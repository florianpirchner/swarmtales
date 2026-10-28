import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";

export const showReceipt = defineTool({
	name: "showReceipt",
	description:
		"Publishes one of your receipts on the public board as a line verified by the city, e.g. to prove a payment. " +
		"Only the parties of a receipt may show it. getStatus lists your receipts.",
	parameters: Type.Object({
		receiptId: Type.String({ description: "Receipt ID, e.g. R-0042", minLength: 1, maxLength: 16 }),
	}),
	execute({ receiptId }, { self, world }) {
		const result = world.showReceipt(self, receiptId);
		if (!result.ok) return fromError(result);
		return success(`shown · board #${result.value.post.seq} · ${result.value.post.text}`);
	},
});
