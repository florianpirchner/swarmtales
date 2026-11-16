// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The empty turns after a brain write of P474 (M4-69): a seat that has not read its last answer is woken for it
 * (reason `answer`), the wake rule of the old platform, so after `writeBrain` it gets a turn with no input line while
 * the game has not started. The param `quietEnds` (off by default) ends the writer's turn with the write, and the
 * turn is gone. The seats are fake seats that, like a model, make one call per activation and read its answer only
 * in the next one.
 */
import type { ActorDriver, Envelope, Kernel, ToolOutcome } from "@swarmtales/contracts";
import { fakeDriver, play } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { blindBidGame } from "../game.ts";

const STOP: ToolOutcome = { ok: true, reply: "", endsTurn: true };
const Opened = Type.Object({ inputs: Type.Array(Type.Unknown({ description: "A line." }), { description: "The lines shown." }), detail: Type.Object({ reason: Type.String({ description: "Why the actor was woken." }) }, { description: "The scheduler's detail." }) }, { description: "An activation_opened payload." });
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

// The `answer` wakes after a call of `tool`: the number of input lines of each.
function answerWakes(events: readonly Envelope[], tool: string): number[] {
	const last = new Map<string, string>();
	const woken: number[] = [];
	for (const event of events) {
		if (event.type === "tool_called" && Value.Check(Called, event.payload)) last.set(event.actor, event.payload.as);
		if (event.type === "activation_opened" && Value.Check(Opened, event.payload) && event.payload.detail.reason === "answer" && last.get(event.actor) === tool) woken.push(event.payload.inputs.length);
	}
	return woken;
}

describe("Blind Bid, the turns after a brain write (P474)", () => {
	const wakes = async (quietEnds: boolean): Promise<number[]> => {
		const { end, events } = await play(blindBidGame({ games: 2, quietEnds }), { seed: 7, drivers: (kernel) => ({ resident: oneCall(kernel) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "blind-bid.match" });
		return answerWakes(events, "writeBrain");
	};

	it("wakes the writer with an empty input with the param off, as the old platform did", async () => {
		const woken = await wakes(false);
		expect(woken.length).toBeGreaterThan(0);
		expect(woken.every((lines) => lines === 0)).toBe(true);
	});

	it("wakes no writer for the answer to its write with the param on", async () => {
		expect(await wakes(true)).toEqual([]);
	});
});
