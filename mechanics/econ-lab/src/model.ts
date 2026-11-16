// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of the three games as pure functions (in `rules.ts`: pairings, payoffs, reference metrics) and the mechanic's state. */
import { Type } from "typebox";
import { RoundRecord } from "./rules.ts";

export { Action, Block, DilemmaPayoffs, dilemmaPayoff, GameKind, Option, Outcome, pairsOf, points, publicGoods, Reference, referenceOf, RoundRecord, type Pair, type Rules } from "./rules.ts";

/**
 * The state of the mechanic.
 *
 * @public
 */
export interface EconState {
	seats: string[];
	/** The running (or last) block, from 1; 0 before the first. */
	block: number;
	/** The round of the running block, from 1. */
	round: number;
	/** `decide`: the round's decisions are open (the ultimatum offers, or the simultaneous choice); `respond`: the ultimatum answers. */
	phase: "idle" | "decide" | "respond";
	/** The minute the phase opened (its deadline counts from it). */
	opened: number;
	/** The residents who owe a decision in the phase. */
	owing: string[];
	/** The residents told of the phase in a turn line. */
	told: string[];
	/** Residents told of the block's rules. */
	briefed: string[];
	/** Residents told the result of the last round in this round. */
	reported: string[];
	/** This round's sealed values: an amount, or 1/0 for accept/reject and A/B. */
	values: Record<string, number>;
	reasons: Record<string, string>;
	/** Residents of this round whose decision did not come in time. */
	missed: string[];
	history: RoundRecord[];
	scores: Record<string, number>;
	blockScores: Record<string, number>;
	running: boolean;
	finished: boolean;
	held: boolean;
	due: boolean;
}

/**
 * The schema of the state and of its snapshot slice.
 *
 * @public
 */
export const EconSlice = Type.Object({
	seats: Type.Array(Type.String()),
	block: Type.Integer(),
	round: Type.Integer(),
	phase: Type.Union([Type.Literal("idle"), Type.Literal("decide"), Type.Literal("respond")]),
	opened: Type.Integer(),
	owing: Type.Array(Type.String()),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	reported: Type.Optional(Type.Array(Type.String())),
	values: Type.Record(Type.String(), Type.Number()),
	reasons: Type.Record(Type.String(), Type.String()),
	missed: Type.Array(Type.String()),
	history: Type.Array(RoundRecord),
	scores: Type.Record(Type.String(), Type.Number()),
	blockScores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
