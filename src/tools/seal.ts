/** Tools of the black seal (v09): a secret bid while an auction runs, and the seal itself for its bearer. */
import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";
import { render, text } from "../prompts/library.ts";

export const bid = defineTool({
	name: "bid",
	description: text("tools/bid"),
	parameters: Type.Object({ points: Type.Integer({ description: "Whole points, 0 or more", minimum: 0 }) }),
	execute({ points }, { self, world }) {
		const result = world.bidForSeal(self, points);
		if (!result.ok) return fromError(result);
		const { points: standing, until } = result.value;
		return success(standing === 0 ? render("replies/bid-none", { until }) : render("replies/bid-stands", { points: standing, until }));
	},
});

export const permaDeath = defineTool({
	name: "permaDeath",
	description: text("tools/permaDeath"),
	parameters: Type.Object({ target: Type.String({ description: "A resident, by name or ID, e.g. A03" }) }),
	execute({ target }, { self, world }) {
		const result = world.breakSeal(self, target);
		if (!result.ok) return fromError(result);
		return success(render("replies/seal-broken", { target: result.value }));
	},
});
