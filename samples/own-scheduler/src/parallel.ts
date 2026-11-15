// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The scheduler sample `parallel` (specification of M4, sections 3.2 and 3.3): every resident that is woken acts
 * on its own, and its calls are committed in the order in which they arrive. A scan opens every actor that may act
 * and has a wake reason; it runs at the start of a tick and at every close, and nowhere else. A tick ends when no
 * activation is open and a scan opens none; `activations` caps the activations of an actor in one tick.
 */
import { kindOf, SwtError } from "@swarmtales/contracts";
import type { Activation, ActorDriver, ActorId, DriverResult, DriverTable, InputNote, OpenActivation, RunEnd, SchedulerDefinition, SchedulerPort, SnapshotSlice } from "@swarmtales/contracts";
import { arrange } from "@swarmtales/engine";
import { RESIDENT_KIND } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { ParallelOptions as ParallelOptionsSchema, type ParallelOptions } from "./options.ts";

const PendingSlice = Type.Object(
	{ pending: Type.Array(Type.String({ description: "An actor id." }), { description: "The actors whose driver holds tool results it has not answered yet." }) },
	{ additionalProperties: false, description: "The state of the parallel scheduler." },
);

// What the functions of one run share. `open`, `counts`, `failures` (by the number of the activation in the order
// of opening) and `done` belong to the current tick.
interface Race {
	readonly port: SchedulerPort;
	readonly drivers: DriverTable;
	readonly options: ParallelOptions;
	readonly pending: Set<string>;
	readonly open: Set<ActorId>;
	readonly counts: Map<ActorId, number>;
	readonly failures: Map<number, unknown>;
	opened: number;
	done: () => void;
}

// One actor a scan wakes, with its driver and the reason.
interface Woken {
	readonly id: ActorId;
	readonly driver: ActorDriver;
	readonly reason: string;
}

const issue = (code: string, summary: string, why: string, fix: string): SwtError => new SwtError({ code, summary, where: { package: "@swarmtales/sample-own-scheduler" }, why, fix });

// The wake rule of `turns`, per actor; a kind other than resident is woken by news only.
function wakeReason(race: Race, id: ActorId): string | undefined {
	const { port, options } = race;
	if (kindOf(id) !== RESIDENT_KIND) return port.hasNews(id) ? "news" : undefined;
	if (options.activation === "always") return "always";
	if (options.activation === "toAct") return port.toAct()?.includes(id) === true ? "toAct" : undefined;
	if (port.hasNews(id)) return "news";
	return race.pending.has(id) ? "answer" : undefined;
}

// Whether the actor can be opened now: a kind of the options, may act, not open, under the cap of the tick.
function openable(race: Race, id: ActorId): boolean {
	const { port, options } = race;
	return options.kinds.includes(kindOf(id)) && port.actors.mayAct(id) && !race.open.has(id) && (race.counts.get(id) ?? 0) < options.activations;
}

// Runs code that writes to the log (a close, a scan); a throw becomes a failure of the tick, and the first failure
// of an activation is the one kept.
function guarded<A extends unknown[]>(race: Race, index: number, code: (...args: A) => void, ...args: A): void {
	try {
		code(...args);
	} catch (error) {
		if (!race.failures.has(index)) race.failures.set(index, error);
	}
}

// The driver's view of the activation: everything but `close`; `basis` is read through on `open`.
function viewOf(open: OpenActivation): Activation {
	return {
		actor: open.actor,
		tick: open.tick,
		get basis() {
			return open.basis;
		},
		detail: open.detail,
		inputs: open.inputs,
		tools: open.tools,
		call: (as, params) => open.call(as, params),
		record: (source, type, payload) => open.record(source, type, payload),
	};
}

// The end of one activation: the pending mark, `activation_closed`, then at once the next scan.
function finish(race: Race, open: OpenActivation, index: number, said: DriverResult | undefined): void {
	const failed = race.failures.has(index);
	if (!failed && said?.pending === true && !open.quietEnd) race.pending.add(open.actor);
	else race.pending.delete(open.actor);
	guarded(race, index, () => {
		open.close(failed);
	});
	race.open.delete(open.actor);
	guarded(race, race.opened, scan, race);
	if (race.open.size === 0) race.done();
}

