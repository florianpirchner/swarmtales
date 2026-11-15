// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standoff's part of the gamemaker's situation, carried from old `mechanics/standoff/src/situation.ts` and
 * `section.ts`: outstanding debts, the city's pieces, hand-overs not used yet, the running ultimatums, and the data
 * of the report's "Standoffs" and "At risk" blocks (the fact `section`, in the shape of `StandoffSectionSchema` of
 * `mechanics/city-directors/src/gamemaker/report/standoff.ts`, decision A73; the gamemaker renders it). The facts
 * compute them when they are read, through queries; nothing is cached, and no piece's value is in `section`.
 */
import { Type, type Static } from "typebox";
import type { Standing } from "@swarmtales/mechanic-exile/contract";
import type { StandoffBook } from "./book.ts";
import { HeldPiece } from "./contract.ts";
import type { CityPiece } from "./model.ts";

const Id = Type.String({ description: "A resident id" });
const Int = (description: string) => Type.Integer({ description });
const Labels = (description: string) => Type.Array(Type.String({ description: "A label" }), { description });

/**
 * The fact `outstanding`: pieces holders in the city still owe residents before their door.
 *
 * @public
 */
export const Outstanding = Type.Array(Type.Object({ holder: Id, needer: Id, level: Int("The door"), pieces: Type.Array(HeldPiece, { description: "The pieces owed" }) }, { description: "One debt" }), { description: "The debts" });

/**
 * The fact `cityPieces`: the pieces the city keeps or seized, who bought each, a seized piece's price.
 *
 * @public
 */
export const CityPieces = Type.Array(
	Type.Object({ from: Id, piece: HeldPiece, claimed: Type.Array(Id, { description: "Who bought it" }), price: Type.Optional(Type.Number({ description: "A seized piece's price" })) }, { description: "A piece of the city" }),
	{ description: "The city's pieces" },
);

/**
 * The fact `unused`: hand-overs whose needer still stands before the door.
 *
 * @public
 */
export const Unused = Type.Array(Type.Object({ holder: Id, needer: Id, label: Type.String({ description: "The piece" }), level: Int("The door"), minute: Int("Written at") }, { description: "A hand-over not used" }), { description: "Hand-overs not used" });

const Running = Type.Object({ number: Int("Its number"), between: Type.Tuple([Id, Id], { description: "The two" }), until: Int("Due at"), penalty: Int("Its price") }, { description: "An ultimatum" });

/**
 * The fact `ultimatums`: the running ultimatums.
 *
 * @public
 */
export const Ultimatums = Type.Array(Running, { description: "The ultimatums" });

/**
 * The fact `section`: the old `StandoffSectionFact`, the shape of the gamemaker's `StandoffSectionSchema`.
 *
 * @public
 */
export const StandoffSectionFact = Type.Object(
	{
		minute: Int("The tick of the report"),
		debts: Type.Array(Type.Object({ holder: Id, needer: Id, level: Int("The door"), labels: Labels("The pieces") }, { description: "Pieces not handed over" }), { description: "The old outstanding pieces" }),
		city: Type.Array(
			Type.Object({ from: Id, label: Type.String({ description: "The piece" }), needer: Id, seized: Type.Boolean({ description: "Seized, not kept" }), price: Type.Number({ description: "Its price" }) }, { description: "A piece of the city" }),
			{ description: "The city's pieces for needers before their door" },
		),
		ultimatums: Ultimatums,
		unused: Unused,
		risk: Type.Union([Type.Object({ opens: Int("The trial opens"), now: Type.Boolean({ description: "It runs now" }) }, { description: "The next trial" }), Type.Null({ description: "None" })], { description: "The tribunal's foresight" }),
		atRisk: Type.Array(
			Type.Object({ agent: Id, points: Type.Number({ description: "Its points" }), gate: Type.Union([Int("At the gate until"), Type.Null({ description: "Not at the gate" })], { description: "Its gate" }), holds: Labels("What it holds for others") }, { description: "One at risk" }),
			{ description: "The accused of the next tribunal and the residents at the gate" },
		),
	},
	{ description: "The standoff's part of the gamemaker's report" },
);

/**
 * The value of the fact `section`.
 *
 * @public
 */
export type StandoffSection = Static<typeof StandoffSectionFact>;

/** What the section reads of the other mechanics. */
export interface SectionReads {
	readonly minute: number;
	readonly alive: readonly string[];
	readonly standing: (agent: string) => Static<typeof Standing>;
	readonly levelOf: (agent: string) => number;
	readonly hasPassed: (agent: string, level: number) => boolean;
	readonly isExiled: (agent: string) => boolean;
	readonly points: (agent: string) => number;
	readonly held: (agent: string) => readonly HeldPiece[];
	readonly atRisk: () => { readonly opens: number; readonly now: boolean; readonly accused: readonly string[] } | null;
	readonly cityPiecePrice: () => number;
}

