/**
 * The cross-mechanic order table (mechanics/shared/src/order.ts, carve-decisions.md D-1) proved on
 * the golden logs. Every golden line the old engine wrote outside a resident's turn (before
 * `run_start`, at the start of a minute, at a round's end and at the run's end) is given to the
 * mechanic that wrote it; one stand-in per mechanic writes its lines in its hook phase, with the
 * table's order, loaded in the reverse of the old order. Through the legacy adapter the result is
 * the golden lines byte for byte (without `seq`), and without the orders it is not.
 *
 * The legacy turn order (`legacyTurnOrder`) is proved on every golden `pass_start`.
 */
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { LegacyEventAdapter, legacyOwner } from "@swarmtales/chronicle";
import type { EventEnvelope, MechanicContext, MechanicShape, MechanicUse, ResidentId } from "@swarmtales/contracts";
import { defineApi, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { HOOK_ORDER, LISTENER_ORDER, ProgressionEvents, legacyTurns } from "@swarmtales/mechanic-shared";
import { dropJustified, goldenLine, idleAgent, playStory, readLegacyLog, type LegacyLine } from "@swarmtales/testkit";

const GOLDEN = join(resolve(import.meta.dirname, "../.."), "test", "golden");
const NAMES = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"];

/** Where a line is written: a hook phase of the table, or a listener of `act_ended`. */
type Slot =
	| { readonly hook: "runStarted"; readonly key: keyof typeof HOOK_ORDER.runStarted }
	| { readonly hook: "minuteStarted"; readonly key: keyof typeof HOOK_ORDER.minuteStarted }
	| { readonly hook: "minuteEnded"; readonly key: keyof typeof HOOK_ORDER.minuteEnded }
	| { readonly hook: "runEnded"; readonly key: keyof typeof HOOK_ORDER.runEnded }
	| { readonly hook: "act_ended"; readonly key: keyof typeof LISTENER_ORDER.act_ended };

/** The mechanic each slot belongs to (the stand-in that writes it). */
const MECHANIC_OF: Readonly<Record<string, string>> = {
	whispers: "whispers",
	ledger: "ledger",
	cast: "cast",
	puzzles: "puzzles",
	cores: "cores",
	progression: "progression",
	arena: "arena",
	names: "names",
	seal: "seal",
	standoffTribunal: "standoff-tribunal",
	script: "script",
	goals: "goals",
};

/** Lines a window's driving line pulls with it (posts, notices, bookings written through another mechanic's API). */
const CARRIED = new Set(["board_post", "notice", "ledger_entry"]);
/** The turn loop's lines: the host writes them (`pass_started`); the turn order has its own test below. */
const TURN_LOOP = new Set(["round_start", "pass_start", "turn_skipped"]);

/** The slot of a line that drives its window, or undefined for a carried line. */
function driverSlot(line: LegacyLine, where: "pre" | "minute" | "end"): Slot | "gamemaker" | undefined {
	const reason = typeof line.reason === "string" ? line.reason : "";
	switch (line.type) {
		case "whisperer_chosen":
			return { hook: "runStarted", key: "whispers" };
		case "fragments_dealt":
		case "factors_dealt":
			return { hook: "runStarted", key: "puzzles" };
		case "core_dealt":
			return { hook: "runStarted", key: "cores" };
		case "run_start":
			return { hook: "runStarted", key: "arena" };
		case "name_chosen":
			return { hook: "minuteStarted", key: "names" };
		case "seal_auction_opened":
			return { hook: "minuteStarted", key: "seal" };
		case "collection_shortened":
			return { hook: "minuteStarted", key: "cast" };
		case "director_action":
			return { hook: "minuteStarted", key: "script" };
		case "blocker_found":
			return { hook: "minuteStarted", key: "standoffTribunal" };
		case "popularity_opened":
		case "popularity_result":
		case "whisper_duty":
			return { hook: "minuteStarted", key: "whispers" };
		case "gamemaker_note":
			return "gamemaker";
		case "round_end":
			return { hook: "minuteEnded", key: "arena" };
		case "seal_expired":
			return { hook: "act_ended", key: "seal" };
		case "goal_resolved":
			return { hook: "act_ended", key: "goals" };
		case "run_end":
			return { hook: "runEnded", key: "arena" };
		case "ledger_entry":
			if (reason === "start points") return { hook: "runStarted", key: "ledger" };
			if (reason === "secret goal fulfilled") return { hook: "act_ended", key: "goals" };
			if (where === "pre" && reason.startsWith("escrow")) return { hook: "runStarted", key: "cast" };
			return undefined;
		default:
			return undefined;
	}
}

interface Placed {
	readonly line: LegacyLine;
	readonly slot: Slot | "gamemaker";
	readonly minute: number;
}

/** Gives every carried line the slot of the driver before it in its window, or after it when it leads the window. */
function attribute(window: readonly LegacyLine[], where: "pre" | "minute" | "end"): readonly Placed[] {
	const slots = window.map((line) => driverSlot(line, where));
	return window.map((line, index) => {
		const before = slots.slice(0, index).reverse().find((slot) => slot !== undefined);
		const after = slots.slice(index + 1).find((slot) => slot !== undefined);
		const slot = slots[index] ?? (CARRIED.has(String(line.type)) ? (before ?? after) : undefined);
		if (slot === undefined) throw new Error(`no slot for ${JSON.stringify(line)}`);
		return { line, slot, minute: typeof line.minute === "number" ? line.minute : 0 };
	});
}

/** The golden's lines outside the residents' turns, each with its slot, in log order. */
function placedLines(lines: readonly LegacyLine[]): readonly Placed[] {
	const mechanic = lines.filter((line) => !TURN_LOOP.has(String(line.type)) && !["app", "core"].includes(legacyOwner(String(line.type))));
	const start = lines.findIndex((line) => line.type === "run_start");
	const ends = lines.flatMap((line, index) => (line.type === "round_end" ? [index] : []));
	const between = (from: number, to: number) => lines.slice(from, to).filter((line) => mechanic.includes(line));
	const firstRound = lines.findIndex((line) => line.type === "round_start");
	// Minute 0 has no minute-start window of its own: nothing lies between run_start and the first round.
	if (between(start + 1, firstRound).length > 0) throw new Error("lines between run_start and the first round");
	const placed: Placed[] = [...attribute(between(0, start + 1), "pre")];
	ends.forEach((end, position) => {
		const last = position === ends.length - 1;
		const next = last ? lines.length : lines.findIndex((line, index) => index > end && line.type === "round_start");
		// The round's end, then the next minute's start (or the run's end after the last round).
		placed.push(...attribute(between(end, end + 1), "minute"), ...attribute(between(end + 1, next), last ? "end" : "minute"));
	});
	return placed;
}

const ReplayApi = defineApi({
	name: "replay",
	summary: "Writes a golden line as an event.",
	methods: { write: { kind: "command", summary: "Writes it.", input: Type.Object({ type: Type.String(), fields: Type.Record(Type.String(), Type.Unknown()) }), output: Type.Null() } },
});

function fieldsOf(line: LegacyLine): { readonly type: string; readonly fields: Readonly<Record<string, unknown>> } {
	return { type: String(line.type), fields: Object.fromEntries(Object.entries(line).filter(([key]) => !["type", "seq", "minute", "at"].includes(key))) };
}

/** Declares every type it writes; writes what the stand-ins hand it. */
function sink(types: readonly string[]) {
	return defineMechanic(
		{ id: "replay", summary: "Writes golden lines.", options: Type.Object({}), state: () => undefined, events: Object.fromEntries(types.map((type) => [type, Type.Object({})])), provides: [ReplayApi] },
		(kit) => ({
			services: [
				kit.provide(ReplayApi, {
					write: ({ type, fields }, ctx) => {
						ctx.emit(type, fields);
						return null;
					},
				}),
			],
		}),
	);
}

/** One stand-in mechanic: writes its slots' lines in its phases, by the table's orders (or all at 0). */
function standInFor(id: string, placed: readonly Placed[], ordered: boolean) {
	const mine = placed.filter((entry): entry is Placed & { readonly slot: Slot } => entry.slot !== "gamemaker" && MECHANIC_OF[entry.slot.key] === id);
	const keys = (hook: Slot["hook"]) => [...new Set(mine.filter((entry) => entry.slot.hook === hook).map((entry) => entry.slot.key))];
	const order = (slot: Slot): number => {
		if (!ordered) return 0;
		switch (slot.hook) {
			case "runStarted":
				return HOOK_ORDER.runStarted[slot.key];
			case "minuteStarted":
				return HOOK_ORDER.minuteStarted[slot.key];
			case "minuteEnded":
				return HOOK_ORDER.minuteEnded[slot.key];
			case "runEnded":
				return HOOK_ORDER.runEnded[slot.key];
			case "act_ended":
				return LISTENER_ORDER.act_ended[slot.key];
		}
	};
	const write = (hook: Slot["hook"], key: string, ctx: MechanicContext<MechanicShape>, minute?: number) => {
		for (const entry of mine) {
			if (entry.slot.hook !== hook || entry.slot.key !== key || (minute !== undefined && entry.minute !== minute)) continue;
			ctx.call(ReplayApi, "write", fieldsOf(entry.line));
		}
	};
	const phases = (hook: "runStarted" | "minuteStarted" | "minuteEnded", byMinute: boolean) =>
		keys(hook).map((key) => {
			const slot = mine.find((entry) => entry.slot.hook === hook && entry.slot.key === key)?.slot;
			return { order: slot === undefined ? 0 : order(slot), run: (ctx: MechanicContext<MechanicShape>) => { write(hook, key, ctx, byMinute ? ctx.minute : undefined); } };
		});
	const actEnds = placed.some((entry) => entry.slot !== "gamemaker" && entry.slot.hook === "act_ended");
	const listened = keys("act_ended");
	return defineMechanic(
		{ id, summary: `Stand-in for ${id}.`, options: Type.Object({}), state: () => undefined, events: id === "progression" ? ProgressionEvents.events : {}, requires: [ReplayApi] },
		(kit) => ({
			hooks: {
				runStarted: phases("runStarted", false),
				minuteStarted: phases("minuteStarted", true),
				minuteEnded: phases("minuteEnded", true),
				runEnded: [
					...(id === "progression" && actEnds ? [{ order: ordered ? HOOK_ORDER.runEnded.progression : 0, run: (_reason: string, ctx: MechanicContext<MechanicShape>) => { ctx.emit("act_ended", { fromLevel: 1 }); } }] : []),
					...keys("runEnded").map((key) => ({ order: ordered ? HOOK_ORDER.runEnded.arena : 0, run: (_reason: string, ctx: MechanicContext<MechanicShape>) => { write("runEnded", key, ctx); } })),
				],
			},
			listeners: listened.map((key) => {
				const slot = mine.find((entry) => entry.slot.hook === "act_ended" && entry.slot.key === key)?.slot;
				return kit.listen(ProgressionEvents, "act_ended", (_payload, ctx) => { write("act_ended", key, ctx); }, { order: slot === undefined ? 0 : order(slot) });
			}),
		}),
	);
}

/** The old order of the mechanics' constructors and ticks, reversed: the load order must not matter. */
const REVERSED = ["arena", "goals", "script", "cast", "standoff-tribunal", "whispers", "seal", "names", "progression", "cores", "puzzles", "ledger"];

async function replay(lines: readonly LegacyLine[], placed: readonly Placed[], ordered: boolean): Promise<readonly string[]> {
	const kept = placed.filter((entry) => entry.slot !== "gamemaker");
	const types = [...new Set(kept.map((entry) => String(entry.line.type)))];
	const rounds = lines.filter((line) => line.type === "round_start").length;
	const residents = lines.find((line) => line.type === "run_start")?.agents;
	const ids: readonly ResidentId[] = Array.isArray(residents) ? residents.map(String) : [];
	const mechanics: MechanicUse[] = [sink(types).with(), ...REVERSED.map((id) => standInFor(id, kept, ordered).with())];
	const run = await playStory({ story: defineCoreStory({ id: "order", seed: 1, minutes: rounds, residents: ids, mechanics, grants: {} }) }, idleAgent);
	const adapter = new LegacyEventAdapter();
	const written = run.events.flatMap((event: EventEnvelope) => adapter.write(event));
	return dropJustified(written, (line) => TURN_LOOP.has(line.type), "the host's turn loop; legacyTurnOrder is proved on pass_start below").kept.map(goldenLine);
}

describe.each(NAMES)("the order table on %s", (name) => {
	const lines = readLegacyLog(join(GOLDEN, `${name}.events.jsonl`));
	const placed = placedLines(lines);
	const gamemaker = dropJustified(placed, (entry) => entry.slot === "gamemaker", "the gamemaker writes in the host's between slot (carve step 17), not in a hook phase");
	const expected = gamemaker.kept.map((entry) => goldenLine(entry.line));

	it("covers every line outside the residents' turns", () => {
		expect(expected.length).toBeGreaterThan(30);
		expect(expected[expected.length - 1]).toContain('"type":"run_end"');
	});

	it("reproduces them byte for byte with the table's orders, loaded in reverse", async () => {
		expect(await replay(lines, placed, true)).toEqual(expected);
	});

	it("does not without the orders (the test is not vacuous)", async () => {
		expect(await replay(lines, placed, false)).not.toEqual(expected);
	});
});

describe.each(NAMES)("the legacy turn order on %s", (name) => {
	const lines = readLegacyLog(join(GOLDEN, `${name}.events.jsonl`));
	const start = lines.find((line) => line.type === "run_start");
	const passes = lines.filter((line) => line.type === "pass_start");

	it("deals every golden pass_start order", async () => {
		const seed = typeof start?.seed === "number" ? start.seed : 0;
		const ids: readonly ResidentId[] = Array.isArray(start?.agents) ? start.agents.map(String) : [];
		const rounds = lines.filter((line) => line.type === "round_start").length;
		const perMinute = Math.max(...passes.map((line) => (typeof line.pass === "number" ? line.pass : 1)));
		const story = defineCoreStory({ id: "turns", seed, minutes: rounds, residents: ids, mechanics: [], grants: {}, turns: legacyTurns({ passesPerMinute: perMinute, blockSize: 1, activation: "always" }) });
		const run = await playStory({ story }, idleAgent);
		const adapter = new LegacyEventAdapter();
		const dealt = run.events.flatMap((event) => adapter.write(event)).filter((line) => line.type === "pass_start");
		expect(dealt.map((line) => JSON.stringify([line.round, line.pass, line.order]))).toEqual(passes.map((line) => JSON.stringify([line.round, line.pass, line.order])));
	});
});
