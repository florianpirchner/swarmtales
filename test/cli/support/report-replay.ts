/**
 * The differential harness of the host-backed gamemaker report (step 18, item 2): an old run (the
 * old engine through `createFixture`, the composer of the golden runs) is recorded in memory, then
 * replayed on the production story mapping (`hostStoryOf`) with the gamemaker overseer reading the
 * city through `hostGamemakerReport`, the old run's gamemaker calls made by its runtime at their
 * minutes and the residents' calls made in their turns (the runner's `text` and `tool_call` lines
 * written as the host runner of item 1 will). Both sides' `gamemaker_turn` inputs are returned for a
 * look-for-look comparison, with every line outside the app.
 */
import { fileURLToPath } from "node:url";
import type { FauxResponseStep, JsonObject, JsonValue } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { legacyOwner, legacySink } from "@swarmtales/chronicle";
import type { AnyStory, Host, MechanicUse, OverseerUse } from "@swarmtales/contracts";
import { directionLevel } from "@swarmtales/engine";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { act, say, ScriptedModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGamemaker, GAMEMAKER_APP_EVENTS, GAMEMAKER_ID, gamemakerRuntime } from "@swarmtales/roles";
import type { LegacyLine } from "@swarmtales/testkit";
import { DEFAULT_LIMITS } from "../../../apps/cli/src/compose.ts";
import { hostGamemakerReport } from "../../../apps/cli/src/host/report.ts";
import { hostStoryOf, type HostRun } from "../../../apps/cli/src/host/story.ts";
import { createFixture, type FixtureOptions } from "../../helpers/fixture.ts";
import { normaliseEvents } from "../../helpers/golden.ts";
import { goldenTurnInputs } from "@swarmtales/testkit";
import { turnKey } from "../../mechanics/t2/golden-plan.ts";

/** The runner's `text` and `tool_call` lines, which the replay writes for the resident runner (step 18, item 1). */
const RUNNER_EVENTS = {
	text: Type.Object({ agent: Type.String(), text: Type.String() }),
	tool_call: Type.Object({ agent: Type.String(), tool: Type.String(), args: Type.Unknown() }),
};

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
	if (Array.isArray(value)) return value.every(isJsonValue);
	return isJsonObject(value);
}

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isJsonValue);
}

function isLine(value: unknown): value is LegacyLine {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Calls = ReadonlyMap<number, readonly { readonly name: string; readonly args: JsonObject }[]>;

/** The old gamemaker's calls by the minute it made them. */
export function gamemakerCalls(lines: readonly LegacyLine[]): Calls {
	const calls = new Map<number, { name: string; args: JsonObject }[]>();
	for (const line of lines) {
		if (line.type !== "gamemaker_call" || !isJsonObject(line.args)) continue;
		const minute = Number(line.minute);
		calls.set(minute, [...(calls.get(minute) ?? []), { name: String(line.tool), args: line.args }]);
	}
	return calls;
}

/** The old gamemaker's answers by the host's minute (test/golden/scripts.ts `gamemakerSteps`). */
function steps(minutes: number, minute: () => number, calls: Calls): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * minutes }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = calls.get(minute());
		answered = planned === undefined;
		return planned === undefined ? say("Nothing to add.") : act(...planned);
	});
}

/** The old log's lines of each turn (after its `turn_input`, up to the next turn or the round's end), by minute and resident. */
function turnWindows(lines: readonly LegacyLine[]): ReadonlyMap<string, readonly LegacyLine[]> {
	const inputs = goldenTurnInputs(lines);
	const windows = new Map<string, LegacyLine[]>();
	let current: LegacyLine[] | undefined;
	let turn = 0;
	for (const line of lines) {
		if (line.type === "turn_input") {
			const input = inputs[turn++];
			if (input === undefined) throw new Error("a turn_input without its parsed input");
			current = [];
			windows.set(turnKey(input.minute, input.agent), current);
		} else if (line.type === "round_end" || line.type === "round_start" || line.type === "pass_start") current = undefined;
		else current?.push(line);
	}
	return windows;
}

export interface OldRun {
	readonly minutes: number;
	readonly lines: readonly LegacyLine[];
	readonly system: string;
	readonly residents: readonly string[];
}

