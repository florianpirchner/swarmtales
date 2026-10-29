import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";

/** P43/P48/P50: pieces the city keeps from the exiled or seized at an ultimatum, sold to whoever needs them. */
export const claimPiece = defineTool({
	name: "claimPiece",
	description:
		"Buys from the city what a resident held for you at one door: pieces an exiled resident did not bequeath (half the price of a ransom) " +
		"or pieces the city seized when an ultimatum ran out (the ultimatum's penalty). One purchase covers every such piece of that holder " +
		"at that door. Only those pieces are for sale. The values arrive as a city notice.",
	parameters: Type.Object({
		piece: Type.String({ description: "The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate" }),
		from: Type.String({ description: "The resident who held it, name or ID" }),
	}),
	execute({ piece, from }, { self, world }) {
		const result = world.claimPiece(self, piece, from);
		if (!result.ok) return fromError(result);
		return success(`bought ${result.value.pieces.map((entry) => entry.id).join(", ")} for ${result.value.price} points; the city sends you the values`);
	},
});
