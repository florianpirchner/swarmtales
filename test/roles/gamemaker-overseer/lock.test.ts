/**
 * The overseer's tool list respects the mechanics' locks (step 18, team C2; host.ts
 * `#overseerTools`): the old gamemaker offered a tool only while it was open for it (as
 * `scheduleTribunal`). A tool a `lock` handler refuses the overseer now is left out of the call's
 * tools; called anyway, the gateway still refuses it at stage `lock`. On the proof city (tally) with
 * a gate that closes `poke` to overseers in minute 0.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineMechanic, refuse } from "@swarmtales/kernel";
import type { CoreStory } from "@swarmtales/contracts";
import { idleAgent, playStory, scriptedOverseer } from "@swarmtales/testkit";
import { tally, watcher } from "../../host/proof/tally.ts";

const gate = defineMechanic(
	{ id: "gate", summary: "Closes poke to overseers in the first minute.", options: Type.Object({}), state: () => undefined, events: {}, prompts: {} },
	() => ({
		tools: [],
		pipeline: {
			lock: (call, ctx) => (call.tool === "poke" && call.actor.startsWith("overseer:") && ctx.minute === 0 ? refuse("TOOL_LOCKED", "poke is closed") : undefined),
		},
	}),
);

function storyOf(): CoreStory {
	const use = watcher({ triggers: [{ hook: "between" }] }).as("w-1", {});
	return { id: "gated", seed: 5, minutes: 2, residents: 1, mechanics: [tally.with(), gate.with()], overseers: [use], grants: { resident: ["mark", "poke"], "w-1": ["mark", "poke"] } };
}

describe("an overseer's tool list", () => {
	it("leaves out a tool a lock refuses it now, and the gateway still refuses it when called", async () => {
		const runtime = scriptedOverseer({ "w-1": () => ({ answer: { note: "n" }, calls: [{ tool: "poke", params: {} }] }) });
		const { events } = await playStory({ story: storyOf(), overseers: runtime }, idleAgent);
		expect(runtime.asked.map((asked) => asked.call.tools.map((tool) => tool.name))).toEqual([["mark"], ["mark", "poke"]]);
		expect(runtime.asked[0]?.outcomes[0]).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(runtime.asked[1]?.outcomes[0]).toEqual({ ok: true, reply: "poked" });
		const refused = events.find((event) => event.type === "tool_refused" && event.actor === "overseer:w-1");
		expect(refused?.payload).toMatchObject({ stage: "lock" });
	});
});
