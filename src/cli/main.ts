/**
 * `pnpm start`: plays one run of a story and writes its artifacts.
 */
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { allocateRunDirectory, MinuteEventLog, writeRunMetadata } from "../log/run-artifacts.ts";
import { writeMinuteReport } from "../log/minute-report.ts";
import { analyzeRun, writeDigest } from "../digest/digest.ts";
import { ConsoleReporter, JsonlEventLog } from "../log/sinks.ts";
import { AgentTranscriptLog } from "../log/transcripts.ts";
import { UsageCollector } from "../log/usage.ts";
import { createProviderRegistry, customProviderSpec, SCRIPTED_PROVIDER_ID, type ProviderSpec } from "../model/providers.ts";
import { oracleScript } from "../model/scripted.ts";
import {
	describeModel,
	missingApiKeys,
	ModelConfigError,
	resolveModelSettings,
	settingsFromStory,
	type ModelEnv,
	type ModelOverrides,
	type ModelSettings,
} from "../model/settings.ts";
import { createModelSource, RoutedModelSource, ScriptedModelSource, type ModelSource } from "../model/source.ts";
import { assignModels } from "../agents/models.ts";
import { createDeliveryJudge, createStatementClassifier } from "../interpret/sources.ts";
import type { ModelChoice } from "../story/types.ts";
import { findStory, storyNames } from "../../stories/index.ts";
import { parseStartArgs, START_USAGE, UsageError } from "./args.ts";
import { assertPlayable, composeRun, DEFAULT_LIMITS, effectiveRun, resumeOverrides } from "./compose.ts";
import { readSnapshot, SnapshotError, writeSnapshot, type RunSnapshot, type SnapshotBrake } from "../snapshot/snapshot.ts";
import { StoryValidationError } from "../story/validate.ts";
import { worldOracle } from "./oracle.ts";
import { runMetadata } from "./metadata.ts";
import { competitorIds } from "../core/ids.ts";
import { resolveReporterModel, type ReporterChoice } from "../report/model.ts";
import { reportSummary, writeRunReport } from "../report/reporter.ts";

const envFile = join(process.cwd(), ".env");
// Existing environment variables win; the file only fills gaps.
if (existsSync(envFile)) loadEnvFile(envFile);

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

let args;
try {
	args = parseStartArgs(process.argv.slice(2));
} catch (error) {
	if (error instanceof UsageError) fail(`${error.message}\n\n${START_USAGE}`);
	throw error;
}

// A resumed run plays the snapshot's story, seed and competitors (SPEC 17); a mismatching flag is refused.
const snapshot: RunSnapshot | undefined = (() => {
	if (args.resume === undefined) return undefined;
	try {
		return readSnapshot(args.resume);
	} catch (error) {
		if (error instanceof SnapshotError) fail(`Cannot resume.\n${error.message}`);
		throw error;
	}
})();
const storyName = args.story ?? snapshot?.story ?? "nexus";
const story = findStory(storyName) ?? fail(`Unknown story "${storyName}". Known: ${storyNames().join(", ")}`);
const runOverrides = (() => {
	if (snapshot === undefined) return args.overrides;
	try {
		return resumeOverrides(snapshot, args.overrides);
	} catch (error) {
		if (error instanceof SnapshotError) fail(`Cannot resume.\n${error.message}`);
		throw error;
	}
})();
const registry = createProviderRegistry(extraProvidersFromEnv());
const modelOverrides = {
	...(args.provider === undefined ? {} : { provider: args.provider }),
	...(args.model === undefined ? {} : { modelId: args.model }),
};
const resolveSettings = (overrides: ModelOverrides, env: ModelEnv, choice: ModelChoice) => {
	try {
		return resolveModelSettings(overrides, env, settingsFromStory(choice), registry);
	} catch (error) {
		if (error instanceof ModelConfigError) fail(error.message);
		throw error;
	}
};
const uniform = resolveSettings(modelOverrides, process.env, story.model);
// CLI flags (and ARENA_PROVIDER / ARENA_MODEL) override every per-competitor assignment (SPEC 5.3).
const overridden =
	args.provider !== undefined ||
	args.model !== undefined ||
	(process.env.ARENA_PROVIDER ?? "").length > 0 ||
	(process.env.ARENA_MODEL ?? "").length > 0;
