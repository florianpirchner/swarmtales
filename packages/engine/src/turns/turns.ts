// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `turns` scheduler (specification of M1, sections 4.2 and 4.3): a tick has passes, each a seeded order cut
 * into blocks. The inputs of a block's members are built before any member acts; their drivers run at once, but
 * the calls of member k wait until member k-1 is closed, so the calls land in the order of the pass. With the
 * option `afterBlocks` (specification of M3, section 8), actors of the named kinds who have news are activated
 * after `pass_started` and after every block; they are no part of the order of the pass.
 */
import { kindOf, SwtError } from "@swarmtales/contracts";
import type { Activation, ActorDriver, ActorId, DriverTable, OpenActivation, RunEnd, SchedulerDefinition, SchedulerPort, SnapshotSlice } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { arrange } from "./inputs.ts";
import type { TurnsOptions } from "./options.ts";
import { TurnsOptions as TurnsOptionsSchema } from "./options.ts";

const ID = "@swarmtales/engine/turns";
const actor = Type.String({ description: "An actor id." });
const pass = Type.Integer({ description: "The pass of the tick, from 1." });

const events = {
	pass_started: Type.Object(
		{
			pass,
			order: Type.Array(actor, { description: "The actors who may act, in the order of the pass." }),
			blocks: Type.Array(Type.Array(actor, { description: "The members of one block." }), { description: "The order, cut into blocks." }),
		},
		{ additionalProperties: false, description: "A pass of a tick started." },
	),
	activation_skipped: Type.Object({ actor, pass, block: Type.Integer({ description: "The block of the pass, from 1." }) }, { additionalProperties: false, description: "An actor who may act was not woken in a pass." }),
};

const PendingSlice = Type.Object({ pending: Type.Array(actor, { description: "The actors whose driver holds tool results it has not answered yet." }) }, { additionalProperties: false, description: "The state of the turns scheduler." });

// What the functions of one run share.
interface Turns {
	readonly port: SchedulerPort;
	readonly drivers: DriverTable;
	readonly options: TurnsOptions;
	readonly pending: Set<string>;
}

const issue = (code: string, summary: string, why: string, fix: string): SwtError => new SwtError({ code, summary, where: { package: "@swarmtales/engine" }, why, fix });

// The wake rule of 4.2: the reason the actor is woken, or undefined when it is skipped.
function wakeReason(turns: Turns, id: ActorId): string | undefined {
	const { port, options } = turns;
	if (options.activation === "always") return "always";
	if (options.activation === "toAct") return port.toAct()?.includes(id) === true ? "toAct" : undefined;
	if (port.hasNews(id)) return "news";
	return turns.pending.has(id) ? "answer" : undefined;
}

// One member's turn: its driver starts at once, its calls wait for `ready`; it ends when both are settled. What
// fails goes to `outcomes`; the promise returned is the next member's `ready` and never rejects.
function playTurn(turns: Turns, open: OpenActivation, driver: ActorDriver, ready: Promise<void>, outcomes: Promise<unknown>[]): Promise<void> {
	const call: Activation["call"] = async (as, params) => {
		await ready;
		return open.call(as, params);
	};
	// Not a spread: `basis` and `quietEnd` are live on `open` (erratum E7), so the copy reads `basis` through.
	const gated: Activation = {
		actor: open.actor,
		tick: open.tick,
		get basis() {
			return open.basis;
		},
		detail: open.detail,
		inputs: open.inputs,
		tools: open.tools,
		call,
		// Not gated by `ready`: a record is the driver's own note (a request that starts), not a move in the game.
		record: (source, type, payload) => open.record(source, type, payload),
	};
	// The executor runs now, so the driver starts before the next member is prepared; a throw becomes a rejection.
	const step = new Promise<Awaited<ReturnType<ActorDriver>>>((resolve) => {
		resolve(driver(gated));
	});
	const closed = Promise.allSettled([ready, step]).then(([, result]) => {
		const said = result.status === "rejected" ? undefined : result.value;
		if (typeof said === "object" && said.pending && !open.quietEnd) turns.pending.add(open.actor);
		else turns.pending.delete(open.actor);
		open.close(result.status === "rejected");
	});
	outcomes.push(step, closed);
	const ignore = (): void => undefined;
	return closed.then(ignore, ignore);
}

// Opens one actor's activation and starts its turn; an actor without a driver fails the block (`SWT-R011`).
function startTurn(turns: Turns, id: ActorId, detail: OpenActivation["detail"], ready: Promise<void>, outcomes: Promise<unknown>[]): Promise<void> {
	const { port, drivers, options } = turns;
	const driver = drivers[id] ?? drivers[kindOf(id)];
	if (driver === undefined) {
		outcomes.push(Promise.reject(issue("SWT-R011", `the actor ${id} is activated but has no driver`, "Every activated actor needs a driver, by its id or by its kind.", `Add a driver for "${id}" or for the kind "${kindOf(id)}" to the driver table.`)));
		return ready;
	}
	const inputs = arrange(port.inputsFor(id), options.inputs);
	return playTurn(turns, port.open(id, inputs, detail), driver, ready, outcomes);
}

