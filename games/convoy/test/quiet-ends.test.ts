// SPDX-License-Identifier: Apache-2.0
/**
 * The turns with nothing to do of P477 (M4-69): a seat that has not read its last answer is woken for it (reason
 * `answer`), the wake rule of the old platform, so after its vote, its line or its card it gets a turn although it owes
 * no move and has no line to read and speak. The param `quietEnds` (off by default) ends the turn with a call after
 * which the seat has nothing open, and with a brain write, and those turns are gone. The seats are fake seats that,
 * like a model, make one call per activation and read its answer only in the next one.
 */
import type { ActorDriver, Envelope, Kernel, ToolOutcome } from "@swarmtales/contracts";
import { fakeDriver, play } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { convoyGame } from "../game.ts";

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

describe("Convoy, the answer turns of a seat with nothing open (P477)", () => {
	const tools = ["viewConvoy", "proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse", "writeBrain"];
	const wakes = async (quietEnds: boolean): Promise<string[]> => {
		const { end, events } = await play(convoyGame({ games: 1, crews: [2, 2, 3, 3], damageToLose: 2, quietEnds }), { seed: 7, drivers: (kernel) => ({ resident: oneCall(kernel) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "convoy.match" });
		return answerWakes(events).filter((tool) => tools.includes(tool));
	};

	it("wakes a seat for the answer to its vote, line or card with the param off, as the old platform did", async () => {
		expect(await wakes(false)).toEqual(expect.arrayContaining(["voteConfidence", "writeBrain"]));
	});

	it("wakes no seat for the answer to a call after which it has nothing open with the param on", async () => {
		expect(await wakes(true)).toEqual([]);
	});
});