const modelOverride: ModelChoice | undefined = overridden ? choiceOf(uniform, story.model) : undefined;

// Validate before allocating a run directory so a bad override leaves nothing behind.
const effective = (() => {
	try {
		const resolved = effectiveRun(story, runOverrides);
		assertPlayable(story, resolved);
		return resolved;
	} catch (error) {
		if (error instanceof StoryValidationError) fail(`Cannot start this run.\n${error.message}`);
		if (error instanceof Error) fail(error.message);
		throw error;
	}
})();
const ids = competitorIds(effective.agents);
const settingsPerAgent = new Map(
	[...assignModels(story, ids, effective.seed, modelOverride)].map(([agent, choice]) => [
		agent,
		overridden ? uniform : resolveSettings({}, {}, choice),
	]),
);
const distinctSettings = [...new Map([...settingsPerAgent.values()].map((entry) => [settingsKey(entry), entry])).values()];
for (const entry of distinctSettings) {
	const missingKeys = missingApiKeys(entry, registry, process.env);
	if (missingKeys.length > 0) {
		fail(
			`Missing API keys for provider "${entry.provider}": ${missingKeys.join(", ")}\n` +
				`Add the key to ${envFile} or export it in your shell, or use --provider scripted (offline).`,
		);
	}
}

// The game master plays along unless switched off. Offline runs (any scripted competitor) never call
// a real model. It keeps the story's model whatever the competitors play; only its own flags or ARENA_GAMEMASTER_* change it.
const offline = distinctSettings.some((entry) => entry.provider === SCRIPTED_PROVIDER_ID);
const overrides = {
	...runOverrides,
	gamemaster: runOverrides.gamemaster !== false && !offline,
	classifier: runOverrides.classifier !== false && !offline,
};
const gamemasterSettings =
	overrides.gamemaster && story.gamemaster !== undefined
		? resolveSettings(
				{
					...(args.gamemasterProvider === undefined ? {} : { provider: args.gamemasterProvider }),
					...(args.gamemasterModel === undefined ? {} : { modelId: args.gamemasterModel }),
				},
				roleEnv("GAMEMASTER"),
				story.gamemaster.model,
			)
		: undefined;
if (gamemasterSettings !== undefined) {
	const missingKeys = missingApiKeys(gamemasterSettings, registry, process.env);
	if (missingKeys.length > 0) {
		fail(
			`Missing API keys for the game master (provider "${gamemasterSettings.provider}"): ${missingKeys.join(", ")}\n` +
				`Add the key to ${envFile} or export it in your shell, or play without it: --no-gamemaster.`,
		);
	}
}

// The classifier labels every round for the digest and the game master. Like the game master it keeps the
// story's model whatever the competitors play; only its own flags or ARENA_CLASSIFIER_* change it.
const classifierSpec = overrides.classifier ? story.classifier : undefined;
const classifierSettings =
	classifierSpec === undefined
		? undefined
		: resolveSettings(
				{
					...(args.classifierProvider === undefined ? {} : { provider: args.classifierProvider }),
					...(args.classifierModel === undefined ? {} : { modelId: args.classifierModel }),
				},
				roleEnv("CLASSIFIER"),
				classifierSpec.model,
			);
