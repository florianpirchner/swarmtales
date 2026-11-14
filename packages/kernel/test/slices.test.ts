// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { KernelSnapshotSchema, SwtError } from "@swarmtales/contracts";
import type { Job, KernelDefinition, KernelSnapshot, PluginInstance, SnapshotSlice } from "@swarmtales/contracts";
import type { Access, Actors, Clock, Loaded, Log, SliceParts } from "../src/parts.ts";
import { restoreKernel, saveKernel } from "../src/slices.ts";

const unused = (): never => {
	throw new RangeError("not used in this test");
};
type Lists = Readonly<Record<string, readonly string[]>>;

// A slice over one value; it refuses a version it does not know.
function cell(value: unknown): { readonly slice: SnapshotSlice; readonly box: { value: unknown } } {
	const box = { value };
	const slice: SnapshotSlice = {
		version: 2,
		save: () => box.value,
		load(data, version) {
			if (version !== 2) throw new TypeError(`no version ${String(version)}`);
			box.value = data;
		},
	};
	return { slice, box };
}

// The parts of a small game: `counter` and `silent` keep state, `plain` keeps none.
function game(options: { readonly id?: string; readonly hash?: string; readonly seed?: number; readonly length?: number; readonly scheduler?: boolean } = {}) {
	const kept: { suspensions: Lists; locks: Lists; tick: number; jobs: readonly Job[] } = { suspensions: {}, locks: {}, tick: 0, jobs: [] };
	const counter = cell({ count: 0, seen: ["x"] });
	const silent = cell(undefined);
	const turns = cell({ waiting: ["resident:a"] });
	const instance = (slice: SnapshotSlice | undefined): PluginInstance => ({ tools: [], services: [], listeners: [], hooks: {}, stages: {}, jobs: { ring: () => undefined }, limits: [], facts: {}, slice });
	const loaded: Loaded = { order: ["counter", "plain", "silent"], instances: new Map([["counter", instance(counter.slice)], ["plain", instance(undefined)], ["silent", instance(silent.slice)]]), tools: new Map(), byShownName: new Map(), hooks: () => [], stages: () => [], limits: [] };
	const log: Log = { length: options.length ?? 7, all: unused, since: unused, ofType: unused, emit: unused, run: unused, frame: unused, listen: unused, addSink: unused, fail: unused };
	const actors: Actors = { ids: [], ofKind: unused, has: unused, mayAct: unused, shared: unused, spec: unused, portFor: unused, state: () => kept.suspensions, restore: (state) => void (kept.suspensions = state) };
	const access: Access = { granted: unused, grantsOf: unused, isLocked: unused, setProbe: unused, portFor: unused, state: () => kept.locks, restore: (state) => void (kept.locks = state) };
	const clock: Clock = { tick: 0, advance: unused, at: unused, take: unused, state: () => kept.jobs, restore: (tick, jobs) => void Object.assign(kept, { tick, jobs }) };
	const scheduler = { id: "@swarmtales/engine/sample", revision: 1, determinism: "seeded", options: Type.Object({}), events: {}, create: unused } as const;
	const definition: KernelDefinition = { game: { id: options.id ?? "sample", hash: options.hash ?? "h1" }, seed: options.seed ?? 11, actors: [], plugins: [], scheduler: { definition: scheduler, options: null }, grants: {}, names: {}, startLocks: {}, replies: {}, limits: { maxTicks: 9 } };
	const parts: SliceParts = { definition, log, actors, access, clock, loaded, scheduler: options.scheduler === false ? undefined : turns.slice };
	return { parts, kept, counter, silent, turns };
}

// A game in play, and its snapshot after a trip through JSON.
function played(): { readonly from: ReturnType<typeof game>; readonly snapshot: KernelSnapshot } {
	const from = game();
	Object.assign(from.kept, { suspensions: { "resident:a": ["counter"] }, locks: { "resident:b": ["counter/add"] }, jobs: [{ id: 1, owner: "counter", job: "ring", next: 5, data: { n: 1 } }] });
	from.counter.box.value = { count: 3, seen: ["x", "y"] };
	const text = JSON.stringify(saveKernel(from.parts, 4, { reason: "limit", tick: 4, limit: "counter.full" }));
	const snapshot: unknown = JSON.parse(text);
	if (!Check(KernelSnapshotSchema, snapshot)) throw new TypeError("the snapshot does not fit its schema");
	return { from, snapshot };
}

