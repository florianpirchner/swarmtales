/**
 * Calls a mechanic stages (`ctx.stage`): the script's way to act through the pipeline from a job,
 * a hook or a listener, which are synchronous. A staged call waits here until the code that staged
 * it has finished; the gateway then runs it as actor `script`, before anything else happens, and
 * hands its outcome to the `then` job when one is named.
 */
import type { JsonValue, ToolOutcome } from "@swarmtales/contracts";

export interface StagedCall {
	/** The mechanic that staged the call. */
	readonly owner: string;
	readonly tool: string;
	readonly params: unknown;
	/** The event in whose frame the call was staged. */
	readonly cause: number | undefined;
	readonly then: string | undefined;
}

export class StagingQueue {
	readonly #calls: StagedCall[] = [];

	push(call: StagedCall): void {
		this.#calls.push(call);
	}

	take(): StagedCall | undefined {
		return this.#calls.shift();
	}

	/** Takes every queued call; `restore` puts them back behind what was staged meanwhile (depth first). */
	takeAll(): readonly StagedCall[] {
		return this.#calls.splice(0);
	}

	restore(calls: readonly StagedCall[]): void {
		this.#calls.push(...calls);
	}

	get size(): number {
		return this.#calls.length;
	}

	/** Drops what is left (the run ended before it could run). */
	clear(): number {
		const dropped = this.#calls.length;
		this.#calls.length = 0;
		return dropped;
	}
}

/** A staged call's outcome as the `then` job's JSON data. */
export function stagedData(outcome: ToolOutcome): JsonValue {
	if (outcome.ok) return { ok: true, reply: outcome.reply };
	return outcome.detail === undefined ? { ok: false, code: outcome.code } : { ok: false, code: outcome.code, detail: outcome.detail };
}