if (classifierSettings !== undefined) {
	const missingKeys = missingApiKeys(classifierSettings, registry, process.env);
	if (missingKeys.length > 0) {
		fail(
			`Missing API keys for the classifier (provider "${classifierSettings.provider}"): ${missingKeys.join(", ")}\n` +
				`Add the key to ${envFile} or export it in your shell, or play without it: --no-classifier.`,
		);
	}
}
const statementClassifier = (() => {
	if (classifierSpec === undefined || classifierSettings === undefined) return undefined;
	try {
		return createStatementClassifier(classifierSettings, classifierSpec, registry, DEFAULT_LIMITS);
	} catch (error) {
		if (error instanceof ModelConfigError) fail(error.message);
		throw error;
	}
})();

// The city's judge decides blames with the classifier's model, also when labelling is off. Offline runs and
// runs without its key play without a judge: the blame tool then answers that the judge is absent.
const judge = (() => {
	if (offline || story.classifier === undefined || !story.levels.some((entry) => entry.tools.includes("blame"))) return undefined;
	const settings =
		classifierSettings ??
		resolveSettings(
			{
				...(args.classifierProvider === undefined ? {} : { provider: args.classifierProvider }),
				...(args.classifierModel === undefined ? {} : { modelId: args.classifierModel }),
			},
			roleEnv("CLASSIFIER"),
			story.classifier.model,
		);
	if (missingApiKeys(settings, registry, process.env).length > 0) {
		process.stderr.write(`> no key for the judge (provider "${settings.provider}"): blame answers that the city's judge is absent\n`);
		return undefined;
	}
	try {
		return createDeliveryJudge(settings, story.classifier, registry, DEFAULT_LIMITS);
	} catch (error) {
		if (error instanceof ModelConfigError) fail(error.message);
		throw error;
	}
})();

const allocated = allocateRunDirectory(args.runsDirectory);
const usage = new UsageCollector();
// One model call per step and at most one step per pass: the oracle never needs more answers.
const steps = effective.minutes * effective.passesPerMinute;
const modelLabel = distinctSettings.map((entry) => describeModel(entry, registry)).join(" + ");
const providerLabel = [...new Set(distinctSettings.map((entry) => entry.provider))].join(",");
const modelIdLabel = [...new Set(distinctSettings.map((entry) => entry.modelId ?? "-"))].join(",");

let snapshotPath: string | undefined;
/** Set when an act's brake wrote the snapshot (v08). */
let snapshotBrake: string | undefined;
const resumedFrom =
	snapshot === undefined || args.resume === undefined
		? undefined
		: {
				file: resolve(args.resume),
				...(snapshot.run.meta?.run === undefined ? {} : { run: snapshot.run.meta.run }),
				level: snapshot.level,
				round: snapshot.round,
				minute: snapshot.minute,
				events: snapshot.events.length,
			};
