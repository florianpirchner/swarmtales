/**
 * Support of the progression tests: the options a story gives the mechanic, the host with the
 * stand-ins for ledger, channels and receipts, and the replay of a golden log's progression calls.
 */
import type { AnyStory, Host, MechanicUse } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import type { goals } from "@swarmtales/mechanic-goals";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { names } from "@swarmtales/mechanic-names";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { ExileApi, NotesApi } from "@swarmtales/mechanic-shared";
import { goldenCalls, type GoldenCall, type LegacyLine } from "@swarmtales/testkit";
import { provider } from "../exile/support/provider.ts";
import { GOLDEN_NAMES, goldenLog, minutesOf, puzzleOptions, RESIDENTS, SEED, storyOf, type GoldenName } from "../puzzles/harness.ts";
import { channelsStandIn, ledgerStandIn, marksStandIn, receiptsStandIn, type Notice, type StatusFeed } from "./standins.ts";

export { GOLDEN_NAMES, goldenLog, minutesOf, RESIDENTS, SEED, storyOf, type GoldenName };

type ProgressionInput = NonNullable<Parameters<typeof progression.with>[0]>;

/** The options a story gives the progression mechanic. */
export function progressionOptions(story: AnyStory): ProgressionInput {
	return {
		levels: story.levels.map((level) => ({
			number: level.number,
			title: level.title,
			reward: level.reward,
			tools: [...level.tools],
			task: level.task,
			...(level.opensAt === undefined ? {} : { opensAt: level.opensAt }),
		})),
		acts: (story.acts ?? []).map((act) => act.fromLevel).filter((fromLevel) => fromLevel > 1),
		penalty: typeof story.rules.penalty === "number" ? story.rules.penalty : [...story.rules.penalty],
		...(story.rules.blame === undefined ? {} : { blamePenalty: typeof story.rules.blame.penalty === "number" ? story.rules.blame.penalty : [...story.rules.blame.penalty] }),
		maxAttemptsPerWindow: story.rules.maxAttemptsPerWindow,
		attemptWindowMinutes: story.rules.attemptWindowMinutes,
		survivors: story.run.survivors,
		finishedNotice: story.finishedNotice,
	};
}

type GoalsInput = NonNullable<Parameters<typeof goals.with>[0]>;

/** The options a story gives the goals mechanic; undefined when the story deals none. */
export function goalsOptionsOf(story: AnyStory): GoalsInput | undefined {
	const spec = story.goals;
	if (spec === undefined) return undefined;
	return {
		acts: [...spec.acts],
		bonus: spec.bonus,
		leadTribunals: spec.leadTribunals,
		againstCoreMotive: spec.againstCoreMotive,
		matches: Object.fromEntries(Object.entries(spec.matches).map(([kind, drives]) => [kind, [...drives]])),
		factions: story.tribunal?.factions !== undefined,
		texts: { ...spec.texts },
	};
}

/** The prompt files of the mechanic, then the library. */
export function promptLookup() {
	return createPromptLookup({ mechanics: mechanicPromptFolders() });
}

/**
 * The real mechanics a task and a status line read of other teams: the names (T1: the line under a
 * task while a resident may choose, and the lock of `chooseName`) and the holdout tribunal (T4b: the
 * rule under every task). Their own surroundings are stand-ins: an exile that keeps everybody in the
 * city and a notes desk that lets every text through.
 */
export function realParts(story: AnyStory, withExile = true, withNames = true): readonly MechanicUse[] {
	const spec = withNames ? story.names : undefined;
	return [
		...(withExile ? [provider("exile", ExileApi, { alive: () => [...RESIDENTS], standing: () => ({ kind: "alive" as const }), isExiled: () => false }).with()] : []),
		provider("notes", NotesApi, { check: ({ text }) => ({ ok: true as const, text: text.trim() }), record: () => null }).with(),
		...(spec === undefined ? [] : [names.with({ untilMinute: spec.untilMinute, announcement: spec.announcement, fallbackWords: [...spec.fallbackWords], reserved: [...Object.keys(story.cast), story.city] })]),
		...(story.holdout === undefined ? [] : [standoffTribunal.with(story.holdout)]),
	];
}

export function standInUses(golden: readonly LegacyLine[], notices: Notice[], feed?: StatusFeed) {
	return [ledgerStandIn(feed).with(), channelsStandIn(notices, feed).with(), receiptsStandIn(golden).with()];
}

