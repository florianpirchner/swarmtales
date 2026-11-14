/**
 * Hand-written players for the scripted oracles. Each decides from its turn's inputs and the answers of its own
 * calls only (what a model would read), so a run depends on nothing but the story and the seed.
 */
import type { TurnTaker } from "@swarmtales/contracts";
import { countFor, minimalRaise, type Rules } from "../../mechanics/liars-dice/src/model.ts";
import { withProbes } from "./probes.ts";
import { CELLS, CELLS_4X4, ticTacToePlayer } from "../../test/stories/tictactoe-support.ts";

export { chessBlunders, chessCap, chessTeams } from "./chess-players.ts";

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

/** Nobody acts: the timers of the game play for every seat (forfeits, missed bids, default moves) until the match ends. */
export const silent = (): TurnTaker => () => Promise.resolve();

const LANE: Readonly<Record<string, string>> = { A01: "amber", A02: "basalt", A03: "cobalt", A04: "jade" };

/** Quarry (the player of `test/stories/quarry.test.ts`): each seat drafts its own lane (A01 amber, A02 basalt, A03 cobalt, A04 jade), then lodestones, then the first card; A01 burns a lodestone when burns are left. */
export const quarry = (): TurnTaker => async (turn) => {
	const text = told(turn);
	if (isRetro(text)) {
		await turn.call("writeBrain", { text: `${turn.resident}: draft ${LANE[turn.resident] ?? "amber"} and take lodestones.` });
		return;
	}
	const pack = /Your pack: ([^.]+)\./.exec(text)?.[1];
	if (pack === undefined) return;
	const cards = pack.split(", ").map((entry) => {
		const [id = "", kind = ""] = entry.split(" ");
		return { id, kind };
	});
	const choice = cards.find((card) => card.kind === LANE[turn.resident]) ?? cards.find((card) => card.kind === "lodestone") ?? cards[0];
	if (choice === undefined) return;
	const wild = cards.find((card) => card.kind === "lodestone" && card.id !== choice.id);
	const burn = turn.resident === "A01" && wild !== undefined && !text.includes("Burns left: 1") && !text.includes("Burns left: 0") ? { burn: wild.id } : {};
	await turn.call("pick", { card: choice.id, reason: "script", ...burn });
};

/** Econ lab (the player of `test/stories/econ-lab.test.ts`): A01 and A02 cooperate (put in 8, choose A), A03 and A04 do not (put in 2, choose B); everyone offers 4 and accepts 3 or more. */
export const econLab = (): TurnTaker => async (turn) => {
	const text = told(turn);
	const kind = ["A01", "A02"].includes(turn.resident);
	if (isRetro(text)) {
		await turn.call("writeBrain", { text: `${turn.resident}: ${kind ? "share fairly and reward those who share" : "keep what I can"}.` });
		return;
	}
	if (text.includes("how many of your")) await turn.call("contribute", { amount: kind ? 8 : 2, reason: "script" });
	else if (text.includes("you are the proposer")) await turn.call("offer", { amount: 4, reason: "script" });
	else {
		const offer = /offers you (\d+) points/.exec(text)?.[1];
		if (offer !== undefined) await turn.call("respond", { accept: Number(offer) >= 3, reason: "script" });
		else if (text.includes("Choose A or B")) await turn.call("choose", { option: kind ? "A" : "B", reason: "script" });
	}
};

const LONG_BRAIN = Array.from({ length: 501 }, (_, index) => `word${String(index + 1)}`).join(" ");

/**
 * Tic-tac-toe with the refusals of every tool: a proposal by a member who is not the captain and by the team that
 * waits, a vote with nothing to vote on, a vote of the captain, a move before the team agreed, a move other than the
 * agreed one, a second vote, a proposal off the board, on a taken cell and without a cell, a brain by a member who
 * is not the retro captain, an empty and a too long brain, a fourth team post, a tool nobody has.
 */
