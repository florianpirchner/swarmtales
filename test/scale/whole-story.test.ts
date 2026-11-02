/**
 * Whole-story runs at scale (v08, spec section 3): the City of Keys with 6, 12 and 48
 * oracle residents from level 1 to the tribunal target, offline. The oracle
 * submits its own solution every minute and never votes, so every tribunal
 * closes on non-voters; the run must still reach the target within the act.
 * Nobody chooses a name, so the city names everyone. v09: every resident gets a
 * core motive at the start and a goal at the wall; the oracle never bids, so every
 * black seal goes unsold.
 * Each takes a few seconds, so they run in the normal suite.
 */
import { describe, expect, it } from "vitest";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { exileTarget } from "@swarmtales/engine";
import { oracleScript } from "@swarmtales/models";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { createHostFixture } from "../helpers/host-fixture.ts";

const tribunal = cityOfKeys.tribunal;

describe.each([6, 12, 48])("cityofkeys with %i oracle residents", (agents) => {
	it("plays Act I, the wall and every tribunal up to the target", async () => {
		if (tribunal === undefined) throw new Error("cityofkeys has no tribunal");
		const fixture = createHostFixture({
			agents,
			story: cityOfKeys,
			names: true,
			stopWhenDone: true,
			stopWhenSeatsDecided: true,
			script: (host) => oracleScript(host.residents, () => hostOracle(host), 200),
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
		// v09: a core motive for everyone, a goal for everyone at the wall, one seal per 12 residents, none sold.
		expect(fixture.events("core_dealt")).toHaveLength(agents);
		expect(fixture.events("goal_dealt")).toHaveLength(agents);
		expect(fixture.events("goal_resolved")).toHaveLength(agents);
		expect(fixture.events("seal_auction_opened")).toHaveLength(Math.ceil(agents / 12));
		expect(fixture.events("seal_expired").filter((event) => event.reason === "nobody bid")).toHaveLength(Math.ceil(agents / 12));
		// The feast seats a quarter of the residents, at least 3.
		expect(fixture.events("collection_started").find((event) => event.into.startsWith("feast"))?.first).toBe(Math.max(3, Math.ceil(agents / 4)));
	}, 600_000);
});
