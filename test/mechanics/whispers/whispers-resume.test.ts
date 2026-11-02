/**
 * The popularity vote of an old snapshot, restored (round 3, T1: mutants T1-8 and T1-9): the vote is
 * loaded at the minute the saved run last played (the old `PopularityVote#restore`), so a round
 * counted at the first minute of the resumed run is still counted then, and the old single surprise
 * vote (no round) stays open as the round of that minute. No example snapshot holds whispers state, so
 * the slice is a fixture in the old shape; the other slices are the checkpoint's own stand-ins.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { receipts } from "@swarmtales/mechanic-receipts";
import { whispers } from "@swarmtales/mechanic-whispers";
import { createPromptLookup } from "@swarmtales/prompts";
import { scriptedAgent, standInsFor } from "@swarmtales/testkit";
import whispersStory from "../../../stories/whispers/story.ts";
import { channelsStandIn } from "../t1/support.ts";
import { exileStandIn, progressionStandIn, puzzlesStandIn } from "../t1/stand-ins.ts";
import { options } from "../t1/whispers-options.ts";

const PATH = join(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);
const TEXTS = options(whispersStory).whispers.popularity.texts;

interface Round {
	readonly opensAt: number;
	readonly countsAt: number;
	readonly points: number;
	readonly label: string;
}

/** The checkpoint (minute 8) resumed with a saved vote in the old shape and these rounds. */
function resume(popularity: unknown, rounds: readonly Round[]) {
	const configured = options(whispersStory);
	const snapshot = { ...converted.host, mechanics: { ...converted.host.mechanics, whispers: { version: 0, data: { whispers: { whisperer: "A02", forgeries: [], popularity } } } } };
	const definition = defineCoreStory({
		id: "nexus",
		seed: 7,
		minutes: 80,
		residents: converted.host.residents.ids,
		mechanics: [
			ledger.with(),
			channelsStandIn().use,
			exileStandIn([]),
			puzzlesStandIn([]),
			progressionStandIn().use,
			marks.with(configured.marks),
			receipts.with(),
			whispers.with({ ...configured.whispers, popularity: { rounds: rounds.map((round) => ({ ...round })), texts: { ...TEXTS } } }),
			...standInsFor(snapshot, ["ledger", "channels", "exile", "marks", "receipts", "whispers", "progression", "puzzles"]),
		],
		grants: { resident: ["nameFavourite"] },
	});
	return createHost({ story: definition, prompts: createPromptLookup(), resume: { snapshot, events: converted.events } });
}

const ROUNDS: readonly Round[] = [
	{ opensAt: 0, countsAt: 6, points: 2, label: "one" },
	{ opensAt: 7, countsAt: 9, points: 3, label: "two" },
];

describe("restoring a saved popularity vote", () => {
	it("counts a round due at the first minute of the resumed run: the vote is restored at the minute before", async () => {
		// The checkpoint is at minute 8, round two counts at minute 9, the first minute played.
		const host = resume({ round: 1, state: "open", ballots: [{ agent: "A01", choice: "A03" }, { agent: "A02", choice: "A03" }, { agent: "A04", choice: "A05" }] }, ROUNDS);
		const before = host.log.length;
		await host.playMinute(scriptedAgent(() => []));
		const results = host.log.all().slice(before).filter((event) => event.type === "popularity_result");
		expect(results).toHaveLength(1);
		expect(results[0]?.payload).toMatchObject({ round: 2, winners: ["A03"], points: 3, voters: ["A01", "A02", "A04"] });
		expect(host.snapshot().mechanics.whispers?.data).toMatchObject({ round: 2, phase: "closed" });
	});

	it("keeps the old single surprise vote, open, as the round of the saved minute, and its ballots only in the final round", async () => {
		const ballots = [{ agent: "A01", choice: "A03" }];
		// Three rounds: the vote is open in round two (it opened at minute 7); the ballots belong to the grand prize, not to it.
		const middle = resume({ state: "open", ballots }, [...ROUNDS.slice(0, 1), { opensAt: 7, countsAt: 12, points: 3, label: "two" }, { opensAt: 10, countsAt: 16, points: 4, label: "three" }]);
		await middle.playMinute(scriptedAgent(() => []));
		expect(middle.snapshot().mechanics.whispers?.data).toMatchObject({ round: 1, phase: "open", ballots: [] });
		// Two rounds: it is the final vote, and the ballots stay.
		const last = resume({ state: "open", ballots }, [ROUNDS[0] ?? { opensAt: 0, countsAt: 6, points: 2, label: "one" }, { opensAt: 7, countsAt: 12, points: 3, label: "two" }]);
		await last.playMinute(scriptedAgent(() => []));
		expect(last.snapshot().mechanics.whispers?.data).toMatchObject({ round: 1, phase: "open", ballots });
		// A single vote that was not open yet stays pending.
		const pending = resume({ state: "pending", ballots: [] }, [ROUNDS[0] ?? { opensAt: 0, countsAt: 6, points: 2, label: "one" }, { opensAt: 10, countsAt: 12, points: 3, label: "two" }]);
		await pending.playMinute(scriptedAgent(() => []));
		expect(pending.snapshot().mechanics.whispers?.data).toMatchObject({ round: 1, phase: "pending" });
	});
});
