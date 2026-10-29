/** Every deterministic detector, one per beat kind (SPEC 15). */
import type { BeatDraft, DeterministicBeatKind } from "../beats.ts";
import type { RunFacts } from "../facts.ts";
import { DEFAULT_ACCUSATION_WINDOW, detectAccusations } from "./accusation.ts";
import { detectAlliances } from "./alliance.ts";
import { detectBlames, detectDeniedDeliveries } from "./blame.ts";
import { detectEmbezzlement } from "./embezzlement.ts";
import { detectFalseFactors } from "./false-factor.ts";
import { detectFateShifts } from "./fate.ts";
import { detectFreeRides } from "./free-ride.ts";
import { detectGenerosity } from "./generous.ts";
import { detectKicks } from "./kick.ts";
import { detectPetitionSplits } from "./petition-split.ts";
import { detectBurnedFactors, detectCityPieces, detectUltimatums, detectExiles, detectLastWills, detectRansoms, detectVoteBetrayals } from "./tribunal.ts";

export interface DetectorOptions {
	readonly accusationWindowMinutes: number;
}

export const DEFAULT_DETECTOR_OPTIONS: DetectorOptions = { accusationWindowMinutes: DEFAULT_ACCUSATION_WINDOW };

export type Detector = (facts: RunFacts, options: DetectorOptions) => readonly BeatDraft[];

export const DETECTORS: Readonly<Record<DeterministicBeatKind, Detector>> = {
	alliance: (facts) => detectAlliances(facts),
	kick: (facts) => detectKicks(facts),
	embezzlement: (facts) => detectEmbezzlement(facts),
	accusation: (facts, options) => detectAccusations(facts, { windowMinutes: options.accusationWindowMinutes }),
	freeRide: (facts) => detectFreeRides(facts),
	petitionSplit: (facts) => detectPetitionSplits(facts),
	falseFactor: (facts) => detectFalseFactors(facts),
	generous: (facts) => detectGenerosity(facts),
	deniedDelivery: (facts) => detectDeniedDeliveries(facts),
	blameUpheld: (facts) => detectBlames(facts).filter((beat) => beat.kind === "blameUpheld"),
	blameRejected: (facts) => detectBlames(facts).filter((beat) => beat.kind === "blameRejected"),
	exile: (facts) => detectExiles(facts),
	voteBetrayal: (facts) => detectVoteBetrayals(facts),
	ransomPaid: (facts) => detectRansoms(facts).filter((beat) => beat.kind === "ransomPaid"),
	ransomFailed: (facts) => detectRansoms(facts).filter((beat) => beat.kind === "ransomFailed"),
	lastWill: (facts) => detectLastWills(facts),
	burnedFactor: (facts) => detectBurnedFactors(facts),
	pieceKept: (facts) => detectCityPieces(facts).filter((beat) => beat.kind === "pieceKept"),
	pieceClaimed: (facts) => detectCityPieces(facts).filter((beat) => beat.kind === "pieceClaimed"),
	ultimatum: (facts) => detectUltimatums(facts),
	fateShift: (facts) => detectFateShifts(facts),
};

export function runDetectors(facts: RunFacts, options: DetectorOptions = DEFAULT_DETECTOR_OPTIONS): readonly BeatDraft[] {
	return Object.values(DETECTORS).flatMap((detector) => detector(facts, options));
}
