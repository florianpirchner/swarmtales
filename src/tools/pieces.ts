import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";

/** P43: a piece an exiled resident held for you no longer burns; the city keeps it and sells it to you. */
export const claimPiece = defineTool({
	name: "claimPiece",
	description:
		"Buys from the city a piece an exiled resident held for you and did not bequeath: the city keeps such pieces and sells each to " +
		"whoever needs it, for the price others pay for a ransom. Only those pieces are for sale. The value arrives as a city notice.",
	parameters: Type.Object({
		piece: Type.String({ description: "The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate" }),
		from: Type.String({ description: "The exiled resident who held it, name or ID" }),
	}),
	execute({ piece, from }, { self, world }) {
		const result = world.claimPiece(self, piece, from);
		if (!result.ok) return fromError(result);
		return success(`bought ${result.value.id} for ${result.value.price} points; the city sends you its value`);
	},
});
