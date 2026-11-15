// SPDX-License-Identifier: Apache-2.0
/**
 * The arms of the Harbor Lights tests, their scripted crew member and their readers of the log. The player is carried
 * from `test/mechanics/hint-towers/support.ts` (`towerPlayer`) of the old platform.
 */
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import { familyParams, type Game } from "@swarmtales/sdk";
import { play, type Oracle, type PlannedCall, type Played } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { expect } from "vitest";
import { SEATS } from "../briefing.ts";
import { harborLightsFamily } from "../game.ts";

type Logged = Played["events"][number];
type Turn = Parameters<ActorDriver>[0];

/**
 * Every variant name of the old registry that an oracle file or the old runs index uses, and the params that give it.
 * `harbor-lights-soft-strikes` of run 004 is not here: P178 retired it when soft strikes became the default, and the
 * old parser no longer takes it.
 */
export const VARIANTS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
	"harbor-lights": {},
	"harbor-lights-g1": { games: 1 },
	"harbor-lights-g2": { games: 2 },
	"harbor-lights-solo": { brain: "solo" },
	"harbor-lights-solo-g1": { brain: "solo", games: 1 },
	"harbor-lights-solo-g2": { brain: "solo", games: 2 },
	"harbor-lights-nobrain": { brain: "nobrain" },
	"harbor-lights-nobrain-g1": { brain: "nobrain", games: 1 },
	"harbor-lights-nobrain-aid-g1": { brain: "nobrain", aid: true, games: 1 },
	"harbor-lights-hard-strikes": { strikes: "hard" },
};

/**
 * The game of one param set of the family, as `resolveGame` builds it. A stand-in: `play` and `runOracle` of the
 * testkit take a game, not yet a family with its overrides.
 *
 * @param overrides - The overrides of the params: an arm of an experiment.
 * @returns The game of the arm.
 */
export function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(harborLightsFamily, overrides);
	expect(issues).toEqual([]);
	return harborLightsFamily.build(Value.Parse(harborLightsFamily.params, params));
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
	// The model of a recorded run owed an answer after every turn with a call: the replay of a live run is pending then.
	const live = oracle.source.kind === "live-replay";
	const resident: ActorDriver = async (activation) => {
		const name = nameOf(activation.actor);
		const turn = turns.get(name) ?? 0;
		turns.set(name, turn + 1);
		const calls = script.get(name)?.[turn] ?? [];
		for (const call of calls) await activation.call(call.tool, call.params);
		return { pending: live && calls.length > 0 };
	};
	const ticks = oracle.truncated === undefined ? oracle.setup.minutes : oracle.truncated.afterMinute + 1;
	return (await play(game, { seed: oracle.seed, ticks, drivers: { resident } })).events;
}

/**
 * The metrics of one mechanic of a run as a table reads them, each computed from that mechanic's own events.
 *
 * @param game - The game that was played.
 * @param id - The mechanic's id.
 * @param events - Every event of the run.
 * @returns The metric id to the number, or `"absent"`.
 */
export function metricsOf(game: Game, id: string, events: readonly Logged[]): Readonly<Record<string, number | "absent">> {
	const mechanic = game.mechanics.find((entry) => entry.mechanic.id === id)?.mechanic;
	const own = events.filter((event) => event.source === mechanic?.source);
	return Object.fromEntries((mechanic?.head.metrics ?? []).map((metric) => [metric.id, metric.compute(own) ?? "absent"]));
}

/** The private notes a seat writes after a game. */
export const notes = (resident: string, game: number): string => `${resident} after game ${String(game)}: the newest card a signal touches is playable; discard the oldest untouched slot.`;
const post = (resident: string): string => `${resident}: let us agree that a signal points at a playable card.`;
const shows = (turn: Turn, tool: string): boolean => turn.tools.some((spec) => spec.name === tool);

// In a retro window: a post where the chat is shown, and the notes where the brain can be written.
async function retro(turn: Turn, told: string, resident: string): Promise<void> {
	if (shows(turn, "postTeam")) await turn.call("postTeam", { text: post(resident) });
	if (shows(turn, "writeBrain")) await turn.call("writeBrain", { text: notes(resident, Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0)) });
}

// The next seat is told the rank of its first card, when a signal is left and it does not know that rank yet.
async function signalled(turn: Turn, told: string, resident: string): Promise<boolean> {
	const next = SEATS[(SEATS.findIndex((seat) => seat === resident) + 1) % SEATS.length];
	const rank = new RegExp(`  ${next}: 1 \\w+ (\\d+)`).exec(told)?.[1];
	if (!told.includes("giveSignal") || rank === undefined || !/Signals [1-9]/.test(told) || told.includes(`[knows ${rank}`)) return false;
	return (await turn.call("giveSignal", { to: next, about: rank })).ok;
}

/** The scripted crew member: plays a surely playable slot, else signals the next seat about its first card's rank, else discards slot 1, else plays it; in a retro it posts and writes its notes. */
export const player: ActorDriver = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	const resident = nameOf(turn.actor);
	if (told.includes("Retro after game") || told.includes("Before game 1")) return retro(turn, told, resident);
	if (!told.includes("Your turn: one action")) return;
	const sure = /slot (\d+)[^\n]*SURELY PLAYABLE/.exec(told)?.[1];
	if (sure !== undefined) {
		await turn.call("playSlot", { slot: Number(sure) });
		return;
	}
	if (await signalled(turn, told, resident)) return;
	if (!(await turn.call("discardSlot", { slot: 1 })).ok) await turn.call("playSlot", { slot: 1 });
};

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of the payload of an event or of an oracle entry, untyped. */
export function field(event: { readonly payload?: unknown }, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** How many calls of each tool were carried out, by the tool's bare name. */
export function accepted(events: readonly Logged[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const name of ofType(events, "tool_result").map((event) => event.tool?.split("/").at(-1) ?? "")) counts[name] = (counts[name] ?? 0) + 1;
	return counts;
}
