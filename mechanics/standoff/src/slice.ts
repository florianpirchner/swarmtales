/** The standoff's snapshot slice: version 1, migrated from the converter's version-0 slice `{ standoff: <old StandoffSnapshot> }`. */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { StandoffData } from "./book.ts";
import { emptySituation, type StandoffSituation } from "./situation.ts";

const Id = Type.String();
const Piece = Type.Object({ id: Type.String(), level: Type.Integer(), label: Type.String(), value: Type.String(), needers: Type.Array(Id) });
const Debt = Type.Object({ holder: Id, needer: Id, level: Type.Integer(), pieces: Type.Array(Type.Object({ id: Type.String(), label: Type.String() })) });

export const StandoffSlice = Type.Object({
	/** Hand-overs sorted by their `holder>needer>piece` key (the old snapshot order), with their minute. */
	given: Type.Array(Type.Object({ key: Type.String(), minute: Type.Integer() })),
	city: Type.Array(Type.Object({ from: Id, piece: Piece, claimed: Type.Array(Id), price: Type.Optional(Type.Number()) })),
	ultimatums: Type.Array(Type.Object({ number: Type.Integer(), between: Type.Array(Id), until: Type.Integer(), penalty: Type.Number(), debts: Type.Array(Debt) })),
	last: Type.Integer(),
});

/** The old `StandoffSnapshot` (world.ts `standoff`): `givenAt` is absent in older files, the whole field in files of worlds that wrote none. */
const Old = Type.Object({
	standoff: Type.Optional(
		Type.Object({
			given: Type.Array(Type.String()),
			givenAt: Type.Optional(Type.Record(Type.String(), Type.Integer())),
			city: StandoffSlice.properties.city,
			ultimatums: StandoffSlice.properties.ultimatums,
			lastUltimatum: Type.Integer(),
		}),
	),
});

export interface HasStandoff {
	data: StandoffData;
	situation: StandoffSituation;
}

export const standoffSnapshot = {
	version: 1,
	schema: StandoffSlice,
	save: (state: HasStandoff): Static<typeof StandoffSlice> => ({
		given: [...state.data.given].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, minute]) => ({ key, minute })),
		city: state.data.city.map((entry) => ({
			from: entry.from,
			piece: { id: entry.piece.id, level: entry.piece.level, label: entry.piece.label, value: entry.piece.value, needers: [...entry.piece.needers] },
			claimed: [...entry.claimed],
			...(entry.price === undefined ? {} : { price: entry.price }),
		})),
		ultimatums: state.data.ultimatums.map((ultimatum) => ({
			number: ultimatum.number,
			between: [...ultimatum.between],
			until: ultimatum.until,
			penalty: ultimatum.penalty,
			debts: ultimatum.debts.map((debt) => ({ holder: debt.holder, needer: debt.needer, level: debt.level, pieces: debt.pieces.map((piece) => ({ ...piece })) })),
		})),
		last: state.data.last,
	}),
	load: (data: Static<typeof StandoffSlice>): HasStandoff => ({
		data: {
			given: new Map(data.given.map((entry) => [entry.key, entry.minute])),
			city: data.city.map((entry) => ({ ...entry, piece: { ...entry.piece }, claimed: [...entry.claimed] })),
			ultimatums: data.ultimatums.map((ultimatum) => ({ ...ultimatum })),
			last: data.last,
		},
		// Taken again at the end of the first minute played.
		situation: emptySituation(),
	}),
	migrations: {
		0: (old: unknown): Static<typeof StandoffSlice> => {
			const { standoff } = Parse(Old, old);
			if (standoff === undefined) return { given: [], city: [], ultimatums: [], last: 0 };
			return {
				given: standoff.given.map((key) => ({ key, minute: standoff.givenAt?.[key] ?? 0 })),
				city: standoff.city,
				ultimatums: standoff.ultimatums,
				last: standoff.lastUltimatum,
			};
		},
	},
} as const;
