// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

/**
 * The card table's events, declared apart so a listener needs no value import of the mechanic.
 *
 * @public
 */
export const CardTableEvents = defineEvents("card-table", {
	cards_dealt: Type.Object({
		deal: Type.Integer({ description: "The deal's number in the run, from 1." }),
		cards: Type.Integer({ description: "Cards each seat got." }),
		hands: Type.Record(Type.String(), Type.Array(Type.String()), { description: "Every seat's hand right after the deal (secret: audience human only)." }),
	}),
});
