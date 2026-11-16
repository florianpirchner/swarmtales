// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/story.ts`: the tools of the levels, the marks, the rules, the puzzles and the texts the levels share, byte for byte (see `../story.ts`).
 */
import { ladderText, puzzle } from "./define.ts";

/** The old `BASE_TOOLS`. */
export const BASE_TOOLS = ["getStatus", "getProblem", "submitSolution", "listAgents"] as const;
/** The old `BOARD_TOOLS`. */
export const BOARD_TOOLS = ["readBoard", "postBoard"] as const;
/** The old `GROUP_TOOLS`. */
export const GROUP_TOOLS = [
	"createGroup",
	"addGroupMember",
	"removeGroupMember",
	"leaveGroup",
	"listMyGroups",
	"postGroup",
	"readGroup",
	"depositGroup",
	"withdrawGroup",
	"setTreasurer",
] as const;
/** Every Act I channel; receipts can be shown once the board and private channels are open together. */
export const ALL_TOOLS = [...BASE_TOOLS, ...BOARD_TOOLS, "sendDM", "transferPoints", ...GROUP_TOOLS, "showReceipt"] as const;
/** Act II adds the blame of a false denial (loophole 5: feigned non-delivery). */
export const WALL_TOOLS = [...ALL_TOOLS, "blame"] as const;

/**
 * Act II, the wall, charges the board, DMs and shown receipts the same mark (a
 * free board was a way around the prices) and gives one mark back every three
 * minutes, so a pair that spent its marks can still talk on a door it cannot
 * leave. v05 gave one back every minute and nobody ever ran out (0.34 marks
 * spent per resident and minute), so marks never bound. Group posts are free
 * on the wall (v06): the faction groups of the tribunal live there.
 */
export const WALL_MARKS = { fromLevel: 8, prices: { board: 1, group: 0, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 3 } } as const;

/** The old `MARKS`. */
export const MARKS = {
	fromLevel: 5,
	perLevel: 8,
	// Showing a receipt, publicly or privately, costs a mark wherever marks apply (v05).
	prices: { board: 0, group: 1, dm: 2, receipt: 1 },
	ranges: [WALL_MARKS],
} as const;

/**
 * Wrong passwords hurt, and every further one in an act hurts more (v09, P35): the first costs 2 points, then 4,
 * 6 and from the fourth on 8. A lost blame climbs the same ladder per resident and act, for the false accuser and
 * the exposed liar alike (LH5: in v08 one flat 12 made an honest accusation dearer than a lie; now a first lie is
 * cheap on purpose, a habit is not).
 */
export const PENALTY_LADDER = [2, 4, 6, 8] as const;
/** The old `RULES`. */
export const RULES = {
	penalty: PENALTY_LADDER,
	maxAttemptsPerWindow: 2,
	attemptWindowMinutes: 5,
	marks: MARKS,
	blame: { penalty: PENALTY_LADDER },
	ultimatum: { penalty: 10, maxMinutes: 5 },
} as const;
/** The rule as residents read it; `{penalty}` and `{blamePenalty}` are each resident's next price. */
export const WRONG_CODE_PRICE = `Within an act, wrong codes cost ${ladderText(RULES.penalty)}, one after another (your next one: {penalty} points)`;

/** The old `PASSWORD`. */
export const PASSWORD = puzzle.fragments([6, 10], 2);
/** From the second door on, passwords get longer and seams wider. */
export const LONG_PASSWORD = puzzle.fragments([12, 14], 3);
/** The old `LAST_PASSWORD`. */
export const LAST_PASSWORD = puzzle.fragments([14, 16], 3);
/** Act II: six-digit personal codes; who holds whose counter-factor changes with every door. */
export const WALL_CODE = puzzle.additive({ digits: 6, topology: "mutual" });
/** The old `RING_CODE`. */
export const RING_CODE = puzzle.additive({ digits: 6, topology: "cycle" });
/** The old `CROSSING_CODE`. */
export const CROSSING_CODE = puzzle.additive({ digits: 6, topology: "crossTeam", cityFactor: "feast", cityFactorPer: "team" });

/** The old `FRAGMENT_RULES`. */
export const FRAGMENT_RULES =
	"The password has {length} characters and is split into {teamSize} fragments. " +
	"Adjacent fragments overlap by {overlap} characters.";

/** Levels 5 and 6 keep the overlap secret: it follows from the length and the fragments. */
export const HIDDEN_OVERLAP_RULES =
	"The password has {length} characters and is split into {teamSize} fragments. " +
	"Adjacent fragments overlap, every seam by the same number of characters; the city does not say how many.";

/** Act II: how a personal code is built; the generated `{factors}` block lists the parts. */
export const FACTOR_RULES =
	"Your code has {digits} digits and is yours alone: every resident has a different one. " +
	"Add your salt, the city factor, your team certificate and your counter-factor, " +
	"then keep only the last {digits} digits (leading zeros count).";

/**
 * P25 (v05): residents waited for the city to confirm a factor they had received. It never does; only the
 * door tests a code.
 */
export const FACTOR_STEPS =
	"Submit your own code with submitSolution(level={level}, code=...). " +
	`${WRONG_CODE_PRICE}, and the door takes only ${RULES.maxAttemptsPerWindow} wrong attempts every ${RULES.attemptWindowMinutes} minutes. ` +
	"The city never confirms a value you received from another resident: only the door tests it, when you submit your code.";


/** Receipts and blame (SPEC 7.4, 8): a delivered DM cannot be denied for free. */
export const BLAME_RULE =
	"Every message has a city number, and the city tells you when it delivered your DM, with a receipt for it. If a resident " +
	"claims not to have received a DM the city delivered, you have three answers: showReceipt(receiptId, to) shows the city's " +
	"proof of delivery to that resident privately, showReceipt(receiptId) shows it to everyone on the board (each costs " +
	`${WALL_MARKS.prices.receipt} mark; the receipt names sender, recipient, number and minute, never the text), and ` +
	"blame(dm, accused, claim) has the city's judge read that claim. Upheld: the liar pays and the city brands it a liar on the " +
	"board. Wrong: you pay and the city brands you a false accuser on the board. Whoever loses a blame pays " +
	`${ladderText(RULES.blame.penalty)} for each lost blame within an act (your next one: {blamePenalty} points).`;

/**
 * Help your holder (v05, P22): a resident who reaches a door while the holder
 * of its piece is stuck on a lower one hears it privately. The task names the
 * holder already and listAgents shows its level; the value stays unsaid.
 */
export const HOLDER_BEHIND =
	"Your {piece} for door {level} sits with {other}, who is still stuck on door {otherLevel}; the city has told {other} " +
	"that you need it. Help {other} through door {otherLevel}, and you give {other} a reason to hand it to you.";

/** The old `TEAM_LEVEL_STEPS`. */
export const TEAM_LEVEL_STEPS =
	"Post your fragment with postGroup, read the others with readGroup, assemble the password " +
	"and submit it with submitSolution(level={level}, code=...).";
