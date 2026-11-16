// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The empty answer turns of P475 (M4-69): a seat that has not read its last answer is woken for it (reason `answer`),
 * the wake rule of the old platform, so after its own bid or card it gets a turn that can only read "Not your turn".
 * The param `quietEnds` (off by default) ends the turn with such a move, and the turn is gone. The seats are fake
 * seats that, like a model, make one call per activation and read its answer only in the next one.
 */
import type { ActorDriver, Envelope, Kernel, ToolOutcome } from "@swarmtales/contracts";
import { fakeDriver, play } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { emberTricksGame } from "../game.ts";

const STOP: ToolOutcome = { ok: true, reply: "", endsTurn: true };
const Opened = Type.Object({ detail: Type.Object({ reason: Type.String({ description: "Why the actor was woken." }) }, { description: "The scheduler's detail." }) }, { description: "An activation_opened payload." });
const Called = Type.Object({ as: Type.String({ description: "The shown tool name." }) }, { description: "A tool_called payload." });

// The first call of the fake driver, then nothing: the answer stays unread until the next activation.
function oneCall(kernel: Kernel): ActorDriver {
	const fake = fakeDriver(kernel, 7);
	return async (activation) => {
		let made = 0;
		await fake({ ...activation, call: (as, params) => (made++ === 0 ? activation.call(as, params) : Promise.resolve(STOP)) });
		return { pending: made > 0 };
	};
}

// The tool of the call before each `answer` wake, by the woken actor.
function answerWakes(events: readonly Envelope[]): string[] {
	const last = new Map<string, string>();
	const woken: string[] = [];
	for (const event of events) {
		if (event.type === "tool_called" && Value.Check(Called, event.payload)) last.set(event.actor, event.payload.as);
		if (event.type === "activation_opened" && Value.Check(Opened, event.payload) && event.payload.detail.reason === "answer") woken.push(last.get(event.actor) ?? "");
	}
	return woken;
}

describe("Ember Tricks, the answer turns after a seat's own move (P475)", () => {
	const moves = ["placeBid", "nameTrump", "playCard", "vetoLead", "writeBrain"];
	const wakes = async (quietEnds: boolean): Promise<string[]> => {
		const { end, events } = await play(emberTricksGame({ games: 2, rounds: [1, 2, 3], quietEnds }), { seed: 7, drivers: (kernel) => ({ resident: oneCall(kernel) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "ember-tricks.match" });
		return answerWakes(events).filter((tool) => moves.includes(tool));
	};

	it("wakes a seat for the answer to its move with the param off, as the old platform did", async () => {
		expect(await wakes(false)).toEqual(expect.arrayContaining(["placeBid", "playCard", "writeBrain"]));
	});

	it("wakes no seat for the answer to a move that leaves it off turn with the param on", async () => {
		expect(await wakes(true)).toEqual([]);
	});
});