const composeOptions: Parameters<typeof composeRun>[0] = {
	story,
	overrides,
	...(args.snapshotAfter === undefined
		? {}
		: {
				snapshot: {
					afterLevel: args.snapshotAfter,
					stop: args.stopAfterSnapshot === true,
					write: (taken) => {
						snapshotPath = writeSnapshot(allocated.directory, taken);
						if (taken.brake !== undefined) snapshotBrake = brakeLine(taken.brake);
						process.stdout.write(`> snapshot after level ${taken.level} (round ${taken.round}): ${snapshotPath}${snapshotBrake === undefined ? "" : ` (${snapshotBrake})`}\n`);
						return snapshotPath;
					},
				},
			}),
	...(snapshot === undefined || args.resume === undefined ? {} : { resume: { snapshot, name: basename(args.resume) } }),
	...(gamemasterSettings === undefined ? {} : { gamemasterModels: createModelSource(gamemasterSettings, { registry }) }),
	...(modelOverride === undefined ? {} : { modelOverride }),
	...(statementClassifier === undefined ? {} : { classifier: statementClassifier }),
	...(judge === undefined ? {} : { judge }),
	models: (world) => {
		const sources = new Map<string, ModelSource>();
		const sourceFor = (entry: ModelSettings): ModelSource => {
			const key = settingsKey(entry);
			const existing = sources.get(key);
			if (existing !== undefined) return existing;
			const created =
				entry.provider === SCRIPTED_PROVIDER_ID
					? new ScriptedModelSource(oracleScript(ids, () => worldOracle(world), steps))
					: createModelSource(entry, { registry });
			sources.set(key, created);
			return created;
		};
		return new RoutedModelSource(new Map([...settingsPerAgent].map(([agent, entry]) => [agent, sourceFor(entry)])));
	},
	sinks: [
		new ConsoleReporter(),
		new JsonlEventLog(join(allocated.directory, "events.jsonl")),
		new MinuteEventLog(allocated.directory),
		new AgentTranscriptLog(join(allocated.directory, "agents")),
		usage,
	],
	// Per run: a resumed run's budget counts only its own spend, not the prefix's.
	budget: { spentUsd: () => usage.own().totals.costUsd },
	meta: {
		run: allocated.name,
		provider: providerLabel,
		model: modelIdLabel,
		seed: String(effective.seed),
		gamemaster: gamemasterSettings === undefined ? "off" : `${gamemasterSettings.provider}/${gamemasterSettings.modelId ?? "-"}`,
		classifier: statementClassifier?.label ?? "off",
		judge: judge?.label ?? "off",
		...(resumedFrom === undefined ? {} : { resumedFrom: resumedFrom.file }),
	},
};
const run = (() => {
	try {
		return composeRun(composeOptions);
	} catch (error) {
		// A snapshot that does not fit (or a story whose reached levels changed) leaves no run directory behind.
		rmSync(allocated.directory, { recursive: true, force: true });
		if (error instanceof SnapshotError || (snapshot !== undefined && error instanceof Error)) {
			fail(`Cannot ${snapshot === undefined ? "start this run" : "resume"}.\n${error.message}`);
		}
		throw error;
	}
})();

writeRunMetadata(
	allocated.directory,
	runMetadata({
		run: allocated.name,
		number: allocated.number,
		startedAt: new Date().toISOString(),
		provider: providerLabel,
		model: modelIdLabel,
		story,
		effective: run.effective,
		profiles: run.profiles,
		...(resumedFrom === undefined ? {} : { resumedFrom }),
	}),
);

process.stdout.write(
	`> story ${story.id} · ${modelLabel} · ${effective.agents} competitors · ` +
		`${effective.minutes} minutes · seed ${effective.seed}` +
		(gamemasterSettings === undefined ? "" : ` · game master ${describeModel(gamemasterSettings, registry)}`) +
		(statementClassifier === undefined ? "" : ` · classifier ${statementClassifier.label}`) +
		(snapshot === undefined ? "" : ` · resumed after round ${snapshot.round} (every competitor past level ${snapshot.level})`) +
		"\n",
);
await run.arena.run();

