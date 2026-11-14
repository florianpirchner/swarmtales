// SPDX-License-Identifier: Apache-2.0
/** The head of the `decisions` mechanic: its option, its slice, its events and the service it provides. */
import { Type, type Static } from "typebox";
import { defineHead } from "@swarmtales/sdk";
import { DecisionsEvents, DecisionsService } from "./contract.ts";

const Amendment = Type.Object(
	{
		by: Type.String({ description: "The actor id of the holder." }),
		seq: Type.Integer({ description: "The seq of the amending call's `tool_called`." }),
		proposal: Type.Unknown({ description: "The proposal the holder put in place." }),
		reason: Type.String({ description: "The holder's reason." }),
	},
	{ description: "One amendment of an open decision." },
);

const Open = Type.Object(
	{
		kind: Type.String({ description: "What is decided, as the owner names it." }),
		owner: Type.String({ description: "The id of the mechanic that proposed it." }),
		proposal: Type.Unknown({ description: "The original proposal." }),
		schema: Type.Optional(Type.Unknown({ description: "A JSON schema every amended proposal must fit." })),
		deadline: Type.Integer({ description: "The tick at whose start it settles." }),
		amendments: Type.Array(Amendment, { description: "The amendments, in order; the last one stands." }),
	},
	{ description: "One open decision." },
);

/** One open decision as the slice holds it. */
export type OpenDecision = Static<typeof Open>;

/** The head of the mechanic. */
export const head = defineHead({
	id: "decisions",
	package: "@swarmtales/mechanic-decisions",
	summary: "A decision window: a proposal that its holders may amend before it settles.",
	provides: [DecisionsService],
	options: Type.Object({
		holders: Type.Array(Type.String(), { default: [], description: "The actor ids that may amend a decision (`human`, `director:warden`, `resident:A01`). An id that is no actor of the run is refused when the run is created." }),
	}),
	state: Type.Object({ next: Type.Integer({ description: "The number of the next decision id." }), open: Type.Record(Type.String(), Open, { description: "The open decisions by id." }) }, { description: "The open decisions." }),
	start: () => ({ next: 1, open: {} }),
	events: DecisionsEvents.events,
});
