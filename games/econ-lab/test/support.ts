// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The scripted seat of the Econ Lab tests and their readers of the log. Carried from `test/stories/econ-lab.test.ts`
 * (`player`) and `test/stories/tictactoe-support.ts` (`field`, `ofType`).
 */
import { familyParams, type Game } from "@swarmtales/sdk";
import { play, scriptedDriver, type Oracle, type Plan, type Played, type PlannedCall } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { expect } from "vitest";
import { econLabGame, type EconLabOptions, econLabFamily } from "../game.ts";

type Logged = Played["events"][number];
type Call = readonly { readonly tool: string; readonly params: unknown }[];

// The decision a text asks for: put in 8 or 2, offer 4, accept 3 or more, choose A or B.
function decisionOf(kind: boolean, told: string): Call {
	if (told.includes("how many of your")) return [{ tool: "contribute", params: { amount: kind ? 8 : 2, reason: "script" } }];
	if (told.includes("you are the proposer")) return [{ tool: "offer", params: { amount: 4, reason: "script" } }];
	const offer = /offers you (\d+) points/.exec(told)?.[1];
	if (offer !== undefined) return [{ tool: "respond", params: { accept: Number(offer) >= 3, reason: "script" } }];
	return told.includes("Choose A or B") ? [{ tool: "choose", params: { option: kind ? "A" : "B", reason: "script" } }] : [];
}

/** A01 and A02 cooperate (put in 8, choose A), A03 and A04 do not (put in 2, choose B); everyone offers 4 and accepts 3 or more. */
export const player = scriptedDriver((turn) => {
	const resident = turn.actor.slice(turn.actor.indexOf(":") + 1);
	const told = turn.inputs.map((note) => note.text).join("\n");
	const kind = ["A01", "A02"].includes(resident);
	if (told.includes("Retro after game") || told.includes("Before game 1")) return [{ tool: "writeBrain", params: { text: `${resident}: ${kind ? "share fairly and reward those who share" : "keep what I can"}.` } }];
	return decisionOf(kind, told);
});

/**
 * The game as the carried test plays it: roster order.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: EconLabOptions = {}) {
	const game = econLabGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The input lines of every opened activation, as JSON, with the resident's name. */
export const shown = (events: readonly Logged[]): readonly { readonly resident: string; readonly inputs: unknown }[] =>
	ofType(events, "activation_opened").map((event) => ({ resident: String(field(event, "actor")).replace(/^resident:/, ""), inputs: field(event, "inputs") }));

/**
 * The game of one param set of the family, as `resolveGame` builds it. A stand-in: `play` and `runOracle` of the
 * testkit take a game, not yet a family with its overrides.
 *
 * @param overrides - The overrides of the params: an arm of an experiment.
 * @returns The game of the arm.
 */
export function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(econLabFamily, overrides);
	expect(issues).toEqual([]);
	return econLabFamily.build(Value.Parse(econLabFamily.params, params));
}

/**
 * Plays a game from the inputs of an oracle file, as `runOracle` does, and gives the new log. A stand-in:
 * `runOracle` returns the mismatches only.
 *
 * @param oracle - The oracle file.
 * @param game - The game of its variant.
 * @returns Every event of the run.
 */
export async function replay(oracle: Oracle, game: Game): Promise<Played["events"]> {
	const script = new Map<string, PlannedCall[][]>();
	for (const entry of oracle.timeline) {
		if (entry.k === "turn") script.set(entry.resident, [...(script.get(entry.resident) ?? []), []]);
		if (entry.k === "call") script.get(entry.actor.slice(entry.actor.indexOf(":") + 1))?.at(-1)?.push({ tool: entry.tool, params: entry.params });
	}
	const turns = new Map<string, number>();
	const plan: Plan = (activation) => {
		const resident = activation.actor.slice(activation.actor.indexOf(":") + 1);
		const turn = turns.get(resident) ?? 0;
		turns.set(resident, turn + 1);
		return script.get(resident)?.[turn] ?? [];
	};
	// The model of a recorded run owed an answer after every turn with a call: the replay of a live run is pending then.
	const live = oracle.source.kind === "live-replay";
	const ticks = oracle.truncated === undefined ? oracle.setup.minutes : oracle.truncated.afterMinute + 1;
	const played = await play(game, {
		seed: oracle.seed,
		ticks,
		drivers: {
			resident: async (activation) => {
				const calls = await plan(activation);
				for (const call of calls) await activation.call(call.tool, call.params);
				return { pending: live && calls.length > 0 };
			},
		},
	});
	return played.events;
}

/**
 * The metrics of a run as a table reads them: every metric of every mechanic of the game, computed from that
 * mechanic's own events.
 *
 * @param game - The game that was played.
 * @param events - Every event of the run.
 * @returns `<mechanic id>.<metric id>` to the number, or `"absent"`.
 */
export const metricsOf = (game: Game, events: readonly Logged[]): Readonly<Record<string, number | "absent">> =>
	Object.fromEntries(game.mechanics.flatMap(({ mechanic }) => mechanic.head.metrics.map((metric) => [`${mechanic.id}.${metric.id}`, metric.compute(events.filter((event) => event.source === mechanic.source)) ?? "absent"])));