writeFileSync(
	join(allocated.directory, "usage.json"),
	`${JSON.stringify(usage.toJSON(), null, 2)}\n`,
);
const report = writeMinuteReport(allocated.directory);
// The deterministic digest is cheap and offline; a failure must not hide the run's other artifacts.
let digestLine: string;
try {
	digestLine = `digest:      ${writeDigest(allocated.directory, analyzeRun(allocated.directory)).directory}`;
} catch (error) {
	digestLine = `digest:      failed (${error instanceof Error ? error.message : String(error)}); retry with pnpm digest ${allocated.directory}`;
}
// The run reporter writes REPORT.md after the run and its budget check, so its spend never counts against the
// run's budget; it is recorded under `reporter` in usage.json and shown below. A failure never fails the run.
let reportLine: string;
if (!args.reporter) {
	reportLine = "report:      off (--no-reporter)";
} else {
	const explicit = args.reporterProvider !== undefined || args.reporterModel !== undefined;
	const choice: ReporterChoice =
		offline && !explicit
			? { ok: false, reason: "offline run (scripted competitors); pass --reporter-provider to use a model" }
			: resolveReporterModel(
					{
						...(args.reporterProvider === undefined ? {} : { provider: args.reporterProvider }),
						...(args.reporterModel === undefined ? {} : { model: args.reporterModel }),
					},
					process.env,
					registry,
				);
	if (choice.ok) process.stdout.write(`> report: asking ${choice.model.label} ...\n`);
	try {
		const written = await writeRunReport(allocated.directory, choice);
		for (const warning of written.warnings) process.stderr.write(`warning: report ${warning}\n`);
		reportLine = reportSummary(written);
	} catch (error) {
		reportLine = `report:      failed (${error instanceof Error ? error.message : String(error)}); retry with pnpm report:run ${allocated.directory}`;
	}
}
process.stdout.write(
	[
		"",
		usage.summary(),
		`run:         ${allocated.directory}`,
		`events:      ${join(allocated.directory, "events.jsonl")}`,
		`transcripts: ${join(allocated.directory, "agents")}`,
		`minutes:     ${report}`,
		...(snapshotPath !== undefined
			? [`snapshot:    ${snapshotPath}`, ...(snapshotBrake === undefined ? [] : [`act brake:   ${snapshotBrake}`])]
			: args.snapshotAfter === undefined
				? []
				: [`snapshot:    none; not every competitor passed level ${args.snapshotAfter} before the run ended`]),
		digestLine,
		reportLine,
		"",
	].join("\n"),
);

/** "the brake of Act I fired at minute 24 (25 minutes); behind: A03 on level 6, A05 on level 7". */
function brakeLine(brake: SnapshotBrake): string {
	const behind = brake.behind.map((entry) => `${entry.agent} on level ${entry.level}`).join(", ");
	return `the brake of ${brake.act} fired at minute ${brake.minute} (${brake.maxMinutes} minutes); behind: ${behind}`;
}

/** `ARENA_<ROLE>_PROVIDER` / `ARENA_<ROLE>_MODEL`, in the shape the model resolver reads. */
function roleEnv(role: "GAMEMASTER" | "CLASSIFIER"): ModelEnv {
	const provider = process.env[`ARENA_${role}_PROVIDER`] ?? "";
	const model = process.env[`ARENA_${role}_MODEL`] ?? "";
	return { ...(provider.length === 0 ? {} : { ARENA_PROVIDER: provider }), ...(model.length === 0 ? {} : { ARENA_MODEL: model }) };
}

function settingsKey(entry: ModelSettings): string {
	return JSON.stringify([entry.provider, entry.modelId ?? "", entry.routing ?? null]);
}

/** The model a competitor actually uses, keeping the story's thinking and token settings. */
function choiceOf(entry: ModelSettings, base: ModelChoice): ModelChoice {
	return {
		provider: entry.provider,
		...(entry.modelId === undefined ? {} : { id: entry.modelId }),
		...(entry.routing === undefined ? {} : { routing: entry.routing }),
		...(base.thinking === undefined ? {} : { thinking: base.thinking }),
		...(base.maxOutputTokens === undefined ? {} : { maxOutputTokens: base.maxOutputTokens }),
	};
}

/** A self-hosted OpenAI-compatible endpoint, configured through the environment. */
function extraProvidersFromEnv(): readonly ProviderSpec[] {
	const baseUrl = process.env.ARENA_BASE_URL;
	if (baseUrl === undefined || baseUrl.length === 0) return [];
	const modelIds = (process.env.ARENA_MODEL_IDS ?? process.env.ARENA_MODEL ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	if (modelIds.length === 0) fail("ARENA_BASE_URL is set but ARENA_MODEL_IDS is missing");
	return [
		customProviderSpec({
			id: process.env.ARENA_CUSTOM_PROVIDER_ID ?? "custom",
			label: process.env.ARENA_CUSTOM_PROVIDER_LABEL ?? "Custom endpoint",
			baseUrl,
			modelIds,
			apiKeyEnv: [process.env.ARENA_API_KEY_ENV ?? "ARENA_API_KEY"],
		}),
	];
}
