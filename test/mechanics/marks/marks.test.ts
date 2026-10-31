/**
 * The marks mechanic (carve step 3, team T1): the golden gate for `marks_spent` (the golden run's
 * level-ups and spends replayed through `MarksApi`, the status part compared with the `marks a/b`
 * of every golden status line), the rules of packages/engine/src/marks.ts (test/engine/marks.test.ts:
 * ranges, refill, run-wide allowance, level change) and the resume of the legacy snapshot.
 * `ProgressionEvents` come from a stand-in that replays the golden `level_up` lines (team T3).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { MarksRules, MechanicUse } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { MarksApi, ProgressionEvents } from "@swarmtales/mechanic-shared";
import { standInWithEvents } from "../t1/stand-ins.ts";
import { createPromptLookup } from "@swarmtales/prompts";
import { Type } from "typebox";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, compareGolden, idleAgent, ownedBy, playStory, standInsFor, type LegacyLine } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";
import { GOLDEN_LOGS, goldenLog, ids, sourcesOf, writtenBy } from "../t1/support.ts";

const MARKS_PART = /marks (\d+)\/(\d+)/;

/** What the replay saw: the status segments the golden status lines had, and the part `left` gives at the same point. */
interface Seen {
	readonly golden: string[];
	readonly mine: string[];
}

/**
 * Replays the golden run in log order, minute by minute: `level_up` is written (this stand-in is the
 * "progression" source), `marks_spent` becomes `MarksApi.spend` and a status line reads `MarksApi.left`.
 */
function replay(log: readonly LegacyLine[], seen: Seen): MechanicUse {
	return defineMechanic(
		{ id: "progression", summary: "Stand-in: replays the golden run.", options: Type.Object({}), state: () => undefined, events: { ...ProgressionEvents.events }, requires: [MarksApi] },
		() => ({
			hooks: {
				minuteStarted: (ctx) => {
					for (const line of log) {
						if (line.minute !== ctx.minute) continue;
						if (line.type === "level_up" && typeof line.agent === "string" && typeof line.from === "number" && typeof line.to === "number") ctx.emit("level_up", { agent: line.agent, from: line.from, to: line.to });
						if (line.type === "marks_spent" && typeof line.agent === "string" && (line.channel === "dm" || line.channel === "board" || line.channel === "group" || line.channel === "receipt")) {
							ctx.call(MarksApi, "spend", { resident: line.agent, channel: line.channel });
						}
						const status = line.type === "turn_input" && Array.isArray(line.inputs) ? String(line.inputs[0]) : "";
						if (typeof line.agent !== "string" || !status.startsWith("[status]")) continue;
						seen.golden.push(MARKS_PART.exec(status)?.[0] ?? "-");
						const left = ctx.call(MarksApi, "left", { resident: line.agent });
						seen.mine.push(left === null ? "-" : `marks ${String(left.remaining)}/${String(left.budget)}`);
					}
				},
			},
		}),
	).with();
}

function marksOptions(story: { readonly rules: { readonly marks?: MarksRules }; readonly levels: readonly { readonly number: number; readonly marks?: { readonly perLevel?: number } }[] }) {
	const rules = story.rules.marks;
	if (rules === undefined) throw new Error("the story has marks");
	const { ranges, ...base } = rules;
	const copied = ranges === undefined ? base : { ...base, ranges: ranges.map((range) => ({ ...range })) };
	return { rules: copied, levels: story.levels.flatMap((level) => (level.marks?.perLevel === undefined ? [] : [{ level: level.number, perLevel: level.marks.perLevel }])) };
}

