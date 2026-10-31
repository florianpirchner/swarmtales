/**
 * The standoff's part of the gamemaker's situation (carve-decisions.md D-8, the old `standoffLines`
 * of situation.ts): outstanding debts, the city's pieces, hand-overs not used yet, the running
 * ultimatums and the city's price. Facts may not call other mechanics, so what needs the puzzles,
 * progression or the tribunal (debts, unused hand-overs, the price) is taken at the end of each
 * minute into `StandoffSituation`, and the facts read it (request R2-5).
 */
import { Type, type Static } from "typebox";
import { HeldPiece } from "@swarmtales/mechanic-shared";
import type { CityPiece, StandoffBook } from "./book.ts";

const Id = Type.String();
const Int = Type.Integer();

export const Outstanding = Type.Array(Type.Object({ holder: Id, needer: Id, level: Int, pieces: Type.Array(HeldPiece) }));
export const CityPieces = Type.Array(Type.Object({ from: Id, piece: HeldPiece, claimed: Type.Array(Id), price: Type.Optional(Type.Number()) }));
export const Unused = Type.Array(Type.Object({ holder: Id, needer: Id, label: Type.String(), level: Int, minute: Int }));
export const Ultimatums = Type.Array(Type.Object({ number: Int, between: Type.Tuple([Id, Id]), until: Int, penalty: Int }));

export interface StandoffSituation {
	readonly outstanding: Static<typeof Outstanding>;
	readonly unused: Static<typeof Unused>;
	readonly cityPiecePrice: number;
}

export function emptySituation(): StandoffSituation {
	return { outstanding: [], unused: [], cityPiecePrice: 0 };
}

/** A kept piece's kind, from its id (`L8-certificate`, `L8-counter-A02`, `L3-fragment`). */
function kindOf(id: string): HeldPiece["kind"] {
	if (id.includes("-counter-")) return "counter";
	return id.includes("-certificate") ? "certificate" : "fragment";
}

export function cityPiecesOf(city: readonly CityPiece[]): Static<typeof CityPieces> {
	return city.map((entry) => ({
		from: entry.from,
		piece: { id: entry.piece.id, kind: kindOf(entry.piece.id), level: entry.piece.level, label: entry.piece.label, value: entry.piece.value, needers: [...entry.piece.needers] },
		claimed: [...entry.claimed],
		...(entry.price === undefined ? {} : { price: entry.price }),
	}));
}

/** What the facts read until the next minute's end: the book's debts with the held pieces they name, and the unused hand-overs. */
export function situationOf(book: StandoffBook, held: (agent: string) => readonly HeldPiece[], cityPiecePrice: number): StandoffSituation {
	const outstanding = book.outstanding().map((debt) => {
		const pieces = held(debt.holder);
		return { holder: debt.holder, needer: debt.needer, level: debt.level, pieces: debt.pieces.flatMap((entry) => pieces.filter((piece) => piece.id === entry.id).map((piece) => ({ ...piece, needers: [...piece.needers] }))) };
	});
	const unused = book.unused().map((entry) => ({ holder: entry.holder, needer: entry.needer, label: entry.label, level: entry.level, minute: entry.minute }));
	return { outstanding, unused, cityPiecePrice };
}
