// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt run` without `--fake`: a game file to a verified run folder, played by models under a cost cap. The order is
 * fixed, because the manifest must exist before the first event: the key broker and the cap; the resolved game and
 * its model; the system prompts, the kernel (created, not started: the manifest holds its tool specs), the manifest
 * and the run folder; the start, the model drivers and `prompt_fixed`; the run; the verification, the leak scan and
 * the result. With a spend ledger the run's cap is reserved before the folder is opened and settled after the scan.
 * The key broker is created here and handed to `createModelSource` only; everything else gets `broker.redact`.
 */
import { readFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { basename, relative, resolve } from "node:path";
import { jsonHash } from "@swarmtales/chain";
import { formatIssue, redactSecrets, redactValue, SwtError, type AskModel, type DriverTable, type EventSink, type Kernel, type PromptLookup, type Redact, type RunEnd, type RunManifest, type SwtIssue } from "@swarmtales/contracts";
import { createDirectorDrivers, createReviewPort, DIRECTOR_RECORDS, REVIEW_RECORDS } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createAsker, createCostMeter, createKeyBroker, createModelDrivers, createToolDirector, DIRECTOR_MODEL_RECORDS, createModelSource, createProviderRegistry, REQUEST_TIMEOUT_MS, RESIDENT_DRIVER, RESIDENT_RECORDS, resolveModelSettings, systemPrompt, parseSavedSessions, type CostMeter, type KeyBroker, type ModelSettings, type ModelSource, type SavedSessions, type Spend } from "@swarmtales/models";
import { nextRunFolder, openRunFolder, verifyRun, type RunFolder, type RunVerdict } from "@swarmtales/runlog";
import { DIRECTOR_TAKE, RESIDENT_KIND, type ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import { loopOf, pauseEvent, runManifest, type LoopOptions } from "./assembly.ts";
import { actorModels, type ActorModels } from "./director-models.ts";
import type { LiveFlags } from "./flags.ts";
import { handOf } from "./hand.ts";
import { scanFolder } from "./leak-scan.ts";
import { openLedger } from "./ledger.ts";
import type { HandSource, LoopStop } from "./loop.ts";
import type { CliIo } from "./main.ts";
import type { LiveResume } from "./live-resume.ts";
import { RUN_RECORDS } from "./records.ts";
import { folderTexts, played, resolveFile, runFacts, whyOf, type RunInput } from "./run.ts";
import { handLine, type HandCount } from "./watch.ts";
import { confirmatoryDirty, readSourceTree, type SourceTree } from "./tree.ts";

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
	/** The commit and the state of the platform's source tree; asked from git (`readSourceTree`) when absent. A test passes one. */
	readonly tree?: SourceTree;
	/** Set for a live resume (`swt resume --budget`): what the run goes on from. */
	readonly resumed?: LiveResume;
}

/** The model of an actor as the manifest names it. @public */
export type ManifestModel = NonNullable<RunManifest["actors"][number]["model"]>;

/**
 * What a live run came to.
 *
 * @public
 */
export interface LiveResult {
	/** The exit code: 0 finished, 1 an `SwtError` before the run or a log that does not verify, 2 ended with `error`, 3 paused with the Human Hand ended (`SWT-X009`), 4 a held key value in a file of the run folder (`SWT-X030`), 5 ended at the cost cap. */
	readonly code: number;
	/** The run folder, relative to the current directory; absent when the run did not start. */
	readonly run?: string;
	/** The name of the run in the spend ledger and in the series lines: `<experiment id>/<run id>`, or `<purpose>/<run id>` outside an experiment (`smoke/quarry-001`). Absent when the run did not start. */
	readonly name?: string;
	/** The end of the run; absent when the run loop stopped with the run still open. */
	readonly end?: RunEnd;
	/** The stop of the run loop, when the run did not end. */
	readonly stopped?: LoopStop;
	/** What the run spent. */
	readonly spend?: Spend;
	/** The issues that were printed, with every text of them redacted. */
	readonly issues: readonly SwtIssue[];
	/** The calls of the Human Hand and the refused ones; absent for a run without a Human Hand. */
	readonly hand?: HandCount;
}

