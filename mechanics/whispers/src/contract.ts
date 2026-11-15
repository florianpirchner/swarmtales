// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `whispers`: its events and the service `whispers`, through which another game mechanic
 * (`motives`) asks who the whisperer is (one direction: `whispers` asks none of them). The only file another
 * mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A06`" });
const Round = Type.Integer({ description: "The round of the vote, from 1" });
const Ids = (description: string) => Type.Array(Id, { description });

/**
 * The events of `whispers`, payloads in the old key order.
 *
 * @public
 */
export const WhispersEvents = defineEvents("whispers", {
	whisperer_chosen: Type.Object({ agent: Id }, { description: "The city chose its whisperer, at the start of a run" }),
	whisper_duty: Type.Object(
		{
			agent: Id,
			since: Type.Integer({ description: "The first tick of the window the notice reports on" }),
			dms: Type.Integer({ description: "The direct messages the whisperer sent in the window" }),
			forgeries: Type.Integer({ description: "The receipts it forged in the window" }),
			whispers: Type.Optional(Type.Integer({ description: "Its whispers in the window, where its orders are measured" })),
			recipients: Type.Optional(Ids("The residents its whispers reached, sorted")),
			met: Type.Optional(Type.Boolean({ description: "Whether it met its orders" })),
			target: Type.Optional(Type.String({ description: "The most liked resident of the vote, its next aim" })),
		},
		{ description: "The city sent the whisperer its duty notice" },
	),
	popularity_opened: Type.Object(
		{ round: Round, until: Type.Integer({ description: "The tick at whose start it is counted" }), points: Type.Integer({ description: "The points each winner gets" }) },
		{ description: "A round of the popularity vote opened" },
	),
	popularity_ballot: Type.Object({ round: Round, agent: Id, choice: Id }, { description: "A resident cast a secret ballot" }),
	popularity_result: Type.Object(
		{
			round: Round,
			counts: Type.Array(Type.Object({ agent: Id, votes: Type.Integer({ description: "The votes it got" }) }, { description: "One resident's votes" }), { description: "Every resident in the city, the most liked first" }),
			winners: Ids("The most liked, more than one on a tie; none without a vote"),
			points: Type.Integer({ description: "The points each winner got" }),
			voters: Ids("The residents whose ballot counted, sorted"),
		},
		{ description: "A round of the popularity vote was counted" },
	),
	receipt_forged: Type.Object(
		{
			receipt: Type.String({ description: "The receipt's id" }),
			by: Id,
			to: Id,
			from: Id,
			number: Type.Integer({ description: "The number of the direct message" }),
			text: Type.String({ description: "What the receipt quotes in truth, empty where it quotes nothing" }),
			forged: Type.String({ description: "What the forged receipt quotes" }),
		},
		{ description: "The whisperer showed a resident a receipt of a real direct message with a text of its own" },
	),
});

/**
 * Who the whisperer is: the service `whispers` (old `WhispersApi`).
 *
 * @public
 */
export const WhispersService = defineService({
	name: "whispers",
	summary: "The game's whisperer.",
	methods: {
		whisperer: {
			kind: "query",
			summary: "The resident the city chose as the whisperer, or null when none plays (a control run, a game without one).",
			input: Type.Object({}, { additionalProperties: false, description: "Nothing" }),
			output: Type.Union([Id, Type.Null({ description: "No whisperer plays" })], { description: "The whisperer, or null" }),
		},
	},
});
