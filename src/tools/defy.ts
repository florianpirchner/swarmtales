import { Type } from "typebox";
import { DEFY_REASON } from "../engine/world.ts";
import { defineTool, fromError, success } from "./tool.ts";

/** Gm direction 10: a resident may refuse the gamemaker's order, for a reason of its own character. */
export const defy = defineTool({
	name: "defy",
	description:
		"Refuses an order of the gamemaker, for a reason of your own character. Think it through first. The reason, in your own voice, " +
		`goes to the gamemaker and into the story (${DEFY_REASON.min}-${DEFY_REASON.max} characters); no other resident learns of it. ` +
		"Name the note you refuse by its number when it has one.",
	parameters: Type.Object({
		reason: Type.String({ description: "Why your character refuses, in its own voice", minLength: 1, maxLength: 1_000 }),
		note: Type.Optional(Type.Integer({ description: "The number of the gamemaker's note you refuse, e.g. 312", minimum: 1 })),
	}),
	execute({ reason, note }, { self, world }) {
		const result = world.defyGamemaker(self, reason, note);
		if (!result.ok) return fromError(result);
		return success("the gamemaker has your refusal");
	},
});
