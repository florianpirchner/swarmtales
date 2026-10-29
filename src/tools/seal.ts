/** Tools of the black seal (v09): a secret bid while an auction runs, and the seal itself for its bearer. */
import { Type } from "typebox";
import { defineTool, fromError, success } from "./tool.ts";

export const bid = defineTool({
	name: "bid",
	description:
		"Bids in secret for the black seal auctioned now. Your last bid counts. When the bidding closes, every bidder pays its bid, " +
		"won or lost; the highest bid wins (a tie goes to the bidder with fewer points). Nobody learns who bid or who won; the winner " +
		"hears it privately. A bid of 0 withdraws your bid and costs nothing; you cannot bid more than you hold.",
	parameters: Type.Object({ points: Type.Integer({ description: "Whole points, 0 or more", minimum: 0 }) }),
	execute({ points }, { self, world }) {
		const result = world.bidForSeal(self, points);
		if (!result.ok) return fromError(result);
		const { points: standing, until } = result.value;
		return success(standing === 0 ? `no bid stands · the bidding closes at minute ${until}` : `your bid of ${standing} points stands in secret · the bidding closes at minute ${until}`);
	},
});

export const permaDeath = defineTool({
	name: "permaDeath",
	description:
		"Breaks your black seal on a resident: it leaves the city at once and for good, without gate, will or ransom; whatever it holds " +
		"is gone with it. Once, never on yourself, and only until the act ends. The board names you as the one who broke it. Refused, " +
		"and the seal gone, once the city has exiled all it will.",
	parameters: Type.Object({ target: Type.String({ description: "A resident, by name or ID, e.g. A03" }) }),
	execute({ target }, { self, world }) {
		const result = world.breakSeal(self, target);
		if (!result.ok) return fromError(result);
		return success(`you broke the black seal · ${result.value} has left the city`);
	},
});
