// SPDX-License-Identifier: Apache-2.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the scripted seat of the old
 * `test/stories/holdem.test.ts` (`player`, with its brain part) and the readers of the log.
 */
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import type { Played } from "@swarmtales/testkit";
import { holdemGame, type HoldemOptions } from "../game.ts";

type Logged = Played["events"][number];

/**
 * The options behind every variant name of the old registry without a mixed table or the aid (those follow with
 * M4-40). The old registry listed fixed entries named by `storyName` of `stories/holdem/story.ts`; the names are not
 * carried.
 */
export const VARIANTS: Readonly<Record<string, HoldemOptions>> = {
	holdem: {},
	"holdem-nobrain": { brain: false },
	"holdem-hu": { seats: 2 },
	"holdem-hu-nobrain": { seats: 2, brain: false },
};

/**
 * The game as the carried test plays it: roster order and few equity draws.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: HoldemOptions = {}) {
	const game = holdemGame({ equitySamples: 20, ...options });
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

// A pair or an ace in the hole.
function strongHand(table: string): boolean {
	const ranks = (/Your cards: (\S)\S (\S)\S/.exec(table) ?? []).slice(1);
	return ranks.length === 2 && (ranks[0] === ranks[1] || ranks.includes("A"));
}

// The scripted rule of each seat, read from its view of the table.
function actionOf(resident: string, table: string): string {
	const facing = !/\b0 to call/.test(table);
	if (resident === "A01") return /You may [^.]*(bet|raise)/.test(table) ? "raise" : "call";
	if (resident === "A02") return "call";
	if (resident !== "A03" && strongHand(table)) return "call";
	return facing ? "fold" : "check";
}

/**
 * A01 bets and raises whenever it may, A02 calls everything, A03 never puts a chip in voluntarily (checks or
 * folds), A04 plays a pair or an ace and folds the rest; in a retro window every seat writes its brain. Stateless:
 * it reads the table on every turn.
 */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${resident}: play the hands my rule says, from any position.` });
		return;
	}
	if (!told.includes("Your turn (")) return;
	const view = await turn.call("viewTable", {});
	if (view.ok) await turn.call("act", { action: actionOf(resident, view.reply), reason: `script ${resident}` });
};

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