export const tictactoeProbed = (): TurnTaker =>
	withProbes(ticTacToePlayer(CELLS, 3), [
		{ resident: "A06", when: "Before game 1", tool: "writeBrain", params: { text: "probe: I am not the retro captain" } },
		{ resident: "A04", when: "You are the retro captain", tool: "writeBrain", params: { text: "" } },
		{ resident: "A04", when: "You are the retro captain", tool: "writeBrain", params: { text: LONG_BRAIN } },
		{ resident: "A04", when: "You are the retro captain", tool: "writeBrain", params: {} },
		{ resident: "A02", when: "Game 1 begins", tool: "proposeMove", params: { cell: 4, reason: "probe: I am not the captain" } },
		{ resident: "A02", when: "Game 1 begins", tool: "castVote", params: { agree: true, reason: "probe: nothing is proposed" } },
		{ resident: "A02", when: "Game 1 begins", tool: "readBrain", params: {} },
		{ resident: "A02", when: "Game 1 begins", tool: "noSuchTool", params: {} },
		{ resident: "A05", when: "Game 1 begins", tool: "proposeMove", params: { cell: 4, reason: "probe: my team is not on move" } },
		{ resident: "A05", when: "Game 1 begins", tool: "castVote", params: { agree: true, reason: "probe: my team is not on move" } },
		{ resident: "A05", when: "Game 1 begins", tool: "playMove", params: { cell: 4 } },
		{ resident: "A06", when: "Game 1 begins", tool: "postTeam", params: { text: "probe: post 1" } },
		{ resident: "A06", when: "Game 1 begins", tool: "postTeam", params: { text: "probe: post 2" } },
		{ resident: "A06", when: "Game 1 begins", tool: "postTeam", params: { text: "probe: post 3" } },
		{ resident: "A06", when: "Game 1 begins", tool: "postTeam", params: { text: "probe: post 4" } },
		{ resident: "A06", when: "Game 1 begins", tool: "readTeam", params: {} },
		{ resident: "A04", when: "Game 1 begins", tool: "proposeMove", params: { cell: 4, reason: "probe: the other side is on move" } },
		{ resident: "A01", when: "you are its captain", tool: "castVote", params: { agree: true, reason: "probe: the captain votes" } },
		{ resident: "A01", when: "you are its captain", tool: "playMove", params: { cell: 0 } },
		{ resident: "A03", when: "proposes the move", tool: "castVote", params: { agree: true, reason: "probe: my first vote" } },
		{ resident: "A04", when: "you are its captain", tool: "proposeMove", params: { cell: 0, reason: "probe: a taken cell" } },
		{ resident: "A04", when: "you are its captain", tool: "proposeMove", params: { cell: 99, reason: "probe: off the board" } },
		{ resident: "A04", when: "you are its captain", tool: "proposeMove", params: {} },
		{ resident: "A02", when: "Your team agreed on", tool: "playMove", params: { cell: 8 } },
		{ resident: "A02", when: "Your team agreed on", tool: "proposeMove", params: { cell: 8, reason: "probe: after the team agreed" } },
	]);

/**
 * Liar's dice with further refusals and the two tools the plain script never calls: a look at the table and at the
 * brain, a bid above the dice on the table, a bid on a face a die does not have, a call with no bid standing, a
 * second action in one turn, a brain outside a retro.
 */
export const liarsDiceProbedMore = (): TurnTaker =>
	withProbes(liarsDice(), [
		{ resident: "A01", when: "Your turn (round 1)", tool: "viewTable", params: {} },
		{ resident: "A01", when: "Your turn (round 1)", tool: "readBrain", params: {} },
		{ resident: "A01", when: "Your turn (round 1)", tool: "liar", params: { reason: "probe: no bid stands" } },
		{ resident: "A01", when: "Your turn (round 1)", tool: "bid", params: { quantity: 17, face: 2, reason: "probe: more than the table holds" } },
		{ resident: "A01", when: "Your turn (round 1)", tool: "bid", params: { quantity: 1, face: 7, reason: "probe: no such face" } },
		{ resident: "A01", when: "Your turn (round 1)", tool: "bid", params: { quantity: 0, face: 2, reason: "probe: nothing" } },
		{ resident: "A01", when: "Your turn (round 1)", tool: "writeBrain", params: { text: "probe: no retro is open" } },
		{ resident: "A01", when: "Your turn (round 1)", tool: "bid", params: { quantity: 1, face: 3, reason: "probe: a second action" }, after: true },
		{ resident: "A02", when: "Your turn (round 1)", tool: "viewTable", params: {}, after: true },
		{ resident: "A03", when: "Game 1 of", tool: "viewTable", params: {} },
		{ resident: "A03", when: "Game 1 of", tool: "noSuchTool", params: {} },
	]);

