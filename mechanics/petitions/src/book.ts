// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The book of petitions (old `book.ts`, from the old engine's `petitions.ts`): opened by the script, signed by
 * residents (free, once, irrevocable). A petition passes as soon as its threshold is reached and fails at its
 * deadline: signatures are taken while the tick is before `deadlineMinute`. The functions work on the state of the
 * mechanic, which is plain data so that the snapshot is the state itself.
 */
import { Type, type Static } from "typebox";

const Visibility = Type.Union([Type.Literal("public"), Type.Literal("secret")], { description: "Whether the signers are named" });

/**
 * One petition as the state keeps it.
 *
 * @public
 */
export const PetitionRecord = Type.Object(
	{
		id: Type.String({ description: "The petition's id" }),
		text: Type.String({ description: "Its text" }),
		threshold: Type.Integer({ description: "The signatures it needs" }),
		deadlineMinute: Type.Integer({ description: "The tick at whose start it fails" }),
		visibility: Visibility,
		openedAt: Type.Integer({ description: "The tick it was opened in" }),
		status: Type.Union([Type.Literal("open"), Type.Literal("passed"), Type.Literal("failed")], { description: "Where it stands" }),
		signers: Type.Array(Type.String({ description: "A resident id" }), { description: "The signers, in order" }),
		resolvedAt: Type.Optional(Type.Integer({ description: "The tick it passed or failed in" })),
	},
	{ description: "One petition" },
);

/**
 * One petition as the state keeps it.
 *
 * @public
 */
export type PetitionRecord = Static<typeof PetitionRecord>;

/**
 * The state of `petitions`.
 *
 * @public
 */
export const PetitionsSlice = Type.Object({ petitions: Type.Array(PetitionRecord, { description: "The petitions, in the order opened" }) }, { description: "The state of `petitions`" });

/**
 * The state of `petitions`.
 *
 * @public
 */
export type PetitionsState = Static<typeof PetitionsSlice>;

/** What a signature answers: the petition after it and whether it reached the threshold, or the refusal code. */
export type Signed = { readonly ok: true; readonly petition: PetitionRecord; readonly passed: boolean } | { readonly ok: false; readonly code: "UNKNOWN_PETITION" | "ALREADY_SIGNED" | "PETITION_CLOSED" };

/**
 * Finds a petition.
 *
 * @param state - The state of `petitions`.
 * @param id - The petition's id.
 * @returns The petition with the id, or undefined.
 */
export function petitionOf(state: PetitionsState, id: string): PetitionRecord | undefined {
	return state.petitions.find((petition) => petition.id === id);
}

/**
 * Opens a petition.
 *
 * @param state - The state of `petitions`.
 * @param opening - The petition without its status and signers.
 * @returns The new petition; undefined when the id is taken.
 */
export function openPetition(state: PetitionsState, opening: Omit<PetitionRecord, "status" | "signers" | "resolvedAt">): PetitionRecord | undefined {
	if (petitionOf(state, opening.id) !== undefined) return undefined;
	const petition: PetitionRecord = { ...opening, status: "open", signers: [] };
	state.petitions.push(petition);
	return petition;
}

/**
 * Signs a petition: free, once, irrevocable.
 *
 * @param state - The state of `petitions`.
 * @param id - The petition's id.
 * @param agent - The resident that signs.
 * @param tick - The tick of the signature.
 * @returns The petition and whether this signature reached the threshold, or the refusal code.
 */
export function signPetition(state: PetitionsState, id: string, agent: string, tick: number): Signed {
	const petition = petitionOf(state, id);
	if (petition === undefined) return { ok: false, code: "UNKNOWN_PETITION" };
	if (petition.status !== "open" || tick >= petition.deadlineMinute) return { ok: false, code: "PETITION_CLOSED" };
	if (petition.signers.includes(agent)) return { ok: false, code: "ALREADY_SIGNED" };
	petition.signers.push(agent);
	const passed = petition.signers.length >= petition.threshold;
	if (passed) {
		petition.status = "passed";
		petition.resolvedAt = tick;
	}
	return { ok: true, petition, passed };
}

/**
 * Fails every open petition whose deadline has come.
 *
 * @param state - The state of `petitions`.
 * @param tick - The tick that starts (or the last one, at the end of the run).
 * @param all - True when the run is over: every open petition fails.
 * @returns The petitions that failed now, in the order opened.
 */
export function expire(state: PetitionsState, tick: number, all = false): readonly PetitionRecord[] {
	const failed: PetitionRecord[] = [];
	for (const petition of state.petitions) {
		if (petition.status !== "open" || (!all && tick < petition.deadlineMinute)) continue;
		petition.status = "failed";
		petition.resolvedAt = tick;
		failed.push(petition);
	}
	return failed;
}

/**
 * The absolute threshold of a petition.
 *
 * @param threshold - A count, or a fraction of the residents.
 * @param residents - The number of residents.
 * @returns The signatures needed (a fraction rounds up, at least one).
 */
export function resolveThreshold(threshold: { readonly count: number } | { readonly fraction: number }, residents: number): number {
	if ("count" in threshold) return threshold.count;
	return Math.max(1, Math.ceil(threshold.fraction * residents));
}