export function progressionHost(name: GoldenName, notices: Notice[], more: readonly MechanicUse[] = [], scriptTools: readonly string[] = [], feed?: StatusFeed, grantMore: readonly string[] = []): Host {
	const story = defineCoreStory({
		id: name,
		seed: SEED,
		minutes: minutesOf(name),
		residents: [...RESIDENTS],
		mechanics: [
			...standInUses(goldenLog(name), notices, feed),
			marksStandIn(storyOf(name)).with(),
			// The Whispers golden was recorded without the names (the story declares them, the run turned them off).
			...realParts(storyOf(name), !more.some((use) => use.mechanic.id === "exile"), goldenLog(name).some((line) => line.type === "name_chosen")),
			puzzles.with(puzzleOptions(storyOf(name))),
			progression.with(progressionOptions(storyOf(name))),
			...more,
		],
		grants: { resident: ["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools", ...grantMore], script: [...scriptTools] },
	});
	const host = createHost({ story, prompts: promptLookup() });
	host.start();
	return host;
}

const TOOLS = new Set(["getProblem", "submitSolution"]);

/** The calls of the golden log progression owns. */
export function progressionCalls(name: GoldenName): readonly GoldenCall[] {
	return goldenCalls(goldenLog(name)).filter((call) => TOOLS.has(call.tool));
}

export interface Outcome {
	readonly minute: number;
	readonly agent: string;
	readonly text: string;
}

/** The reply text the old engine wrote for an outcome. */
function replyText(outcome: { readonly ok: true; readonly reply: string } | { readonly ok: false; readonly code: string; readonly detail?: string }): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/**
 * Plays the golden log's progression calls on a host, minute by minute and in the golden order (the
 * old turn order was shuffled by the arena; the turn loop is not moved yet), to the end of the run;
 * returns every reply.
 */
export async function replay(host: Host, name: GoldenName, minutes?: number): Promise<readonly Outcome[]> {
	const calls = progressionCalls(name);
	const outcomes: Outcome[] = [];
	let done = -1;
	const agent = async (turn: { readonly minute: number }): Promise<void> => {
		if (done === turn.minute) return;
		done = turn.minute;
		for (const call of calls.filter((entry) => entry.minute === turn.minute)) {
			outcomes.push({ minute: turn.minute, agent: call.agent, text: replyText(await host.call(`resident:${call.agent}`, call.tool, call.args)) });
		}
	};
	if (minutes === undefined) await host.run(agent);
	else for (let minute = 0; minute < minutes; minute++) await host.playMinute(agent);
	return outcomes;
}

const ALL_TOOLS = new Set(["getStatus", "activeTools", "getProblem", "submitSolution"]);

export interface StatusOutcome {
	readonly tool: string;
	readonly agent: string;
	readonly golden: string;
	readonly text: string;
}

/**
 * Plays every golden call of the four tools of progression in the golden order. Before a
 * `getStatus` the feed takes what the golden reply says the ledger and the channels know (points,
 * unread DMs), so the reply's frame and the lines progression owns are what is compared.
 */
export async function replayStatus(host: Host, name: GoldenName, feed: StatusFeed): Promise<readonly StatusOutcome[]> {
	const calls = goldenCalls(goldenLog(name)).filter((call) => ALL_TOOLS.has(call.tool));
	const outcomes: StatusOutcome[] = [];
	let done = -1;
	const agent = async (turn: { readonly minute: number }): Promise<void> => {
		if (done === turn.minute) return;
		done = turn.minute;
		for (const call of calls.filter((entry) => entry.minute === turn.minute)) {
			const golden = call.text ?? "";
			feed.agent = call.agent;
			const points = Number(/^points: (-?\d+)$/m.exec(golden)?.[1]);
			feed.points = Number.isNaN(points) ? undefined : points;
			feed.unread = Number(/^unread DMs: (\d+)$/m.exec(golden)?.[1] ?? 0);
			outcomes.push({ tool: call.tool, agent: call.agent, golden, text: replyText(await host.call(`resident:${call.agent}`, call.tool, call.args)) });
		}
	};
	await host.run(agent);
	return outcomes;
}

export interface TurnParts {
	/** The task each turn opened with (the note of kind `task`), by `minute:resident:pass`. */
	readonly tasks: ReadonlyMap<string, string>;
	/** The status parts progression wrote in each turn, in order, by the same key. */
	readonly status: ReadonlyMap<string, readonly string[]>;
}

/** Plays the golden's progression calls at each resident's own turn and returns what progression put in each turn's inputs. */
export async function replayTurns(host: Host, name: GoldenName): Promise<TurnParts> {
	const calls = progressionCalls(name);
	const tasks = new Map<string, string>();
	const status = new Map<string, readonly string[]>();
	const played = new Set<string>();
	await host.run(async (turn) => {
		const key = `${turn.minute}:${turn.resident}:${turn.pass}`;
		const task = turn.inputs.find((note) => note.kind === "task");
		if (task !== undefined) tasks.set(key, task.text);
		status.set(key, turn.inputs.filter((note) => note.kind === "status" && note.source === "progression").map((note) => note.text));
		const own = `${turn.minute}:${turn.resident}`;
		if (played.has(own)) return;
		played.add(own);
		for (const call of calls.filter((entry) => entry.minute === turn.minute && entry.agent === turn.resident)) await turn.call(call.tool, call.args);
	});
	return { tasks, status };
}