/** The ids of the cards in the pack a turn shows, in the order shown. */
const firstCards = (text: string): string[] => (/Your pack: ([^.]+)\./.exec(text)?.[1] ?? "").split(", ").map((entry) => entry.split(" ")[0] ?? "");

/**
 * Quarry with free burns and the refusals of `pick`: a card that is not in the pack, a burn of the kept card, a burn
 * that is not in the pack, a pick without a card, a second pick in one round, a pick before the first game, a third
 * burn in a game, and a look at the table and the brain.
 */
export const quarryProbed = (): TurnTaker =>
	withProbes(quarry(), [
		{ resident: "A03", when: "Before game 1", tool: "pick", params: { card: "A1", reason: "probe: no game yet" } },
		{ resident: "A03", when: "Before game 1", tool: "viewTable", params: {} },
		{ resident: "A03", when: "Before game 1", tool: "readBrain", params: {} },
		{ resident: "A02", when: "Your pack:", tool: "pick", params: { card: "Z9", reason: "probe: not a card" } },
		{ resident: "A02", when: "Your pack:", tool: "pick", params: { reason: "probe: no card" } },
		{ resident: "A03", when: "Your pack:", tool: "viewTable", params: {} },
		{ resident: "A03", when: "Your pack:", tool: "pick", params: { card: "A1", reason: "probe: a second pick" }, after: true },
		{ resident: "A04", when: "Your pack:", tool: "pick", paramsFrom: (text: string) => ({ card: firstCards(text)[0], burn: firstCards(text)[0], reason: "probe: burn the kept card" }) },
		{ resident: "A04", when: "Your pack:", tool: "pick", paramsFrom: (text: string) => ({ card: firstCards(text)[0], burn: "Z9", reason: "probe: burn a card I do not hold" }) },
		{ resident: "A04", when: "Game 2 begins", tool: "writeBrain", params: { text: "probe: no retro is open" } },
		{ resident: "A01", when: "Burns left: 1", tool: "pick", paramsFrom: (text: string) => ({ card: firstCards(text)[0], burn: firstCards(text)[1], reason: "probe: my last burn" }) },
		{ resident: "A01", when: "Burns left: 0", tool: "pick", paramsFrom: (text: string) => ({ card: firstCards(text)[0], burn: firstCards(text)[1], reason: "probe: no burn left" }) },
	]);

/**
 * Econ lab with the refusals of its four decisions: an amount above the range and below it, the wrong decision for
 * the round, a decision that is not the caller's, a second decision, a decision without a value, a decision before
 * the first game, and a look at the table and the brain.
 */
