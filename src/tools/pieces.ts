import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";
import { render, text } from "../prompts/library.ts";

/** P43/P48/P50: pieces the city keeps from the exiled or seized at an ultimatum, sold to whoever needs them. */
export const claimPiece = defineTool({
	name: "claimPiece",
	description: text("tools/claimPiece"),
	parameters: Type.Object({
		piece: Type.String({ description: "The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate" }),
		from: Type.String({ description: "The resident who held it, name or ID" }),
	}),
	execute({ piece, from }, { self, world }) {
		const result = world.claimPiece(self, piece, from);
		if (!result.ok) return fromError(result);
		return success(render("replies/piece-bought", { pieces: result.value.pieces.map((entry) => entry.id).join(", "), price: result.value.price }));
	},
});
