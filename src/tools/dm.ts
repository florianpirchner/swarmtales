import { Type } from "typebox";
import { MAX_DM_LENGTH } from "../engine/mailbox.ts";
import { defineTool, fromError, marksSuffix, success } from "./tool.ts";

export const sendDM = defineTool({
	name: "sendDM",
	description:
		"Sends a private message to another competitor. It arrives at their next activation; only the recipient sees it. " +
		"Every DM gets a city number; once it reaches the recipient, the city sends you a numbered receipt with its text.",
	parameters: Type.Object({
		target: Type.String({ description: "Recipient ID, e.g. A07" }),
		message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
	}),
	execute({ target, message }, { self, world }) {
		const result = world.sendDm(self, target, message);
		if (!result.ok) return fromError(result);
		const number = result.value.number === undefined ? "" : ` #${result.value.number}`;
		return success(`sent · DM${number} to ${target} · the city confirms delivery when it reaches them${marksSuffix(result.value.marks)}`);
	},
});
