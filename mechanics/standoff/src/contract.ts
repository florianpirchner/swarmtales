// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `standoff`: its events, and the three services it asks of others. `held-pieces` (what a
 * resident holds for others, provided by `puzzles`), `ransom-price` (what a ransom costs now) and `trial-risk` (who
 * stands trial next), both provided by `tribunal`, are declared here, as `progression` declares `level-pieces`: their providers import this file, and
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
 * The events of `standoff`, field for field as the old platform wrote them.
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
	ultimatum_set: Type.Object(
		{
			number: Type.Integer({ description: "The ultimatum's number, from 1" }),
			between: Ids,
			until: Type.Integer({ description: "The tick it is due" }),
			penalty: Type.Integer({ description: "What a holdout loses" }),
			debts: Type.Array(Type.Object({ holder: Id, needer: Id, level: Level, pieces: Type.Array(PieceId, { description: "The pieces owed" }) }, { description: "What one side owes the other" }), { description: "The debts it binds" }),
		},
		{ description: "The gamemaker gave two residents who hold pieces for each other a deadline" },
	),
	ultimatum_resolved: Type.Object(
		{
			number: Type.Integer({ description: "The ultimatum's number" }),
			kept: Ids,
			released: Ids,
			paid: Type.Array(Type.Object({ agent: Id, points: Type.Integer({ description: "The points lost" }) }, { description: "A holdout and its loss" }), { description: "Who did not hand over" }),
		},
		{ description: "An ultimatum came due: who handed over, who owed nothing any more, who paid" },
	),
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

const Risk = Type.Object(
	{ opens: Type.Integer({ description: "The tick the next trial opens" }), now: Type.Boolean({ description: "Whether it runs now" }), accused: Ids },
	{ additionalProperties: false, description: "The next trial and its accused" },
);

/**
 * What the gamemaker's report of `standoff` asks of the tribunal: who stands trial next (old `TribunalViewApi.atRisk`;
 * erratum J85 left it without a provider), provided by `tribunal`. Without a provider only the residents at the gate
 * are at risk.
 *
 * @public
 */
export const TrialRiskService = defineService({
	name: "trial-risk",
	summary: "Who stands trial next, and when.",
	methods: {
		atRisk: {
			kind: "query",
			summary: "The next trial and its accused, or null without one or with nobody at risk (old `atRisk`).",
			input: Type.Object({}, { additionalProperties: false, description: "Nothing" }),
			output: Type.Union([Risk, Type.Null({ description: "Nobody at risk" })], { description: "The next trial" }),
		},
	},
});
