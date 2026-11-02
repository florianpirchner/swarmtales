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
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { convertLegacySnapshot, legacySink, parseSnapshot, type RunSnapshot, MemorySink } from "@swarmtales/chronicle";
import type { AnyStory, Host, MechanicUse } from "@swarmtales/contracts";
import type { World } from "@swarmtales/engine";
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
import { ScriptedModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { dropJustified, ownedBy, standInsFor, type LegacyLine, type PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { composeRun, resolveBlockSize, resumeOverrides } from "../../../apps/cli/src/compose.ts";
import { act, say } from "../../helpers/fixture.ts";
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

function argsOf(params: unknown): Record<string, string | number | boolean> {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([name, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${name}`);
			return [name, value];
		}),
	);
}

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
	readonly world: World;
}

/** The old run resumed for `minutes` more minutes with the story's own activation; a turn after a turn with calls answers them. */
async function resumeOld(minutes: number): Promise<OldResumed> {
	const snapshot: RunSnapshot = parseSnapshot(raw());
	const start = snapshot.minute + 1;
	const log = new MemorySink();
	const composed = composeRun({
		story: WITHOUT_SEAL,
		overrides: { minutes: start + minutes, gamemaker: false, classifier: false, budgetUsd: BUDGET, ...resumeOverrides(snapshot) },
		models: (world) => {
			const codeOf: CodeOf = (agent, level) => world.inspect.codeOf(agent, level);
			const awaiting = new Set<string>();
			const step =
				(agent: string): FauxResponseStep =>
				(): AssistantMessage => {
					if (awaiting.delete(agent)) return say("Answered.");
					const calls = PLAN(agent, world.minute, codeOf);
					if (calls.length > 0) awaiting.add(agent);
					return calls.length === 0 ? say() : act(...calls.map((planned) => ({ name: planned.tool, args: argsOf(planned.params) })));
				};
			return new ScriptedModelSource(Object.fromEntries(world.competitors.map((agent) => [agent, Array.from({ length: minutes * passes + 2 }, () => step(agent))])));
		},
		sinks: [log],
		meta: { run: "resumed" },
		resume: { snapshot, name: "snapshot-L7.json" },
	});
	const restored = composed.arena.snapshot();
	await composed.arena.run();
	const replies = new Map<string, string[]>();
	for (const event of log.events) {
		if (event.type !== "tool_result" || event.minute < start) continue;
		const at = `${String(event.minute)}:${event.agent}`;
		replies.set(at, [...(replies.get(at) ?? []), `${String(event.isError)}|${event.text}`]);
	}
	const lines = log.events.filter((event) => event.minute >= start && event.type !== "run_resumed").map((event) => ({ ...event }));
	return { replies, lines, restored, arena: composed.arena.snapshot(), world: composed.world };
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
