// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Quarry with scripted model records replays without a model: the seat writes a request and a response record
 * around its calls and owes an answer after each turn with a call, as a model driver does. The record source is a
 * stand-in of this test: a game test cannot import the models package.
 */
import { play, replay, type Played } from "@swarmtales/testkit";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { ofType, player, rosterGame } from "./support.ts";

const text = Type.String({ description: "A text." });
const MODEL = {
	id: "@test/quarry-model",
	events: { prompt_fixed: Type.Object({ system: text }, { description: "The fixed prompt." }), request: Type.Object({ inputs: Type.Array(text, { description: "The inputs." }) }, { description: "A request." }), response: Type.Object({ calls: Type.Integer({ description: "The calls." }) }, { description: "An answer." }) },
};
const SEATS = ["A01", "A02", "A03", "A04"] as const;

// A run whose seats record like a model driver: `prompt_fixed` before the first tick, a request and a response per activation.
function recorded(game: ReturnType<typeof rosterGame>): Promise<Played> {
	return play(game, {
		records: [MODEL],
		drivers: (kernel) => {
			kernel.start();
			for (const seat of SEATS) kernel.record(MODEL.id, `resident:${seat}`, "prompt_fixed", { system: `You are ${seat}.` });
			return {
				resident: async (turn) => {
					turn.record(MODEL.id, "request", { inputs: turn.inputs.map((note) => note.text) });
					let calls = 0;
					const counted = { ...turn, basis: turn.basis, call: (as: string, params: unknown) => ((calls += 1), turn.call(as, params)) };
					await player(counted);
					turn.record(MODEL.id, "response", { calls });
					return { pending: calls > 0 };
				},
			};
		},
	});
}

describe("quarry, replayed", () => {
	it("a run with model records replays equal, with the records as inputs and no model", async () => {
		const game = rosterGame({ games: 1 });
		const { events, end } = await recorded(game);
		expect(end).toMatchObject({ reason: "limit" });
		expect(ofType(events, "prompt_fixed")).toHaveLength(4);
		expect(ofType(events, "request").length).toBe(ofType(events, "activation_opened").length);
		const again = await replay({ game, log: events, records: [MODEL] });
		expect(again.firstDifference).toBeUndefined();
		expect([again.equal, again.log.length]).toEqual([true, events.length]);
	});
});