/**
 * `SWT-C023`: a confirmatory run outside an experiment. On a tree that is not clean it is `confirmatoryDirty`.
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

// The system prompt of every resident (a Director has its own, and the human none): a pure function of the resolved game, so its hash is in the manifest before the kernel starts.
function promptsOf(game: ResolvedGame, texts: PromptLookup): Readonly<Record<string, string>> {
	const { actors, scheduler } = game.definition;
	const passes = Check(Passes, scheduler.options) ? scheduler.options.passes : 1;
	return Object.fromEntries(actors.filter((actor) => actor.kind === RESIDENT_KIND).map((actor) => [actor.id, systemPrompt({ id: actor.id.slice(actor.kind.length + 1), passes, briefing: game.briefings[actor.id] ?? "" }, texts)]));
}

function modelOf(settings: ModelSettings): ManifestModel {
	const params = { temperature: "provider-default", topP: "provider-default", maxOutputTokens: settings.maxOutputTokens, thinking: settings.thinking } as const;
	return { provider: settings.provider, requestedId: settings.requestedId, resolvedId: settings.modelId, params, pricing: pricing() };
}

// The model of the run: command line, then environment, then the game; a Director's by `actorModels`. `SWT-X001` when a provider has no key, also with a source of the caller's.
function settingsOf(input: LiveInput, game: ResolvedGame, broker: KeyBroker): { readonly settings: ModelSettings; readonly source: ModelSource; readonly actors: ActorModels } {
	const registry = createProviderRegistry();
	const overrides = { ...(input.provider === undefined ? {} : { provider: input.provider }), ...(input.modelId === undefined ? {} : { modelId: input.modelId }), ...(input.thinking === undefined ? {} : { thinking: input.thinking }) };
	const env = { ...(input.env.SWT_PROVIDER === undefined ? {} : { SWT_PROVIDER: input.env.SWT_PROVIDER }), ...(input.env.SWT_MODEL === undefined ? {} : { SWT_MODEL: input.env.SWT_MODEL }) };
	const settings = resolveModelSettings(overrides, env, game.data.model, registry);
	broker.auth(settings.provider);
	const make = (chosen: ModelSettings): ModelSource => {
		broker.auth(chosen.provider);
		return input.source ?? createModelSource(chosen, registry, broker);
	};
	const actors = actorModels(game, input.directorModels ?? {}, { settings, source: input.source ?? createModelSource(settings, registry, broker) }, make, registry);
	const { source } = actors;
	// `SWT-X007` comes from `bind`: every actor a model plays is bound once here and the binding dropped, so a model without a price is refused before the run folder exists.
	for (const actor of game.definition.actors.filter(({ id }) => id !== "human")) source.bind(actor.id, { maxOutputTokens: settings.maxOutputTokens, timeoutMs: REQUEST_TIMEOUT_MS });
	return { settings, source, actors };
}

interface Outcome {
	readonly game: ResolvedGame;
	readonly settings: ModelSettings;
	readonly end: RunEnd | LoopStop;
	readonly why: string;
	readonly result?: { readonly fact: string; readonly value: unknown };
	readonly verdict: RunVerdict;
	readonly spend: Spend;
	readonly capUsd: number;
	readonly run: string;
	readonly issues: readonly SwtIssue[];
	readonly hand?: HandCount;
}

/**
 * The requests and tokens of a run as the result line prints them (P448): the input that was not read from a cache,
 * the cache reads and writes, and the output.
 *
 * @param spend - What the run spent.
 * @returns For example "12 requests, 686 input, 755266 cache-read, 84665 cache-write and 31038 output tokens".
 *
 * @public
 */
export function tokenLine(spend: Spend): string {
	return `${String(spend.requests)} requests, ${String(spend.input)} input, ${String(spend.cacheRead)} cache-read, ${String(spend.cacheWrite)} cache-write and ${String(spend.output)} output tokens`;
}

/**
 * The name of a run in the spend ledger and in the series lines (P447): never a path, so it does not depend on the
 * directory the command started in.
 *
 * @param input - The experiment of the run and its purpose.
 * @param input.experiment - The experiment the run belongs to.
 * @param input.purpose - The purpose of the run, which names it outside an experiment.
 * @param directory - The run folder; its last part is the run id.
 * @returns `<experiment id>/<run id>`, or `<purpose>/<run id>` (`smoke/quarry-001`).
 *
 * @public
 */
export function runName(input: Pick<LiveInput, "experiment" | "purpose">, directory: string): string {
	return `${input.experiment?.id ?? input.purpose}/${basename(directory)}`;
}

