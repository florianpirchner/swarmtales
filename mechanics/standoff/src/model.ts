// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The data of the `standoff` mechanic: its state with the snapshot and its prompts. */
import { Type, type Static } from "typebox";
import { HeldPiece } from "./contract.ts";

const Id = Type.String({ description: "A resident id" });

/** A piece as the book knows it: who must give it to whom, on which door (the held piece without its kind). */
const Piece = Type.Omit(HeldPiece, ["kind"], { description: "A piece the city keeps" });

const CityEntry = Type.Object(
	{
		from: Id,
		piece: Piece,
		claimed: Type.Array(Id, { description: "The needers who bought it" }),
		price: Type.Optional(Type.Number({ description: "A seized piece's fixed price; without it the city's current price holds" })),
	},
	{ description: "A piece the city keeps since its holder left; each needer may buy it once" },
);

/**
 * The state of `standoff`, saved as it is: the hand-overs the city saw and the pieces it keeps.
 *
 * @public
 */
export const StandoffSlice = Type.Object(
	{
		given: Type.Array(Type.Object({ key: Type.String({ description: "`holder>needer>piece`" }), minute: Type.Integer({ description: "The tick it was seen" }) }, { description: "One hand-over" }), {
			description: "The hand-overs the city saw, in the order seen",
		}),
		city: Type.Array(CityEntry, { description: "The pieces the city keeps, in the order kept" }),
	},
	{ description: "The state of `standoff`" },
);

/**
 * The state of `standoff`.
 *
 * @public
 */
export type StandoffState = Static<typeof StandoffSlice>;

/** A piece the city keeps. */
export type CityPiece = StandoffState["city"][number];

/** A piece as the book knows it. */
export type StandoffPiece = Static<typeof Piece>;

/**
 * The prompts of `standoff`, with their variables.
 *
 * @public
 */
export const STANDOFF_PROMPTS = {
	"standoff/tools/claimPiece": [],
	"standoff/replies/piece-bought": ["pieces", "price"],
	"standoff/replies/locked": [],
	"standoff/status/held": ["pieces"],
	"standoff/status/held-piece": ["waiting", "level", "noun", "value"],
	"standoff/will-piece": ["agent", "label", "value"],
} as const;
