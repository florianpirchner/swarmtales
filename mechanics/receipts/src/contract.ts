// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `receipts`: its events. The only file another mechanic imports; the ids of receipts
 * are asked through `receipt-source` of `mechanics/contracts`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id" });

/**
 * The events of `receipts`, in the old field order.
 *
 * @public
 */
export const ReceiptsEvents = defineEvents("receipts", {
	receipt_issued: Type.Object(
		{
			receipt: Type.String({ description: "The receipt's id" }),
			kind: Type.String({ description: "`transfer`, `deposit`, `withdrawal`, `levelUp` or `dm`" }),
			parties: Type.Array(Id, { description: "Who may show it" }),
			text: Type.String({ description: "Its line" }),
		},
		{ description: "The city issued a receipt; written in the listener of the event it is the receipt of" },
	),
	receipt_shown: Type.Object(
		{ receipt: Type.String({ description: "The receipt's id" }), by: Id, postSeq: Type.Optional(Type.Integer({ description: "The board post that shows it" })), to: Type.Optional(Id) },
		{ description: "A party showed a receipt, on the board (`postSeq`) or to one resident (`to`)" },
	),
});
