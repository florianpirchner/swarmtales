// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ActorSpec, Envelope, KernelDefinition } from "@swarmtales/contracts";
import { createAccess } from "../src/access.ts";
import { createActors } from "../src/actors.ts";
import type { Access, Log } from "../src/parts.ts";

/** A log that keeps what is emitted and does nothing else. */
function fakeLog(): Log {
	const events: Envelope[] = [];
	return {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.filter((event) => event.seq > seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
		emit: (source, type, payload) => {
			const event: Envelope = { seq: events.length + 1, tick: 0, source, type, actor: "kernel", payload };
			events.push(event);
			return event;
		},
		run: (_frame, code) => code(),
		frame: () => ({ actor: "kernel" }),
		listen: () => undefined,
		addSink: () => undefined,
		fail: () => undefined,
	};
}

const [ADD, READ, STOP, GONE] = ["@example/counter/counter/add", "@example/counter/counter/read", "@example/counter/counter/stop", "@example/counter/counter/gone"];
const [A01, A02, W1] = ["worker:A01", "worker:A02", "watcher:W1"] as const;
const SPECS: readonly ActorSpec[] = [
	{ id: A01, kind: "worker", grant: "worker", shared: {} },
	{ id: A02, kind: "worker", grant: "worker", shared: {} },
	{ id: W1, kind: "watcher", grant: "watcher", shared: {} },
];

const DEFINITION: KernelDefinition = {
	game: { id: "counting", hash: "0".repeat(64) },
	seed: 1,
	actors: SPECS,
	plugins: [],
	scheduler: {
		definition: { id: "fake", revision: 1, determinism: "seeded", options: Type.Object({}, { description: "No options" }), events: {}, create: () => ({ run: () => Promise.resolve(undefined) }) },
		options: {},
	},
	grants: { worker: [ADD, READ], watcher: [READ, STOP] },
	names: { [ADD]: "add", [READ]: "read", [STOP]: "stop" },
	startLocks: { worker: [READ] },
	replies: {},
	limits: { maxTicks: 3 },
};

function setup(): { readonly log: Log; readonly access: Access } {
	const log = fakeLog();
	return { log, access: createAccess(DEFINITION, createActors(SPECS, log), log) };
}

const written = (log: Log): readonly unknown[] => log.all().map((event) => [event.source, event.type, event.payload]);

describe("access (part 4): grants and locks", () => {
	it("reads the grants in the order a caller sees them", () => {
		const { access } = setup();
		expect(access.grantsOf("watcher")).toEqual([READ, STOP]);
		expect([access.grantsOf("nobody"), access.grantsOf("constructor")]).toEqual([[], []]);
		expect([access.granted("worker", ADD), access.granted("worker", STOP), access.granted("nobody", ADD), access.granted("toString", ADD)]).toEqual([true, false, false, false]);
	});

	it("locks the start locks of a grant for each of its actors, without an event", () => {
		const { log, access } = setup();
		expect([access.isLocked(A01, READ), access.isLocked(A02, READ), access.isLocked(W1, READ), access.isLocked(A01, ADD)]).toEqual([true, true, false, false]);
		expect(access.state()).toEqual({ [A01]: [READ], [A02]: [READ] });
		expect(log.length).toBe(0);
	});

	it("writes one event for a lock and one for an unlock, and none when nothing changes", () => {
		const { log, access } = setup();
		const port = access.portFor("gate");
		port.lock(A01, ADD);
		expect(written(log)).toEqual([["kernel", "tool_locked", { actor: A01, tool: ADD, by: "gate" }]]);
		port.lock(A01, ADD);
		port.lock(A01, READ);
		access.portFor("other").lock(A01, ADD);
		port.unlock(A02, ADD);
		expect(log.length).toBe(1);
		expect([port.isLocked(A01, ADD), access.isLocked(A01, ADD), port.isLocked(A02, ADD)]).toEqual([true, true, false]);
		access.portFor("other").unlock(A01, ADD);
		expect(written(log).slice(1)).toEqual([["kernel", "tool_unlocked", { actor: A01, tool: ADD, by: "other" }]]);
		port.unlock(A01, ADD);
		expect(log.length).toBe(2);
		expect(port.isLocked(A01, ADD)).toBe(false);
		port.unlock(A01, READ);
		expect(written(log).slice(2)).toEqual([["kernel", "tool_unlocked", { actor: A01, tool: READ, by: "gate" }]]);
		expect(access.state()).toEqual({ [A02]: [READ] });
	});

	it("refuses to lock or unlock a tool the definition neither names nor grants", () => {
		const { log, access } = setup();
		expect(() => {
			access.portFor("gate").lock(A01, GONE);
		}).toThrowError(new RangeError(`gate: no tool "${GONE}" to lock or unlock`));
		expect(() => {
			access.portFor("gate").unlock(A01, "toString");
		}).toThrowError(RangeError);
		// A lock of an id that is no actor would be saved and then refused by `restore`.
		expect(() => {
			access.portFor("gate").lock("worker:A09", ADD);
		}).toThrowError(new RangeError('gate: no actor "worker:A09" to lock or unlock a tool for'));
		expect(log.length).toBe(0);
		expect(access.state()).toEqual({ [A01]: [READ], [A02]: [READ] });
	});

	it("`isOpen` asks the probe, and only for a tool that is granted and not locked", () => {
		const { access } = setup();
		const port = access.portFor("gate");
		expect([port.isOpen(A01, ADD), port.isOpen(A01, READ), port.isOpen(A01, STOP), port.isOpen("script", ADD)]).toEqual([true, false, false, false]);
		const asked: string[] = [];
		access.setProbe((actor, tool) => {
			asked.push(`${actor} ${tool}`);
			return actor !== A02;
		});
		expect([port.isOpen(A01, ADD), port.isOpen(A02, ADD), port.isOpen(A01, READ), port.isOpen(A01, STOP), port.isOpen("script", ADD)]).toEqual([true, false, false, false, false]);
		expect(asked).toEqual([`${A01} ${ADD}`, `${A02} ${ADD}`]);
		port.unlock(A02, READ);
		expect([port.open(A01), port.open(A02), port.open(W1), port.open("script")]).toEqual([[ADD], [], [READ, STOP], []]);
	});

	it("refuses a probe that asks about the call it decides, and can be asked again after it", () => {
		const { access } = setup();
		const port = access.portFor("gate");
		access.setProbe((actor, tool) => port.isOpen(actor, tool === ADD ? ADD : STOP));
		expect(() => port.isOpen(A01, ADD)).toThrowError(RangeError);
		access.setProbe(() => true);
		expect(port.isOpen(A01, ADD)).toBe(true);
	});

	it("restores the locks of a snapshot in place of its own, sorted in `state`, and refuses an id that is no actor (SWT-R002)", () => {
		const { log, access } = setup();
		access.restore({ [W1]: [STOP, READ], [A02]: [] });
		expect(access.state()).toEqual({ [W1]: [READ, STOP] });
		expect([access.isLocked(A01, READ), access.isLocked(W1, STOP)]).toEqual([false, true]);
		expect(log.length).toBe(0);
		expect(() => {
			access.restore({ "worker:A09": [ADD] });
		}).toThrowError(/SWT-R002.*"worker:A09"/s);
	});
});