// A failed member does not stop the next: all turns end, then the first failure in the block's order is thrown.
async function settle(outcomes: readonly Promise<unknown>[]): Promise<void> {
	await Promise.allSettled(outcomes);
	await Promise.all(outcomes);
}

async function playBlock(turns: Turns, passNumber: number, block: number, members: readonly ActorId[]): Promise<void> {
	const { port } = turns;
	const outcomes: Promise<unknown>[] = [];
	let ready: Promise<void> = Promise.resolve();
	// No await in this loop: every member's inputs show the block's start.
	for (const id of members) {
		if (!port.actors.mayAct(id)) continue;
		const reason = wakeReason(turns, id);
		if (reason === undefined) {
			port.emit("activation_skipped", { actor: id, pass: passNumber, block });
			continue;
		}
		ready = startTurn(turns, id, { pass: passNumber, block, reason }, ready, outcomes);
	}
	await settle(outcomes);
}

// A slot of `afterBlocks`: one round through the actors of those kinds, in the definition's order. Who may act and
// has news gets one activation; no await in the loop, so news that one of them creates waits for the next slot.
// `block` is the block the slot follows, 0 for the slot `start`.
async function playSlot(turns: Turns, slot: "start" | "afterBlock", passNumber: number, block: number): Promise<void> {
	const { port, options } = turns;
	const kinds = options.afterBlocks ?? [];
	if (kinds.length === 0 || port.halted) return;
	const outcomes: Promise<unknown>[] = [];
	let ready: Promise<void> = Promise.resolve();
	for (const id of port.actors.ids) {
		if (!kinds.includes(kindOf(id)) || !port.actors.mayAct(id) || !port.hasNews(id)) continue;
		ready = startTurn(turns, id, { slot, pass: passNumber, block }, ready, outcomes);
	}
	await settle(outcomes);
}

async function playPass(turns: Turns, passNumber: number): Promise<void> {
	const { port, options } = turns;
	const roster = port.actors.ids.filter((id) => options.kinds.includes(kindOf(id)));
	const may = roster.filter((id) => port.actors.mayAct(id));
	// `arena`: the old arena's draw (legacy `legacyTurnOrder`), the whole roster shuffled, then who may not act left out.
	const arena = (): ActorId[] => port.rng("order", port.tick + 1, passNumber).shuffle(roster).filter((id) => may.includes(id));
	const order = options.order === "roster" ? may : options.order === "arena" ? arena() : port.rng("turns", port.tick, ...(passNumber === 1 ? [] : [passNumber])).shuffle(may);
	if (order.length !== may.length || new Set(order).size !== order.length || !order.every((id) => may.includes(id))) {
		throw issue("SWT-R010", `the order of pass ${String(passNumber)} is not a permutation of the actors who may act`, "A pass activates every actor who may act at most once.", "Fix the order of the scheduler.");
	}
	const blocks: ActorId[][] = [];
	for (let start = 0; start < order.length; start += options.blockSize) blocks.push(order.slice(start, start + options.blockSize));
	port.emit("pass_started", { pass: passNumber, order, blocks });
	await playSlot(turns, "start", passNumber, 0);
	for (const [index, members] of blocks.entries()) {
		if (port.halted) break;
		await playBlock(turns, passNumber, index + 1, members);
		await playSlot(turns, "afterBlock", passNumber, index + 1);
	}
}

async function play(turns: Turns, until: { readonly ticks: number } | undefined): Promise<RunEnd | undefined> {
	const { port, options } = turns;
	if (options.activation === "toAct" && port.toAct() === undefined) {
		throw issue("SWT-R014", "the activation is toAct, but no loaded plugin names who is to act", "With the activation toAct, one plugin's toAct hook says who is woken.", "Load a mechanic with a toAct hook, or set the activation to always or onNews.");
	}
	for (let ticks = 0; until === undefined || ticks < until.ticks; ticks++) {
		await port.beginTick();
		let started = 0;
		for (let passNumber = 1; passNumber <= options.passes && !port.halted; passNumber++) {
			started += 1;
			await playPass(turns, passNumber);
		}
		const end = await port.endTick(started === 0);
		if (end !== undefined) return end;
	}
	return undefined;
}

/**
 * The turn scheduler: passes per tick, a seeded, roster or arena order, blocks, and the activations `always`, `onNews`
 * and `toAct`. Its state is the set of actors whose driver awaits an answer.
 *
 * @example
 * ```ts
 * const end = await turns.create(options).run(port, { resident: driver });
 * ```
 * @public
 */
export const turns: SchedulerDefinition<TurnsOptions> = {
	id: ID,
	revision: 1,
	determinism: "seeded",
	options: TurnsOptionsSchema,
	events,
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
		return { run: (port, drivers, until) => play({ port, drivers, options, pending }, until), slice };
	},
};
