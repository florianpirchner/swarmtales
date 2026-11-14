/** An oracle from a recorded live run of a core story: the run's story name and seed, its calls played again (`replay.ts`). */
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { createPromptLookup } from "@swarmtales/prompts";
import { coreStoryFor } from "../../apps/cli/src/host/core-run.ts";
import { findCoreStory } from "../../stories/index.ts";
import type { Oracle } from "./format.ts";
import { recordOracle, type OracleCut } from "./record.ts";
import { replayAgent, type ReplayAgent } from "./replay.ts";

export const ROOT = resolve(import.meta.dirname, "..", "..");

const RunFile = Type.Object({ storyId: Type.String(), effective: Type.Object({ agents: Type.Integer(), minutes: Type.Integer(), seed: Type.Number() }, { additionalProperties: true }) }, { additionalProperties: true });

export interface LiveRun {
	readonly variant: string;
	readonly seed: number;
	readonly minutes: number;
	readonly agents: number;
}

/** What `000-run.json` next to the log says about the run. */
export function liveRun(events: string): LiveRun | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(resolve(dirname(events), "000-run.json"), "utf8"));
	} catch {
		return undefined;
	}
	if (!Check(RunFile, parsed)) return undefined;
	return { variant: parsed.storyId, seed: parsed.effective.seed, minutes: parsed.effective.minutes, agents: parsed.effective.agents };
}

export interface LiveOptions {
	readonly game: string;
	/** Repository path of the recorded `events.jsonl`. */
	readonly events: string;
	readonly cut?: OracleCut;
	readonly note?: string;
	/** The registry name to play, when the recording's own name leaves out an option the run was started with. */
	readonly variant?: string;
}

export interface LiveResult {
	readonly oracle: Oracle;
	readonly differences: readonly string[];
}

export async function liveOracle(options: LiveOptions): Promise<LiveResult> {
	const path = resolve(ROOT, options.events);
	const run = liveRun(path);
	if (run === undefined) throw new Error(`${options.events}: no readable 000-run.json next to the log`);
	const variant = options.variant ?? run.variant;
	const entry = findCoreStory(variant);
	if (entry === undefined) throw new Error(`${options.events}: "${variant}" is not a core story of the registry`);
	const roster = entry.fixedRoster === undefined && typeof entry.story.residents === "number" ? { agents: run.agents } : {};
	const story = coreStoryFor(entry.story, { seed: run.seed, minutes: run.minutes, ...roster });
	const ref: { agent?: ReplayAgent } = {};
	const oracle = await recordOracle({
		game: options.game,
		variant,
		source: { kind: "live-replay", from: relative(ROOT, path), ...(options.note === undefined ? {} : { note: options.note }) },
		host: { story, prompts: createPromptLookup(entry.prompts === undefined ? {} : { story: entry.prompts }) },
		agent: (host) => {
			const agent = replayAgent(host, path);
			ref.agent = agent;
			return agent;
		},
		...(options.cut === undefined ? {} : { cut: options.cut }),
		finish: (source) => ({ ...source, ...(ref.agent === undefined ? {} : { fidelity: ref.agent.fidelity() }) }),
	});
	return { oracle, differences: ref.agent?.differences ?? [] };
}