const refusal = (code: () => void): string => {
	try {
		code();
	} catch (thrown) {
		return thrown instanceof SwtError ? `${thrown.code}: ${thrown.issues[0]?.summary ?? ""}` : String(thrown);
	}
	return "no refusal";
};

describe("the kernel's snapshot", () => {
	it("makes the round trip through JSON", () => {
		const { from, snapshot } = played();
		expect(snapshot).toEqual({
			format: "swarmtales.kernel",
			version: 1,
			game: "sample",
			gameHash: "h1",
			seed: 11,
			tick: 4,
			seq: 7,
			ended: { reason: "limit", tick: 4, limit: "counter.full" },
			suspensions: { "resident:a": ["counter"] },
			locks: { "resident:b": ["counter/add"] },
			jobs: [{ id: 1, owner: "counter", job: "ring", next: 5, data: { n: 1 } }],
			plugins: { counter: { version: 2, data: { count: 3, seen: ["x", "y"] } }, silent: { version: 2, data: null } },
			scheduler: { version: 2, data: { waiting: ["resident:a"] } },
		});
		const to = game();
		restoreKernel(to.parts, snapshot);
		expect(to.kept).toEqual({ ...from.kept, tick: 4 });
		expect([to.counter.box.value, to.silent.box.value, to.turns.box.value]).toEqual([{ count: 3, seen: ["x", "y"] }, null, { waiting: ["resident:a"] }]);
		expect(saveKernel(to.parts, 4, snapshot.ended)).toEqual(snapshot);
	});

	it("saves copies and leaves `ended` and the scheduler out when there is none", () => {
		const from = game({ scheduler: false });
		const state = { count: 1, seen: ["x"] };
		from.counter.box.value = state;
		const snapshot = saveKernel(from.parts, 0, undefined);
		state.seen.push("later");
		expect(snapshot.plugins.counter).toEqual({ version: 2, data: { count: 1, seen: ["x"] } });
		expect(Object.keys(snapshot)).not.toContain("ended");
		expect(Object.keys(snapshot)).not.toContain("scheduler");
	});

	it.each([
		["another game", { id: "other" }, /^SWT-R002: the snapshot was taken from the game "sample" \(h1\), not from "other" \(h1\)/],
		["another hash of the game", { hash: "h2" }, /^SWT-R002: the snapshot was taken from the game/],
		["another seed", { seed: 12 }, /^SWT-R002: the snapshot was taken with the seed 11, not 12/],
		["another log length", { length: 8 }, /^SWT-R002: the snapshot was taken at seq 7, but the log has 8 events/],
		["a scheduler without state", { scheduler: false }, /^SWT-R002: the snapshot has state of the scheduler, and the scheduler keeps none/],
	])("refuses a snapshot of %s and changes nothing (SWT-R002)", (_name, options, summary) => {
		const to = game(options);
		expect(
			refusal(() => {
				restoreKernel(to.parts, played().snapshot);
			}),
		).toMatch(summary);
		expect([to.kept.tick, to.kept.jobs, to.counter.box.value]).toEqual([0, [], { count: 0, seen: ["x"] }]);
	});

	it.each([
		["state of a plugin that keeps none", (s: KernelSnapshot) => ({ ...s, plugins: { ...s.plugins, plain: { version: 1, data: {} } } }), /state of the plugin "plain"/],
		["no state of a plugin that keeps some", (s: KernelSnapshot) => ({ ...s, plugins: { counter: { version: 2, data: {} } } }), /no state of the plugin "silent"/],
		["a job no plugin has", (s: KernelSnapshot) => ({ ...s, jobs: [{ id: 1, owner: "counter", job: "toString", next: 5 }] }), /the job "toString" of "counter"/],
		["a job of a plugin that is not loaded", (s: KernelSnapshot) => ({ ...s, jobs: [{ id: 1, owner: "gone", job: "ring", next: 5 }] }), /the job "ring" of "gone"/],
		["a slice version its owner refuses", (s: KernelSnapshot) => ({ ...s, plugins: { ...s.plugins, counter: { version: 1, data: {} } } }), /saved state of "counter" \(version 1\) does not load: no version 1/],
		["a scheduler slice its owner refuses", (s: KernelSnapshot) => ({ ...s, scheduler: { version: 3, data: {} } }), /saved state of "@swarmtales\/engine\/sample" \(version 3\) does not load/],
	])("refuses a snapshot with %s (SWT-R002)", (_name, change, summary) => {
		const said = refusal(() => {
			restoreKernel(game().parts, change(played().snapshot));
		});
		expect(said).toMatch(/^SWT-R002: /);
		expect(said).toMatch(summary);
	});
});
