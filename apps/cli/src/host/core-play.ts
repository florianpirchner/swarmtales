/**
 * `swt run --story <name>` for a registered core story (stories/index.ts `coreStories`): resolves the
 * model, writes the run directory (metadata, signed `events.jsonl`, agent transcripts and prompts,
 * `usage.json`) and plays the story with the generic runner (core-run.ts). The city-shaped extras of
 * `main.ts` (gamemaker, classifier, weaver, snapshots, digest, reporter) do not apply to a core story.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentTranscriptLog, allocateRunDirectory, CHAIN_FILE, EventChain, jsonHash, JsonlEventLog, UsageCollector, writeRunMetadata, writeSystemPrompts } from "@swarmtales/chronicle";
import type { Host, ModelChoice } from "@swarmtales/contracts";
import {
	createModelSource,
	isToolChoice,
	TOOL_CHOICES,
	createProviderRegistry,
	describeModel,
	missingApiKeys,
	ModelConfigError,
	resolveModelSettings,
	SCRIPTED_PROVIDER_ID,
	ScriptedModelSource,
	say,
	settingsFromStory,
	type ModelEnv,
	type ModelSettings,
	type ModelSource,
	type ProviderRegistry,
	type Script,
} from "@swarmtales/models";
import type { CoreStoryEntry } from "../../../../stories/index.ts";
import { competitorIds, storyData } from "@swarmtales/kernel";
import type { StartArgs } from "../args.ts";
import { codeCommit } from "./chain.ts";
import { composeCoreRun, coreStoryFor, refusedOverrides } from "./core-run.ts";
import { describeRunNotes, readRunNotes } from "./run-notes.ts";
import { RESIDENT_LIMITS } from "./residents.ts";
import { planResidentModels, residentModelSource, settingsLabel, type ResidentModelPlan } from "./resident-models.ts";

export interface CorePlayIo {
	readonly out: (text: string) => void;
	readonly env: ModelEnv & Readonly<Record<string, string | undefined>>;
	readonly registry?: ProviderRegistry;
}

/** Plays the run; returns the process exit code (1 with a message on `err` for a refused run). */
export async function playCoreStory(args: StartArgs, name: string, entry: CoreStoryEntry, io: CorePlayIo, err: (text: string) => void): Promise<number> {
	if (args.resume !== undefined || args.snapshotAfter !== undefined || args.snapshotAt !== undefined) {
		err(`The core story ${name} has no snapshots or resume yet`);
		return 1;
	}
	const registry = io.registry ?? createProviderRegistry();
	const overrides = {
		...(args.overrides.agents === undefined ? {} : { agents: args.overrides.agents }),
		...(args.overrides.minutes === undefined ? {} : { minutes: args.overrides.minutes }),
		...(args.overrides.seed === undefined ? {} : { seed: args.overrides.seed }),
	};
	const refused = refusedOverrides(entry, overrides);
	if (refused !== undefined) {
		err(refused);
		return 1;
	}
	const story = coreStoryFor(entry.story, overrides);
	let settings;
	try {
		settings = resolveModelSettings({ ...(args.provider === undefined ? {} : { provider: args.provider }), ...(args.model === undefined ? {} : { modelId: args.model }) }, io.env, settingsFromStory(entry.model), registry);
	} catch (error) {
		if (error instanceof ModelConfigError) {
			err(error.message);
			return 1;
		}
		throw error;
	}
	const missing = missingApiKeys(settings, registry, io.env);
	if (missing.length > 0) {
		err(`Missing API keys for provider "${settings.provider}": ${missing.join(", ")}\nExport the key or use --provider scripted (offline).`);
		return 1;
	}
	const rawToolChoice = args.toolChoice ?? ((io.env.ARENA_TOOL_CHOICE ?? "") === "" ? undefined : io.env.ARENA_TOOL_CHOICE);
	if (rawToolChoice !== undefined && !isToolChoice(rawToolChoice)) {
		err(`tool choice must be one of ${TOOL_CHOICES.join(", ")}, got "${rawToolChoice}"`);
		return 1;
	}
	const toolChoice = rawToolChoice;
	const choice: ModelChoice = { provider: settings.provider, ...(settings.modelId === undefined ? {} : { id: settings.modelId }), ...(entry.model.thinking === undefined ? {} : { thinking: entry.model.thinking }), ...(entry.model.maxOutputTokens === undefined ? {} : { maxOutputTokens: entry.model.maxOutputTokens }) };
	// A scripted run has no game to play: every resident only speaks, one answer per step it may take.
	const steps = story.minutes * (story.turns?.passes ?? 1);
	let plan: ResidentModelPlan = { overrides: new Map() };
	if (args.residentModels !== undefined) {
		const roster = typeof story.residents === "number" ? competitorIds(story.residents) : story.residents;
		try {
			plan = planResidentModels(args.residentModels, roster, registry, settings, io.env);
		} catch (error) {
			if (error instanceof ModelConfigError) {
				err(error.message);
				return 1;
			}
			throw error;
		}
	}
	const sourceFor = (host: Host, own: ModelSettings): ModelSource => {
		if (own.provider !== SCRIPTED_PROVIDER_ID) return createModelSource(own, { registry, ...(toolChoice === undefined ? {} : { toolChoice }) });
		const script: Script = Object.fromEntries(host.residents.map((id) => [id, Array.from({ length: steps }, () => say())]));
		return new ScriptedModelSource(script);
	};
	const models = (host: Host): ModelSource => (plan.overrides.size === 0 ? sourceFor(host, settings) : residentModelSource(host.residents, settings, plan, (own) => sourceFor(host, own)));
	const residentChoices = new Map<string, ModelChoice>([...plan.overrides].map(([id, own]) => [id, { provider: own.provider, ...(own.modelId === undefined ? {} : { id: own.modelId }) }]));
	const residentLabels = Object.fromEntries([...plan.overrides].map(([id, own]) => [id, settingsLabel(own)]));

	const allocated = allocateRunDirectory(args.runsDirectory);
	const commit = codeCommit();
	const label = `${settings.provider}/${settings.modelId ?? "-"}`;
	const chain = new EventChain(allocated.directory, {
		...(commit === undefined ? {} : { commit }),
		run: allocated.name,
		story: story.id,
		storyHash: jsonHash(JSON.parse(JSON.stringify(storyData(story)))),
		seed: story.seed,
		models: { residents: label, ...residentLabels },
	});
	const usage = new UsageCollector();
	const run = composeCoreRun({
		entry,
		overrides,
		models,
		modelOverride: choice,
		residentChoices,
		sinks: [new JsonlEventLog(join(allocated.directory, "events.jsonl"), { chain }), new AgentTranscriptLog(join(allocated.directory, "agents")), usage],
	});
	const residents = run.host.residents;
	writeRunMetadata(allocated.directory, {
		run: allocated.name,
		number: allocated.number,
		startedAt: new Date().toISOString(),
		provider: settings.provider,
		model: settings.modelId ?? "-",
		storyId: story.id,
		kind: "core",
		title: entry.title,
		effective: { agents: residents.length, minutes: story.minutes, seed: story.seed },
		agents: residents.map((agent) => {
			const own = plan.overrides.get(agent) ?? settings;
			return { agent, provider: own.provider, model: own.modelId ?? "-" };
		}),
	});
	writeSystemPrompts(
		join(allocated.directory, "agents"),
		residents.map((agent) => ({ agent, label: residentLabels[agent] ?? label, prompt: run.runner(agent)?.systemPrompt ?? run.prompts.get(agent) ?? "" })),
	);
	io.out(`> story ${story.id} (core) · ${describeModel(settings, registry)}${plan.overrides.size === 0 ? "" : ` (residents ${[...plan.overrides.keys()].join(",")}: ${[...new Set(Object.values(residentLabels))].join(", ")})`} · ${residents.length} residents · ${story.minutes} minutes · seed ${story.seed}\n`);
	try {
		await run.run();
	} finally {
		chain.close();
	}
	writeFileSync(join(allocated.directory, "usage.json"), `${JSON.stringify({ ...usage.toJSON(), models: { residents: label, ...residentLabels } }, null, 2)}\n`);
	const outputCap = entry.model.maxOutputTokens ?? RESIDENT_LIMITS.maxOutputTokens;
	io.out(["", usage.summary(), `notes:       ${describeRunNotes(readRunNotes(join(allocated.directory, "events.jsonl"), outputCap), outputCap)}`, `run:         ${allocated.directory}`, `events:      ${join(allocated.directory, "events.jsonl")}`, `chain:       ${join(allocated.directory, CHAIN_FILE)} (signed; check with swt log verify ${allocated.directory})`, `transcripts: ${join(allocated.directory, "agents")}`, ""].join("\n"));
	return 0;
}
