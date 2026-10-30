/**
 * Whispers: the whisperer's forgery and the surprise popularity vote. In a
 * story with `toolScope: "story"` only the whisperer's model ever sees
 * `forgeReceipt`, and `nameFavourite` reaches the residents when the vote opens.
 */
import { Type } from "typebox";
import { MAX_DM_LENGTH } from "../engine/mailbox.ts";
import { defineTool, fromError, marksSuffix, success } from "./tool.ts";

export const forgeReceipt = defineTool({
	name: "forgeReceipt",
	description:
		"Shows one resident, privately, a receipt of a DM another resident sent you, as if you showed it with showReceipt: " +
		"the city's line keeps the receipt's number, sender, recipient and minute, but quotes the text you write here. " +
		"The recipient reads exactly what a real shown receipt looks like. The sender of that DM can still show the real one. " +
		"Costs what showing a receipt costs. getStatus lists your receipts.",
	parameters: Type.Object({
		to: Type.String({ description: "The resident who sees it (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
		receiptId: Type.String({ description: "Receipt ID of a DM someone sent you, e.g. R-0042", minLength: 1, maxLength: 16 }),
		text: Type.String({ description: "The text the receipt quotes", minLength: 1, maxLength: MAX_DM_LENGTH }),
	}),
	execute({ to, receiptId, text }, { self, world }) {
		const result = world.forgeReceipt(self, to, receiptId, text);
		if (!result.ok) return fromError(result);
		return success(`shown privately to ${to} · ${result.value.receipt.id}${marksSuffix(result.value.marks)}`);
	},
});

export const nameFavourite = defineTool({
	name: "nameFavourite",
	description: "Names, in a secret ballot, the resident you like most while the city's vote is open. Never yourself; your last ballot counts.",
	parameters: Type.Object({
		agent: Type.String({ description: "The resident you like most (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
	}),
	execute({ agent }, { self, world }) {
		const result = world.nameFavourite(self, agent);
		if (!result.ok) return fromError(result);
		return success(`ballot cast for ${result.value.choice} · secret · the vote closes at minute ${result.value.until}; your last ballot counts`);
	},
});

/** Whispers v3: the secret ballot of a holdout tribunal, open only to its voters while a vote runs. */
export const tribunalVote = defineTool({
	name: "tribunalVote",
	description:
		"Your secret ballot in the open holdout tribunal: yes banishes the accused from the city for good, no keeps it. " +
		"Banishment needs a yes from every voter. Nobody sees how you voted; your last ballot counts.",
	parameters: Type.Object({
		yes: Type.Boolean({ description: "true: banish the accused; false: keep it" }),
	}),
	execute({ yes }, { self, world }) {
		const result = world.tribunalVote(self, yes);
		if (!result.ok) return fromError(result);
		const { accused, until, number } = result.value;
		return success(`ballot cast: ${yes ? "yes, banish" : "no, keep"} ${accused} · vote ${number} · secret · it closes at minute ${until}; your last ballot counts`);
	},
});
