/**
 * Splits a golden log into what a replay on the new host must do and when (team T2, strict gates):
 * the turns (each with the golden lines of its window), the lines the old engine wrote at the start
 * of a minute and at the run's end (each given the hook slot of the mechanic that wrote it), and
 * the gamemaker's calls between two minutes. The lines that belong to mechanics that are really
 * loaded in the replay (names, receipts, cast, channels) are not planned: they must be produced.
 */
import { legacyOwner } from "@swarmtales/chronicle";
import { HOOK_ORDER, LISTENER_ORDER } from "@swarmtales/mechanic-shared";
import { goldenTurnInputs, type GoldenTurnInput, type LegacyLine } from "@swarmtales/testkit";

/** Where a planned line is written: a hook phase of the order table, or a listener of `act_ended`. */
export type Slot =
	| { readonly hook: "minuteStarted"; readonly order: number; readonly key: string }
	| { readonly hook: "act_ended"; readonly order: number; readonly key: string };

/** A golden line of a mechanic that is not loaded (emitted by the stand-in) or a carried line (posted through channels). */
export interface Placed {
	readonly line: LegacyLine;
	readonly slot: Slot;
	/** `emit`: the line is the stand-in's own event; `carry`: a post or notice written through `ChannelsApi`. */
	readonly how: "emit" | "carry";
}

export interface TurnWindow {
	readonly minute: number;
	readonly agent: string;
	readonly input: GoldenTurnInput;
	/** The golden lines after the turn's `turn_input` up to the next turn, the round's end included. */
	readonly lines: readonly LegacyLine[];
}

export interface GoldenPlan {
	/** Minutes the golden run played (the run ends at this minute). */
	readonly minutes: number;
	/** Whether the city named residents in this run (`name_chosen`). */
	readonly namesChosen: boolean;
	readonly turns: ReadonlyMap<string, TurnWindow>;
	readonly starts: ReadonlyMap<number, readonly Placed[]>;
	readonly end: readonly Placed[];
	/** The lines written after a minute's end (the gamemaker's), by that minute. */
	readonly between: ReadonlyMap<number, readonly LegacyLine[]>;
}

export const turnKey = (minute: number, agent: string): string => `${String(minute)}:${agent}`;

const minuteOf = (line: LegacyLine): number => (typeof line.minute === "number" ? line.minute : 0);
const typeOf = (line: LegacyLine): string => (typeof line.type === "string" ? line.type : "");

/** Lines a stand-in emits itself: the owners the replay checks (`seal`, `script`) whose mechanics are not loaded. */
const EMITTED = new Set(["director_action", "seal_auction_opened", "seal_expired"]);
/** Lines the real mechanics of the replay produce: names, cast, receipts. */
const REAL_DRIVER = new Set(["name_chosen", "collection_shortened"]);
const CARRIED = new Set(["board_post", "notice"]);

type Driver = Slot | "real" | "none";

/** The slot of a line that drives its window, `real` for a line a loaded mechanic writes, `none` otherwise. */
function driverOf(line: LegacyLine): Driver {
	const type = typeOf(line);
	if (REAL_DRIVER.has(type)) return "real";
	switch (type) {
		case "director_action":
			return { hook: "minuteStarted", order: HOOK_ORDER.minuteStarted.script, key: "script" };
		case "seal_auction_opened":
			return { hook: "minuteStarted", order: HOOK_ORDER.minuteStarted.seal, key: "seal" };
		case "blocker_found":
			return { hook: "minuteStarted", order: HOOK_ORDER.minuteStarted.standoffTribunal, key: "standoffTribunal" };
		case "popularity_opened":
		case "popularity_result":
		case "whisper_duty":
			return { hook: "minuteStarted", order: HOOK_ORDER.minuteStarted.whispers, key: "whispers" };
		case "seal_expired":
			return { hook: "act_ended", order: LISTENER_ORDER.act_ended.seal, key: "seal" };
		case "goal_resolved":
			return { hook: "act_ended", order: LISTENER_ORDER.act_ended.goals, key: "goals" };
		case "ledger_entry":
			return line.reason === "secret goal fulfilled" ? { hook: "act_ended", order: LISTENER_ORDER.act_ended.goals, key: "goals" } : "none";
		default:
			return "none";
	}
}

/** Gives every carried line of a window the driver before it, or the first one after it when it leads the window. */
function place(window: readonly LegacyLine[]): readonly Placed[] {
	const drivers = window.map(driverOf);
	const placed: Placed[] = [];
	window.forEach((line, index) => {
		const type = typeOf(line);
		if (!CARRIED.has(type) && !EMITTED.has(type)) return;
		const before = drivers.slice(0, index).reverse().find((driver) => driver !== "none");
		const after = drivers.slice(index + 1).find((driver) => driver !== "none");
		const driver = EMITTED.has(type) ? drivers[index] : (before ?? after);
		if (driver === undefined || driver === "none") throw new Error(`no slot for ${JSON.stringify(line)}`);
		// A line a loaded mechanic writes (a name, its announcement and its private notice) is produced, not planned.
		if (driver === "real") return;
		placed.push({ line, slot: driver, how: EMITTED.has(type) ? "emit" : "carry" });
	});
	return placed;
}

/** The plan of a golden log. */
export function planOf(lines: readonly LegacyLine[]): GoldenPlan {
	const inputs = goldenTurnInputs(lines);
	const turns = new Map<string, TurnWindow>();
	const windows = new Map<number, LegacyLine[]>();
	const between = new Map<number, LegacyLine[]>();
	let mode: "pre" | "turn" | "after" = "pre";
	let current: LegacyLine[] | undefined;
	let lastRoundEnd = -1;
	let turn = 0;
	for (const line of lines) {
		const type = typeOf(line);
		if (type === "turn_input") {
			const input = inputs[turn++];
			if (input === undefined) throw new Error("a turn_input without its parsed input");
			current = [];
			turns.set(turnKey(input.minute, input.agent), { minute: input.minute, agent: input.agent, input, lines: current });
			mode = "turn";
		} else if (type === "round_end") {
			mode = "after";
			lastRoundEnd = minuteOf(line);
		} else if (type === "round_start" || type === "pass_start") {
			if (mode === "after") mode = "pre";
		} else if (mode === "turn") {
			current?.push(line);
		} else if (mode === "after") {
			const target = minuteOf(line) === lastRoundEnd ? between : windows;
			target.set(minuteOf(line), [...(target.get(minuteOf(line)) ?? []), line]);
		}
	}
	const minutes = lastRoundEnd + 1;
	const starts = new Map<number, readonly Placed[]>();
	for (const [minute, window] of windows) if (minute < minutes) starts.set(minute, place(window));
	return { minutes, namesChosen: lines.some((line) => line.type === "name_chosen"), turns, starts, end: place(windows.get(minutes) ?? []), between };
}
