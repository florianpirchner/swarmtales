/**
 * Story beats (SPEC 15). A beat names who did what to whom and cites the
 * `seq` numbers of the events that prove it. Detectors produce drafts; the
 * digest numbers them and assigns their act.
 */

export const DETERMINISTIC_BEAT_KINDS = [
	"alliance",
	"kick",
	"embezzlement",
	"accusation",
	"freeRide",
	"petitionSplit",
	"falseFactor",
	"generous",
	"deniedDelivery",
	"blameUpheld",
	"blameRejected",
	"exile",
	"voteBetrayal",
	"ransomPaid",
	"ransomFailed",
	"lastWill",
	"burnedFactor",
	"pieceKept",
	"pieceClaimed",
	"ultimatum",
	"fateShift",
] as const;
export const NARRATIVE_BEAT_KINDS = ["brokenPromise", "doubleGame"] as const;

export type DeterministicBeatKind = (typeof DETERMINISTIC_BEAT_KINDS)[number];
export type NarrativeBeatKind = (typeof NARRATIVE_BEAT_KINDS)[number];
export type BeatKind = DeterministicBeatKind | NarrativeBeatKind;

/** `deterministic` beats come from detectors; `narrative` beats from the optional model pass. */
export type BeatLayer = "deterministic" | "narrative";

export interface BeatDraft {
	readonly kind: BeatKind;
	/** The event at which the beat became true. */
	readonly seq: number;
	readonly minute: number;
	/** Who acted (the ally pair, the founder, the treasurer, the accuser, ...). */
	readonly actors: readonly string[];
	/** Who was acted upon or harmed. */
	readonly targets: readonly string[];
	readonly summary: string;
	/** Evidence `seq` references, ascending. */
	readonly evidence: readonly number[];
}

export interface Beat extends BeatDraft {
	/** `B-001` for deterministic and `N-001` for narrative beats, in order of `seq`. */
	readonly id: string;
	readonly layer: BeatLayer;
	readonly act: string;
}

export function draft(input: BeatDraft): BeatDraft {
	return { ...input, evidence: [...new Set(input.evidence)].sort((a, b) => a - b) };
}

/** Orders drafts by `seq` (then kind and actors) and numbers them within their layer. */
export function numberBeats(drafts: readonly BeatDraft[], layer: BeatLayer, actOf: (minute: number) => string): readonly Beat[] {
	const prefix = layer === "deterministic" ? "B" : "N";
	return [...drafts]
		.sort((a, b) => a.seq - b.seq || a.kind.localeCompare(b.kind) || a.actors.join().localeCompare(b.actors.join()) || a.targets.join().localeCompare(b.targets.join()))
		.map((entry, index) => ({
			id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
			layer,
			act: actOf(entry.minute),
			...entry,
		}));
}
