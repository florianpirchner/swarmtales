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

/** What one holder still owes one needer at one door. */
const Debt = Type.Object(
	{
		holder: Id,
		needer: Id,
		level: Type.Integer({ description: "The door" }),
		pieces: Type.Array(Type.Object({ id: Type.String({ description: "The piece" }), label: Type.String({ description: "How a text names it" }) }, { description: "One piece owed" }), { description: "The pieces owed" }),
	},
	{ description: "What one side owes the other" },
);

const Ultimatum = Type.Object(
	{
		number: Type.Integer({ description: "Its number, from 1" }),
		between: Type.Array(Id, { description: "The two residents" }),
		until: Type.Integer({ description: "The tick it is due" }),
		penalty: Type.Number({ description: "What a holdout loses" }),
		debts: Type.Array(Debt, { description: "The debts it binds" }),
	},
	{ description: "A running ultimatum" },
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
		ultimatums: Type.Array(Ultimatum, { description: "The ultimatums still running, in the order given" }),
		last: Type.Integer({ description: "The number of the last ultimatum given" }),
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

/** What one holder still owes one needer at one door. */
export type Debt = Static<typeof Debt>;

/** A running ultimatum. */
export type Ultimatum = Static<typeof Ultimatum>;

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
	"standoff/tools/ultimatum": [],
	"standoff/replies/ultimatum-given": ["number", "between", "until", "penalty"],
} as const;
