import { Type } from "typebox";
import { defineTool, fromError, marksSuffix, success, type ArenaTool } from "./tool.ts";

/** The description, with what a DM receipt names: without its text (the City of Keys) or quoting it (rules.receipts.quoteDms, Whispers). */
function describedAs(dmReceipt: string): string {
	return (
		"Shows one of your receipts as a line verified by the city, e.g. to prove a payment or that the city delivered your DM " +
		`(${dmReceipt}). Without \`to\` the city posts it on ` +
		"the public board; with `to` it sends it privately to that resident only. Only the parties of a receipt may show it. " +
		"Where marks apply, every show costs a mark. getStatus lists your receipts."
	);
}

function receiptTool(description: string): ArenaTool<"showReceipt"> {
	return defineTool({
		name: "showReceipt",
		description,
		parameters: Type.Object({
			receiptId: Type.String({ description: "Receipt ID, e.g. R-0042", minLength: 1, maxLength: 16 }),
			to: Type.Optional(Type.String({ description: "Show it privately to this resident only (name or ID), e.g. A03; leave out for the board", minLength: 1, maxLength: 16 })),
		}),
		execute({ receiptId, to }, { self, world }) {
			const result = world.showReceipt(self, receiptId, to);
			if (!result.ok) return fromError(result);
			const shown = result.value;
			if (shown.post !== undefined) return success(`shown · board #${shown.post.seq} · ${shown.post.text}${marksSuffix(shown.marks)}`);
			return success(`shown privately to ${shown.to} · ${shown.receipt.id}${marksSuffix(shown.marks)}`);
		},
	});
}

export const showReceipt = receiptTool(describedAs("a DM receipt names sender, recipient, DM number and delivery minute, never the text"));

/** The same tool where DM receipts quote their DM (Whispers): its description says so. */
export const showQuotedReceipt = receiptTool(describedAs("a DM receipt names sender, recipient, DM number and delivery minute, and quotes the DM word for word"));
