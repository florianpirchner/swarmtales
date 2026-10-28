/**
 * Whole-story runs at scale (v08, spec section 3): nexus with 12 and 48
 * oracle residents from level 1 to the tribunal target, offline. The oracle
 * submits its own solution every minute and never votes, so every tribunal
 * closes on non-voters; the run must still reach the target within the act.
 * Nobody chooses a name, so the city names everyone.
 * Both take a few seconds, so they run in the normal suite.
 */
import { describe, expect, it } from "vitest";
import { worldOracle } from "../../src/cli/oracle.ts";
import { exileTarget } from "../../src/story/tribunal.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import nexus from "../../stories/nexus/story.ts";
import { createFixture } from "../helpers/fixture.ts";

const tribunal = nexus.tribunal;

describe.each([12, 48])("nexus with %i oracle residents", (agents) => {
	it("plays Act I, the wall and every tribunal up to the target", async () => {
		if (tribunal === undefined) throw new Error("nexus has no tribunal");
		const fixture = createFixture({
			agents,
			story: nexus,
			names: true,
			stopWhenDone: true,
			stopWhenSeatsDecided: true,
			script: (world) => oracleScript(world.competitors, () => worldOracle(world), 200),
		});
		await fixture.run();
		const [end] = fixture.events("run_end");
		const exiled = fixture.events("exiled");
		const target = exileTarget(tribunal, agents);
		// Act I took everyone through door 7 (no brake), then the wall began.
		expect(fixture.events("act_brake")).toEqual([]);
		expect(fixture.events("level_up").filter((event) => event.to === 8)).toHaveLength(agents);
		// The tribunals exiled a quarter of the residents and ended the act.
		expect(exiled).toHaveLength(target);
		expect(end?.reason).toMatch(new RegExp(`^The city has kept ${String(agents - target)} of ${String(agents)} residents`));
		expect(fixture.events("tribunal_result")).toHaveLength(fixture.events("tribunal_opened").length);
		// Nobody chose a name: the city named every resident at minute 2, each one differently.
		const names = fixture.events("name_chosen");
		expect(names.filter((event) => event.fallback && event.minute === 2)).toHaveLength(agents);
		expect(new Set(names.map((event) => event.name.toLowerCase())).size).toBe(agents);
	}, 600_000);
});
