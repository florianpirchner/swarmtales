import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";

export const chooseName = defineTool({
	name: "chooseName",
	description:
		"Chooses the name the city knows you by, once and for good: 3 to 16 characters (letters, digits, hyphens, starting with a letter), " +
		"not taken by another resident, not the city's or its cast's, not like a resident ID. The board announces it, and from then on " +
		"every resident sees your name instead of your ID. Whoever has no name when the choice closes gets one from the city.",
	parameters: Type.Object({ name: Type.String({ description: "Your name, e.g. Mira", minLength: 1, maxLength: 40 }) }),
	execute({ name }, { self, world }) {
		const result = world.chooseName(self, name);
		if (!result.ok) return fromError(result);
		return success(`you are now called ${result.value.name} · the board announces it`);
	},
});