describe("the golden gate for marks_spent", () => {
	it.each(GOLDEN_LOGS)("%s: the marks spent and the status part equal the golden run's", async (name) => {
		const log = goldenLog(name);
		const story = name.startsWith("whispers") ? whispers : cityOfKeys;
		const seen: Seen = { golden: [], mine: [] };
		const definition = defineCoreStory({
			id: "golden",
			seed: 7,
			minutes: 21,
			residents: ids(6),
			mechanics: [ledger.with(), marks.with(marksOptions(story)), replay(log, seen)],
			grants: {},
		});
		const run = await playStory({ story: definition, prompts: createPromptLookup() }, idleAgent);
		const expected = ownedBy(log, ["marks"]);
		expect(expected.length).toBeGreaterThan(0);
		expect(compareGolden(expected, writtenBy(run.events, ["marks"]))).toBeUndefined();
		expect(seen.golden.length).toBe(log.filter((line) => line.type === "turn_input" && String(Array.isArray(line.inputs) ? line.inputs[0] : "").startsWith("[status]")).length);
		expect(seen.mine).toEqual(seen.golden);
		expect(seen.golden.some((part) => part !== "-")).toBe(true);
	});
});

const RANGES = {
	rules: {
		fromLevel: 1,
		perLevel: 4,
		prices: { board: 0, group: 1, dm: 2 },
		ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 1 } }, { fromLevel: 5, perLevel: 2 }],
	},
};

/** What a scenario can do at the start of a minute, as the cities' other mechanics would. */
interface Probe {
	up(agent: string, to: number): void;
	spend(agent: string, channel: "board" | "group" | "dm" | "receipt"): string;
	left(agent: string): string;
	canAfford(agent: string, channel: "board" | "group" | "dm" | "receipt"): boolean;
}

const show = (status: { readonly remaining: number; readonly budget: number } | null): string => (status === null ? "none" : `${String(status.remaining)}/${String(status.budget)}`);

/** Runs `steps` at the start of their minutes; a step records what it saw in `seen`. */
async function scenario(options: object, steps: Readonly<Record<number, (probe: Probe) => void>>, minutes = 41): Promise<void> {
	const driver = defineMechanic(
		{ id: "progression", summary: "Stand-in that writes level_up and calls the marks.", options: Type.Object({}), state: () => undefined, events: { ...ProgressionEvents.events }, requires: [MarksApi] },
		() => ({
			hooks: {
				minuteStarted: (ctx) => {
					steps[ctx.minute]?.({
						up: (agent, to) => {
							ctx.emit("level_up", { agent, from: to - 1, to });
						},
						spend: (agent, channel) => show(ctx.call(MarksApi, "spend", { resident: agent, channel })),
						left: (agent) => show(ctx.call(MarksApi, "left", { resident: agent })),
						canAfford: (agent, channel) => ctx.call(MarksApi, "canAfford", { resident: agent, channel }),
					});
				},
			},
		}),
	);
	const story = defineCoreStory({ id: "scenario", seed: 7, minutes, residents: ids(2), mechanics: [ledger.with(), marks.with(options), driver.with()], grants: {} });
	await playStory({ story, prompts: createPromptLookup() }, idleAgent);
}