// Every line goes through `redact`: the result of a game and the text of an issue may hold what a model wrote.
function print(outcome: Outcome, json: boolean, io: CliIo, redact: Redact): void {
	const { game, settings, end, result, verdict, spend, capUsd, run, issues } = outcome;
	const { id } = game.definition.game;
	const { seed } = game.definition;
	const model = `${settings.provider}/${settings.modelId}`;
	if (json) {
		io.out(redact(JSON.stringify({ driver: RESIDENT_DRIVER, model, game: id, seed, end, ...(result === undefined ? {} : { result }), log: { ok: verdict.ok, lines: verdict.lines, head: verdict.head }, ...(outcome.hand === undefined ? {} : { hand: outcome.hand }), spend, capUsd, run, issues })));
		return;
	}
	io.out(redact(`${id} seed ${String(seed)} with ${model}: ${"stopped" in end ? "stopped" : "ended"} after ${String(end.tick)} ticks (${outcome.why})`));
	if (result !== undefined) io.out(redact(`result ${result.fact}: ${JSON.stringify(result.value)}`));
	for (const line of handLine(outcome.hand)) io.out(line);
	for (const issue of issues) io.err(redact(formatIssue(issue)));
	if (verdict.ok) io.out(`log verified: ${String(verdict.lines)} lines, head ${verdict.head ?? "none"}`);
	io.out(`spend: ${spend.costUsd.toFixed(4)} USD of the cap ${capUsd.toFixed(2)} USD, ${tokenLine(spend)}`);
	io.out(redact(`run: ${run}`));
}

// What the steps before the run made, for the steps that open the folder and play.
interface Prepared {
	readonly game: ResolvedGame;
	readonly texts: PromptLookup;
	readonly settings: ModelSettings;
	readonly source: ModelSource;
	readonly actors: ActorModels;
	readonly ask: AskModel;
	readonly systemPrompts: Readonly<Record<string, string>>;
	readonly meter: CostMeter;
	readonly redact: Redact;
	readonly tree: SourceTree;
	readonly hand: HandSource | undefined;
	readonly pauseOn: LoopOptions["pauseOn"];
	readonly saved: SavedSessions | undefined;
}

// The limits of a Director's use; none for another actor.
const limitsOf = (game: ResolvedGame, actor: string): { readonly maxCostUsd?: number; readonly maxRequests?: number } => (game.directors ?? []).find((director) => director.actor === actor)?.limits ?? {};

// Steps one and two: the cap, the source tree (a confirmatory run needs an experiment and a clean tree), the resolved game, its model with the key check, the system prompts.
async function prepared(input: LiveInput, io: CliIo, broker: KeyBroker): Promise<Prepared> {
	const meter = createCostMeter(input.budget ?? 0);
	if (input.purpose === "confirmatory" && input.experiment === undefined) throw new SwtError(confirmatoryAlone());
	const tree = input.tree ?? readSourceTree();
	if (input.purpose === "confirmatory" && tree.dirty !== false) throw new SwtError(confirmatoryDirty(tree));
	const { game, texts } = await resolveFile(input, io, [RESIDENT_RECORDS, DIRECTOR_RECORDS, DIRECTOR_MODEL_RECORDS, REVIEW_RECORDS, ...(input.resumed === undefined ? [] : [RUN_RECORDS])]);
	const models = settingsOf(input, game, broker);
	// A Director asks its model; its cost counts on the meter of the run, under its own `maxCostUsd`.
	const ask = createAsker(models.source, meter, (actor) => limitsOf(game, actor));
	return { game, texts, ...models, ask, systemPrompts: promptsOf(game, texts), meter, redact: broker.redact, tree, ...loopParts(input, game, io, broker.redact) };
}

// The Human Hand (without the lines a resumed run had applied), the event of `--pause-on`, and a resume's saved sessions.
function loopParts(input: LiveInput, game: ResolvedGame, io: CliIo, redact: Redact): Pick<Prepared, "hand" | "pauseOn" | "saved"> {
	const { resumed } = input;
	return { hand: handOf(input.hand, game, io, resumed?.hand), pauseOn: input.pauseOn === undefined ? undefined : pauseEvent(game, input.pauseOn), saved: resumed === undefined ? undefined : parseSavedSessions(resumed.sessions, redact) };
}

