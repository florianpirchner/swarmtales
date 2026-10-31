/**
 * The strict golden gate of cast (carve-round2-T2.md, "Gate"): the options come from the story
 * (`castOptionsFromStory`), nothing is injected from the golden. The stand-in script reveals the
 * cast member and starts the collection when the golden `director_action` of that rule appears, with
 * the cast, the number of seats, the window and the "ends after a solve" rule read from the story's
 * own `collectDms` action; the shortening of the window comes out of cast itself, from the minute the
 * first resident passed level 10.
 */
import { describe, expect, it } from "vitest";
import { castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { goldenDiff, ownedBy } from "@swarmtales/testkit";
import { act, at } from "@swarmtales/sdk";
import { castStory, socialLevels } from "../../helpers/stories.ts";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";
import { playGolden, type GoldenName } from "../t2/golden-world.ts";

describe("the cast options of a story", () => {
	it("takes the members and the collections of City of Keys in the order of its rules", () => {
		expect(castOptionsFromStory(cityOfKeys)).toEqual({ members: { STEWARD: { level: 10, hidden: true } }, collections: ["feast", "feast-start"] });
	});

	it("is empty for a story without a cast", () => {
		expect(castOptionsFromStory(whispers)).toEqual({ members: {}, collections: [] });
	});

	it("finds a collection inside a petition's actions and a lottery's actions, once", () => {
		const collect = (into: string) => act.collectDms("A", { first: 2, forMinutes: 3, into });
		const petition = { id: "p", text: "t", threshold: { count: 2 }, deadlineMinute: 9, visibility: "public", onPass: [collect("one")], onFail: [act.lottery("one", [collect("two")])] } as const;
		const story = castStory({
			cast: { A: { level: 1 } },
			levels: socialLevels(["listAgents"]),
			director: [at(1, [act.openPetition(petition)], { id: "r1" }), at(1, [collect("one"), collect("three")], { id: "r2" })],
		});
		expect(castOptionsFromStory(story).collections).toEqual(["one", "two", "three"]);
	});
});

describe.each(["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const)("golden gate: cast in %s", (name: GoldenName) => {
	it("writes exactly the golden cast lines: revealed, collection started and shortened", async () => {
		const run = await playGolden(name);
		const expected = ownedBy(run.golden, ["cast"]);
		expect(expected.length).toBe(name.startsWith("whispers") ? 0 : 3);
		expect(goldenDiff(expected, ownedBy(run.written(), ["cast"]))).toEqual([]);
	});
});
