// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a base mechanic (`channels`) asks to print the marks a resident has left in its reply (`marks 7/8 left`). The
 * mechanic `marks` provides it and charges the price in its own stage handlers on the tools of `channels`, by bare
 * name. When no provider is loaded, the caller's `tryCall` comes back empty and the reply carries no marks part
 * (12-m5-spec.md, section 2.2, pattern 4).
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

const resident = Type.String({ description: "A resident id, for example `A03`" });
const channel = Type.Union([Type.Literal("board"), Type.Literal("group"), Type.Literal("dm"), Type.Literal("receipt")], {
	description: "What a message is sent on: the board, a group, a direct message, or showing a receipt",
});
const marksLeft = Type.Object(
	{
		remaining: Type.Number({ description: "The marks left in the current window" }),
		budget: Type.Number({ description: "The marks of a full window" }),
	},
	{ additionalProperties: false, description: "A resident's marks in the current window" },
);

/**
 * The marks left to a resident and the price of a message: the service `allowance`.
 *
 * @public
 */
export const AllowanceService = defineService({
	name: "allowance",
	summary: "The marks a resident has left and what a message costs it, for the replies of the message tools.",
	methods: {
		left: {
			kind: "query",
			summary: "The resident's marks in the current window, or null where marks do not apply (old `left` of `marks`).",
			input: Type.Object({ resident }, { additionalProperties: false, description: "One resident" }),
			output: Type.Union([marksLeft, Type.Null({ description: "Marks do not apply" })], { description: "The marks left, or null" }),
		},
		priceOf: {
			kind: "query",
			summary: "What a message on the channel costs the resident now, or null where marks do not apply (old `priceOf` of `marks`).",
			input: Type.Object({ resident, channel }, { additionalProperties: false, description: "One resident and a channel" }),
			output: Type.Union([Type.Number({ description: "The price in marks" }), Type.Null({ description: "Marks do not apply" })], { description: "The price, or null" }),
		},
	},
});
