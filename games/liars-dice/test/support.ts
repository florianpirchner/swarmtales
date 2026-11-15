// SPDX-License-Identifier: Apache-2.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the scripted seat of the old
 * `test/stories/liars-dice.test.ts` (`player`, with its brain part) and the readers of the log.
 */
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import { countFor, minimalRaise, type Rules } from "@swarmtales/mechanic-liars-dice/rules";
import type { OracleCall, Played } from "@swarmtales/testkit";
import { liarsDiceGame, type LiarsDiceOptions } from "../game.ts";

type Logged = Played["events"][number];

const WILD: Rules = { faces: 6, wildOnes: true };

/**
 * The options behind every variant name that an oracle file, the old registry or an old runs index uses. The old
 * parser read `liars-dice[-hu|-<N>p][-nobrain][-quiet][-g<games>][-d<dice>]`; the name grammar is not carried.
 */
export const VARIANTS: Readonly<Record<string, LiarsDiceOptions>> = {
	"liars-dice": {},
	"liars-dice-nobrain": { brain: false },
	"liars-dice-quiet": { talk: false },
	"liars-dice-g1": { games: 1 },
	"liars-dice-hu-quiet-g2-d5": { seats: 2, talk: false, games: 2, dice: 5 },
};

/**
 * The game as the carried test plays it: roster order.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: LiarsDiceOptions = {}) {
	const game = liarsDiceGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

// A02's bid: one more die on its most common face, or undefined when that does not fit on the table.
function commonFace(dice: readonly number[], prev: { readonly quantity: number; readonly face: number } | undefined, total: number) {
	const face = [2, 3, 4, 5, 6].reduce((best, next) => (countFor(dice, next, WILD) > countFor(dice, best, WILD) ? next : best), 2);
	const quantity = prev === undefined ? 1 : face > prev.face ? prev.quantity : prev.quantity + 1;
	return quantity <= total ? { quantity, face } : undefined;
}

// What a seat is told on its turn: its dice, the dice on the table and the standing bid.
function turnOf(told: string) {
	const line = /Your turn \(round \d+\)\. Your dice: ([\d ]+)\. Dice on the table: (\d+)\. The standing bid: ([^.]+)\./.exec(told);
	if (line === null) return undefined;
	const standing = /^(\d+) x (\d+) by/.exec(line[3] ?? "");
	return { dice: (line[1] ?? "").split(" ").map(Number), total: Number(line[2]), prev: standing === null ? undefined : { quantity: Number(standing[1]), face: Number(standing[2]) } };
}

// The decision of a seat on its turn: a call, a bid, or nothing.
function moveOf(resident: string, { dice, total, prev }: NonNullable<ReturnType<typeof turnOf>>): { readonly tool: string; readonly params: object } | undefined {
	const minimal = minimalRaise(prev, total, WILD);
	if (prev !== undefined && (resident === "A01" || minimal === undefined || (resident === "A04" && prev.quantity > total / 2))) return { tool: "liar", params: { reason: `script ${resident}` } };
	const common = resident === "A02" ? commonFace(dice, prev, total) : undefined;
	if (common !== undefined) return { tool: "bid", params: { ...common, say: `I have plenty of ${String(common.face)}s`, reason: "my most common face" } };
	return minimal === undefined ? undefined : { tool: "bid", params: { ...minimal, reason: `script ${resident}` } };
}

/**
 * A01 calls liar on every bid it faces, A02 bids one more die on its most common face with a public remark,
 * A03 makes the smallest raise, A04 calls once a bid names more than half the table; in a retro window every seat
 * writes its brain. Stateless: it reads its turn line.
 */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${resident}: call high bids, bid my own dice.` });
		return;
	}
	const seen = turnOf(told);
	const move = seen === undefined ? undefined : moveOf(resident, seen);
	if (move !== undefined) await turn.call(move.tool, move.params);
};

const ENDS_TURN = /end your turn now/i;
/**
 * The calls that ended their turn, for `withEndsTurn` of the testkit: every accepted call whose reply tells the caller
 * to end its turn. No file of `oracles/` holds the flag (see `oracle.test.ts`).
 */
export const endsTurn = (call: OracleCall): boolean => ENDS_TURN.test(call.reply ?? "");

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
