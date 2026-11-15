// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standoff's part of the gamemaker's report, carried from old `mechanics/standoff/src/section.ts` (word for word
 * as the old `standoffLines` and `riskLines`): pieces not handed over, the city's pieces of the exiled, ultimatums,
 * hand-overs not used, and who stands to lose the next tribunal with what it holds for others. Written from the
 * fact `standoff.section`, which holds no piece's value, and the gamemaker's tracks.
 */
import { Type, type Static } from "typebox";
import { Id, Int } from "./schema.ts";

// A list of piece labels.
const Texts = (description: string) => Type.Array(Type.String({ description: "A label" }), { description });

/**
 * The value of the fact `standoff.section` (old `StandoffSectionFact`).
 *
 * @public
 */
export const StandoffSectionSchema = Type.Object(
	{
		minute: Int("The tick of the report"),
		debts: Type.Array(Type.Object({ holder: Id("The holder"), needer: Id("Who needs it"), level: Int("The door"), labels: Texts("The pieces") }, { description: "Pieces not handed over" }), { description: "The old outstanding pieces" }),
		city: Type.Array(
			Type.Object({ from: Id("The exiled"), label: Type.String({ description: "The piece" }), needer: Id("Who needs it"), seized: Type.Boolean({ description: "Seized, not kept" }), price: Type.Number({ description: "Its price" }) }, { description: "A piece of the city" }),
			{ description: "The city's pieces for needers before their door" },
		),
		ultimatums: Type.Array(Type.Object({ number: Int("Its number"), between: Type.Tuple([Id(), Id()], { description: "The two" }), until: Int("Due at"), penalty: Int("Its price") }, { description: "An ultimatum" }), { description: "The ultimatums" }),
		unused: Type.Array(Type.Object({ holder: Id("The holder"), needer: Id("Who needs it"), label: Type.String({ description: "The piece" }), level: Int("The door"), minute: Int("Written at") }, { description: "A hand-over not used" }), { description: "Hand-overs not used" }),
		risk: Type.Union([Type.Object({ opens: Int("The trial opens"), now: Type.Boolean({ description: "It runs now" }) }, { description: "The next trial" }), Type.Null({ description: "None" })], { description: "The tribunal's foresight" }),
		atRisk: Type.Array(Type.Object({ agent: Id(), points: Type.Number({ description: "Its points" }), gate: Type.Union([Int("At the gate until"), Type.Null({ description: "Not at the gate" })], { description: "Its gate" }), holds: Texts("What it holds for others") }, { description: "One at risk" }), {
			description: "The accused of the next tribunal and the residents at the gate",
		}),
	},
	{ description: "The standoff's part of the gamemaker's report" },
);

/**
 * The value of the fact `standoff.section`.
 *
 * @public
 */
export type StandoffSection = Static<typeof StandoffSectionSchema>;

function debtLines(section: StandoffSection, levelSince: (agent: string) => number): readonly string[] {
	const { debts } = section;
	const owes = (holder: string, needer: string): boolean => debts.some((debt) => debt.holder === holder && debt.needer === needer);
	return [...debts]
		.sort((a, b) => levelSince(a.needer) - levelSince(b.needer))
		.map((debt) => {
			const waited = section.minute - levelSince(debt.needer);
			const mutual = owes(debt.needer, debt.holder) ? " · they wait on each other" : "";
			return `- ${debt.holder} has not handed ${debt.needer} ${debt.labels.join(" and ")}; ${debt.needer} has stood before door ${String(debt.level)} for ${String(waited)} min${mutual}`;
		});
}

function unusedLines({ unused }: StandoffSection): readonly string[] {
	if (unused.length === 0) return [];
	return [
		"Handed over but not used (the city never confirms a value; you may point the needer to the message):",
		...unused.map((entry) => `- ${entry.holder} wrote ${entry.needer} ${entry.label} at minute ${String(entry.minute)}; ${entry.needer} still stands before door ${String(entry.level)} and may not have seen it`),
	];
}

/**
 * The "Standoffs" block with the blank line after it, or none (old `standoffLines`).
 *
 * @param section - The fact's value.
 * @param levelSince - The tick a resident entered its level, as the gamemaker tracks it (0 when untracked).
 * @returns The lines.
 */
export function renderStandoffSection(section: StandoffSection, levelSince: (agent: string) => number): readonly string[] {
	const { debts, city, ultimatums, unused } = section;
	if (debts.length === 0 && city.length === 0 && ultimatums.length === 0 && unused.length === 0) return [];
	return [
		"Standoffs (pieces not handed over; the city sees a hand-over when the holder writes the value to the one who needs it):",
		...debtLines(section, levelSince),
		...city.map((entry) => `- the city ${entry.seized ? "has seized" : "keeps"} ${entry.label} of ${entry.from} for ${entry.needer}; ${entry.needer} may buy it with claimPiece for ${String(entry.price)} points`),
		...ultimatums.map((entry) => `- ultimatum ${String(entry.number)}: ${entry.between.join(" and ")}, due at minute ${String(entry.until)}, ${String(entry.penalty)} points`),
		...unusedLines(section),
		"",
	];
}

/**
 * The "At risk" block with the blank line after it, or none (old `riskLines`).
 *
 * @param section - The fact's value.
 * @returns The lines.
 */
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

