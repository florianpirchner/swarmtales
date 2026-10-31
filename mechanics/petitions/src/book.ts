/**
 * The book of petitions, copied from packages/engine/src/petitions.ts (SPEC 11): opened by the
 * director, signed by residents (free, once, irrevocable). A petition passes as soon as its
 * threshold is reached and fails at its deadline: signatures are accepted while the minute is
 * before `deadlineMinute`.
 */
import { Type, type Static } from "typebox";

export const PetitionStatus = Type.Union([Type.Literal("open"), Type.Literal("passed"), Type.Literal("failed")]);
export type PetitionStatus = Static<typeof PetitionStatus>;

/** One petition as the snapshot slice keeps it, also what the tools show. */
export const PetitionRecord = Type.Object({
	id: Type.String(),
	text: Type.String(),
	threshold: Type.Integer(),
	deadlineMinute: Type.Integer(),
	visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]),
	openedAt: Type.Integer(),
	status: PetitionStatus,
	signers: Type.Array(Type.String()),
	resolvedAt: Type.Optional(Type.Integer()),
});

export interface PetitionView {
	readonly id: string;
	readonly text: string;
	readonly threshold: number;
	readonly deadlineMinute: number;
	readonly visibility: "public" | "secret";
	readonly openedAt: number;
	readonly status: PetitionStatus;
	readonly signatures: number;
	readonly signers: readonly string[];
	readonly resolvedAt?: number;
}

export interface Resolution {
	readonly petition: PetitionView;
	readonly outcome: "passed" | "failed";
}

export type SignError = "UNKNOWN_PETITION" | "ALREADY_SIGNED" | "PETITION_CLOSED";

export type PetitionRecord = Static<typeof PetitionRecord>;

interface PetitionState {
	readonly id: string;
	readonly text: string;
	readonly threshold: number;
	readonly deadlineMinute: number;
	readonly visibility: "public" | "secret";
	readonly openedAt: number;
	status: PetitionStatus;
	readonly signers: string[];
	resolvedAt?: number;
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

export type Signed = { readonly ok: true; readonly petition: PetitionView; readonly passed: boolean } | { readonly ok: false; readonly code: SignError };

export class PetitionBook {
	readonly #petitions = new Map<string, PetitionState>();

	/** Opens a petition; undefined when the id is taken. */
	open(opening: { readonly id: string; readonly text: string; readonly threshold: number; readonly deadlineMinute: number; readonly visibility: "public" | "secret"; readonly openedAt: number }): PetitionView | undefined {
		if (this.#petitions.has(opening.id)) return undefined;
		const state: PetitionState = { ...opening, status: "open", signers: [] };
		this.#petitions.set(opening.id, state);
		return view(state);
	}

	/** Signs; the result says when this signature reached the threshold. */
	sign(id: string, agent: string, minute: number): Signed {
		const state = this.#petitions.get(id);
		if (state === undefined) return { ok: false, code: "UNKNOWN_PETITION" };
		if (state.status !== "open" || minute >= state.deadlineMinute) return { ok: false, code: "PETITION_CLOSED" };
		if (state.signers.includes(agent)) return { ok: false, code: "ALREADY_SIGNED" };
		state.signers.push(agent);
		const passed = state.signers.length >= state.threshold;
		if (passed) {
			state.status = "passed";
			state.resolvedAt = minute;
		}
		return { ok: true, petition: view(state), passed };
	}

	/** Fails every open petition whose deadline has come; with `all`, every open one (the run is over). */
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

	get(id: string): PetitionView | undefined {
		const state = this.#petitions.get(id);
		return state === undefined ? undefined : view(state);
	}

	all(): readonly PetitionView[] {
		return [...this.#petitions.values()].map(view);
	}

	records(): PetitionRecord[] {
		return this.all().map((petition) => ({
			id: petition.id,
			text: petition.text,
			threshold: petition.threshold,
			deadlineMinute: petition.deadlineMinute,
			visibility: petition.visibility,
			openedAt: petition.openedAt,
			status: petition.status,
			signers: [...petition.signers],
			...(petition.resolvedAt === undefined ? {} : { resolvedAt: petition.resolvedAt }),
		}));
	}

	restore(records: readonly PetitionRecord[]): void {
		this.#petitions.clear();
		for (const record of records) {
			this.#petitions.set(record.id, { ...record, signers: [...record.signers] });
		}
	}
}

/** Absolute threshold for `competitors` active competitors (fractions round up). */
export function resolveThreshold(threshold: { readonly count: number } | { readonly fraction: number }, competitors: number): number {
	if ("count" in threshold) return threshold.count;
	return Math.max(1, Math.ceil(threshold.fraction * competitors));
}