// Steps three and four: the kernel is created (the manifest holds its tool specs), then the manifest is written with the folder. Nothing is started.
function opened(input: LiveInput, io: CliIo, run: Prepared, directory: string): { readonly kernel: Kernel; readonly folder: RunFolder } {
	const { game, systemPrompts, meter, redact } = run;
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
	// The answerer of a review is a Director (`answers`), asked through the asker with the facts of the run.
	const { resumed } = input;
	const kernel: Kernel = createKernel(game.definition, { sinks: [sink, ...(input.sinks ?? [])], limits: [meter.limit], redact, review: createReviewPort({ game, ask: run.ask, facts: (key) => kernel.fact(key) }) }, resumed?.input);
	if (game.win !== undefined) kernel.fact(game.win);
	const facts = {
		...runFacts(directory, io.now),
		...run.tree,
		purpose: input.purpose,
		replicate: input.replicate,
		budgetUsd: meter.capUsd,
		models: Object.fromEntries(actors.filter(({ id }) => id !== "human").map((actor) => [actor.id, modelOf(run.actors.settings(actor.id))])),
		systemPrompts,
		toolSpecs: Object.fromEntries(actors.map((actor) => [actor.grant, kernel.toolSpecs(actor.grant)])),
		...(input.experiment === undefined ? {} : { experiment: input.experiment }),
	};
	const manifest = runManifest(game, facts, RESIDENT_DRIVER);
	const folder = openRunFolder(directory, resumed === undefined ? manifest : { ...manifest, resumedFrom: { snapshotHash: resumed.snapshotHash } }, { now: io.now, game: game.data, texts: folderTexts(game), redact, ...resumed?.folder });
	folders.push(folder);
	resumed?.began(kernel, facts.models);
	return { kernel, folder };
}

// The leak scan of the run folder, for the caller that catches a throw of the run: absent until the folder is open.
interface Trace {
	scan?: () => readonly SwtIssue[];
}

// The cap is reserved before the folder is opened; a folder that is refused (`SWT-L006`) started nothing and gives it back.
function reserved(input: LiveInput, io: CliIo, name: string, capUsd: number, open: () => ReturnType<typeof opened>): ReturnType<typeof opened> & { readonly settle: (costUsd: number) => void } {
	const ledger = input.ledger === undefined ? undefined : openLedger(resolve(io.cwd, input.ledger), io.now);
	const settle = (costUsd: number): void => ledger?.settle(name, costUsd);
	ledger?.reserve(name, capUsd, input.resumed?.base);
	try {
		return { ...open(), settle };
	} catch (error) {
		settle(0);
		throw error;
	}
}

// A leak comes first: its folder is not published, whatever the run came to.
function codeOf(leak: boolean, end: RunEnd | undefined, verified: boolean, capped: boolean): number {
	if (leak) return 4;
	if (end?.reason === "error") return 2;
	if (!verified) return 1;
	if (end === undefined) return 3;
	return capped ? 5 : 0;
}

// The six steps. The folder is open before `kernel.start()` writes the first event, and closed whatever the run does.
// A throw after the start leaves the reservation in the ledger: a crashed run keeps its whole cap, and so does a run whose cost is not known.
async function live(input: LiveInput, io: CliIo, broker: KeyBroker, trace: Trace): Promise<LiveResult> {
	const run = await prepared(input, io, broker);
	const { game, settings, source, systemPrompts, meter, redact, texts, ask } = run;
	const directory = nextRunFolder(resolve(io.cwd, input.out ?? "runs"), game.definition.game.id);
	const name = runName(input, directory);
	const { kernel, folder, settle } = reserved(input, io, name, meter.capUsd, () => opened(input, io, run, directory));
	trace.scan = () => scanFolder(directory, (text) => broker.leaks(text));
	const play = async (): Promise<Awaited<ReturnType<typeof played>>> => {
		// A resumed kernel has started; its residents go on from their saved conversations, whose prompts were fixed before.
		if (run.saved === undefined) kernel.start();
		const models = createModelDrivers({ kernel, actors: game.definition.actors, source, settings, systemPrompts, meter, redact, texts, hash: jsonHash, ...(run.saved === undefined ? {} : { saved: run.saved }) });
		if (run.saved === undefined) models.fix();
		// A Director that acts by tool use looks through a resident session of its own model; it is never given `take`.
		const look = createToolDirector({ kernel, source, settings: run.actors.settings, limits: (actor) => limitsOf(game, actor), meter, redact, hidden: [game.definition.names[DIRECTOR_TAKE] ?? "take"] });
		const drivers: DriverTable = { ...models.drivers, ...createDirectorDrivers({ game, ask, facts: (key) => kernel.fact(key), look }) };
		// Every snapshot of a live run holds the residents' conversations, checked with the run's redaction.
		const loop = loopOf(game, kernel, () => folder, { hand: run.hand, snapshotAt: input.snapshotAt, warn: (line) => { io.err(redact(line)); }, pauseOn: run.pauseOn, sessions: () => models.save(), redact });
		return played(kernel, drivers, { ...loop, ticks: input.resumed?.ticks ?? loop.ticks });
	};
	const { end: last, issues, hand } = await play().finally(() => {
		folder.close();
	});
	const ended = "stopped" in last ? { stopped: last } : { end: last };
	const { end } = ended;
	const verdict = verifyRun(directory);
	const leak = trace.scan();
	// A closed meter does not know the cost: the reservation stays, as for a run that crashed.
	if (meter.closed === undefined) settle(meter.total.costUsd);
	const result = game.win === undefined || end?.reason === "error" ? {} : { result: { fact: game.win, value: kernel.fact(game.win) } };
	const outcome = { ...ended, spend: meter.total, run: relative(io.cwd, directory), name, issues: redactValue([...issues, ...verdict.issues, ...leak], redact), ...(hand === undefined ? {} : { hand }) };
	print({ game, settings, end: last, why: whyOf(kernel, last), ...result, verdict, capUsd: meter.capUsd, ...outcome }, input.json, io, redact);
	return { code: codeOf(leak.length > 0, end, verdict.ok, end?.limit === meter.limit.id), ...outcome };
}