describe("the rules of the allowance", () => {
	it("takes allowance, prices and refill from the range of the level, and refills one mark per minute up to the allowance", async () => {
		const seen: unknown[] = [];
		await scenario(RANGES, {
			0: (probe) => {
				probe.up("A01", 3);
				seen.push([1, probe.left("A01"), probe.spend("A01", "dm"), probe.spend("A01", "dm"), probe.spend("A01", "dm"), probe.spend("A01", "dm"), probe.left("A01"), probe.canAfford("A01", "board")]);
				seen.push([2, probe.spend("A02", "dm"), probe.left("A02")]);
			},
			2: (probe) => seen.push([3, probe.left("A01"), probe.left("A01")]),
			30: (probe) => {
				seen.push([4, probe.left("A01"), probe.spend("A01", "dm")]);
			},
			31: (probe) => seen.push([5, probe.left("A01")]),
			40: (probe) => seen.push([6, probe.left("A02")]),
		});
		expect(seen).toEqual([
			[1, "4/4", "3/4", "2/4", "1/4", "0/4", "0/4", false],
			[2, "2/4", "2/4"],
			[3, "2/4", "2/4"],
			// A full allowance banks nothing: one spend later, one minute gives one mark back.
			[4, "4/4", "3/4"],
			[5, "4/4"],
			// Without a refill (level 1) nothing comes back.
			[6, "2/4"],
		]);
	});

	it("is free below its first level, and a level change gives a fresh allowance of the new level", async () => {
		const seen: unknown[] = [];
		const options = { rules: { fromLevel: 5, perLevel: 8, prices: { board: 0, group: 1, dm: 2 } }, levels: [{ level: 6, perLevel: 3 }], startLevel: 4 };
		await scenario(options, {
			0: (probe) => {
				seen.push([probe.left("A01"), probe.spend("A01", "dm"), probe.canAfford("A01", "dm")]);
				probe.up("A01", 5);
				seen.push([probe.left("A01"), probe.spend("A01", "dm"), probe.spend("A01", "board"), probe.spend("A01", "receipt")]);
				probe.up("A01", 6);
				seen.push([probe.left("A01"), probe.canAfford("A01", "dm")]);
			},
		}, 2);
		expect(seen).toEqual([
			["none", "none", true],
			// Level 5: 8 marks, a DM costs 2, the board is free, a receipt costs 1 where the story names no price.
			["8/8", "6/8", "6/8", "5/8"],
			// Level 6 has its own allowance (3): a DM costs 2, so one more is affordable, the second not.
			["3/3", true],
		]);
	});

	it("keeps one balance for the whole run with a run-wide allowance (Whispers)", async () => {
		const seen: unknown[] = [];
		const options = { rules: { fromLevel: 1, perRun: 5, prices: { board: 1, group: 1, dm: 1, receipt: 2 } } };
		await scenario(options, {
			0: (probe) => seen.push([probe.spend("A01", "dm"), probe.spend("A01", "receipt")]),
			1: (probe) => {
				probe.up("A01", 2);
				seen.push([probe.left("A01"), probe.spend("A01", "board")]);
			},
		}, 3);
		expect(seen).toEqual([["4/5", "2/5"], ["2/5", "1/5"]]);
	});

	it("documents its options and takes randomness and time only from the host", () => {
		expect(checkOptionsDocumented(marks)).toEqual([]);
		expect(checkSourceRules(sourcesOf("marks"))).toEqual([]);
	});

	it("is deterministic and survives snapshot round trips", async () => {
		const story = defineCoreStory({ id: "rt", seed: 7, minutes: 4, residents: ids(3), mechanics: [ledger.with(), marks.with(RANGES)], grants: {} });
		const options = { story, prompts: createPromptLookup() };
		expect(await checkDeterminism(options, () => idleAgent)).toEqual([]);
		expect(await checkSnapshotRoundTrip(options, () => idleAgent, 2)).toEqual([]);
	});
});

describe("the legacy snapshot", () => {
	const PATH = join(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(PATH, "utf8")), {}, PATH);

	it("resumes with the version-0 slice migrated to version 1: allowances and the levels they stood on", () => {
		const definition = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [ledger.with(), marks.with(marksOptions(cityOfKeys)), standInWithEvents(ProgressionEvents), ...standInsFor(converted.host, ["marks", "ledger", "progression"])],
			grants: {},
		});
		const host = createHost({ story: definition, prompts: createPromptLookup(), resume: { snapshot: converted.host, events: converted.events } });
		expect(host.facts()["marks.remaining"]).toEqual({ A02: 7, A05: 6, A03: 7, A04: 8, A06: 7, A01: 5 });
		const slice = host.snapshot().mechanics.marks;
		expect(slice?.version).toBe(1);
		expect(JSON.stringify(slice?.data)).toContain('"levels":[{"agent":"A02","level":7}');
	});
});
