/** The events of the standoff mechanic: the old events field for field (packages/chronicle event-schema.ts) without `type`, `seq`, `minute`. */
import { Type } from "typebox";

const Id = Type.String();
const Ids = Type.Array(Type.String());
const Int = Type.Integer();

export const standoffEvents = {
	piece_kept: Type.Object({ agent: Id, level: Int, piece: Type.String(), needers: Ids, cause: Type.Union([Type.Literal("exile"), Type.Literal("ultimatum")]) }),
	piece_claimed: Type.Object({ agent: Id, from: Id, level: Int, piece: Type.String(), price: Int }),
	piece_given: Type.Object({ holder: Id, needer: Id, level: Int, piece: Type.String() }),
	ultimatum_set: Type.Object({
		number: Int,
		between: Ids,
		until: Int,
		penalty: Int,
		debts: Type.Array(Type.Object({ holder: Id, needer: Id, level: Int, pieces: Type.Array(Type.String()) })),
	}),
	ultimatum_resolved: Type.Object({ number: Int, kept: Ids, released: Ids, paid: Type.Array(Type.Object({ agent: Id, points: Int })) }),
} as const;
