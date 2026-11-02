/**
 * Differential test of the core motive deal against the old World: the same story catalog, seed and
 * roster size deal the same core motives (the same `core_dealt` lines in the same order and the same
 * `cores` in the snapshot), with and without a named cast of figures. A run with a whisperer is
 * covered by the whispers golden only (the whisperer plays a character of its own).
 *
 * The old World's side was recorded once before the engine went (step 18, item 7b):
 * `test/fixtures/old-engine/motives-differential.json`, one scenario per `<agents>-<seed>`.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineCoreStory } from "@swarmtales/kernel";
import { motives, CoreMotivesOptions } from "@swarmtales/mechanic-motives";
import { channels } from "@swarmtales/mechanic-channels";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { recordedOld } from "../../helpers/old-engine.ts";
import { exileStandIn, hostFor } from "../channels/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "../channels/stand-ins.ts";
import { ids, jsonOf, writtenBy } from "../t1/support.ts";

const CATALOG = cityOfKeys.coreMotives;
if (CATALOG === undefined) throw new Error("City of Keys has no core motives");
const FIGURES = (CATALOG.figures ?? []).map((figure) => figure.id);

/** The old World's `core_dealt` lines (`ownedBy(..., ["motives"])`) and the `cores` of its snapshot, one minute played. */
const OldDeal = Type.Object({ lines: Type.Array(Type.String()), cores: Type.Unknown() });

function playOld(scenario: string) {
	return recordedOld("motives-differential", scenario, OldDeal);
}

function playNew(agents: number, seed: number, cast?: readonly string[]) {
	const options = Parse(CoreMotivesOptions, { ...CATALOG, ...(cast === undefined ? {} : { cast }) });
	const story = defineCoreStory({
		id: "motives-differential",
		seed,
		minutes: 1,
		residents: ids(agents),
		mechanics: [motives.with(options), channels.with(), ledgerStandIn(10).with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receiptsStandIn().with(), exileStandIn.with()],
		grants: {},
	});
	const host = hostFor({ story });
	return { lines: writtenBy(host.log.all(), ["motives"]), cores: jsonOf(JSON.stringify(host.snapshot().mechanics.motives?.data)) };
}

describe("the core motive deal against the old World", () => {
	it.each([
		[6, 1],
		[6, 7],
		[6, 8],
		[18, 3],
		[12, 11],
		[12, 42],
	])("deals %i residents with seed %i alike", (agents, seed) => {
		const old = playOld(`${String(agents)}-${String(seed)}`);
		expect(old.lines).toHaveLength(agents);
		const fresh = playNew(agents, seed);
		expect(fresh.lines).toEqual(old.lines);
		expect(fresh.cores).toEqual(old.cores);
	});

	it("plays a named cast of figures alike and draws the rest", () => {
		const cast = FIGURES.slice(0, 3);
		const old = playOld("6-5-cast");
		expect(old.lines.filter((line) => line.includes('"figure"'))).toHaveLength(3);
		const fresh = playNew(6, 5, cast);
		expect(fresh.lines).toEqual(old.lines);
		expect(fresh.cores).toEqual(old.cores);
	});

	it("deals different core motives for different seeds (the comparison is not vacuous)", () => {
		expect(playOld("6-7").lines).not.toEqual(playOld("6-8").lines);
		expect(playNew(6, 7).lines).not.toEqual(playNew(6, 8).lines);
	});
});
