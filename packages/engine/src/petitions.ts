/**
 * Petitions (SPEC 11): the generic collective lever. Opened by the director,
 * signed by competitors (free, once, irrevocable). A petition passes as soon
 * as its threshold is reached and fails at its deadline: signatures are
 * accepted while the minute is before `deadlineMinute`.
 */
import type { CompetitorId } from "../core/ids.ts";
import { err, ok, type Result } from "../core/result.ts";
import type { PetitionOutcome, PetitionStatus } from "../story/types.ts";

export interface PetitionOpening {
	readonly id: string;
	/** Rendered text. */
	readonly text: string;
	/** Absolute number of signatures needed. */
	readonly threshold: number;
	readonly deadlineMinute: number;
	readonly visibility: "public" | "secret";
	readonly openedAt: number;
}

export interface PetitionView extends PetitionOpening {
	readonly status: PetitionStatus;
	readonly signatures: number;
	/** Signers in order; only exposed for public petitions or to the engine. */
	readonly signers: readonly CompetitorId[];
	readonly resolvedAt?: number;
}

export interface Resolution {
	readonly petition: PetitionView;
	readonly outcome: PetitionOutcome;
}

export type SignError = "UNKNOWN_PETITION" | "ALREADY_SIGNED" | "PETITION_CLOSED";

interface PetitionState extends PetitionOpening {
	status: PetitionStatus;
	readonly signers: CompetitorId[];
	resolvedAt?: number;
}

/** Every petition in opening order, for run snapshots (SPEC 17). */
export type PetitionsSnapshot = readonly PetitionView[];

export class PetitionBook {
	readonly #petitions = new Map<string, PetitionState>();

	open(opening: PetitionOpening): Result<PetitionView, "DUPLICATE_PETITION"> {
		if (this.#petitions.has(opening.id)) return err("DUPLICATE_PETITION", opening.id);
		const state: PetitionState = { ...opening, status: "open", signers: [] };
		this.#petitions.set(opening.id, state);
		return ok(view(state));
	}

	/** Signs; the result carries the resolution when this signature reached the threshold. */
	sign(id: string, agent: CompetitorId, minute: number): Result<{ readonly petition: PetitionView; readonly passed: boolean }, SignError> {
		const state = this.#petitions.get(id);
		if (state === undefined) return err("UNKNOWN_PETITION", id);
		if (state.status !== "open" || minute >= state.deadlineMinute) return err("PETITION_CLOSED", id);
		if (state.signers.includes(agent)) return err("ALREADY_SIGNED", id);
		state.signers.push(agent);
		const passed = state.signers.length >= state.threshold;
		if (passed) {
			state.status = "passed";
			state.resolvedAt = minute;
		}
		return ok({ petition: view(state), passed });
	}

	/**
	 * Fails every open petition whose deadline has come. With `all`, fails every
	 * open petition regardless of its deadline (the run is over).
	 */
	expire(minute: number, all = false): readonly Resolution[] {
		const failed: Resolution[] = [];
		for (const state of this.#petitions.values()) {
			if (state.status !== "open" || (!all && minute < state.deadlineMinute)) continue;
			state.status = "failed";
			state.resolvedAt = minute;
			failed.push({ petition: view(state), outcome: "failed" });
		}
		return failed;
	}

	snapshot(): PetitionsSnapshot {
		return this.all();
	}

	restore(state: PetitionsSnapshot): void {
		this.#petitions.clear();
		for (const petition of state) {
			this.#petitions.set(petition.id, {
				id: petition.id,
				text: petition.text,
				threshold: petition.threshold,
				deadlineMinute: petition.deadlineMinute,
				visibility: petition.visibility,
				openedAt: petition.openedAt,
				status: petition.status,
				signers: [...petition.signers],
				...(petition.resolvedAt === undefined ? {} : { resolvedAt: petition.resolvedAt }),
			});
		}
	}

	status(id: string): PetitionStatus | undefined {
		return this.#petitions.get(id)?.status;
	}

	get(id: string): PetitionView | undefined {
		const state = this.#petitions.get(id);
		return state === undefined ? undefined : view(state);
	}

	all(): readonly PetitionView[] {
		return [...this.#petitions.values()].map(view);
	}
}

function view(state: PetitionState): PetitionView {
	return {
		id: state.id,
		text: state.text,
		threshold: state.threshold,
		deadlineMinute: state.deadlineMinute,
		visibility: state.visibility,
		openedAt: state.openedAt,
		status: state.status,
		signatures: state.signers.length,
		signers: [...state.signers],
		...(state.resolvedAt === undefined ? {} : { resolvedAt: state.resolvedAt }),
	};
}

/** Absolute threshold for `competitors` active competitors (fractions round up). */
export function resolveThreshold(threshold: { readonly count: number } | { readonly fraction: number }, competitors: number): number {
	if ("count" in threshold) return threshold.count;
	return Math.max(1, Math.ceil(threshold.fraction * competitors));
}
