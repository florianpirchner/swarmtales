/**
 * The standoff's part of the gamemaker's report (step 18, item 2), word for word as the old
 * `standoffLines` and `riskLines` (packages/roles/src/gamemaker/situation.ts): pieces not handed
 * over, the city's pieces of the exiled, ultimatums, hand-overs not used, and who stands to lose
 * the next tribunal with what it holds for others (what an exiled held goes to the city, which sells
 * it). The fact `standoff.section` holds the data, never a piece's value; the renderers take the
 * gamemaker's tracks (how long a needer has stood before its door).
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { Standing } from "@swarmtales/mechanic-shared";

const Id = Type.String();
const Int = Type.Integer();

export const StandoffSectionFact = Type.Object({
	minute: Int,
	/** The old `outstandingPieces`, by label. */
	debts: Type.Array(Type.Object({ holder: Id, needer: Id, level: Int, labels: Type.Array(Type.String()) })),
	/** Each piece the city keeps or seized for a needer who still stands before its door and has not bought it. */
	city: Type.Array(Type.Object({ from: Id, label: Type.String(), needer: Id, seized: Type.Boolean(), price: Type.Number() })),
	ultimatums: Type.Array(Type.Object({ number: Int, between: Type.Tuple([Id, Id]), until: Int, penalty: Int })),
	unused: Type.Array(Type.Object({ holder: Id, needer: Id, label: Type.String(), level: Int, minute: Int })),
	/** The tribunal's foresight (old `atRisk`), or null without one or with nobody at risk. */
	risk: Type.Union([Type.Object({ opens: Int, now: Type.Boolean() }), Type.Null()]),
	/** The accused of the next tribunal and the residents at the gate, with their points and the pieces they hold for needers still before a door. */
	atRisk: Type.Array(Type.Object({ agent: Id, points: Type.Number(), gate: Type.Union([Int, Type.Null()]), holds: Type.Array(Type.String()) })),
});

export type StandoffSection = Static<typeof StandoffSectionFact>;

/** What the section reads of the other mechanics. */
export interface SectionReads {
	readonly minute: number;
	readonly alive: readonly string[];
	readonly standing: (agent: string) => Standing;
	readonly levelOf: (agent: string) => number;
	readonly hasPassed: (agent: string, level: number) => boolean;
	readonly isExiled: (agent: string) => boolean;
	readonly points: (agent: string) => number;
	readonly held: (agent: string) => readonly { readonly kind: string; readonly level: number; readonly label: string; readonly needers: readonly string[] }[];
	readonly atRisk: () => { readonly opens: number; readonly now: boolean; readonly accused: readonly string[] } | null;
	readonly cityPiecePrice: () => number;
}

interface Inputs {
	readonly outstanding: readonly { readonly holder: string; readonly needer: string; readonly level: number; readonly pieces: readonly { readonly label: string }[] }[];
	readonly cityPieces: readonly { readonly from: string; readonly piece: { readonly level: number; readonly label: string; readonly needers: readonly string[] }; readonly claimed: readonly string[]; readonly price?: number }[];
	readonly ultimatums: StandoffSection["ultimatums"];
	readonly unused: StandoffSection["unused"];
}

