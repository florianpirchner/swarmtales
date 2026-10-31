/**
 * Support of the progression tests: the options a story gives the mechanic, the host with the
 * stand-ins for ledger, channels and receipts, and the replay of a golden log's progression calls.
 */
import { resolve } from "node:path";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { goldenCalls, type GoldenCall, type LegacyLine } from "@swarmtales/testkit";
import { GOLDEN_NAMES, goldenLog, minutesOf, puzzleOptions, RESIDENTS, SEED, storyOf, type GoldenName } from "../puzzles/harness.ts";
import { channelsStandIn, ledgerStandIn, receiptsStandIn, type Notice } from "./standins.ts";

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

/** The prompt files of the mechanic, then the library. */
export function promptLookup() {
	return createPromptLookup({ mechanics: { progression: resolve(import.meta.dirname, "../../../mechanics/progression/prompts") } });
}

export function standInUses(golden: readonly LegacyLine[], notices: Notice[]) {
	return [ledgerStandIn().with(), channelsStandIn(notices).with(), receiptsStandIn(golden).with()];
}

export function progressionHost(name: GoldenName, notices: Notice[]): Host {
	const story = defineCoreStory({
		id: name,
		seed: SEED,
		minutes: minutesOf(name),
		residents: [...RESIDENTS],
		mechanics: [
			...standInUses(goldenLog(name), notices),
			puzzles.with(puzzleOptions(storyOf(name))),
			progression.with(progressionOptions(storyOf(name))),
		],
		grants: { resident: ["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"] },
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
 * old turn order was shuffled by the arena; the turn loop is not moved yet); returns every reply.
 */
export async function replay(host: Host, name: GoldenName, upTo: number = minutesOf(name)): Promise<readonly Outcome[]> {
	const calls = progressionCalls(name);
	const outcomes: Outcome[] = [];
	let done = -1;
	for (let minute = 0; minute < upTo; minute++) {
		await host.playMinute(async () => {
			if (done === minute) return;
			done = minute;
			for (const call of calls.filter((entry) => entry.minute === minute)) {
				outcomes.push({ minute, agent: call.agent, text: replyText(await host.call(`resident:${call.agent}`, call.tool, call.args)) });
			}
		});
	}
	return outcomes;
}
