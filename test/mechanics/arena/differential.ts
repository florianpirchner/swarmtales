/**
 * The differential harness of the arena (step 18, team A1): the same plan is played through the old
 * engine (a composed run: the real `World`, `Director` and `Arena` of packages/engine with scripted
 * models) and through the new host (the real city of T1's differentials, cast, petitions, the script
 * and the real arena with the same settings, `arenaFromStory`). Each resident decides per minute
 * what to call; on both sides a turn right after a turn with calls only answers its tool results
 * (the old runner's `awaitsAnswer`), so `onNovelty` activates the same residents. The app's part is
 * played as the old arena played it: a scripted spend per model request (`usage` app events on the
 * new side, `budget.spentUsd` on the old), and the snapshot the arena says is due
 * (`arena.snapshot`), with `host.stop` when it ends the run.
 */
import type { AssistantMessage, FauxResponseStep, JsonObject } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { legacySink, parseSnapshot, type RunSnapshot } from "@swarmtales/chronicle";
import type { AnyStory, Host, HostSnapshot, MechanicUse, TurnTaker } from "@swarmtales/contracts";
import { MemorySink, type World } from "@swarmtales/engine";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { arena, arenaFromStory, type ArenaRun } from "@swarmtales/mechanic-arena";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { script, scriptOptionsFromStory } from "@swarmtales/mechanic-script";
import { ScriptedModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { ownedBy, type GoldenLine, type LegacyLine, type PlannedCall } from "@swarmtales/testkit";
import { composeRun } from "../../../apps/cli/src/compose.ts";
import { act, say } from "../../helpers/fixture.ts";
import { progressionOptions } from "../progression/harness.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { SCRIPT_GRANTS } from "../script/golden-host.ts";
import { realCity } from "../t1/city.ts";
import { replyText } from "../t1/differential.ts";

export type CodeOf = (agent: string, level: number) => string;
/** What a resident calls in a minute's first turn without results to answer. */
export type Plan = (agent: string, minute: number, codeOf: CodeOf) => readonly PlannedCall[];

export interface Settings {
	readonly activation?: "always" | "onNovelty";
	readonly passesPerMinute?: number;
	readonly blockSize?: number;
	readonly stopWhenDone?: boolean;
	readonly stopWhenSeatsDecided?: boolean;
	readonly budgetUsd?: number;
	/** The spend of one model request (exact in binary, so the order of the sum does not matter). */
	readonly costPerRequest?: number;
	readonly snapshot?: { readonly afterLevel: number; readonly atMinute?: number; readonly stop: boolean };
}

export interface Spec {
	readonly story: AnyStory;
	readonly agents: number;
	readonly minutes: number;
	readonly plan: Plan;
	readonly tools: readonly string[];
	readonly settings?: Settings;
}

/** Where both sides write the snapshot, for the end reason. */
export const FILE = "memory";

export interface Played {
	/** `minute:agent` to the replies in call order (`isError|text`). */
	readonly replies: ReadonlyMap<string, readonly string[]>;
	readonly lines: readonly LegacyLine[];
}

export interface OldPlayed extends Played {
	readonly world: World;
	/** The old arena's snapshot after the run (`ArenaSnapshot`). */
	readonly arena: unknown;
	/** The snapshot the run took, if any. */
	readonly taken?: RunSnapshot;
}

export interface NewPlayed extends Played {
	readonly host: Host;
	/** The host snapshot the app took when the arena said it was due. */
	readonly taken?: HostSnapshot;
	readonly cut?: unknown;
}

const key = (minute: number, agent: string): string => `${String(minute)}:${agent}`;

function argsOf(params: unknown): JsonObject {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([name, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${name}`);
			return [name, value];
		}),
	);
}

function idsOf(agents: number): readonly string[] {
	return Array.from({ length: agents }, (_unused, index) => `A${String(index + 1).padStart(2, "0")}`);
}

function settingsOf(spec: Spec): Required<Omit<Settings, "budgetUsd" | "snapshot">> & Pick<Settings, "budgetUsd" | "snapshot"> {
	const settings = spec.settings ?? {};
	return {
		activation: settings.activation ?? "always",
		passesPerMinute: settings.passesPerMinute ?? 1,
		blockSize: settings.blockSize ?? 1,
		stopWhenDone: settings.stopWhenDone ?? false,
		stopWhenSeatsDecided: settings.stopWhenSeatsDecided ?? false,
		costPerRequest: settings.costPerRequest ?? 0,
		...(settings.budgetUsd === undefined ? {} : { budgetUsd: settings.budgetUsd }),
		...(settings.snapshot === undefined ? {} : { snapshot: settings.snapshot }),
	};
}

function repliesOf(lines: readonly LegacyLine[]): ReadonlyMap<string, readonly string[]> {
	const replies = new Map<string, string[]>();
	for (const line of lines) {
		if (line.type !== "tool_result") continue;
		const at = key(Number(line.minute), String(line.agent));
		replies.set(at, [...(replies.get(at) ?? []), `${String(line.isError)}|${String(line.text)}`]);
	}
	return replies;
}

export async function playOld(spec: Spec): Promise<OldPlayed> {
	const settings = settingsOf(spec);
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const snapshot = settings.snapshot;
	const run = composeRun({
		story: spec.story,
		overrides: {
			agents: spec.agents,
			minutes: spec.minutes,
			names: false,
			gamemaker: false,
			classifier: false,
			activation: settings.activation,
			passesPerMinute: settings.passesPerMinute,
			blockSize: settings.blockSize,
			stopWhenDone: settings.stopWhenDone,
			stopWhenSeatsDecided: settings.stopWhenSeatsDecided,
			...(settings.budgetUsd === undefined ? {} : { budgetUsd: settings.budgetUsd }),
		},
		models: (world) => {
			const codeOf: CodeOf = (agent, level) => world.inspect.codeOf(agent, level);
			// One step per turn: the old runner ends a turn after its tool results, so the turn after a turn with calls answers them.
			const awaiting = new Set<string>();
			const step =
				(agent: string): FauxResponseStep =>
				(): AssistantMessage => {
					if (awaiting.delete(agent)) return say("Answered.");
					const calls = spec.plan(agent, world.minute, codeOf);
					if (calls.length > 0) awaiting.add(agent);
					return calls.length === 0 ? say() : act(...calls.map((call) => ({ name: call.tool, args: argsOf(call.params) })));
				};
			return new ScriptedModelSource(Object.fromEntries(world.competitors.map((agent) => [agent, Array.from({ length: spec.minutes * settings.passesPerMinute + 2 }, () => step(agent))])));
		},
		sinks: [log],
		budget: { spentUsd: () => settings.costPerRequest * log.events.filter((event) => event.type === "request").length },
		...(snapshot === undefined
			? {}
			: {
					snapshot: {
						...snapshot,
						write: (file: RunSnapshot) => {
							taken = parseSnapshot(JSON.parse(JSON.stringify(file)));
							return FILE;
						},
					},
				}),
	});
	await run.arena.run();
	const lines = log.events.map((event) => ({ ...event }));
	return { replies: repliesOf(lines), lines, world: run.world, arena: run.arena.snapshot(), ...(taken === undefined ? {} : { taken }) };
}

/** The real city with the old door when a snapshot is requested (the composer's `holdAfter`). */
function cityOf(spec: Spec, holdAfter: number | undefined): readonly MechanicUse[] {
	const hold = holdAfter === undefined ? {} : { holdAfter };
	return realCity(spec.story).map((use) => {
		if (use.mechanic.id === "puzzles") return puzzles.with({ ...puzzleOptions(spec.story), ...hold });
		if (use.mechanic.id === "progression") return progression.with({ ...progressionOptions(spec.story), ...hold });
		return use;
	});
}

export function arenaRunOf(spec: Spec): ArenaRun {
	const settings = settingsOf(spec);
	return {
		startLevel: 1,
		activation: settings.activation,
		passesPerMinute: settings.passesPerMinute,
		blockSize: settings.blockSize,
		stopWhenDone: settings.stopWhenDone,
		stopWhenSeatsDecided: settings.stopWhenSeatsDecided,
		...(settings.budgetUsd === undefined ? {} : { budgetUsd: settings.budgetUsd }),
		...(settings.snapshot === undefined ? {} : { snapshot: { ...settings.snapshot, file: FILE } }),
	};
}

/** The app event a runner writes per model request (the old `usage` line, the fields the arena reads). */
export const USAGE = {
	usage: Type.Object({ agent: Type.String(), provider: Type.String(), model: Type.String(), input: Type.Integer(), output: Type.Integer(), cacheRead: Type.Integer(), cacheWrite: Type.Integer(), costUsd: Type.Number() }),
};

export function definitionOf(spec: Spec, extra: readonly MechanicUse[] = []) {
	const { options, turns } = arenaFromStory(spec.story, arenaRunOf(spec));
	return defineCoreStory({
		id: "arena-differential",
		seed: spec.story.run.seed,
		minutes: spec.minutes,
		residents: idsOf(spec.agents),
		mechanics: [...cityOf(spec, settingsOf(spec).snapshot?.afterLevel), cast.with(castOptionsFromStory(spec.story)), petitions.with({}), script.with(scriptOptionsFromStory(spec.story)), ...extra, arena.with(options)],
		// The old world always offered `activeTools` besides the level's tools.
		grants: { resident: [...spec.tools, "activeTools"], script: SCRIPT_GRANTS },
		turns,
	});
}

/** The old runner's side of a turn: the spend of its request, and the plan's calls unless it answers its last results. */
export function agentOf(spec: Spec, codeOf: CodeOf, replies: Map<string, string[]>, awaiting: Set<string>): TurnTaker {
	const cost = settingsOf(spec).costPerRequest;
	return async (turn) => {
		await turn.record("usage", { agent: turn.resident, provider: "faux", model: "faux-1", input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: cost });
		if (awaiting.delete(turn.resident)) return;
		const calls = spec.plan(turn.resident, turn.minute, codeOf);
		for (const call of calls) {
			const outcome = await turn.call(call.tool, call.params);
			replies.set(key(turn.minute, turn.resident), [...(replies.get(key(turn.minute, turn.resident)) ?? []), replyText(outcome)]);
		}
		if (calls.length > 0) awaiting.add(turn.resident);
	};
}

function record(lines: LegacyLine[]): Parameters<Host["subscribe"]>[0] {
	return legacySink((event) => lines.push(Object.fromEntries(Object.entries(event))));
}

const Cut = Type.Object({ stop: Type.Boolean() });

export interface NewOptions {
	/** Snapshot the host after this many minutes and play the rest on a host resumed from it. */
	readonly resumeAfter?: number;
	/** The app stops the host with this text once it has played this many minutes (A1-4: the text reaches `run_end`). */
	readonly stopAfter?: { readonly minutes: number; readonly text: string };
	/** More mechanics on the new host (an `EndingApi` provider). */
	readonly extra?: readonly MechanicUse[];
}

/** The plan on the new host; the app takes the snapshot the arena says is due and stops the host when it ends the run. */
export async function playNew(spec: Spec, codeOf: CodeOf, options: NewOptions = {}): Promise<NewPlayed> {
	const definition = definitionOf(spec, options.extra);
	const lines: LegacyLine[] = [];
	const replies = new Map<string, string[]>();
	const awaiting = new Set<string>();
	const agent = agentOf(spec, codeOf, replies, awaiting);
	let host = createHost({ story: definition, prompts: createPromptLookup(), app: { events: USAGE }, awaitsAnswer: (resident) => awaiting.has(resident) });
	host.subscribe(record(lines));
	host.start();
	let taken: HostSnapshot | undefined;
	let cut: unknown;
	for (let played = 0; host.ended === undefined; played++) {
		if (played === options.resumeAfter) {
			const snapshot = structuredClone(host.snapshot());
			host = createHost({ story: definition, prompts: createPromptLookup(), app: { events: USAGE }, awaitsAnswer: (resident) => awaiting.has(resident), resume: { snapshot, events: host.log.all() } });
			host.subscribe(record(lines));
		}
		await host.playMinute(agent);
		if (options.stopAfter?.minutes === played + 1 && host.ended === undefined) host.stop(options.stopAfter.text);
		const due = host.facts()["arena.snapshot"];
		if (due === null || due === undefined || host.ended !== undefined) continue;
		taken = structuredClone(host.snapshot());
		cut = due;
		if (Check(Cut, due) && due.stop) host.stop("snapshot");
	}
	return { replies, lines, host, ...(taken === undefined ? {} : { taken, cut }) };
}

/** Plays the plan on both sides. */
export async function playBoth(spec: Spec, options: NewOptions = {}): Promise<{ readonly old: OldPlayed; readonly fresh: NewPlayed }> {
	const old = await playOld(spec);
	const fresh = await playNew(spec, (agent, level) => old.world.inspect.codeOf(agent, level), options);
	return { old, fresh };
}

/** The owners a side's lines are compared over: the arena and every mechanic loaded on both sides. */
export const OWNERS = ["arena", "script", "channels", "cast", "petitions", "ledger", "receipts", "marks", "progression", "puzzles"] as const;

export function compared(side: Played): readonly GoldenLine[] {
	return ownedBy(side.lines, OWNERS);
}

/** The arena's slice of the new host (the old `ArenaSnapshot` without `delivered` and `seenBoard`). */
export function arenaSlice(host: Host): unknown {
	return host.snapshot().mechanics.arena?.data;
}

/** The old arena's own fields (what the arena keeps; `delivered` is progression's, `seenBoard` channels'). */
export function oldArenaFields(snapshot: unknown): unknown {
	if (typeof snapshot !== "object" || snapshot === null) return undefined;
	const field = (name: string): unknown => Reflect.get(snapshot, name);
	return { seenPoints: field("seenPoints"), braked: field("braked") };
}
