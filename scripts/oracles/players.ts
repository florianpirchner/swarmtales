/**
 * Hand-written players for the scripted oracles. Each decides from its turn's inputs and the answers of its own
 * calls only (what a model would read), so a run depends on nothing but the story and the seed.
 */
import type { TurnTaker } from "@swarmtales/contracts";
import { countFor, minimalRaise, type Rules } from "../../mechanics/liars-dice/src/model.ts";
import { withProbes } from "./probes.ts";
import { CELLS, CELLS_4X4, ticTacToePlayer } from "../../test/stories/tictactoe-support.ts";

const WILD: Rules = { faces: 6, wildOnes: true };

/** Tic-tac-toe 3x3: game 1 X wins the top row, game 2 is a draw, game 3 O wins the middle row; one refused brain (a replay of moves). */
export const tictactoe = (): TurnTaker => ticTacToePlayer(CELLS, 3);

/** Tic-tac-toe 4x4: game 1 X wins the top row, game 2 O wins the left column, game 3 fills the board. */
export const tictactoe4x4 = (): TurnTaker => ticTacToePlayer(CELLS_4X4, 4);

const told = (turn: Parameters<TurnTaker>[0]): string => turn.inputs.map((note) => note.text).join("\n");
const isRetro = (text: string): boolean => text.includes("Retro after game") || text.includes("Before game 1");

/**
 * Liar's dice (the player of `test/stories/liars-dice.test.ts`): A01 calls liar on every bid it faces, A02 bids one more
 * die on its most common face with a public remark, A03 makes the smallest raise, A04 calls once a bid names more
 * than half the table. A seat that keeps a brain writes one line when asked.
 */
export const liarsDice = (): TurnTaker => async (turn) => {
	const text = told(turn);
	if (isRetro(text)) {
		await turn.call("writeBrain", { text: `${turn.resident}: call high bids, bid my own dice.` });
		return;
	}
	const line = /Your turn \(round \d+\)\. Your dice: ([\d ]+)\. Dice on the table: (\d+)\. The standing bid: ([^.]+)\./.exec(text);
	if (line === null) return;
	const dice = (line[1] ?? "").split(" ").map(Number);
	const total = Number(line[2]);
	const standing = /^(\d+) x (\d+) by/.exec(line[3] ?? "");
	const prev = standing === null ? undefined : { quantity: Number(standing[1]), face: Number(standing[2]) };
	const minimal = minimalRaise(prev, total, WILD);
	if (prev !== undefined && (turn.resident === "A01" || minimal === undefined || (turn.resident === "A04" && prev.quantity > total / 2))) {
		await turn.call("liar", { reason: `script ${turn.resident}` });
		return;
	}
	if (turn.resident === "A02") {
		const face = [2, 3, 4, 5, 6].reduce((best, next) => (countFor(dice, next, WILD) > countFor(dice, best, WILD) ? next : best), 2);
		const quantity = prev === undefined ? 1 : face > prev.face ? prev.quantity : prev.quantity + 1;
		if (quantity <= total) {
			await turn.call("bid", { quantity, face, say: `I have plenty of ${String(face)}s`, reason: "my most common face" });
			return;
		}
	}
	if (minimal === undefined) return;
	await turn.call("bid", { ...minimal, reason: `script ${turn.resident}` });
};

/**
 * Hold'em (the player of `test/stories/holdem.test.ts`): A01 bets and raises whenever it may, A02 calls everything, A03
 * never puts a chip in voluntarily, A04 plays a pair or an ace and folds the rest.
 */
export const holdem = (): TurnTaker => async (turn) => {
	const text = told(turn);
	if (isRetro(text)) {
		await turn.call("writeBrain", { text: `${turn.resident}: play the hands my rule says, from any position.` });
		return;
	}
	if (!text.includes("Your turn (")) return;
	const view = await turn.call("viewTable", {});
	if (!view.ok) return;
	const cards = /Your cards: (\S\S) (\S\S)/.exec(view.reply);
	const facing = !/\b0 to call/.test(view.reply);
	const canRaise = /You may [^.]*(bet|raise)/.test(view.reply);
	const strong = cards !== null && (cards[1]?.[0] === cards[2]?.[0] || cards[1]?.[0] === "A" || cards[2]?.[0] === "A");
	const action = turn.resident === "A01" ? (canRaise ? "raise" : "call") : turn.resident === "A02" ? "call" : turn.resident === "A03" ? (facing ? "fold" : "check") : strong ? "call" : facing ? "fold" : "check";
	await turn.call("act", { action, reason: `script ${turn.resident}` });
};

/** Blind bid (the player of `test/stories/blind-bid.test.ts`): A01 bids its value or estimate, A02 half of it, A03 its value plus 5, A04 always passes; each capped by the coins left. */
export const blindBid = (): TurnTaker => async (turn) => {
	const text = told(turn);
	if (isRetro(text)) {
		await turn.call("writeBrain", { text: `${turn.resident}: bid below the estimate on shared-worth lots.` });
		return;
	}
	const own = /your (?:private value is|estimate of the worth is) (-?\d+)/.exec(text)?.[1];
	const coins = /You have (\d+) coins/.exec(text)?.[1];
	if (own === undefined || coins === undefined) return;
	const value = Number(own);
	const wanted = turn.resident === "A01" ? value : turn.resident === "A02" ? Math.floor(value / 2) : turn.resident === "A03" ? value + 5 : 0;
	await turn.call("bid", { amount: Math.max(0, Math.min(Number(coins), wanted)), reason: "script" });
};

/** Liar's dice with refusals: a bid on ones, a bid that does not beat the standing one, a bid out of turn, a bid without a face. */
export const liarsDiceProbed = (): TurnTaker =>
	withProbes(liarsDice(), [
		{ resident: "A03", when: "Your turn (round 1)", tool: "bid", params: { quantity: 2, face: 1, reason: "probe: ones are wild" } },
		{ resident: "A02", when: "Your turn (round 2)", tool: "bid", params: { quantity: 1, face: 2, reason: "probe: does not beat" } },
		{ resident: "A01", when: "bids", tool: "liar", params: { reason: "probe: maybe out of turn" } },
		{ resident: "A02", when: "Your turn (round 3)", tool: "bid", params: { quantity: 3 } },
	]);

/** Hold'em with refusals: an action on a seat's first turn (out of turn unless it is to act), an action the table does not know, an action without a name. */
export const holdemProbed = (): TurnTaker =>
	withProbes(holdem(), [
		{ resident: "A02", when: "", tool: "act", params: { action: "raise", reason: "probe: first turn" } },
		{ resident: "A03", when: "Your turn (", tool: "act", params: { action: "dance", reason: "probe: unknown action" } },
		{ resident: "A04", when: "Your turn (", tool: "act", params: { reason: "probe: no action" } },
	]);

/** Blind bid with refusals: a bid above the coins a seat has, a negative bid, a bid on a seat's first turn. */
export const blindBidProbed = (): TurnTaker =>
	withProbes(blindBid(), [
		{ resident: "A01", when: "You have", tool: "bid", params: { amount: 100000, reason: "probe: more than I have" } },
		{ resident: "A02", when: "You have", tool: "bid", params: { amount: -5, reason: "probe: negative" } },
		{ resident: "A04", when: "", tool: "bid", params: { amount: 1, reason: "probe: first turn" } },
	]);
