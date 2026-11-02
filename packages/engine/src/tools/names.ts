import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";
import { render, text } from "@swarmtales/prompts";

export const chooseName = defineTool({
	name: "chooseName",
	description: text("tools/chooseName"),
	parameters: Type.Object({ name: Type.String({ description: "Your name, e.g. Mira", minLength: 1, maxLength: 40 }) }),
	execute({ name }, { self, world }) {
		const result = world.chooseName(self, name);
		if (!result.ok) return fromError(result);
		return success(render("replies/name-chosen", { name: result.value.name }));
	},
});
