import { Type } from "typebox";
import { defineTool, failure, fromError, marksSuffix, success, type ArenaTool } from "./tool.ts";
import { render, text } from "../prompts/library.ts";

/** A board show refused because the receipt quotes part of a fragment (SPEC 20); nothing is posted or charged. */
export const RECEIPT_CARRIES_FRAGMENT = "RECEIPT_CARRIES_FRAGMENT";

/** The description, with what a DM receipt names: without its text (the City of Keys) or quoting it (rules.receipts.quoteDms, Whispers). */
function describedAs(dmReceipt: string): string {
	return render("tools/showReceipt", { dmReceipt });
}

function receiptTool(description: string): ArenaTool<"showReceipt"> {
	return defineTool({
		name: "showReceipt",
		description,
		parameters: Type.Object({
			receiptId: Type.String({ description: "Receipt ID, e.g. R-0042", minLength: 1, maxLength: 16 }),
			to: Type.Optional(Type.String({ description: "Show it privately to this resident only (name or ID), e.g. A03; leave out for the board", minLength: 1, maxLength: 16 })),
		}),
		execute({ receiptId, to }, { self, world, guard }) {
			// A board show is a post the city writes for the resident: it may not carry what the guard keeps off the board (SPEC 20).
			const minRun = to === undefined ? guard?.boardMinRun() : undefined;
			if (minRun !== undefined && world.receiptCarriesFragment(self, receiptId, minRun)) {
				return failure(RECEIPT_CARRIES_FRAGMENT, text("replies/receipt-fragment"));
			}
			const result = world.showReceipt(self, receiptId, to);
			if (!result.ok) return fromError(result);
			const shown = result.value;
			if (shown.post !== undefined) return success(`${render("replies/receipt-shown-board", { seq: shown.post.seq, text: shown.post.text })}${marksSuffix(shown.marks)}`);
			return success(`${render("replies/receipt-shown-private", { to: shown.to, receipt: shown.receipt.id })}${marksSuffix(shown.marks)}`);
		},
	});
}

export const showReceipt = receiptTool(describedAs(text("tools/showReceipt-receipt-plain")));

/** The same tool where DM receipts quote their DM (Whispers): its description says so. */
export const showQuotedReceipt = receiptTool(describedAs(text("tools/showReceipt-receipt-quoted")));
