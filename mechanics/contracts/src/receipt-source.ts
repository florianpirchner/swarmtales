// SPDX-License-Identifier: Apache-2.0
/**
 * What a base mechanic (`ledger`, `channels`) asks to name the receipt of a booking or a delivered message in its
 * reply. The mechanic `receipts` provides it: it listens to the bookings and the delivered messages and issues the
 * receipts itself, so nobody calls it to issue one. When no provider is loaded, the caller's `tryCall` comes back
 * empty and the old answer says `none` (12-m5-spec.md, section 2.2, pattern 4).
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

const receiptId = Type.Union([Type.String({ description: "The receipt's id" }), Type.Null({ description: "No receipt was issued" })], { description: "The receipt's id, or null" });

/**
 * The receipts of bookings and delivered messages: the service `receipt-source`.
 *
 * @public
 */
export const ReceiptSourceService = defineService({
	name: "receipt-source",
	summary: "The id of the receipt issued for a booking of the ledger or for a delivered direct message.",
	methods: {
		ofTransfer: {
			kind: "query",
			summary: "The id of the receipt issued for the booking `txId` of the ledger, or null (old `ofTransfer` of `receipts`).",
			input: Type.Object({ txId: Type.String({ description: "The id of the ledger's booking" }) }, { additionalProperties: false, description: "One booking" }),
			output: receiptId,
		},
		ofMessage: {
			kind: "query",
			summary: "The id of the receipt issued when the direct message `number` was delivered, or null.",
			input: Type.Object({ number: Type.Integer({ description: "The number of the direct message" }) }, { additionalProperties: false, description: "One direct message" }),
			output: receiptId,
		},
	},
});
