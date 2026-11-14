// SPDX-License-Identifier: Apache-2.0
/**
 * A Director amends a decision (asked for by the review of M3; decision A34). The warden of the slice holds
 * `amendDecision` and never uses it, so this test gives the Director's driver a stand-in definition with the same
 * name whose act is the amendment: the kernel, the plugin `directors`, the driver and `decisions` are the real ones.
 * The verdict of the court (A04) is changed by the Director to A02, and no payload of the run names a log position.
 */
import { nameOf, type DriverTable, type Envelope } from "@swarmtales/contracts";
import { createDirectorDrivers } from "@swarmtales/engine";
import { scriptedAsker } from "@swarmtales/models";
import { defineDirector, parseTake } from "@swarmtales/sdk";
import { scriptedDriver, testKernel } from "@swarmtales/testkit";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { callsOf } from "../src/scripts.ts";
import { RECORDS, resolved } from "./support.ts";

const Verdict = Type.Object({ exiled: Type.String({ description: "The resident to banish instead" }) }, { additionalProperties: false, description: "The magistrate's answer" });
const magistrate = defineDirector(
	{ id: "warden", summary: "Amends a proposed verdict.", on: [{ event: "decisions.decision_proposed" }], output: Verdict },
	{
		system: () => "You are the magistrate.",
		input: (ctx) => ctx.firings.map((firing) => `firing ${String(firing.n)} at tick ${String(firing.tick)}`).join(),
		act: async (answer, ctx) => {
			await ctx.call("amendDecision", { decision: "D1", proposal: answer, reason: "the magistrate overrules" });
		},
	},
);

/** The slice with the scripted residents and the amending Director; no Human Hand. */
async function played(): Promise<{ readonly events: readonly Envelope[]; readonly asked: readonly string[] }> {
	const base = resolved(7);
	const directors = (base.directors ?? []).map((director) => ({ ...director, definition: magistrate }));
	const answers = scriptedAsker({ "director:warden": [{ exiled: "A02" }] });
	const asked: string[] = [];
	const table: DriverTable = {
		resident: scriptedDriver((activation) => callsOf(activation.tick, nameOf(activation.actor))),
		...createDirectorDrivers({ game: { ...base, directors }, ask: (activation, question) => (asked.push(question.input), answers(activation, question)) }),
	};
	const { kernel } = testKernel(game, { seed: 7, records: RECORDS });
	await kernel.run(table);
	return { events: kernel.log.all(), asked };
}

const of = (events: readonly Envelope[], ...types: readonly string[]): readonly unknown[] => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.actor, event.payload]);

describe("a Director amends a decision of the city slice", () => {
	it("is asked about firing 1, amends the verdict as amendment 1, and the amended verdict is carried out", async () => {
		const { events, asked } = await played();
		expect(asked).toEqual(["firing 1 at tick 6"]);
		expect(of(events, "asked")).toEqual([[6, "asked", "director:warden", { firings: [1] }]]);
		expect(of(events, "decision_amended", "decision_settled", "exiled")).toMatchObject([
			[6, "decision_amended", "director:warden", { decision: "D1", by: "director:warden", n: 1, proposal: { exiled: "A02" }, reason: "the magistrate overrules" }],
			[8, "decision_settled", "kernel", { decision: "D1", changed: true, proposal: { exiled: "A02" }, amendments: [{ by: "director:warden", n: 1 }] }],
			[8, "exiled", "kernel", { agent: "A02", by: "court" }],
		]);
		const calls = events.filter((event) => event.actor === "director:warden" && event.type === "tool_result").map((event) => event.payload);
		expect(calls).toMatchObject([{ as: "take" }, { as: "amendDecision" }]);
		// The reply of `take` names the trigger by number, tick, event and payload: the line of `decision_proposed` itself.
		const proposed = events.find((event) => event.type === "decision_proposed");
		expect(parseTake(String(Reflect.get(Object(calls[0]), "reply")))).toEqual({ firings: [{ n: 1, tick: 6, event: "decisions.decision_proposed", payload: proposed?.payload }], calls: 1 });
	});

	it("writes no log position into a payload of the Director or of `decisions`", async () => {
		const { events } = await played();
		const lines = events.filter((event) => event.actor === "director:warden" || event.type.startsWith("decision_"));
		expect(lines.length).toBeGreaterThan(8);
		expect(lines.filter((event) => /\\?"seq\\?"/.test(JSON.stringify(event.payload)))).toEqual([]);
	});
});
