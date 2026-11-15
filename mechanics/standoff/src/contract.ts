// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `standoff`: its events, and the two services it asks of others. `held-pieces` (what a
 * resident holds for others, provided by `puzzles`) and `ransom-price` (what a ransom costs now, provided by
 * `tribunal`) are declared here, as `progression` declares `level-pieces`: their providers import this file, and
 * `standoff` imports neither, so no package or service cycle forms (12-m5-spec.md, section 2.2, pattern 5). The only
 * file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type, type Static } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Ids = Type.Array(Id, { description: "Resident ids" });
const Level = Type.Integer({ description: "The level of the piece's door" });
const PieceId = Type.String({ description: "The id of a piece, for example `L8-counter-A02` or `L8-certificate`" });

/**
 * A piece a resident holds that others need (old `HeldPiece`).
 *
 * @public
 */
export const HeldPiece = Type.Object(
	{
		id: PieceId,
		kind: Type.Union([Type.Literal("counter"), Type.Literal("certificate"), Type.Literal("fragment")], { description: "A counter-factor, a team certificate or a fragment" }),
		level: Level,
		label: Type.String({ description: "How a text names it, for example `the counter-factor of A02 for door 8`" }),
		value: Type.String({ description: "The piece itself" }),
		needers: Type.Array(Id, { description: "Who needs it, in team-member order" }),
	},
	{ additionalProperties: false, description: "One piece held for others" },
);

/**
 * The static shape of a held piece.
 *
 * @public
 */
export type HeldPiece = Static<typeof HeldPiece>;

/**
 * The events of `standoff`, field for field as the old platform wrote them (the ultimatum's two come with its tool).
 *
 * @public
 */
export const StandoffEvents = defineEvents("standoff", {
	piece_kept: Type.Object(
		{ agent: Id, level: Level, piece: PieceId, needers: Ids, cause: Type.Union([Type.Literal("exile"), Type.Literal("ultimatum")], { description: "Why the city keeps it" }) },
		{ description: "The city keeps a piece an exiled resident held for others, and sells it to its needers" },
	),
	piece_claimed: Type.Object(
		{ agent: Id, from: Id, level: Level, piece: PieceId, price: Type.Integer({ description: "The points paid; 0 for every piece of one purchase but the first" }) },
		{ description: "A needer bought a piece the city keeps" },
	),
	piece_given: Type.Object({ holder: Id, needer: Id, level: Level, piece: PieceId }, { description: "The city saw a holder hand a piece to its needer, in a text or a last will" }),
});

/**
 * What `standoff` asks of the deal: every piece a resident holds for others (old `PuzzlesApi.heldPieces`), provided
 * by `puzzles`. Without a provider nobody holds anything.
 *
 * @public
 */
export const HeldPiecesService = defineService({
	name: "held-pieces",
	summary: "The pieces a resident holds for others on the levels dealt.",
	methods: {
		held: {
			kind: "query",
			summary: "Every piece the resident holds for others on the levels it has reached, by level, the needers in team-member order (old `heldPieces`).",
			input: Type.Object({ resident: Id }, { additionalProperties: false, description: "The resident" }),
			output: Type.Array(HeldPiece, { description: "The pieces" }),
		},
	},
});

/**
 * What `standoff` asks for the price of the city's pieces: what others pay for a ransom of a gate opening now (old
 * `TribunalApi.ransomPrices().price`), provided by `tribunal`. Without a provider the city's pieces cost 0.
 *
 * @public
 */
export const RansomPriceService = defineService({
	name: "ransom-price",
	summary: "What others pay for a ransom now.",
	methods: {
		price: {
			kind: "query",
			summary: "What others pay in full for the ransom of a gate that opened now.",
			input: Type.Object({}, { additionalProperties: false, description: "Nothing" }),
			output: Type.Integer({ description: "The points" }),
		},
	},
});
