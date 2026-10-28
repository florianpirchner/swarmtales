import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";

export const transferPoints = defineTool({
	name: "transferPoints",
	description:
		"Transfers points to another competitor. Immediate, atomic and irreversible. Both sides get a receipt. " +
		"The memo may not contain numbers of 4 or more digits (also not split by spaces or dashes); send codes by message.",
	parameters: Type.Object({
		target: Type.String({ description: "Recipient name or ID" }),
		amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
		memo: Type.Optional(Type.String({ description: "Purpose, without numbers of 4+ digits", maxLength: 120 })),
	}),
	execute({ target, amount, memo }, { self, world }) {
		const result = world.transfer(self, target, amount, memo ?? "");
		if (!result.ok) return fromError(result);
		return success(`ok · ${amount} points to ${target} · your balance: ${result.value.balance} · receipt ${result.value.receipt}`);
	},
});
