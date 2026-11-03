/**
 * The arena resumed from the Act I checkpoint `examples/cityofkeys-act1-06a-04/snapshot-L7.json`
 * (six residents held at door 7), against the old engine:
 *
 * - the converter's version-0 slice (the old `arena` field) loads through the arena's migration as
 *   the old `Arena.restore` + `snapshot` keeps its own fields (`seenPoints`, `braked`; `delivered`
 *   is progression's now, `seenBoard` channels');
 * - the resumed run continues alike with the story's own turn policy (`onNovelty`, three passes, the
 *   `auto` block): the old composed run and the new host (the real city, the real script and the
 *   real arena; exile a stand-in with nobody exiled, the slices of the mechanics not loaded inert
 *   stand-ins) play the same calls from minute 9 on. Replies, the arena's lines (`round_start`,
 *   `pass_start`, `turn_skipped` of the activation, `round_end` with its standings, `run_end`),
 *   the lines of every loaded mechanic in log order, and the arena's slice must be the same. The
 *   seal (another team's mechanic) is taken out of the story on both sides, as in the script's
 *   resume test; the secret goals are not loaded on the new side (every goal misses in the old run,
 *   so the standings' points are the same, and the goals' own lines are left out of the comparison).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, legacySink, parseSnapshot } from "@swarmtales/chronicle";
import type { AnyStory, Host, MechanicUse } from "@swarmtales/contracts";
import { Type } from "typebox";
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
import { dropJustified, ownedBy, standInsFor, type LegacyLine, type PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { resolveBlockSize } from "../../../apps/cli/src/run-options.ts";
import { currentScenario, expectFingerprint, fingerprintOf, planTable, recordedOld } from "../../helpers/old-engine.ts";
import { OldWorldRecord, RecordedWorld } from "../../helpers/old-world.ts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";
import { exileStandIn } from "../t1/stand-ins.ts";
import { replyText } from "../t1/differential.ts";
import { progressionOptions } from "../progression/harness.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { SCRIPT_GRANTS } from "../script/golden-host.ts";
import { oldArenaFields, type CodeOf, type Plan } from "./differential.ts";

const PATH = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

function raw(): unknown {
	return JSON.parse(readFileSync(PATH, "utf8"));
}

/** The old world offers every resident its level's tools and `activeTools`; the city's levels name them all. */
const TOOLS: readonly string[] = [...new Set([...cityOfKeys.levels.flatMap((level) => level.tools), "activeTools"])];

/** The mechanics a resumed city loads for real; every other slice gets an inert stand-in. */
const LOADED = ["ledger", "channels", "receipts", "marks", "names", "exile", "cast", "petitions", "puzzles", "progression", "script", "arena"];

/** The story without the seal (another team's mechanic, not loaded here), as in the script's resume test. */
const WITHOUT_SEAL: AnyStory = (() => {
	const rest: { -readonly [K in keyof AnyStory]: AnyStory[K] } = { ...cityOfKeys };
	delete rest.seal;
	return rest;
})();

const call = (tool: string, params: Record<string, string | number | boolean> = {}): PlannedCall => ({ tool, params });

/** All enter the wall when the door opens at minute 9; A01 and A02 climb on, A03 writes A04, A05 follows later. */
const PLAN: Plan = (agent, minute, codeOf) => {
	if (minute === 9 && (agent === "A01" || agent === "A02")) return [call("submitSolution", { level: 8, code: codeOf(agent, 8) })];
	if (minute === 9 && agent === "A03") return [call("sendDM", { target: "A04", message: "A03 asks A04 for the wall." })];
	if (minute === 10 && agent === "A04") return [call("readBoard")];
	if (minute === 11 && agent === "A05") return [call("submitSolution", { level: 8, code: codeOf(agent, 8) })];
	return [];
};

const run = cityOfKeys.run;
/**
 * Below what Act I spent before the checkpoint (the file's `usage` lines): a resumed run counts only
 * its own spend (old `usage.own()`), so neither side stops for the replayed prefix.
 */
const BUDGET = 0.05;
const passes = run.passesPerMinute;
const blockSize = resolveBlockSize(run.blockSize, 6);

interface OldResumed {
	readonly replies: ReadonlyMap<string, readonly string[]>;
	readonly lines: readonly LegacyLine[];
	readonly restored: unknown;
	readonly arena: unknown;
	readonly world: RecordedWorld;
}

const OldRecord = Type.Object({
	fingerprint: Type.String(),
	replies: Type.Array(Type.Tuple([Type.String(), Type.Array(Type.String())])),
	lines: Type.Array(Type.Record(Type.String(), Type.Unknown())),
	restored: Type.Unknown(),
	arena: Type.Unknown(),
	world: OldWorldRecord,
});

/** The old continuation's inputs: the checkpoint, the minutes and every call of the plan on the old world's codes. */
function fingerprint(minutes: number, world: RecordedWorld): string {
	const start = parseSnapshot(raw()).minute + 1;
	return fingerprintOf({ snapshot: fingerprintOf(raw()), minutes, calls: planTable(6, minutes, (agent, index) => PLAN(agent, start + index, (who, level) => world.knownCode(who, level))) });
}

/**
 * The old run resumed for `minutes` more minutes, as it was recorded once before the engine went
 * (step 18, item 7b; `test/fixtures/old-engine/`).
 */
