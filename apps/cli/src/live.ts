// SPDX-License-Identifier: Apache-2.0
/**
 * `swt run` without `--fake`: a game file to a verified run folder, played by models under a cost cap. The order is
 * fixed, because the manifest must exist before the first event: the key broker and the cap; the resolved game and
 * its model; the system prompts, the kernel (created, not started: the manifest holds its tool specs), the manifest
 * and the run folder; the start, the model drivers and `prompt_fixed`; the run; the verification and the result.
 * The key broker is created here and handed to `createModelSource` only; everything else gets `broker.redact`.
 */
import { readFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { relative, resolve } from "node:path";
import { jsonHash } from "@swarmtales/chain";
import { formatIssue, redactSecrets, SwtError, type EventSink, type Kernel, type PromptLookup, type Redact, type RunEnd, type RunManifest, type SwtIssue } from "@swarmtales/contracts";
import { buildManifest } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createCostMeter, createKeyBroker, createModelDrivers, createModelSource, createProviderRegistry, RESIDENT_DRIVER, RESIDENT_RECORDS, resolveModelSettings, systemPrompt, type CostMeter, type KeyBroker, type ModelSettings, type ModelSource, type Spend } from "@swarmtales/models";
import { nextRunFolder, openRunFolder, verifyRun, type RunFolder, type RunVerdict } from "@swarmtales/runlog";
import type { ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import type { LiveFlags } from "./flags.ts";
import type { CliIo } from "./main.ts";
import { folderTexts, played, resolveFile, runFacts, whyOf, type RunInput } from "./run.ts";

const Passes = Type.Object({ passes: Type.Integer({ minimum: 1, description: "Passes per tick" }) }, { description: "The option of the turn scheduler that the system prompt names" });
const Pinned = Type.Object(
	{ dependencies: Type.Object({ "@earendil-works/pi-ai": Type.String({ description: "The exact version of the provider library" }) }, { description: "The dependencies of the models package" }) },
	{ description: "The `package.json` of the models package, as far as the price table is named from it" },
);

/**
 * What a live run is made of: the game file and the flags, the environment record and, for a test or an
 * experiment, the model source and more sinks. Nothing here is read from the process.
 *
 * @public
 */
export interface LiveInput extends RunInput, LiveFlags {
	/** The environment, as a plain record: the key variables, `SWT_PROVIDER` and `SWT_MODEL` (`readEnv`). */
	readonly env: Readonly<Record<string, string | undefined>>;
	/** The model source; the provider's (`createModelSource`) when absent. A test passes the scripted one. */
	readonly source?: ModelSource;
	/** Sinks beside the run folder. */
	readonly sinks?: readonly EventSink[];
	/** The experiment the run belongs to, with its arm. */
	readonly experiment?: NonNullable<RunManifest["experiment"]>;
}

/**
 * What a live run came to.
 *
 * @public
 */
export interface LiveResult {
	/** The exit code: 0 finished, 1 an `SwtError` before the run or a log that does not verify, 2 ended with `error`, 5 ended at the cost cap. */
	readonly code: number;
	/** The run folder, relative to the current directory; absent when the run did not start. */
	readonly run?: string;
	/** The end of the run. */
	readonly end?: RunEnd;
	/** What the run spent. */
	readonly spend?: Spend;
	/** The issues that were printed. */
	readonly issues: readonly SwtIssue[];
}

/**
 * `SWT-C023`: a confirmatory run outside an experiment.
 *
 * @returns The issue.
 *
 * @public
 */
export function confirmatoryAlone(): SwtIssue {
	return {
		code: "SWT-C023",
		summary: "`--purpose confirmatory` needs a run that belongs to an experiment",
		why: "A confirmatory run is pooled with the other runs of its plan, and the plan is the committed specification of an experiment.",
		fix: "Run it through `swt experiment run`, or use `--purpose pilot` or `exploratory` for a single run.",
	};
}

// The price table that computes the cost: the provider library at the version the models package pins.
function pricing(): string {
	const raw: unknown = JSON.parse(readFileSync(findPackageJSON("@swarmtales/models", import.meta.url) ?? "", "utf8"));
	return `pi-ai@${Parse(Pinned, raw).dependencies["@earendil-works/pi-ai"]}`;
}

// The system prompt of every actor: a pure function of the resolved game, so its hash is in the manifest before the kernel starts.
function promptsOf(game: ResolvedGame, texts: PromptLookup): Readonly<Record<string, string>> {
	const { actors, scheduler } = game.definition;
	const passes = Check(Passes, scheduler.options) ? scheduler.options.passes : 1;
	return Object.fromEntries(actors.map((actor) => [actor.id, systemPrompt({ id: actor.id.slice(actor.kind.length + 1), passes, briefing: game.briefings[actor.id] ?? "" }, texts)]));
}

function modelOf(settings: ModelSettings): NonNullable<RunManifest["actors"][number]["model"]> {
	const params = { temperature: "provider-default", topP: "provider-default", maxOutputTokens: settings.maxOutputTokens, thinking: settings.thinking } as const;
	return { provider: settings.provider, requestedId: settings.requestedId, resolvedId: settings.modelId, params, pricing: pricing() };
}

// The model of the run: command line, then environment, then the game. `SWT-X001` when the provider has no key, also with a source of the caller's.
function settingsOf(input: LiveInput, game: ResolvedGame, broker: KeyBroker): { readonly settings: ModelSettings; readonly source: ModelSource } {
	const registry = createProviderRegistry();
	const overrides = { ...(input.provider === undefined ? {} : { provider: input.provider }), ...(input.modelId === undefined ? {} : { modelId: input.modelId }), ...(input.thinking === undefined ? {} : { thinking: input.thinking }) };
	const env = { ...(input.env.SWT_PROVIDER === undefined ? {} : { SWT_PROVIDER: input.env.SWT_PROVIDER }), ...(input.env.SWT_MODEL === undefined ? {} : { SWT_MODEL: input.env.SWT_MODEL }) };
	const settings = resolveModelSettings(overrides, env, game.data.model, registry);
	broker.auth(settings.provider);
	return { settings, source: input.source ?? createModelSource(settings, registry, broker) };
}

interface Outcome {
	readonly game: ResolvedGame;
	readonly settings: ModelSettings;
	readonly end: RunEnd;
	readonly why: string;
	readonly result?: { readonly fact: string; readonly value: unknown };
	readonly verdict: RunVerdict;
	readonly spend: Spend;
	readonly capUsd: number;
	readonly run: string;
	readonly issues: readonly SwtIssue[];
}

// Every line goes through `redact`: the result of a game and the text of an issue may hold what a model wrote.
function print(outcome: Outcome, json: boolean, io: CliIo, redact: Redact): void {
	const { game, settings, end, result, verdict, spend, capUsd, run, issues } = outcome;
	const { id } = game.definition.game;
	const { seed } = game.definition;
	const model = `${settings.provider}/${settings.modelId}`;
	if (json) {
		io.out(redact(JSON.stringify({ driver: RESIDENT_DRIVER, model, game: id, seed, end, ...(result === undefined ? {} : { result }), log: { ok: verdict.ok, lines: verdict.lines, head: verdict.head }, spend, capUsd, run, issues })));
		return;
	}
	io.out(redact(`${id} seed ${String(seed)} with ${model}: ended after ${String(end.tick)} ticks (${outcome.why})`));
	if (result !== undefined) io.out(redact(`result ${result.fact}: ${JSON.stringify(result.value)}`));
	for (const issue of issues) io.err(redact(formatIssue(issue)));
	if (verdict.ok) io.out(`log verified: ${String(verdict.lines)} lines, head ${verdict.head ?? "none"}`);
	io.out(`spend: ${spend.costUsd.toFixed(4)} USD of the cap ${capUsd.toFixed(2)} USD, ${String(spend.requests)} requests, ${String(spend.input)} input and ${String(spend.output)} output tokens`);
	io.out(redact(`run: ${run}`));
}

// What the steps before the run made, for the steps that open the folder and play.
interface Prepared {
	readonly game: ResolvedGame;
	readonly texts: PromptLookup;
	readonly settings: ModelSettings;
	readonly source: ModelSource;
	readonly systemPrompts: Readonly<Record<string, string>>;
	readonly meter: CostMeter;
	readonly redact: Redact;
}

// Steps one and two: the cap, the resolved game, its model with the key check, the system prompts.
async function prepared(input: LiveInput, io: CliIo, broker: KeyBroker): Promise<Prepared> {
	const meter = createCostMeter(input.budget ?? 0);
	if (input.purpose === "confirmatory" && input.experiment === undefined) throw new SwtError(confirmatoryAlone());
	const { game, texts } = await resolveFile(input, io, [RESIDENT_RECORDS]);
	return { game, texts, ...settingsOf(input, game, broker), systemPrompts: promptsOf(game, texts), meter, redact: broker.redact };
}

// Steps three and four: the kernel is created (the manifest holds its tool specs), then the manifest is written with the folder. Nothing is started.
function opened(input: LiveInput, io: CliIo, run: Prepared, directory: string): { readonly kernel: Kernel; readonly folder: RunFolder } {
	const { game, settings, systemPrompts, meter, redact } = run;
	const { actors } = game.definition;
	const folders: RunFolder[] = [];
	const sink: EventSink = {
		write(event) {
			const [folder] = folders;
			if (folder === undefined) throw new RangeError("an event was written before the run folder was open");
			folder.sink.write(event);
		},
		close(end) {
			folders[0]?.sink.close?.(end);
		},
	};
	const kernel = createKernel(game.definition, { sinks: [sink, ...(input.sinks ?? [])], limits: [meter.limit], redact });
	if (game.win !== undefined) kernel.fact(game.win);
	const model = modelOf(settings);
	const manifest = buildManifest(game, {
		...runFacts(directory, io.now),
		purpose: input.purpose,
		replicate: input.replicate,
		budgetUsd: meter.capUsd,
		drivers: Object.fromEntries(actors.map((actor) => [actor.id, RESIDENT_DRIVER])),
		models: Object.fromEntries(actors.map((actor) => [actor.id, model])),
		systemPrompts,
		toolSpecs: Object.fromEntries(actors.map((actor) => [actor.grant, kernel.toolSpecs(actor.grant)])),
		...(input.experiment === undefined ? {} : { experiment: input.experiment }),
	});
	const folder = openRunFolder(directory, manifest, { now: io.now, game: game.data, texts: folderTexts(game), redact });
	folders.push(folder);
	return { kernel, folder };
}

// The six steps. The folder is open before `kernel.start()` writes the first event, and closed whatever the run does.
async function live(input: LiveInput, io: CliIo, broker: KeyBroker): Promise<LiveResult> {
	const run = await prepared(input, io, broker);
	const { game, settings, source, systemPrompts, meter, redact, texts } = run;
	const directory = nextRunFolder(resolve(io.cwd, input.out ?? "runs"), game.definition.game.id);
	const { kernel, folder } = opened(input, io, run, directory);
	const play = async (): Promise<Awaited<ReturnType<typeof played>>> => {
		kernel.start();
		const models = createModelDrivers({ kernel, actors: game.definition.actors, source, settings, systemPrompts, meter, redact, texts, hash: jsonHash });
		models.fix();
		return played(kernel, models.drivers);
	};
	const { end, issues } = await play().finally(() => {
		folder.close();
	});
	const verdict = verifyRun(directory);
	const failed = end.reason === "error";
	const result = game.win === undefined || failed ? {} : { result: { fact: game.win, value: kernel.fact(game.win) } };
	const outcome = { end, spend: meter.total, run: relative(io.cwd, directory), issues: [...issues, ...verdict.issues] };
	print({ game, settings, why: whyOf(kernel, end), ...result, verdict, capUsd: meter.capUsd, ...outcome }, input.json, io, redact);
	return { code: failed ? 2 : !verdict.ok ? 1 : end.limit === meter.limit.id ? 5 : 0, ...outcome };
}

/**
 * Plays a game file with models into a new run folder: resolves the game (with the overrides of `--set`) and its
 * model, builds every actor's system prompt, writes the manifest before the first event, plays under the cost cap,
 * verifies the log and prints the result and the spend. Every printed line passes the redaction of the key broker,
 * and no error object is printed: an `SwtError` is printed as its issues, anything else as its redacted message.
 * The spend ledger and the leak scan are not part of this function yet.
 *
 * @param input - The game file, the flags of a live run, the environment record, and for a test the model source.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code with the run folder, the end, the spend and the printed issues. Code 1 with the issues
 * before a run: `SWT-X005` without a cost cap, `SWT-X001` without a key (it names every variable that was tried),
 * `SWT-X002` to `SWT-X004`, `SWT-X006`, `SWT-X007`, `SWT-C023`, `SWT-L006`, and what `resolveFile` reports.
 * @example
 * ```ts
 * const { code } = await runLive({ file: "games/quarry/game.ts", seed: undefined, out: undefined, json: false, budget: 0.4, purpose: "smoke", replicate: 0, env: readEnv() }, io);
 * ```
 *
 * @public
 */
export async function runLive(input: LiveInput, io: CliIo): Promise<LiveResult> {
	let redact: Redact = redactSecrets;
	try {
		const broker = createKeyBroker(input.env);
		redact = broker.redact;
		return await live(input, io, broker);
	} catch (error) {
		const issues = error instanceof SwtError ? error.issues : [];
		if (input.json) io.out(redact(JSON.stringify(error instanceof SwtError ? { issues } : { error: error instanceof Error ? error.message : "the run failed" })));
		else if (error instanceof SwtError) for (const issue of issues) io.err(redact(formatIssue(issue)));
		else io.err(redact(`error: ${error instanceof Error ? error.message : "the run failed"}`));
		return { code: 1, issues };
	}
}
