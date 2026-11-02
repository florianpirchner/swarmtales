/**
 * The script resumed from the Act I checkpoint `examples/cityofkeys-act1-06a-04/snapshot-L7.json`
 * (six residents held at door 7), against the old engine:
 *
 * - the converter's version-0 slice (the old `director` field) loads through the script's migration
 *   unchanged, as the old `Director.restore` + `snapshot` keeps it, and the old file written back
 *   from the new host (`toLegacySnapshot`) carries the same `director` field;
 * - the resumed run continues alike: the old composed run (with the real `Director`) and the new
 *   host (the real city and the real script; exile a stand-in with nobody exiled, the slices of the
 *   mechanics not loaded inert stand-ins) play the same calls from minute 9 on. The door opens, all
 *   six enter the wall (`courier-8`, `city-marks-8`, `city-factor-8`), two climb on (`courier-9`,
 *   `city-factor-9`, `holder-behind-9`), a DM stays unanswered, the standings are published at
 *   minute 12 and split teams are announced at minute 13. Replies, the director's lines and windows,
 *   and the slice must be the same. The seal (another team's mechanic) is taken out of the story on
 *   both sides: its auction would post before the director at minute 13.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { convertLegacySnapshot, legacySink, parseSnapshot, toLegacySnapshot, type ConvertedSnapshot, type RunSnapshot, MemorySink } from "@swarmtales/chronicle";
import type { AnyStory, Host, MechanicUse } from "@swarmtales/contracts";
import { Director, EventBus, type World } from "@swarmtales/engine";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
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
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { ScriptedModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { ownedBy, standInsFor, type LegacyLine, type PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { composeRun, resolveBlockSize, resumeOverrides } from "../../../apps/cli/src/compose.ts";
import { act, say } from "../../helpers/fixture.ts";
import { currentScenario, expectFingerprint, fingerprintOf, planTable, recordedOld } from "../../helpers/old-engine.ts";
import { oldValue, RECORDING, recordOld, recordWorld } from "../../helpers/old-engine-recorder.ts";
import { OldWorldRecord, RecordedWorld } from "../../helpers/old-world.ts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";
import { exileStandIn } from "../t1/stand-ins.ts";
import { replyText } from "../t1/differential.ts";
import { progressionOptions } from "../progression/harness.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { SCRIPT_GRANTS } from "./golden-host.ts";
import type { CodeOf, Plan } from "./differential.ts";
import { windowsOf } from "./windows.ts";

const PATH = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

function raw(): unknown {
	return JSON.parse(readFileSync(PATH, "utf8"));
}

function directorOf(file: unknown): unknown {
	return typeof file === "object" && file !== null ? Reflect.get(file, "director") : undefined;
}

const TOOLS = ["getStatus", "getProblem", "submitSolution", "sendDM", "postBoard", "readBoard"] as const;

/** The mechanics a resumed city loads for real; every other slice gets an inert stand-in. */
const LOADED = ["ledger", "channels", "receipts", "marks", "names", "exile", "cast", "petitions", "puzzles", "progression", "script"];