// Opens one woken actor and starts its driver; its calls go to the kernel as they arrive.
function start(race: Race, woken: Woken, inputs: readonly InputNote[]): void {
	const index = race.opened++;
	const n = (race.counts.get(woken.id) ?? 0) + 1;
	const open = race.port.open(woken.id, inputs, { reason: woken.reason, n });
	race.open.add(woken.id);
	race.counts.set(woken.id, n);
	// The executor runs now, so a throw of the driver becomes a rejection.
	const step = new Promise<Awaited<ReturnType<ActorDriver>>>((resolve) => {
		resolve(woken.driver(viewOf(open)));
	});
	const failed = (error: unknown): undefined => (race.failures.set(index, error), undefined);
	void step.then((said) => said ?? undefined, failed).then((said) => {
		finish(race, open, index, said);
	});
}

// One scan, with no await: every actor it wakes gets its inputs, then every one is opened. A halted run or a failed
// tick opens nothing; an actor without a driver fails the tick (`SWT-R011`) and nothing of the scan is opened.
function scan(race: Race): void {
	const { port, drivers, options } = race;
	if (race.failures.size > 0 || port.halted) return;
	const woken: Woken[] = [];
	for (const id of port.actors.ids) {
		const reason = openable(race, id) ? wakeReason(race, id) : undefined;
		if (reason === undefined) continue;
		const driver = drivers[id] ?? drivers[kindOf(id)];
		if (driver === undefined) {
			race.failures.set(race.opened, issue("SWT-R011", `the actor ${id} is activated but has no driver`, "Every activated actor needs a driver, by its id or by its kind.", `Add a driver for "${id}" or for the kind "${kindOf(id)}" to the driver table.`));
			return;
		}
		woken.push({ id, driver, reason });
	}
	const inputs = woken.map((entry) => arrange(port.inputsFor(entry.id), options.inputs));
	for (const [at, entry] of woken.entries()) start(race, entry, inputs[at] ?? []);
}

// One tick between `beginTick` and `endTick`; it returns whether the first scan ran (not halted before it). A failed
// tick throws its first failure in the order of opening once every open activation has ended.
async function playTick(race: Race): Promise<boolean> {
	race.counts.clear();
	race.failures.clear();
	race.opened = 0;
	const started = !race.port.halted;
	await new Promise<void>((resolve) => {
		race.done = resolve;
		guarded(race, 0, scan, race);
		if (race.open.size === 0) resolve();
	});
	const first = Math.min(...race.failures.keys());
	if (race.failures.size > 0) throw race.failures.get(first);
	return started;
}

async function play(race: Race, until: { readonly ticks: number } | undefined): Promise<RunEnd | undefined> {
	const { port, options } = race;
	if (options.activation === "toAct" && port.toAct() === undefined) {
		throw issue("SWT-R014", "the activation is toAct, but no loaded plugin names who is to act", "With the activation toAct, one plugin's toAct hook says who is woken.", "Load a mechanic with a toAct hook, or set the activation to always or onNews.");
	}
	for (let ticks = 0; until === undefined || ticks < until.ticks; ticks++) {
		await port.beginTick();
		const started = await playTick(race);
		const end = await port.endTick(!started);
		if (end !== undefined) return end;
	}
	return undefined;
}

/**
 * The scheduler sample `parallel`: no passes, no blocks, no seeded order. Every woken actor acts on its own; a scan
 * at the start of a tick and at every close opens whom it may. Its state is the set of actors whose driver awaits
 * an answer, as under `turns`.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: { ...game, scheduler: { id: "parallel" } }, schedulers: { turns, parallel }, prompts });
 * ```
 * @public
 */
export const parallel: SchedulerDefinition<ParallelOptions> = {
	id: "@swarmtales/sample-own-scheduler/parallel",
	revision: 1,
	determinism: "recorded",
	options: ParallelOptionsSchema,
	events: {},
	create(options) {
		const pending = new Set<string>();
		const slice: SnapshotSlice = {
			version: 1,
			save: () => ({ pending: [...pending].sort() }),
			load: (data) => {
				pending.clear();
				for (const id of Parse(PendingSlice, data).pending) pending.add(id);
			},
		};
		const race = (port: SchedulerPort, drivers: DriverTable): Race => ({ port, drivers, options, pending, open: new Set(), counts: new Map(), failures: new Map(), opened: 0, done: () => undefined });
		return { run: (port, drivers, until) => play(race(port, drivers), until), slice };
	},
};
