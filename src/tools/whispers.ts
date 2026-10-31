/**
 * Whispers: the whisperer's forgery and the surprise popularity vote. In a
 * story with `toolScope: "story"` only the whisperer's model ever sees
 * `forgeReceipt`, and `nameFavourite` reaches the residents when the vote opens.
 */
import { Type } from "typebox";
import { MAX_DM_LENGTH } from "../engine/mailbox.ts";
import { render, text } from "../prompts/library.ts";
import { defineTool, fromError, marksSuffix, success } from "./tool.ts";

export const forgeReceipt = defineTool({
	name: "forgeReceipt",
	description: text("tools/forgeReceipt"),
	parameters: Type.Object({
		to: Type.String({ description: "The resident who sees it (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
		receiptId: Type.String({ description: "Receipt ID of a DM someone sent you, e.g. R-0042", minLength: 1, maxLength: 16 }),
		text: Type.String({ description: "The text the receipt quotes", minLength: 1, maxLength: MAX_DM_LENGTH }),
	}),
	execute({ to, receiptId, text }, { self, world }) {
		const result = world.forgeReceipt(self, to, receiptId, text);
		if (!result.ok) return fromError(result);
		return success(`${render("replies/receipt-shown-private", { to, receipt: result.value.receipt.id })}${marksSuffix(result.value.marks)}`);
	},
});

export const nameFavourite = defineTool({
	name: "nameFavourite",
	description: text("tools/nameFavourite"),
	parameters: Type.Object({
		agent: Type.String({ description: "The resident you like most (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
	}),
	execute({ agent }, { self, world }) {
		const result = world.nameFavourite(self, agent);
		if (!result.ok) return fromError(result);
		return success(render("replies/ballot-favourite", { choice: result.value.choice, until: result.value.until }));
	},
});

/** Whispers v3: the secret ballot of a holdout tribunal, open only to its voters while a vote runs. */
export const tribunalVote = defineTool({
	name: "tribunalVote",
	description: text("tools/tribunalVote"),
	parameters: Type.Object({
		yes: Type.Boolean({ description: "true: banish the accused; false: keep it" }),
	}),
	execute({ yes }, { self, world }) {
		const result = world.tribunalVote(self, yes);
		if (!result.ok) return fromError(result);
		const { accused, until, number } = result.value;
		return success(render("replies/ballot-holdout", { vote: text(yes ? "replies/ballot-yes" : "replies/ballot-no"), accused, number, until }));
	},
});
