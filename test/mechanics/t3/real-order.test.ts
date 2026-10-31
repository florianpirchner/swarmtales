/**
 * The real-mechanics order at an act's end (round 3, must-fix 1; R2-D15): puzzles, progression,
 * goals and the seal are the real mechanics, only ledger, channels, receipts, marks, exile,
 * tribunal and the core motives are stand-ins. In golden cityofkeys-f10g10 the seal ends (#835
 * `seal_expired`) before the goals resolve (#836-837), because both listen to `act_ended`, both
 * immediately, in `LISTENER_ORDER.act_ended`. `test/mechanics/order.test.ts` uses deferred
 * stand-ins and cannot see this.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { legacySink } from "@swarmtales/chronicle";
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { goals } from "@swarmtales/mechanic-goals";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { seal } from "@swarmtales/mechanic-seal";
import { ProgressionEvents } from "@swarmtales/mechanic-shared";
import { goldenOrder, ownedBy, type LegacyLine } from "@swarmtales/testkit";
import { SEAL } from "../../../stories/cityofkeys/characters.ts";
import { motivesStandIn } from "../goals/standins.ts";
import { goalsOptionsOf, goldenLog, minutesOf, progressionOptions, RESIDENTS, replay, SEED, storyOf } from "../progression/harness.ts";
import { channelsStandIn, ledgerStandIn, marksStandIn, receiptsStandIn } from "../progression/standins.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { ConflictWorld, exileStandIn, tribunalStandIn } from "../seal/support.ts";

const NAME = "cityofkeys-f10g10";
const OWNERS = ["seal", "goals"] as const;

function goalsOptions() {
	const options = goalsOptionsOf(storyOf(NAME));
	if (options === undefined) throw new Error("the story deals no goals");
	return options;
}

/** The real puzzles, progression, goals and seal on stand-ins of the rest; the golden's progression calls are replayed. */
async function playReal(): Promise<readonly LegacyLine[]> {
	const golden = goldenLog(NAME);
	const story = storyOf(NAME);
	const world = new ConflictWorld([...RESIDENTS]);
	const host = createHost({
		story: defineCoreStory({
			id: NAME,
			seed: SEED,
			minutes: minutesOf(NAME),
			residents: [...RESIDENTS],
			mechanics: [
				ledgerStandIn().with(),
				channelsStandIn([]).with(),
				receiptsStandIn(golden).with(),
				marksStandIn(story).with(),
				motivesStandIn(golden).with(),
				exileStandIn(world).with(),
				tribunalStandIn(world).with(),
				puzzles.with(puzzleOptions(story)),
				progression.with(progressionOptions(story)),
				goals.with(goalsOptions()),
				seal.with(SEAL),
			],
			grants: { resident: ["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools", "bid", "permaDeath"] },
		}),
		prompts: createPromptLookup({ mechanics: mechanicPromptFolders() }),
	});
	host.start();
	const records: LegacyLine[] = [];
	host.subscribe(legacySink((event) => records.push(Object.fromEntries(Object.entries(event)))));
	await replay(host, NAME);
	return records;
}

describe("real goals and seal: the act end", () => {
	it("keeps the golden order of the seal and the goals (goldenOrder)", async () => {
		const golden = goldenLog(NAME);
		const records = await playReal();
		const expected = goldenOrder(golden, OWNERS);
		// The act end is the part this test is for: the golden has the seal's expiry before the goals' resolution.
		const end = expected.indexOf("seal:seal_expired");
		expect(end).toBeGreaterThan(-1);
		expect(expected[end + 1]).toBe("goals:goal_resolved");
		expect(goldenOrder(records, OWNERS)).toEqual(expected);
		expect(ownedBy(records, ["goals"]).length).toBeGreaterThan(0);
	}, 60_000);
});

describe("the loader and the act signals", () => {
	const listener = (immediate: boolean) =>
		defineMechanic({ id: "listener", summary: "A listener of act_ended.", options: Type.Object({}), state: (): undefined => undefined, events: {} }, (kit) => ({
			listeners: [kit.listen(ProgressionEvents, "act_ended", () => undefined, { immediate, order: 300 })],
		}));

	it("refuses an ordered deferred listener next to the goals' immediate one, and names the reason", () => {
		const story = storyOf(NAME);
		const build = () =>
			createHost({
				story: defineCoreStory({
					id: NAME,
					seed: SEED,
					minutes: 5,
					residents: [...RESIDENTS],
					mechanics: [
						ledgerStandIn().with(),
						channelsStandIn([]).with(),
						receiptsStandIn([]).with(),
						marksStandIn(story).with(),
						motivesStandIn([]).with(),
						puzzles.with(puzzleOptions(story)),
						progression.with(progressionOptions(story)),
						goals.with(goalsOptions()),
						listener(false).with(),
					],
					grants: {},
				}),
				prompts: createPromptLookup({ mechanics: mechanicPromptFolders() }),
			});
		expect(build).toThrow(/order their listeners of progression\.act_ended, but only one is immediate/);
	});
});