function resumeOld(minutes: number): Promise<OldResumed> {
	const { name, scenario } = currentScenario();
	const recorded = recordedOld(name, scenario, OldRecord);
	const world = new RecordedWorld(recorded.world);
	expectFingerprint(name, scenario, recorded.fingerprint, fingerprint(minutes, world));
	return Promise.resolve({ replies: new Map(recorded.replies), lines: recorded.lines, restored: recorded.restored, arena: recorded.arena, world });
}

/** The real city with the real script and the real arena on the converted snapshot. */
function resumedHost(minutes: number): Host {
	const story = WITHOUT_SEAL;
	const converted = convertLegacySnapshot(raw(), {}, "snapshot-L7");
	const rules = marksOptions(story);
	const naming = story.names;
	const { options, turns } = arenaFromStory(story, {
		startLevel: parseSnapshot(raw()).run.startLevel,
		activation: run.activation,
		passesPerMinute: passes,
		blockSize,
		stopWhenDone: run.stopWhenDone ?? false,
		stopWhenSeatsDecided: run.stopWhenSeatsDecided ?? false,
		budgetUsd: BUDGET,
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
			minutes: converted.host.minute + minutes,
			residents: converted.host.residents.ids,
			mechanics: [...mechanics, ...standInsFor(converted.host, LOADED)],
			grants: { resident: [...TOOLS], script: SCRIPT_GRANTS },
			turns,
		}),
		prompts: createPromptLookup(),
		awaitsAnswer: (resident) => awaiting.has(resident),
		resume: { snapshot: converted.host, events: converted.events },
	});
}

/** The residents whose last turn made calls (the old runner's `awaitsAnswer`); shared by the host and its turn taker. */
const awaiting = new Set<string>();

const arenaData = (host: Host): unknown => host.snapshot().mechanics.arena?.data;

/** The owners loaded on both sides. */
const OWNERS = ["arena", "script", "channels", "cast", "petitions", "ledger", "receipts", "marks", "names", "progression", "puzzles"] as const;

describe("the arena's slice of the L7 checkpoint", () => {
	it("loads the old arena field through the version-0 migration, as the old Arena keeps its own fields", async () => {
		const old = await resumeOld(1);
		const host = resumedHost(1);
		expect(host.snapshot().mechanics.arena?.version).toBe(1);
		expect(JSON.stringify(arenaData(host))).toBe(JSON.stringify(oldArenaFields(old.restored)));
		const file = raw();
		const field: unknown = typeof file === "object" && file !== null ? Reflect.get(file, "arena") : undefined;
		expect(JSON.stringify(arenaData(host))).toBe(JSON.stringify(oldArenaFields(field)));
	}, 60_000);
});

describe("the run resumed from the L7 checkpoint", () => {
	it("continues alike on the old engine and the new host: replies, the arena's lines, every loaded mechanic's lines, the slice", async () => {
		const minutes = 5;
		const old = await resumeOld(minutes);
		awaiting.clear();
		const host = resumedHost(minutes);
		const lines: LegacyLine[] = [];
		host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
		const codeOf: CodeOf = (agent, level) => old.world.inspect.codeOf(agent, level);
		const replies = new Map<string, string[]>();
		await host.run(async (turn) => {
			if (awaiting.delete(turn.resident)) return;
			const calls = PLAN(turn.resident, turn.minute, codeOf);
			for (const planned of calls) {
				const outcome = await turn.call(planned.tool, planned.params);
				const at = `${String(turn.minute)}:${turn.resident}`;
				replies.set(at, [...(replies.get(at) ?? []), replyText(outcome)]);
			}
			if (calls.length > 0) awaiting.add(turn.resident);
		});
		expect([...replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
		for (const [at, expected] of old.replies) expect(replies.get(at), at).toEqual(expected);

		const spentBefore = parseSnapshot(raw()).events.reduce((total, event) => total + (event.type === "usage" ? event.costUsd : 0), 0);
		expect(spentBefore).toBeGreaterThan(BUDGET);
		expect(lines.find((line) => line.type === "run_end")?.reason).toBeUndefined();
		const arenaLines = ownedBy(old.lines, ["arena"]);
		expect(arenaLines.filter((line) => line.startsWith('{"type":"round_end"'))).toHaveLength(minutes);
		expect(arenaLines.some((line) => line.startsWith('{"type":"turn_skipped"'))).toBe(true);
		expect(ownedBy(lines, ["arena"])).toEqual(arenaLines);
		// The secret goals (dealt when door 8 opens, read out at the act's end) are not loaded on the new side; every goal
		// misses in the old run, so the standings hold the same points.
		const goalLine = (line: string): boolean => line.includes("secret goal");
		const { kept } = dropJustified(ownedBy(old.lines, OWNERS), goalLine, "the goals mechanic is not loaded on the new side (its deal on resume is the goals team's)");
		expect(old.lines.filter((line) => line.type === "goal_resolved").every((line) => line.fulfilled === false)).toBe(true);
		expect(ownedBy(lines, OWNERS)).toEqual(kept);
		expect(JSON.stringify(arenaData(host))).toBe(JSON.stringify(oldArenaFields(old.arena)));
	}, 120_000);
});