export const econLabProbed = (): TurnTaker =>
	withProbes(econLab(), [
		{ resident: "A03", when: "Before game 1", tool: "contribute", params: { amount: 1, reason: "probe: no round yet" } },
		{ resident: "A03", when: "Before game 1", tool: "viewTable", params: {} },
		{ resident: "A03", when: "Before game 1", tool: "readBrain", params: {} },
		{ resident: "A01", when: "you are the proposer", tool: "offer", params: { amount: 1000, reason: "probe: above the range" } },
		{ resident: "A01", when: "you are the proposer", tool: "offer", params: { amount: -1, reason: "probe: below the range" } },
		{ resident: "A02", when: "you are the proposer", tool: "offer", params: { reason: "probe: no amount" } },
		{ resident: "A02", when: "you are the proposer", tool: "respond", params: { accept: true, reason: "probe: not my decision" } },
		{ resident: "A03", when: "you are the proposer", tool: "contribute", params: { amount: 1, reason: "probe: the wrong decision" } },
		{ resident: "A03", when: "you are the proposer", tool: "viewTable", params: {} },
		{ resident: "A04", when: "you are the proposer", tool: "offer", params: { amount: 5, reason: "probe: a second offer" }, after: true },
		{ resident: "A02", when: "how many of your", tool: "contribute", params: { amount: 1000, reason: "probe: above the range" } },
		{ resident: "A03", when: "how many of your", tool: "choose", params: { option: "A", reason: "probe: the wrong decision" } },
		{ resident: "A04", when: "how many of your", tool: "contribute", params: { amount: 3, reason: "probe: a second decision" }, after: true },
		{ resident: "A04", when: "Choose A or B", tool: "choose", params: { option: "C", reason: "probe: no such option" } },
		{ resident: "A01", when: "Choose A or B", tool: "offer", params: { amount: 3, reason: "probe: the wrong decision" } },
		{ resident: "A02", when: "Choose A or B", tool: "writeBrain", params: { text: "probe: no retro is open" } },
	]);

const FOOLS_MATE: Readonly<Record<string, readonly string[]>> = { White: ["f3", "g4"], Black: ["e5", "Qh4"] };

/**
 * Chess to a mate in every game: White plays f3 and g4, Black e5 and Qh4 mate. A seat learns its colour from the
 * game's first line and tries its next move on every turn it gets. Added: a second move in a row, an
 * illegal and an unreadable move, a move without arguments, a look at the board and the brain.
 */
export const chessMates = (): TurnTaker => {
	const plans = new Map<string, string[]>();
	const play: TurnTaker = async (turn) => {
		const text = told(turn);
		if (isRetro(text)) {
			await turn.call("writeBrain", { text: `${turn.resident}: with White open the king's side, with Black punish it.` });
			return;
		}
		const colour = /Game \d+ of \d+: you play (White|Black)/.exec(text)?.[1];
		if (colour !== undefined) plans.set(turn.resident, [...(FOOLS_MATE[colour] ?? [])]);
		const plan = plans.get(turn.resident);
		const move = plan?.[0];
		if (plan === undefined || move === undefined) return;
		const outcome = await turn.call("playMove", { move, reason: `script ${turn.resident}` });
		if (outcome.ok) plan.shift();
	};
	return withProbes(play, [
		{ resident: "A02", when: "Game 1 of", tool: "playMove", params: { move: "Qh4", reason: "probe: it is not my move" }, after: true },
		{ resident: "A02", when: "Game 1 of", tool: "viewBoard", params: {} },
		{ resident: "A01", when: "Game 1 of", tool: "playMove", params: { move: "Ke3", reason: "probe: not a legal move" } },
		{ resident: "A01", when: "Game 1 of", tool: "playMove", params: { move: "castle somewhere", reason: "probe: not a move" } },
		{ resident: "A01", when: "Game 1 of", tool: "playMove", params: {} },
		{ resident: "A01", when: "Game 1 of", tool: "readBrain", params: {} },
	]);
};

/**
 * Harbor Lights, a crew that misfires: in a retro window every seat posts one line to the crew chat and the retro
 * captain writes the brain; on its turn a seat plays its oldest slot blind, so the strikes of a game add up fast.
 */
export const harborMisfires = (): TurnTaker => async (turn) => {
	const text = told(turn);
	if (isRetro(text)) {
		await turn.call("postTeam", { text: `${turn.resident}: a signal means play that card now.` });
		if (text.includes("You are the retro captain")) await turn.call("writeBrain", { text: "A signal means: play that card now. Without a signal, play the oldest slot." });
		return;
	}
	if (!text.includes("Your turn: one action")) return;
	await turn.call("playSlot", { slot: 1 });
};