function argsOf(params: unknown): Record<string, string | number | boolean> {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([key, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${key}`);
			return [key, value];
		}),
	);
}

interface OldResumed {
	readonly replies: ReadonlyMap<string, readonly string[]>;
	readonly lines: readonly LegacyLine[];
	readonly director: unknown;
	readonly world: RecordedWorld;
}

const OldRecord = Type.Object({
	fingerprint: Type.String(),
	replies: Type.Array(Type.Tuple([Type.String(), Type.Array(Type.String())])),
	lines: Type.Array(Type.Record(Type.String(), Type.Unknown())),
	director: Type.Unknown(),
	world: OldWorldRecord,
});

/** The old continuation's inputs: the snapshot, the story, the minutes and every call of the plan on the old world's codes. */
function fingerprint(file: unknown, story: AnyStory, minutes: number, plan: Plan, world: RecordedWorld): string {
	const snapshot = parseSnapshot(JSON.parse(JSON.stringify(file)));
	const start = snapshot.minute + 1;
	return fingerprintOf({ snapshot: fingerprintOf(file), story, minutes, calls: planTable(snapshot.agents, minutes, (agent, index) => plan(agent, start + index, (who, level) => world.knownCode(who, level))) });
}

/**
 * Continues the old run for `minutes` more minutes, as it was recorded once before the engine went
 * (step 18, item 7b; `test/fixtures/old-engine/`).
 */
async function resumeOld(file: unknown, story: AnyStory, minutes: number, plan: Plan): Promise<OldResumed> {
	const { name, scenario } = currentScenario();
	if (RECORDING) {
		const live = await resumeOldLive(file, story, minutes, plan);
		const world = recordWorld(live.world);
		recordOld(name, scenario, { fingerprint: fingerprint(file, story, minutes, plan, new RecordedWorld(world)), replies: [...live.replies], lines: live.lines, director: live.director, world });
	}
	const recorded = recordedOld(name, scenario, OldRecord);
	const world = new RecordedWorld(recorded.world);
	expectFingerprint(name, scenario, recorded.fingerprint, fingerprint(file, story, minutes, plan, world));
	return { replies: new Map(recorded.replies), lines: recorded.lines, director: recorded.director, world };
}

/** The live old continuation; the plan's calls are built when the turn comes (a level is dealt when the door opens). Recording only; deleted with the engine. */
async function resumeOldLive(file: unknown, story: AnyStory, minutes: number, plan: Plan) {
	const snapshot: RunSnapshot = parseSnapshot(JSON.parse(JSON.stringify(file)));
	const start = snapshot.minute + 1;
	const log = new MemorySink();
	const run = composeRun({
		story,
		overrides: { minutes: start + minutes, gamemaker: false, classifier: false, activation: "always", passesPerMinute: 1, ...resumeOverrides(snapshot) },
		models: (world) => {
			const codeOf: CodeOf = (agent, level) => world.inspect.codeOf(agent, level);
			return new ScriptedModelSource(
				Object.fromEntries(
					world.competitors.map((agent) => [
						agent,
						Array.from({ length: minutes }, (_unused, index): FauxResponseStep => (): AssistantMessage => {
							const calls = plan(agent, start + index, codeOf);
							return calls.length === 0 ? say() : act(...calls.map((call: PlannedCall) => ({ name: call.tool, args: argsOf(call.params) })));
						}),
					]),
				),
			);
		},
		sinks: [log],
		meta: { run: "resumed" },
		resume: { snapshot, name: "snapshot-L7.json" },
	});
	await run.arena.run();
	const replies = new Map<string, string[]>();
	for (const event of log.events) {
		if (event.type !== "tool_result" || event.minute < start) continue;
		const key = `${String(event.minute)}:${event.agent}`;
		replies.set(key, [...(replies.get(key) ?? []), `${String(event.isError)}|${event.text}`]);
	}
	const lines = log.events.filter((event) => event.minute >= start && event.type !== "run_resumed").map((event) => ({ ...event }));
	return { replies, lines, director: run.director.snapshot(), world: run.world };
}

/** The real city with the real script on the converted snapshot. */
function resumedHost(file: unknown, story: AnyStory, minutes: number): Host {
	return resumedHostOf(convertLegacySnapshot(JSON.parse(JSON.stringify(file)), {}, "snapshot-L7"), story, minutes);
}

function resumedHostOf(converted: ConvertedSnapshot, story: AnyStory, minutes: number): Host {
	const rules = marksOptions(story);
	const naming = story.names;
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
	];
	return createHost({
		story: defineCoreStory({
			id: converted.host.story,
			seed: converted.host.seed,
			minutes: converted.host.minute + minutes,
			residents: converted.host.residents.ids,
			mechanics: [...mechanics, ...standInsFor(converted.host, LOADED)],
			grants: { resident: [...TOOLS], script: SCRIPT_GRANTS },
			turns: legacyTurns({ passesPerMinute: 1, blockSize: resolveBlockSize(story.run.blockSize, converted.host.residents.ids.length), activation: "always" }),
		}),
		prompts: createPromptLookup(),
		resume: { snapshot: converted.host, events: converted.events },
	});
}

const scriptData = (host: Host): unknown => host.snapshot().mechanics.script?.data;

describe("the script's slice of the L7 checkpoint", () => {
	it("loads the old director field through the version-0 migration, as the old Director keeps it", () => {
		const file = raw();
		const old = parseSnapshot(raw()).director;
		// The old Director's snapshot after `restore(old)`, recorded once (step 18, item 7b).
		const restored = oldValue(() => {
			const director = new Director(cityOfKeys.director, worldStub(), new EventBus([new MemorySink()], () => 0));
			director.restore(old);
			return director.snapshot();
		});
		const host = resumedHost(file, cityOfKeys, 1);
		expect(host.snapshot().mechanics.script?.version).toBe(1);
		expect(JSON.stringify(scriptData(host))).toBe(JSON.stringify(restored));
		expect(JSON.stringify(scriptData(host))).toBe(JSON.stringify(directorOf(file)));
	});

	it("starts fresh from an empty version-0 slice (a file without director state, R2-D2)", () => {
		const converted = convertLegacySnapshot(raw(), {}, "snapshot-L7");
		const snapshot = { ...converted.host, mechanics: { ...converted.host.mechanics, script: { version: 0, data: {} } } };
		const host = resumedHostOf({ ...converted, host: snapshot }, cityOfKeys, 1);
		// A fresh old Director's snapshot, recorded once (step 18, item 7b).
		const empty = oldValue(() => new Director(cityOfKeys.director, worldStub(), new EventBus([new MemorySink()], () => 0)).snapshot());
		expect(JSON.stringify(scriptData(host))).toBe(JSON.stringify(empty));
	});

	it("is written back into the old file's director field (version 1 keeps the version-0 shape)", () => {
		const file = raw();
		const converted = convertLegacySnapshot(JSON.parse(JSON.stringify(file)), {}, "snapshot-L7");
		const slice = resumedHost(file, cityOfKeys, 1).snapshot().mechanics.script;
		expect(slice?.version).toBe(1);
		// `toLegacySnapshot` writes the script's version-1 slice back as the director field (step 18, S1-5).
		const host = { ...converted.host, mechanics: { ...converted.host.mechanics, ...(slice === undefined ? {} : { script: slice }) } };
		expect(JSON.stringify(toLegacySnapshot({ ...converted, host }).director)).toBe(JSON.stringify(directorOf(file)));
	});
});

/** All enter the wall when the door opens at minute 9; A01 and A02 climb on, A03's DM stays unanswered. */
const PLAN: Plan = (agent, minute, codeOf) => {
	if (minute === 9 && (agent === "A01" || agent === "A02")) return [call("submitSolution", { level: 8, code: codeOf(agent, 8) })];
	if (minute === 9 && agent === "A03") return [call("sendDM", { target: "A04", message: "A03 asks A04 for the wall." })];
	if (minute === 11 && agent === "A05") return [call("submitSolution", { level: 8, code: codeOf(agent, 8) })];
	return [];
};

/** The story without the seal (another team's mechanic, not loaded here): its auction at minute 13 would post before the director. */
const WITHOUT_SEAL: AnyStory = (() => {
	const rest: { -readonly [K in keyof AnyStory]: AnyStory[K] } = { ...cityOfKeys };
	delete rest.seal;
	return rest;
})();

function call(tool: string, params: Record<string, string | number | boolean> = {}): PlannedCall {
	return { tool, params };
}

describe("the run resumed from the L7 checkpoint", () => {
	it("continues alike on the old engine and the new host: replies, the director's lines and windows, the slice", async () => {
		const minutes = 5;
		const old = await resumeOld(raw(), WITHOUT_SEAL, minutes, PLAN);
		const host = resumedHost(raw(), WITHOUT_SEAL, minutes);
		const lines: LegacyLine[] = [];
		host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
		const codeOf: CodeOf = (agent, level) => old.world.inspect.codeOf(agent, level);
		const replies = new Map<string, string[]>();
		await host.run(async (turn) => {
			for (const planned of PLAN(turn.resident, turn.minute, codeOf)) {
				const outcome = await turn.call(planned.tool, planned.params);
				const key = `${String(turn.minute)}:${turn.resident}`;
				replies.set(key, [...(replies.get(key) ?? []), replyText(outcome)]);
			}
		});
		expect([...replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
		for (const [at, expected] of old.replies) expect(replies.get(at), at).toEqual(expected);

		const director = ownedBy(old.lines, ["script"]);
		expect(ownedBy(lines, ["script"])).toEqual(director);
		expect(windowsOf(lines).map((window) => window.lines)).toEqual(windowsOf(old.lines).map((window) => window.lines));
		expect(JSON.stringify(scriptData(host))).toBe(JSON.stringify(old.director));

		const seen = director.join("\n");
		for (const rule of ["courier-8", "city-marks-8", "city-factor-8", "courier-9", "city-factor-9", "unanswered-dm", "standings", "team-split", "holder-behind-9"]) expect(seen, rule).toContain(`"rule":"${rule}"`);
	}, 120_000);
});

/** The old Director reads the world only when a rule fires; `restore` and `snapshot` need none. */
function worldStub(): World {
	const fixture = composeRun({
		story: cityOfKeys,
		overrides: { gamemaker: false, classifier: false, names: false },
		models: () => new ScriptedModelSource({}),
		sinks: [],
	});
	return fixture.world;
}
