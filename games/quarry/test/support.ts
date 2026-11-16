// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The scripted seat of the Quarry tests and their readers of the log. Carried from `test/stories/quarry.test.ts`
 * (`player`) and `test/stories/tictactoe-support.ts` (`field`, `ofType`).
 */
import { familyParams, type Game } from "@swarmtales/sdk";
import { play, scriptedDriver, type Oracle, type Plan, type Played, type PlannedCall } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { expect } from "vitest";
import { quarryGame, type QuarryOptions, quarryFamily } from "../game.ts";

/** The ids this platform renamed (M6-06), from the id the oracle files hold to the id here: the option `renamed` of `runOracle`. */
export const RENAMED = { "draft-rounds": "quarry" } as const;

type Logged = Played["events"][number];

const LANE: Readonly<Record<string, string>> = { A01: "amber", A02: "basalt", A03: "cobalt", A04: "jade" };

interface Seen {
	readonly id: string;
	readonly kind: string;
}

// The cards of the pack a text names (`Your pack: A3 amber, L1 lodestone.`).
function cardsOf(text: string): readonly Seen[] {
	const pack = /Your pack: ([^.]+)\./.exec(text)?.[1];
	if (pack === undefined) return [];
	return pack.split(", ").map((entry) => {
		const [id = "", kind = ""] = entry.split(" ");
		return { id, kind };
	});
}

/** The ids of the pack a text names. */
export const packOf = (text: string): string[] => cardsOf(text).map((card) => card.id);

// The pick of a seat: its lane, then a lodestone, then the first card; A01 also burns a lodestone once per game.
function pickOf(resident: string, told: string): readonly { readonly tool: string; readonly params: unknown }[] {
	const cards = cardsOf(told);
	const choice = cards.find((card) => card.kind === LANE[resident]) ?? cards.find((card) => card.kind === "lodestone") ?? cards[0];
	if (choice === undefined) return [];
	const wild = cards.find((card) => card.kind === "lodestone" && card.id !== choice.id);
	const burn = resident === "A01" && wild !== undefined && !told.includes("Burns left: 1") && !told.includes("Burns left: 0") ? { burn: wild.id } : {};
	return [{ tool: "pick", params: { card: choice.id, reason: "script", ...burn } }];
}

/** Each seat drafts its own lane (A01 amber, A02 basalt, ...), then lodestones, then the first card; A01 burns a lodestone once per game. */
export const player = scriptedDriver((turn) => {
	const resident = turn.actor.slice(turn.actor.indexOf(":") + 1);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) return [{ tool: "writeBrain", params: { text: `${resident}: draft ${LANE[resident] ?? "amber"} and take lodestones.` } }];
	return pickOf(resident, told);
});

/**
 * The game as the carried test plays it: roster order.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: QuarryOptions = {}) {
	const game = quarryGame(options);
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
	const { params, issues } = familyParams(quarryFamily, overrides);
	expect(issues).toEqual([]);
	return quarryFamily.build(Value.Parse(quarryFamily.params, params));
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
