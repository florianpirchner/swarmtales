/**
 * The holdout tribunal's own surface (team T4b): the rule under every door's task (D-3, the old
 * `#withHoldoutRule`, on the local `StandoffTribunalTaskApi` until request R2-3 shares it), the DM
 * cap exemption through the frozen `StandoffTribunalApi`, and the lock of `tribunalVote`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineHead, defineMechanic, reply } from "@swarmtales/kernel";
import { StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import { StandoffTribunalTaskApi } from "@swarmtales/mechanic-standoff-tribunal";
import { storyOptions } from "../standoff/support/host.ts";
import { lot, newRun, playNew, recordOf } from "./differential.ts";
import { HOLDOUT_RULE } from "./rule.ts";
import { fallback, lotStrikes } from "./scenarios.ts";

let seen: unknown[] = [];

const reader = defineMechanic(
	defineHead({
		id: "reader",
		summary: "Reads the holdout's task line and exemptions.",
		options: Type.Object({}),
		state: (): undefined => undefined,
		events: {},
		uses: [StandoffTribunalTaskApi, StandoffTribunalApi],
		prompts: { "probe/tools/probe": [] },
	}),
	(kit) => ({
		tools: [
			kit.tool({
				name: "read",
				description: "probe/tools/probe",
				parameters: Type.Object({}),
				suggest: ["script"],
				execute: (_params, ctx) => {
					seen = [
						ctx.tryCall(StandoffTribunalTaskApi, "taskLine", { resident: "A01" }),
						ctx.tryCall(StandoffTribunalApi, "exemptFromCap", { from: "A02", to: "A01" }),
						ctx.tryCall(StandoffTribunalApi, "exemptFromCap", { from: "A01", to: "A02" }),
					];
					return reply("read");
				},
			}),
		],
	}),
);

describe("standoff-tribunal surface (stand-in puzzles, progression, exile, channels, notes)", () => {
	it("gives the holdout rule as every door's task line and exempts the accused's DMs to those it owes during the grace", async () => {
		const scenario = lotStrikes();
		const run = newRun(scenario, (story) => {
			const options = storyOptions(story);
			const coreMotive = defineCoreStory({
				id: "t4-test",
				seed: 7,
				minutes: scenario.minutes,
				residents: scenario.residents,
				mechanics: [...story.mechanics, reader.with()],
				grants: { resident: ["tribunalVote"], gamemaker: ["callTribunal", "drawLot", "announceTribunal", "permaDeath"], script: ["probe", "read"] },
			});
			const host = createHost({ ...options, story: coreMotive });
			host.start();
			return host;
		});
		await playNew(run, scenario, 6);
		seen = [];
		const outcome = await run.host.call("script", "read", {});
		expect(outcome.ok).toBe(true);
		// The lot made A02 the accused (see the differential scenario); it owes A01 its fragment, not the other way round.
		expect(seen).toEqual([HOLDOUT_RULE.texts.rule, true, false]);
	});

	it("draws every lot from the old stream (\"holdout-lot\", n) over the sorted candidates", async () => {
		const scenario = fallback();
		const run = newRun(scenario);
		await playNew(run, scenario);
		const draws = recordOf(run)
			.events.map((line): unknown => JSON.parse(line))
			.flatMap((event) => (typeof event === "object" && event !== null && "type" in event && event.type === "lot_drawn" && "candidates" in event && "drawn" in event && Array.isArray(event.candidates) ? [{ candidates: event.candidates.map(String), drawn: String(event.drawn) }] : []));
		expect(draws.length).toBe(3);
		expect(draws.map((draw) => draw.drawn)).toEqual(draws.map((draw, index) => lot(index + 1, draw.candidates)));
	});

	it("locks tribunalVote outside a vote and for the accused", async () => {
		const scenario = lotStrikes();
		const run = newRun(scenario);
		await playNew(run, scenario, 8);
		expect(run.replies.filter((text) => text.startsWith("TOOL_LOCKED")).length).toBe(2);
	});
});
