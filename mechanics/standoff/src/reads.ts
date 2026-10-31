/**
 * What the standoff reads of other mechanics (the old world's `heldPieces`, `levelOf`, `hasPassed`,
 * `isExiled` and the ransom price), the same way for its tools and hooks (`ctx`) and for its facts
 * (`view`, queries only, R2-D4), so the gamemaker's facts are computed when they are read and never
 * cached at a minute's end.
 */
import type { HeldPiece } from "@swarmtales/mechanic-shared";

/** The queries the standoff makes; `ctx` and `view` both answer them. */
export interface StandoffReads {
	readonly ids: readonly string[];
	/** Every piece `agent` holds on the levels dealt (old `heldPieces`), needers in team-member order. */
	readonly heldAll: (agent: string) => readonly HeldPiece[];
	readonly levelOf: (agent: string) => number;
	readonly hasPassed: (agent: string, level: number) => boolean;
	readonly isExiled: (agent: string) => boolean;
	/** What others pay for a ransom; undefined without a tribunal. */
	readonly ransomPrice: () => number | undefined;
}

/** What a piece the city keeps costs its needer: half of what others pay for a ransom, rounded up (P48); 0 without a tribunal. */
export function cityPiecePrice(reads: StandoffReads): number {
	const price = reads.ransomPrice();
	return price === undefined ? 0 : Math.ceil(price / 2);
}

/** Whether `agent` stands before `level`'s door and has not passed it (old `needsNow`). */
export function needsNow(reads: StandoffReads, agent: string, level: number): boolean {
	return !reads.isExiled(agent) && reads.levelOf(agent) === level && !reads.hasPassed(agent, level);
}
