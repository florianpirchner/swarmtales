// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the scripted bidders of the old
 * `test/stories/blind-bid.test.ts` (`player`, with its brain part) and the readers of the log.
 */
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import type { Played } from "@swarmtales/testkit";
import { blindBidGame, type BlindBidOptions } from "../game.ts";

type Logged = Played["events"][number];

/**
 * The options behind every variant name that an oracle file or the old registry's test uses. The old registry parsed
 * `blind-bid[-nobrain][-g<games>]` (`blindBidEntryByName` of `stories/blind-bid/story.ts`); the names are not carried.
 */
export const VARIANTS: Readonly<Record<string, BlindBidOptions>> = {
	"blind-bid": {},
	"blind-bid-nobrain": { brain: false },
	"blind-bid-g5": { games: 5 },
	"blind-bid-nobrain-g2": { brain: false, games: 2 },
};

/**
 * The game as the carried test plays it: the turn order `roster`, as the old test set it.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: BlindBidOptions = {}) {
	const game = blindBidGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/**
 * A01 bids its value or estimate, A02 half of it, A03 its value plus 5, A04 always passes; each capped by the coins
 * left. In a retro window every seat writes its brain.
 */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${resident}: bid below the estimate on shared-worth lots.` });
		return;
	}
	const own = /your (?:private value is|estimate of the worth is) (-?\d+)/.exec(told)?.[1];
	const coins = /You have (\d+) coins/.exec(told)?.[1];
	if (own === undefined || coins === undefined) return;
	const value = Number(own);
	const wanted = resident === "A01" ? value : resident === "A02" ? Math.floor(value / 2) : resident === "A03" ? value + 5 : 0;
	await turn.call("bid", { amount: Math.max(0, Math.min(Number(coins), wanted)), reason: "script" });
};

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
