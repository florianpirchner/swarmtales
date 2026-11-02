/**
 * `toLegacySnapshot` from the host's own (version 1) slices of the arena, progression, channels and
 * script (step 18, S1-5 and A1-5): the Act I checkpoint is converted, resumed on the real city with
 * the real arena, snapshotted, and written back; the old file comes out byte for byte, with the
 * arena's `delivered` taken from progression and its `seenBoard` from channels. Slices of
 * mechanics without a writer stay the converter's version 0.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, parseSnapshot, toLegacySnapshot, type ConvertedSnapshot } from "@swarmtales/chronicle";
import type { AnyStory, Host, HostSnapshot, MechanicUse } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { arena, arenaFromStory } from "@swarmtales/mechanic-arena";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { script, scriptOptionsFromStory } from "@swarmtales/mechanic-script";
import { createPromptLookup } from "@swarmtales/prompts";
import { standInsFor } from "@swarmtales/testkit";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { resolveBlockSize } from "../../apps/cli/src/compose.ts";
import { channelsOptionsOf, marksOptions } from "../mechanics/t2/golden-world.ts";
import { exileStandIn } from "../mechanics/t1/stand-ins.ts";
import { progressionOptions } from "../mechanics/progression/harness.ts";
import { puzzleOptions } from "../mechanics/puzzles/harness.ts";
import { SCRIPT_GRANTS } from "../mechanics/script/golden-host.ts";

const PATH = resolve(import.meta.dirname, "../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

function raw(): unknown {
	return JSON.parse(readFileSync(PATH, "utf8"));
}

const LOADED = ["ledger", "channels", "receipts", "marks", "names", "exile", "cast", "petitions", "puzzles", "progression", "script", "arena"];

const WITHOUT_SEAL: AnyStory = (() => {
	const rest: { -readonly [K in keyof AnyStory]: AnyStory[K] } = { ...cityOfKeys };
	delete rest.seal;
	return rest;
})();

/** The real city with the real script and the real arena on the converted snapshot. */
function resumedHost(converted: ConvertedSnapshot): Host {
	const story = WITHOUT_SEAL;
	const rules = marksOptions(story);
	const naming = story.names;
	const run = story.run;
	const { options, turns } = arenaFromStory(story, {
		startLevel: parseSnapshot(raw()).run.startLevel,
		activation: run.activation,
		passesPerMinute: run.passesPerMinute,
		blockSize: resolveBlockSize(run.blockSize, 6),
		stopWhenDone: run.stopWhenDone ?? false,
		stopWhenSeatsDecided: run.stopWhenSeatsDecided ?? false,
		budgetUsd: 0.05,
	});
	const mechanics: MechanicUse[] = [
		ledger.with({ startPoints: story.run.startPoints }),
		channels.with(channelsOptionsOf(story)),
		receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true }),
		...(rules === undefined ? [] : [marks.with(rules)]),
		...(naming === undefined ? [] : [names.with({ ...naming, fallbackWords: [...naming.fallbackWords], reserved: [...Object.keys(story.cast), story.city] })]),
		exileStandIn([]),
		cast.with(castOptionsFromStory(story)),
		petitions.with({}),
		puzzles.with(puzzleOptions(story)),
		progression.with(progressionOptions(story)),
		script.with(scriptOptionsFromStory(story)),
		arena.with(options),
	];
	return createHost({
		story: defineCoreStory({
			id: converted.host.story,
			seed: converted.host.seed,
			minutes: converted.host.minute + 1,
			residents: converted.host.residents.ids,
			mechanics: [...mechanics, ...standInsFor(converted.host, LOADED)],
			grants: { resident: [], script: SCRIPT_GRANTS },
			turns,
		}),
		prompts: createPromptLookup(),
		resume: { snapshot: converted.host, events: converted.events },
	});
}

/** The converted snapshot with the host's own slices of the four mechanics that have a writer. */
function withCurrentSlices(converted: ConvertedSnapshot, host: HostSnapshot, which: readonly string[]): ConvertedSnapshot {
	const mechanics = { ...converted.host.mechanics };
	for (const name of which) {
		const slice = host.mechanics[name];
		if (slice !== undefined) mechanics[name] = slice;
	}
	return { ...converted, host: { ...converted.host, mechanics } };
}

describe("toLegacySnapshot from the current slices", () => {
	const converted = convertLegacySnapshot(raw(), {}, "snapshot-L7");
	const taken = resumedHost(converted).snapshot();
	const original = JSON.stringify(parseSnapshot(raw()));

	it("takes the four mechanics' slices at version 1 from the resumed host", () => {
		for (const name of ["arena", "progression", "channels", "script"]) expect(taken.mechanics[name]?.version, name).toBe(1);
	});

	it("writes the old file back byte for byte", () => {
		const legacy = toLegacySnapshot(withCurrentSlices(converted, taken, ["arena", "progression", "channels", "script"]));
		expect(JSON.stringify(legacy)).toBe(original);
	});

	it("merges the arena's delivered from progression and its seenBoard from channels", () => {
		const file = parseSnapshot(raw());
		const slices = withCurrentSlices(converted, taken, ["arena", "progression", "channels", "script"]);
		const changed: HostSnapshot = {
			...slices.host,
			mechanics: {
				...slices.host.mechanics,
				progression: { version: 1, data: { ...asRecord(taken.mechanics.progression?.data), delivered: [{ agent: "A01", level: 3, finished: true }] } },
				channels: { version: 1, data: { ...asRecord(taken.mechanics.channels?.data), seen: [{ agent: "A02", seq: 9 }] } },
			},
		};
		const legacy = toLegacySnapshot({ ...slices, host: changed });
		expect(legacy.arena.delivered).toEqual([{ agent: "A01", level: 3, finished: true }]);
		expect(legacy.arena.seenBoard).toEqual([{ agent: "A02", seq: 9 }]);
		expect(legacy.arena.seenPoints).toEqual(file.arena.seenPoints);
		expect(legacy.arena.braked).toEqual(file.arena.braked ?? []);
	});

	it("keeps what the player changed: a solved level and a board post reach the old world", () => {
		const slices = withCurrentSlices(converted, taken, ["arena", "progression", "channels", "script"]);
		const progressionData = asRecord(taken.mechanics.progression?.data);
		const competitors = Array.isArray(progressionData.competitors) ? progressionData.competitors : [];
		const first: unknown = competitors[0];
		const edited = [{ ...asRecord(first), solved: [1, 2, 3, 4, 5, 6, 7] }, ...competitors.slice(1)];
		const changed: HostSnapshot = { ...slices.host, mechanics: { ...slices.host.mechanics, progression: { version: 1, data: { ...progressionData, competitors: edited } } } };
		const legacy = toLegacySnapshot({ ...slices, host: changed });
		expect(legacy.world.competitors[0]?.solved).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(legacy.world.competitors[1]?.solved).toEqual(parseSnapshot(raw()).world.competitors[1]?.solved);
	});

	it("refuses a slice of another mechanic that is not version 0 (no writer yet)", () => {
		const slices = withCurrentSlices(converted, taken, ["arena", "progression", "channels", "script", "ledger"]);
		expect(() => toLegacySnapshot(slices)).toThrow(/ledger: only version-0 slices/);
	});
});

function asRecord(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("a slice is an object");
	return Object.fromEntries(Object.entries(value));
}