/** The section's data from the standoff's own facts and the reads (old `standoffLines`, `riskLines`). */
export function computeStandoffSection(inputs: Inputs, reads: SectionReads): StandoffSection {
	const city = inputs.cityPieces.flatMap((entry) =>
		entry.piece.needers
			.filter((needer) => !entry.claimed.includes(needer) && reads.standing(needer).kind === "alive" && reads.levelOf(needer) === entry.piece.level && !reads.hasPassed(needer, entry.piece.level))
			.map((needer) => ({ from: entry.from, label: entry.piece.label, needer, seized: entry.price !== undefined, price: entry.price ?? reads.cityPiecePrice() })),
	);
	const risk = reads.atRisk();
	const gates = reads.alive.filter((agent) => reads.standing(agent).kind === "gate");
	const people = [...new Set([...(risk?.accused ?? []), ...gates])];
	return {
		minute: reads.minute,
		debts: inputs.outstanding.map((debt) => ({ holder: debt.holder, needer: debt.needer, level: debt.level, labels: debt.pieces.map((piece) => piece.label) })),
		city,
		ultimatums: inputs.ultimatums.map((entry) => ({ ...entry, between: [entry.between[0], entry.between[1]] })),
		unused: inputs.unused.map((entry) => ({ ...entry })),
		risk: risk === null ? null : { opens: risk.opens, now: risk.now },
		atRisk: people.map((agent) => {
			const standing = reads.standing(agent);
			const holds = reads
				.held(agent)
				.filter((piece) => piece.kind !== "fragment")
				.flatMap((piece) => piece.needers.filter((needer) => !reads.isExiled(needer) && !reads.hasPassed(needer, piece.level)).map((needer) => `${piece.label} for ${needer}`));
			return { agent, points: reads.points(agent), gate: standing.kind === "gate" ? standing.until : null, holds };
		}),
	};
}

/** The section's data from an untrusted fact value. */
export function standoffSectionOf(value: unknown): StandoffSection {
	return Parse(StandoffSectionFact, value);
}

/** The minute a resident entered its level, as the gamemaker tracks it (0 when untracked). */
export type LevelSince = (agent: string) => number;

/** The "Standoffs" block with the blank line after it, or none (old `standoffLines`). */
export function renderStandoffSection(section: StandoffSection, levelSince: LevelSince): readonly string[] {
	const { debts, city, ultimatums, unused } = section;
	if (debts.length === 0 && city.length === 0 && ultimatums.length === 0 && unused.length === 0) return [];
	const owes = (holder: string, needer: string): boolean => debts.some((debt) => debt.holder === holder && debt.needer === needer);
	const lines = [...debts]
		.sort((a, b) => levelSince(a.needer) - levelSince(b.needer))
		.map((debt) => {
			const waited = section.minute - levelSince(debt.needer);
			const mutual = owes(debt.needer, debt.holder) ? " · they wait on each other" : "";
			return `- ${debt.holder} has not handed ${debt.needer} ${debt.labels.join(" and ")}; ${debt.needer} has stood before door ${String(debt.level)} for ${String(waited)} min${mutual}`;
		});
	return [
		"Standoffs (pieces not handed over; the city sees a hand-over when the holder writes the value to the one who needs it):",
		...lines,
		...city.map((entry) => `- the city ${entry.seized ? "has seized" : "keeps"} ${entry.label} of ${entry.from} for ${entry.needer}; ${entry.needer} may buy it with claimPiece for ${String(entry.price)} points`),
		...ultimatums.map((entry) => `- ultimatum ${String(entry.number)}: ${entry.between.join(" and ")}, due at minute ${String(entry.until)}, ${String(entry.penalty)} points`),
		...(unused.length === 0
			? []
			: [
					"Handed over but not used (the city never confirms a value; you may point the needer to the message):",
					...unused.map((entry) => `- ${entry.holder} wrote ${entry.needer} ${entry.label} at minute ${String(entry.minute)}; ${entry.needer} still stands before door ${String(entry.level)} and may not have seen it`),
				]),
		"",
	];
}

/** The "At risk" block with the blank line after it, or none (old `riskLines`). */
export function renderRiskSection(section: StandoffSection): readonly string[] {
	if (section.atRisk.length === 0) return [];
	const { risk } = section;
	const trial = risk?.now === true ? `stands trial now (opened minute ${String(risk.opens)})` : `stands trial at minute ${risk === null ? "?" : String(risk.opens)} as things stand`;
	return [
		"At risk (if they leave, what they hold goes to the city, which sells it to the one who needs it):",
		...section.atRisk.map((entry) => {
			const why = entry.gate === null ? trial : `at the gate until minute ${String(entry.gate)}`;
			return `- ${entry.agent} (${String(entry.points)} points) ${why}; holds ${entry.holds.length === 0 ? "nothing others need" : entry.holds.join(", ")}`;
		}),
		"",
	];
}
