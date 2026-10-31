/**
 * The seal's snapshot slice: version 1, migrated from the converter's version-0 slice, which holds
 * the old `SealSnapshot` under the key `seal` (world.ts `seal`), or nothing while the act's seal has
 * not begun (the old world wrote no `seal` then).
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { SealData } from "./house.ts";

const Id = Type.String();
const Stage = Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("held"), Type.Literal("used"), Type.Literal("gone")]);

/** The old `SealSnapshot` field for field; it is also the version-1 slice. */
const Saved = Type.Object({
	actStart: Type.Integer(),
	seals: Type.Array(
		Type.Object({
			seal: Type.Integer(),
			opens: Type.Integer(),
			until: Type.Integer(),
			bids: Type.Array(Type.Object({ agent: Id, points: Type.Integer() })),
			state: Stage,
			holder: Type.Optional(Id),
		}),
	),
});

export const SealSlice = Type.Object({ seal: Type.Optional(Saved) });
type Slice = Static<typeof SealSlice>;

export interface HasSeal {
	data: SealData;
}

function save(state: HasSeal): Slice {
	const { actStart, seals } = state.data;
	if (actStart === undefined) return {};
	return {
		seal: {
			actStart,
			seals: seals.map((seal) => ({
				seal: seal.seal,
				opens: seal.opens,
				until: seal.until,
				bids: [...seal.bids].map(([agent, points]) => ({ agent, points })),
				state: seal.state,
				...(seal.holder === undefined ? {} : { holder: seal.holder }),
			})),
		},
	};
}

function load(slice: Slice): HasSeal {
	const saved = slice.seal;
	if (saved === undefined) return { data: { actStart: undefined, seals: [] } };
	return {
		data: {
			actStart: saved.actStart,
			seals: saved.seals.map((seal) => ({
				seal: seal.seal,
				opens: seal.opens,
				until: seal.until,
				bids: new Map(seal.bids.map((entry) => [entry.agent, entry.points])),
				state: seal.state,
				...(seal.holder === undefined ? {} : { holder: seal.holder }),
			})),
		},
	};
}

export const sealSnapshot = {
	version: 1,
	schema: SealSlice,
	save,
	load,
	// The converter's version 0 is `{ seal?: <old SealSnapshot> }`: the same shape, checked.
	migrations: { 0: (old: unknown): Slice => Parse(SealSlice, old) },
} as const;
