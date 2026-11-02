/**
 * The `runResumed` phases of T2 in the old `#restore` order (world.ts:3083-3125, R2-D9): a file from
 * before the core motives gets them dealt first, then a cast member the story added after the
 * snapshot gets its escrow, both at the snapshot's minute and before `minute_started`. The real
 * motives, cast, channels, ledger, marks, names, receipts, puzzles and progression resume the real
 * Act I checkpoint. Exile stands in: the real one needs the real seal and goals with the story's
 * options (steps 17 and 18), and nothing here reads it (test/mechanics/channels/real-exile.test.ts
 * runs the real exile and tribunal with channels).
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { HostSnapshot } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { receipts } from "@swarmtales/mechanic-receipts";
import { CoreMotivesOptions, motives } from "@swarmtales/mechanic-motives";
import { idleAgent, standInsFor } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { progression } from "@swarmtales/mechanic-progression";
import { progressionOptions } from "../progression/harness.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { exileStandIn, t2Prompts } from "../channels/harness.ts";
import { marksOptions } from "./golden-world.ts";
import { beforeTheMember } from "./old-file.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const path = join(ROOT, "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json");
function need<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new Error(what);
	return value;
}

const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);
const KEYS = Parse(CoreMotivesOptions, need(cityOfKeys.coreMotives, "the story has core motives"));
const rules = need(marksOptions(cityOfKeys), "the story has marks");
const naming = need(cityOfKeys.names, "the story names its residents");
const LOADED = ["motives", "cast", "channels", "ledger", "marks", "names", "receipts", "exile", "progression", "puzzles"];

/** The file as it was before the core motives existed and before the story added its cast member. */
function oldest(): HostSnapshot {
	const bare = beforeTheMember(converted.host, "STEWARD");
	return { ...bare, mechanics: { ...bare.mechanics, motives: { version: 0, data: {} } } };
}

function resume(snapshot: HostSnapshot) {
	const story = defineCoreStory({
		id: "nexus",
		seed: 7,
		minutes: 80,
		residents: converted.host.residents.ids,
		mechanics: [
			motives.with(KEYS),
			cast.with({ members: { STEWARD: { level: 10, hidden: true, escrow: 10 } } }),
			channels.with(),
			ledger.with(),
			marks.with(rules),
			names.with({ ...naming, fallbackWords: [...naming.fallbackWords], reserved: ["STEWARD", cityOfKeys.city] }),
			receipts.with(),
			exileStandIn.with(),
			puzzles.with(puzzleOptions(cityOfKeys)),
			progression.with(progressionOptions(cityOfKeys)),
			...standInsFor(snapshot, LOADED),
		],
		grants: {},
	});
	return createHost({ story, prompts: t2Prompts(), resume: { snapshot, events: converted.events } });
}

describe("what a resumed run does before its first minute", () => {
	it("deals the core motives, then funds the escrow, then starts the minute", async () => {
		const host = resume(oldest());
		await host.playMinute(idleAgent);
		const written = host.log.all().slice(converted.events.length);
		const kinds = written.map((event) => event.type);
		const dealt = kinds.flatMap((type, index) => (type === "core_dealt" ? [index] : []));
		const funded = kinds.indexOf("ledger_entry");
		const started = kinds.indexOf("minute_started");
		expect(dealt).toHaveLength(6);
		expect(funded).toBeGreaterThan(-1);
		expect(Math.max(...dealt)).toBeLessThan(funded);
		expect(funded).toBeLessThan(started);
		// All at the old file's minute, one before the host's next (the old restore's clock, L1): nothing of the next minute has begun.
		expect(new Set(written.slice(0, started).map((event) => event.minute))).toEqual(new Set([converted.host.minute - 1]));
	});

	it("does neither for a file that has both", async () => {
		const host = resume(converted.host);
		await host.playMinute(idleAgent);
		const kinds = host.log.all().slice(converted.events.length).map((event) => event.type);
		expect(kinds).not.toContain("core_dealt");
		expect(kinds).not.toContain("ledger_entry");
	});
});
