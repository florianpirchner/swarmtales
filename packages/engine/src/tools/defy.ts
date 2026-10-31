import { Type } from "typebox";
import { DEFY_REASON } from "../engine/world.ts";
import { render, text } from "../prompts/library.ts";
import { defineTool, fromError, success } from "./tool.ts";

/** Gm direction 10: a resident may refuse the gamemaker's order, for a reason of its own character. */
export const defy = defineTool({
	name: "defy",
	description: render("tools/defy", { min: DEFY_REASON.min, max: DEFY_REASON.max }),
	parameters: Type.Object({
		reason: Type.String({ description: "Why your character refuses, in its own voice", minLength: 1, maxLength: 1_000 }),
		note: Type.Optional(Type.Integer({ description: "The number of the gamemaker's note you refuse, e.g. 312", minimum: 1 })),
	}),
	execute({ reason, note }, { self, world }) {
		const result = world.defyGamemaker(self, reason, note);
		if (!result.ok) return fromError(result);
		return success(text("replies/defy-recorded"));
	},
});
