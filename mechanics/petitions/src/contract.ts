// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The service contract of the mechanic `petitions`: the only file another mechanic imports. It holds the service
 * `petitions` that opens a petition (the old `PetitionsApi`, asked by the story's script) and the events of a
 * petition, `petition_resolved` among them, which the script listens to for its `onPass` and `onFail` actions.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const petitionId = Type.String({ description: "The petition's id, for example `P1`" });
const visibility = Type.Union([Type.Literal("public"), Type.Literal("secret")], { description: "Whether the signers are named (`public`) or only counted (`secret`)" });
const outcome = Type.Union([Type.Literal("passed"), Type.Literal("failed")], { description: "How the petition ended" });
const ids = Type.Array(Type.String({ description: "A resident id" }), { description: "Resident ids, in signing order" });

/**
 * The events of `petitions`, payloads in the old key order.
 *
 * @public
 */
export const PetitionsEvents = defineEvents("petitions", {
	petition_opened: Type.Object(
		{
			petition: petitionId,
			text: Type.String({ description: "The text of the petition" }),
			threshold: Type.Integer({ description: "The signatures it needs to pass" }),
			deadlineMinute: Type.Integer({ description: "The tick at whose start it fails when still open" }),
			visibility,
			against: Type.Array(Type.String({ description: "A resident id" }), { description: "The residents the petition is aimed at, as the opener names them" }),
		},
		{ description: "A petition was opened" },
	),
	petition_signed: Type.Object(
		{ petition: petitionId, agent: Type.String({ description: "The resident that signed" }), signatures: Type.Integer({ description: "The signatures after this one" }) },
		{ description: "A resident signed a petition" },
	),
	petition_resolved: Type.Object({ petition: petitionId, outcome, signatures: Type.Integer({ description: "The signatures it ended with" }), signers: ids }, { description: "A petition passed or failed" }),
});

/**
 * The threshold of a petition: a count of signatures, or a fraction of the residents rounded up.
 *
 * @public
 */
export const Threshold = Type.Union(
	[
		Type.Object({ count: Type.Integer({ minimum: 1, description: "The signatures it needs" }) }, { description: "A count" }),
		Type.Object({ fraction: Type.Number({ exclusiveMinimum: 0, maximum: 1, description: "The share of the residents, rounded up" }) }, { description: "A fraction" }),
	],
	{ description: "What a petition needs to pass" },
);

/**
 * What another mechanic (the story's script) calls to open a petition.
 *
 * @public
 */
export const PetitionsService = defineService({
	name: "petitions",
	summary: "Petitions residents sign.",
	methods: {
		open: {
			kind: "command",
			summary: "Opens a petition (old `openPetition`): writes `petition_opened` and the city's board post. A taken id is refused with `DUPLICATE_PETITION`.",
			input: Type.Object(
				{
					id: petitionId,
					text: Type.String({ description: "The text of the petition" }),
					threshold: Threshold,
					deadlineMinute: Type.Integer({ description: "The tick at whose start it fails when still open" }),
					visibility,
					against: Type.Optional(Type.Array(Type.String({ description: "A resident id" }), { description: "The residents the petition is aimed at" })),
				},
				{ additionalProperties: false, description: "The petition" },
			),
			output: Type.Union(
				[
					Type.Object({ ok: Type.Literal(true, { description: "Opened" }) }, { additionalProperties: false, description: "Opened" }),
					Type.Object(
						{ ok: Type.Literal(false, { description: "Not opened" }), code: Type.String({ description: "The refusal code" }), detail: Type.Optional(Type.String({ description: "What was refused" })) },
						{ additionalProperties: false, description: "Refused" },
					),
				],
				{ description: "Whether it was opened" },
			),
		},
	},
});
