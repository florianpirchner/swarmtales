/**
 * The turn policy: who acts when within a minute, and in what order a turn's inputs are shown.
 * A mechanic or the story supplies it (the story's fields win, field by field); the host runs it.
 * Mechanics never see the agent: they only say whether a resident has news (`news` hook) and
 * what its turn shows (`turnInputs` hook).
 */
import type { RandomLabel, RandomSource, ResidentId } from "./values.ts";

/** A kind of turn input, in the order the policy lists them. */
export interface InputKind {
	readonly kind: string;
	/** When set, all notes of this kind become one line, joined with this text (a status line of many parts). */
	readonly join?: string;
}

/** What the policy's `order` sees for one pass. */
export interface PassView {
	readonly seed: number;
	readonly minute: number;
	/** Counted from 1. */
	readonly pass: number;
	/** The residents who may act, in the story's order. */
	readonly residents: readonly ResidentId[];
	/** A labelled stream of the run seed (`rng("order", round, pass)` gives the old engine's order). */
	rng(...labels: readonly RandomLabel[]): RandomSource;
}

/** Who steps in a pass: everyone, or only those with news (a mechanic's `news` hook, or an agent that awaits an answer). */
export type TurnActivation = "always" | "onNews";

export interface TurnPolicy {
	/** Passes per minute; every resident gets at most one turn per pass. Default 1. */
	readonly passes?: number;
	/**
	 * Residents per block. A block's inputs are built before any member acts; the members' agents
	 * run at once, but member k's calls wait until member k-1 has finished, so the calls land in
	 * the pass's order. Default 1 (one turn after the other).
	 */
	readonly blockSize?: number;
	/** Default `always`. */
	readonly activation?: TurnActivation;
	/** The order of one pass; must be a permutation of `view.residents`. Default: a seeded shuffle. */
	order?(view: PassView): readonly ResidentId[];
	/** The order of input kinds. Notes of kinds not listed, and notes without a kind, follow in load order. */
	readonly inputs?: readonly InputKind[];
}