/** Plays an old run and keeps its log as the golden files hold it, with its gamemaker's system prompt. */
export async function recordOld(options: FixtureOptions): Promise<OldRun> {
	const fixture = createFixture(options);
	const system = fixture.gamemaker?.systemPrompt;
	if (system === undefined) throw new Error("the old run has no gamemaker");
	await fixture.run();
	const minutes = options.minutes;
	if (minutes === undefined) throw new Error("an old run for the replay needs its minutes");
	return { minutes, lines: normaliseEvents(fixture.log.events).flatMap((line) => (isLine(line) ? [line] : [])), system, residents: [...fixture.world.competitors] };
}

export interface Replayed {
	readonly lines: readonly LegacyLine[];
}

/** The dials of the replay; the rest of the run is the fixture's (one pass, block 1, every resident each minute, no early stop). */
export type Dials = Pick<HostRun, "figureDirection" | "gmDirection" | "names">;

/** Replays an old run's log on the host with the host-backed report. */
export async function replayOnHost(story: AnyStory, old: OldRun, seed: number, dials: Dials): Promise<Replayed> {
	const spec = story.gamemaker;
	if (spec === undefined) throw new Error("no gamemaker");
	const windows = turnWindows(old.lines);
	const run: HostRun = {
		residents: [...old.residents],
		seed,
		minutes: old.minutes,
		arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: false, stopWhenSeatsDecided: false },
		coreMotives: true,
		whisperer: true,
		guards: true,
		gamemaker: true,
		...dials,
	};
	const { definition } = hostStoryOf(story, run);
	const gamemaker = defineGamemaker(hostGamemakerReport(story)).as("gamemaker", {
		every: spec.every,
		direction: directionLevel(run.gmDirection),
		notesPerAgent: spec.notesPerAgent,
		boardPosts: spec.boardPosts,
		windowMinutes: spec.windowMinutes,
		system: old.system,
	});
	const ref: { host?: Host } = {};
	const hostOf = (): Host => {
		if (ref.host === undefined) throw new Error("no host yet");
		return ref.host;
	};
	const binding = new ScriptedModelSource({ [GAMEMAKER_ID]: steps(old.minutes, () => hostOf().minute, gamemakerCalls(old.lines)) }).bind(GAMEMAKER_ID, DEFAULT_LIMITS);
	const runtime = gamemakerRuntime({
		host: {
			record: (actor, type, payload) => {
				hostOf().record(actor, type, payload);
			},
			get minute() {
				return hostOf().minute;
			},
		},
		binding,
		thinking: spec.model.thinking ?? "low",
		modelCallsPerTurn: spec.modelCallsPerTurn,
	});
	const host = createHost({
		story: defineCoreStory<readonly MechanicUse[], readonly OverseerUse[]>({ ...definition, overseers: [gamemaker] }),
		prompts: createPromptLookup({ story: fileURLToPath(new URL("../../mechanics/t2/prompts", import.meta.url)) }),
		overseers: runtime,
		app: { events: { ...GAMEMAKER_APP_EVENTS, ...RUNNER_EVENTS } },
	});
	ref.host = host;
	const lines: LegacyLine[] = [];
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	await host.run(async (turn) => {
		const window = windows.get(turnKey(turn.minute, turn.resident));
		if (window === undefined) throw new Error(`no old turn for ${turn.resident} at minute ${String(turn.minute)}`);
		for (const line of window) {
			if (line.type === "text") await turn.record("text", { agent: turn.resident, text: String(line.text) });
			if (line.type !== "tool_call") continue;
			await turn.record("tool_call", { agent: turn.resident, tool: String(line.tool), args: line.args });
			await turn.call(String(line.tool), line.args);
		}
	});
	return { lines };
}

export const isGamemakerLine = (line: LegacyLine): boolean => String(line.type).startsWith("gamemaker_") || (line.type === "usage" && line.agent === GAMEMAKER_ID);
export const outsideApp = (line: LegacyLine): boolean => legacyOwner(String(line.type)) !== "app";

/** A line without its log position. */
export function placed(line: LegacyLine): string {
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "at")));
}

/** Each look's round and input, in order. */
export function looksOf(lines: readonly LegacyLine[]): readonly { readonly round: number; readonly input: string }[] {
	return lines.filter((line) => line.type === "gamemaker_turn").map((line) => ({ round: Number(line.round), input: String(line.input) }));
}

/** The look's section that starts with `heading` (up to the next blank line), for the assertions that a scenario reached it. */
export function sectionOf(input: string, heading: string): readonly string[] {
	const lines = input.split("\n");
	const start = lines.findIndex((line) => line.startsWith(heading));
	if (start < 0) return [];
	const end = lines.indexOf("", start);
	return lines.slice(start, end < 0 ? undefined : end);
}
