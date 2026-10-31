import { Type } from "typebox";
import { MAX_DM_LENGTH } from "../mailbox.ts";
import { render, text } from "@swarmtales/prompts";
import { defineTool, fromError, marksSuffix, success } from "./tool.ts";

export const sendDM = defineTool({
	name: "sendDM",
	description: text("tools/sendDM"),
	parameters: Type.Object({
		target: Type.String({ description: "Recipient name or ID, e.g. A07" }),
		message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
	}),
	execute({ target, message }, { self, world }) {
		const result = world.sendDm(self, target, message);
		if (!result.ok) return fromError(result);
		const number = result.value.number === undefined ? "" : ` #${result.value.number}`;
		return success(`${render("replies/dm-sent", { number, target })}${marksSuffix(result.value.marks)}`);
	},
});
