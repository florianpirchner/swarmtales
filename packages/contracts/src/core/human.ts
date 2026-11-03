/**
 * The human's channel into a run (docs/design/overseer-api.md §5): the safe stops where human
 * calls land, the calls a replay gives back, and the hand the app pushes calls through. Kept apart
 * from `overseer.ts` so that `host.ts` can name the hand without an import cycle.
 */
import type { ToolOutcome } from "./tools.ts";

/** Where a human call may land (§5): before or after a block, or in the `between` slot (also while paused there). */
export interface SafeStop {
	readonly minute: number;
	readonly at: "beforeBlock" | "afterBlock" | "between";
	/** The pass and block of a block's safe stop. */
	readonly pass?: number;
	readonly block?: number;
	/** The log's last seq when the stop asks: a replay gives each recorded call where the log had this length. */
	readonly seq: number;
}

/** One call of the human, as the inbox holds it and a replay feeds it back. */
export interface HumanCall {
	readonly tool: string;
	readonly params: unknown;
}

/**
 * A human attached to the run (`HostOptions.human`). The host opens no socket: the app pushes
 * calls through `host.hand()`, and `next` lets a replay (`scriptedHuman`) give the recorded calls
 * back at the safe stop where they landed. `next` is asked again after each call it gave.
 */
export interface HumanChannel {
	next?(stop: SafeStop): HumanCall | undefined;
}

/** The human's tools, each run at the next safe stop through the full pipeline as actor `human`. */
export interface HumanHand {
	instruct(params: unknown): Promise<ToolOutcome>;
	amendDecision(params: unknown): Promise<ToolOutcome>;
	pause(): Promise<ToolOutcome>;
	resume(): Promise<ToolOutcome>;
	step(): Promise<ToolOutcome>;
}