// A run that threw: an `SwtError` is printed as its issues, anything else as its message, then the leak the folder
// holds. The issues are redacted before they are returned: the caller may keep them in a file.
function thrownRun(error: unknown, leak: readonly SwtIssue[], json: boolean, io: CliIo, redact: Redact): readonly SwtIssue[] {
	const issues = redactValue([...(error instanceof SwtError ? error.issues : []), ...leak], redact);
	const other = error instanceof SwtError ? {} : { error: error instanceof Error ? error.message : "the run failed" };
	if (json) io.out(redact(JSON.stringify({ ...other, ...(issues.length > 0 || other.error === undefined ? { issues } : {}) })));
	else {
		if (other.error !== undefined) io.err(redact(`error: ${other.error}`));
		for (const issue of issues) io.err(redact(formatIssue(issue)));
	}
	return issues;
}

/**
 * Plays a game file with models into a new run folder: resolves the game (with the overrides of `--set`) and its
 * model, builds every actor's system prompt, writes the manifest before the first event, plays under the cost cap,
 * verifies the log, scans the run folder for a held key value and prints the result and the spend. Every printed
 * line passes the redaction of the key broker, and no error object is printed: an `SwtError` is printed as its
 * issues, anything else as its redacted message. With `ledger`, the run's cap is reserved in the spend ledger before
 * the run folder is opened and replaced by the run's cost after it; a run that throws after its start, and a run
 * with an answer whose cost could not be counted (it ends at the limit `models.budget`, code 5), keep their
 * reservation. A `confirmatory` run is refused (`SWT-C023`) outside an experiment and on a source tree that git
 * does not report as clean; the tree's commit and state go into the manifest of every run. A leak (`SWT-X030`, code 4) writes the marker file `LEAK` into the folder, also when the run threw.
 *
 * @param input - The game file, the flags of a live run, the environment record, and for a test the model source.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code with the run folder, the end, the spend and the printed issues. Code 1 with the issues
 * before a run: `SWT-X005` without a cost cap, `SWT-X001` without a key (it names every variable that was tried),
 * `SWT-X002` to `SWT-X004`, `SWT-X006`, `SWT-X007`, `SWT-C023`, `SWT-C025` (the ledger cannot be read, or the cap
 * does not fit under it), `SWT-L006`, and what `resolveFile` reports.
 * @example
 * ```ts
 * const { code } = await runLive({ file: "games/quarry/game.ts", seed: undefined, out: undefined, json: false, budget: 0.4, purpose: "smoke", replicate: 0, env: readEnv() }, io);
 * ```
 *
 * @public
 */
export async function runLive(input: LiveInput, io: CliIo): Promise<LiveResult> {
	let redact: Redact = redactSecrets;
	const trace: Trace = {};
	try {
		const broker = createKeyBroker(input.env);
		redact = broker.redact;
		return await live(input, io, broker, trace);
	} catch (error) {
		const leak = trace.scan?.() ?? [];
		return { code: leak.length > 0 ? 4 : 1, issues: thrownRun(error, leak, input.json, io, redact) };
	}
}