// A kept piece's kind, from its id (`L8-certificate`, `L8-counter-A02`, `L3-fragment`).
function kindOf(id: string): HeldPiece["kind"] {
	if (id.includes("-counter-")) return "counter";
	return id.includes("-certificate") ? "certificate" : "fragment";
}

/**
 * The city's pieces as the fact shows them.
 *
 * @param city - The state's pieces.
 * @returns The fact's value.
 */
export function cityPiecesOf(city: readonly CityPiece[]): Static<typeof CityPieces> {
	return city.map((entry) => ({
		from: entry.from,
		piece: { id: entry.piece.id, kind: kindOf(entry.piece.id), level: entry.piece.level, label: entry.piece.label, value: entry.piece.value, needers: [...entry.piece.needers] },
		claimed: [...entry.claimed],
		...(entry.price === undefined ? {} : { price: entry.price }),
	}));
}

/**
 * The book's debts with the held pieces they name (old `outstandingPieces`).
 *
 * @param book - The book.
 * @param held - Every piece a resident holds for others.
 * @returns The fact's value.
 */
export function outstandingOf(book: StandoffBook, held: (agent: string) => readonly HeldPiece[]): Static<typeof Outstanding> {
	return book.outstanding().map((debt) => {
		const pieces = held(debt.holder);
		return { holder: debt.holder, needer: debt.needer, level: debt.level, pieces: debt.pieces.flatMap((entry) => pieces.filter((piece) => piece.id === entry.id).map((piece) => ({ ...piece, needers: [...piece.needers] }))) };
	});
}

/**
 * The hand-overs whose needer still stands before the door (old `unusedHandOvers`).
 *
 * @param book - The book.
 * @returns The fact's value.
 */
export function unusedOf(book: StandoffBook): Static<typeof Unused> {
	return book.unused().map((entry) => ({ holder: entry.holder, needer: entry.needer, label: entry.label, level: entry.level, minute: entry.minute }));
}

// Each piece the city keeps or seized for a needer who still stands before its door and has not bought it.
function cityLines(pieces: Static<typeof CityPieces>, reads: SectionReads): StandoffSection["city"] {
	return pieces.flatMap((entry) =>
		entry.piece.needers
			.filter((needer) => !entry.claimed.includes(needer) && reads.standing(needer).kind === "alive" && reads.levelOf(needer) === entry.piece.level && !reads.hasPassed(needer, entry.piece.level))
			.map((needer) => ({ from: entry.from, label: entry.piece.label, needer, seized: entry.price !== undefined, price: entry.price ?? reads.cityPiecePrice() })),
	);
}

// The accused of the next trial and the residents at the gate, with what they hold for needers still before a door.
function atRiskOf(reads: SectionReads, accused: readonly string[]): StandoffSection["atRisk"] {
	const gates = reads.alive.filter((agent) => reads.standing(agent).kind === "gate");
	return [...new Set([...accused, ...gates])].map((agent) => {
		const standing = reads.standing(agent);
		const holds = reads
			.held(agent)
			.filter((piece) => piece.kind !== "fragment")
			.flatMap((piece) => piece.needers.filter((needer) => !reads.isExiled(needer) && !reads.hasPassed(needer, piece.level)).map((needer) => `${piece.label} for ${needer}`));
		return { agent, points: reads.points(agent), gate: standing.kind === "gate" ? standing.until : null, holds };
	});
}

/**
 * The section's data from the standoff's own facts and the reads (old `computeStandoffSection`).
 *
 * @param inputs - The facts `outstanding`, `cityPieces`, `ultimatums` and `unused`.
 * @param inputs.outstanding - The debts.
 * @param inputs.cityPieces - The city's pieces.
 * @param inputs.ultimatums - The running ultimatums.
 * @param inputs.unused - The hand-overs not used.
 * @param reads - What it reads of the other mechanics.
 * @returns The section.
 */
export function computeStandoffSection(
	inputs: { readonly outstanding: Static<typeof Outstanding>; readonly cityPieces: Static<typeof CityPieces>; readonly ultimatums: Static<typeof Ultimatums>; readonly unused: Static<typeof Unused> },
	reads: SectionReads,
): StandoffSection {
	const risk = reads.atRisk();
	return {
		minute: reads.minute,
		debts: inputs.outstanding.map((debt) => ({ holder: debt.holder, needer: debt.needer, level: debt.level, labels: debt.pieces.map((piece) => piece.label) })),
		city: cityLines(inputs.cityPieces, reads),
		ultimatums: inputs.ultimatums.map((entry) => ({ ...entry, between: [entry.between[0], entry.between[1]] })),
		unused: inputs.unused.map((entry) => ({ ...entry })),
		risk: risk === null ? null : { opens: risk.opens, now: risk.now },
		atRisk: atRiskOf(reads, risk?.accused ?? []),
	};
}
