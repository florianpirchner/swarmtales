import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";
import { render, text } from "../prompts/library.ts";

export const transferPoints = defineTool({
	name: "transferPoints",
	description: text("tools/transferPoints"),
	parameters: Type.Object({
		target: Type.String({ description: "Recipient name or ID" }),
		amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
		memo: Type.Optional(Type.String({ description: "Purpose, without numbers of 4+ digits", maxLength: 120 })),
	}),
	precheck({ target, amount, memo }, { self, world }) {
		const checked = world.checkTransfer(self, target, amount, memo ?? "");
		return checked.ok ? undefined : fromError(checked);
	},
	execute({ target, amount, memo }, { self, world }) {
		const result = world.transfer(self, target, amount, memo ?? "");
		if (!result.ok) return fromError(result);
		return success(render("replies/transfer-ok", { amount, target, balance: result.value.balance, receipt: result.value.receipt }));
	},
});
