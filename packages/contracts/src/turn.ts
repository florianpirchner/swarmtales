/** What the scheduler hands a competitor and what a competitor looks like to it (types only). */
import type { CompetitorId } from "./ids.ts";

export type TurnInputKind = "character" | "status" | "task" | "dm" | "notice" | "digest";

/** One line of a step's inputs, tagged with where it came from. */
export interface TurnInput {
	readonly kind: TurnInputKind;
	readonly text: string;
}

/** Where a step sits in the minute, and when it may act. */
export interface StepSlot {
	/** Both counted from 1. */
	readonly pass: number;
	readonly block: number;
	/**
	 * Resolves once every competitor before this one in the block has finished
	 * its step. The model may be called before; its answer (text, tool calls,
	 * tool executions) must wait for the turn.
	 */
	readonly turn: Promise<void>;
}

/** A competitor as the scheduler sees it; the LLM runner implements it. */
export interface Competitor {
	readonly id: CompetitorId;
	/** Whether its last step ended with tool results the model has not answered yet. */
	readonly awaitsAnswer: boolean;
	/** One model call and that call's tool executions. */
	step(inputs: readonly TurnInput[], slot: StepSlot): Promise<void>;
}
