// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of the game: the params behind each old variant name, the scripted seat of the old
 * `test/mechanics/trick-play/support.ts` (`trickPlayer`, carried with its notes branch) and the readers of the log.
 */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { familyParams } from "@swarmtales/sdk";
import { Value } from "typebox/value";
import { expect } from "vitest";
import { emberTricksFamily, emberTricksGame, type EmberTricksOptions } from "../game.ts";

/** The ids this platform renamed (M6-06), from the id the oracle files hold to the id here: the option `renamed` of `runOracle`. */
export const RENAMED = { "trick-play": "ember-tricks" } as const;

type Turn = Parameters<ActorDriver>[0];

/**
 * Every variant name of the old registry that an oracle file or the old runs index uses, and the params that give it.
 * The old registry parsed `ember-tricks[-nobrain][-sum|-calib|-mcretro|-mcbid][-g<games>][-r<rounds>]`; the names are
 * not carried, `carried.test.ts` pins this table against the old parser.
 */
export const VARIANTS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
	"ember-tricks": {},
	"ember-tricks-g1": { games: 1 },
	"ember-tricks-g4": { games: 4 },
	"ember-tricks-g2-r4": { games: 2, rounds: 4 },
	"ember-tricks-nobrain": { brain: false },
	"ember-tricks-nobrain-g1": { brain: false, games: 1 },
	"ember-tricks-nobrain-g4": { brain: false, games: 4 },
	"ember-tricks-sum-g4": { lever: "bidSum", games: 4 },
	"ember-tricks-calib-g4": { lever: "calibration", games: 4 },
	"ember-tricks-mcretro-g4": { lever: "mcRetro", games: 4 },
	"ember-tricks-mcbid-g4": { lever: "mcBid", games: 4 },
};

/**
 * The game of one param set of the family, as `resolveGame` builds it.
 *
 * @param overrides - The overrides of the params: an arm of an experiment.
 * @returns The game of the arm.
 */
export function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(emberTricksFamily, overrides);
	expect(issues).toEqual([]);
	return emberTricksFamily.build(Value.Parse(emberTricksFamily.params, params));
}

/**
 * The game as the carried test plays it: three rounds a game and the turn order `roster`, as the old test set it.
 *
 * @param options - The variant.
 * @returns The game.
 */
export function rosterGame(options: EmberTricksOptions = {}) {
	const game = emberTricksGame({ rounds: [1, 2, 3], ...options });
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/** What the scripted player does beside following the table. */
export interface ScriptOptions {
	/** The bid for a hand of `cards` cards (default: one in four, rounded down). */
	readonly bid?: (cards: number, resident: string) => number;
	/** Notes written in a retro window (none: no notes). */
	readonly notes?: (resident: string, game: number) => string;
}

/** The notes a seat writes after a game. */
export const notes = (resident: string, game: number): string => `${resident} after game ${String(game)}: bid one trick per ace-high card, name the suit I hold most of as trump, keep the veto for a long suit lead.`;

async function viewTable(turn: Turn): Promise<string> {
	const view = await turn.call("viewTable", {});
	return view.ok ? view.reply : "";
}

// The one call the table asks for: a bid, the trump (the first suit of the hand) or the first legal card.
interface Call {
	readonly tool: string;
	readonly params: Record<string, string | number>;
}

function bidOf(status: string, seat: string, script: ScriptOptions): Call | undefined {
	const bid = /placeBid with 0 to (\d+)/.exec(status)?.[1];
	return bid === undefined ? undefined : { tool: "placeBid", params: { tricks: script.bid?.(Number(bid), seat) ?? Math.floor(Number(bid) / 4) } };
}

function choose(status: string, seat: string, script: ScriptOptions): Call | undefined {
	const bid = bidOf(status, seat, script);
	if (bid !== undefined) return bid;
	if (status.includes("name the trump")) return { tool: "nameTrump", params: { suit: /Your hand: (\w+):/.exec(status)?.[1] ?? "Ash" } };
	const legal = /Legal now: ([^.]+)\./.exec(status)?.[1]?.split(", ")[0];
	return legal === undefined ? undefined : { tool: "playCard", params: { card: legal } };
}

async function act(turn: Turn, status: string, script: ScriptOptions): Promise<void> {
	const call = choose(status, nameOf(turn.actor), script);
	if (call !== undefined) await turn.call(call.tool, call.params);
}

/**
 * The reference player of the old tests: in a retro window it writes its notes; otherwise it reads its turn's table
 * (or `viewTable`), bids, names the first suit of its hand and plays the first legal card.
 *
 * @param script - The bids and the notes.
 * @returns The driver of every seat.
 */
export function trickPlayer(script: ScriptOptions = {}): ActorDriver {
	return async (turn) => {
		const told = turn.inputs.map((note) => note.text).join("\n");
		if (script.notes !== undefined && (told.includes("Retro after game") || told.includes("Before game 1"))) {
			await turn.call("writeBrain", { text: script.notes(nameOf(turn.actor), Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0)) });
			return;
		}
		await act(turn, told.includes("Your turn") || told.includes("lowest bid") ? told : await viewTable(turn), script);
	};
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);

/** One field of the payload of an event, untyped. */
export function field(event: { readonly payload?: unknown }, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** How many calls of each tool were carried out, by the tool's bare name. */
export function accepted(events: readonly Envelope[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const name of ofType(events, "tool_result").map((event) => event.tool?.split("/").at(-1) ?? "")) counts[name] = (counts[name] ?? 0) + 1;
	return counts;
}
