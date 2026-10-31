/**
 * The gamemaker's "Standoffs" section rendered from the standoff's facts (carve-round3-T4b.md
 * must-fix 6): a line-for-line copy of the old `standoffLines` (packages/roles/src/gamemaker/
 * situation.ts:353-386) with `world.outstandingPieces()`, `cityPieces()`, `cityPiecePrice()`,
 * `unusedHandOvers()` and `ultimatums()` replaced by the facts `standoff.outstanding`, `cityPieces`,
 * `cityPiecePrice`, `unused` and `ultimatums`. The rest the old function read from the world and
 * the gamemaker's own tracks comes in `SectionReads`.
 */
import { Type, type Static, type TSchema } from "typebox";
import { Parse } from "typebox/value";
import { CityPieces, Outstanding, Ultimatums, Unused } from "@swarmtales/mechanic-standoff";

export interface SectionReads {
	readonly minute: number;
	/** The gamemaker's track: the minute the resident reached its level (old `levelSince`, 0 before any). */
	readonly levelSince: (agent: string) => number;
	readonly levelOf: (agent: string) => number;
	readonly hasPassed: (agent: string, level: number) => boolean;
	readonly isAlive: (agent: string) => boolean;
}

function fact<T extends TSchema>(facts: Readonly<Record<string, unknown>>, name: string, schema: T): Static<T> {
	return Parse(schema, facts[`standoff.${name}`]);
}

export function standoffSection(facts: Readonly<Record<string, unknown>>, reads: SectionReads): readonly string[] {
	const debts = fact(facts, "outstanding", Outstanding);
	const price = fact(facts, "cityPiecePrice", Type.Number());
	const city = fact(facts, "cityPieces", CityPieces).flatMap((entry) =>
		entry.piece.needers
			.filter((needer) => !entry.claimed.includes(needer) && reads.isAlive(needer) && reads.levelOf(needer) === entry.piece.level && !reads.hasPassed(needer, entry.piece.level))
			.map((needer) => `- the city ${entry.price === undefined ? "keeps" : "has seized"} ${entry.piece.label} of ${entry.from} for ${needer}; ${needer} may buy it with claimPiece for ${String(entry.price ?? price)} points`),
	);
	const unused = fact(facts, "unused", Unused).map(
		(entry) => `- ${entry.holder} wrote ${entry.needer} ${entry.label} at minute ${String(entry.minute)}; ${entry.needer} still stands before door ${String(entry.level)} and may not have seen it`,
	);
	const ultimatums = fact(facts, "ultimatums", Ultimatums).map(
		(ultimatum) => `- ultimatum ${String(ultimatum.number)}: ${ultimatum.between.join(" and ")}, due at minute ${String(ultimatum.until)}, ${String(ultimatum.penalty)} points`,
	);
	if (debts.length === 0 && city.length === 0 && ultimatums.length === 0 && unused.length === 0) return [];
	const owes = (holder: string, needer: string): boolean => debts.some((debt) => debt.holder === holder && debt.needer === needer);
	const lines = [...debts]
		.sort((a, b) => reads.levelSince(a.needer) - reads.levelSince(b.needer))
		.map((debt) => {
			const waited = reads.minute - reads.levelSince(debt.needer);
			const mutual = owes(debt.needer, debt.holder) ? " · they wait on each other" : "";
			return `- ${debt.holder} has not handed ${debt.needer} ${debt.pieces.map((piece) => piece.label).join(" and ")}; ${debt.needer} has stood before door ${String(debt.level)} for ${String(waited)} min${mutual}`;
		});
	return [
		"Standoffs (pieces not handed over; the city sees a hand-over when the holder writes the value to the one who needs it):",
		...lines,
		...city,
		...ultimatums,
		...(unused.length === 0 ? [] : ["Handed over but not used (the city never confirms a value; you may point the needer to the message):", ...unused]),
		"",
	];
}
