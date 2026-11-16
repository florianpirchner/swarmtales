// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `REPORT.md` of one run. Every number comes from the facts of the run; the only part a model will write is the
 * last section, and at this milestone nothing writes it.
 */
import type { RunManifest } from "@swarmtales/contracts";
import { ACTOR_KEYS, type BaseFacts, type RunFacts } from "../facts/facts.ts";
import { code, section, shown, table } from "./format.ts";

/**
 * The heading of the last section of a run report. A model's loophole candidates go below it and nowhere else; a
 * reader treats what stands there as unverified.
 *
 * @public
 */
export const LOOPHOLE_HEADING = "## Loophole candidates (unverified)";

/**
 * The line below {@link LOOPHOLE_HEADING} while no model writes candidates.
 *
 * @public
 */
export const NO_LOOPHOLE_PART = "none written: this report has no model-written part";

type Titles = Readonly<Record<string, { readonly title: string; readonly unit?: string }>>;

const REFUSALS = "run.refusals.";
/** The titles of the lab's own keys; a title of the caller wins. */
const GENERIC: Titles = {
	"run.ticks": { title: "Ticks" },
	"run.activations": { title: "Activations" },
	"run.toolCalls": { title: "Tool calls" },
	"run.toolRefusals": { title: "Refused tool calls" },
	"run.noCallActivations": { title: "Activations without a call" },
	"run.humanToolCalls": { title: "Tool calls of the human" },
	"models.requests": { title: "Model requests" },
	"models.failedRequests": { title: "Failed model requests" },
	"models.contextResets": { title: "Context resets" },
	"models.inputTokens": { title: "Input tokens", unit: "tokens" },
	"models.outputTokens": { title: "Output tokens", unit: "tokens" },
	"models.cacheReadTokens": { title: "Tokens read from the cache", unit: "tokens" },
	"models.cacheWriteTokens": { title: "Tokens written to the cache", unit: "tokens" },
	"models.costUsd": { title: "Cost", unit: "USD" },
};

function titleOf(key: string, titles: Titles): { readonly title: string; readonly unit?: string } {
	const refusal = key.startsWith(REFUSALS) ? { title: `Refusals with ${key.slice(REFUSALS.length)}` } : undefined;
	return titles[key] ?? GENERIC[key] ?? refusal ?? { title: key };
}

function header(facts: RunFacts, manifest: RunManifest): readonly string[] {
	const { game, kernel, scheduler, run, experiment } = manifest;
	const commit = kernel.commit === undefined ? "" : `, commit ${code(kernel.commit)}`;
	const calls = [facts.values["run.humanToolCalls"], facts.base?.values["run.humanToolCalls"]].reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
	return [
		`# Run ${facts.run}`,
		"",
		`- Game: ${code(game.id)}${game.title === undefined ? "" : ` (${game.title})`}, params \`${JSON.stringify(game.params)}\``,
		`- Seed ${facts.seed}, replicate ${facts.replicate}${experiment === undefined ? "" : `, arm ${code(experiment.arm)} of experiment ${code(experiment.id)}`}`,
		`- Purpose: ${run.purpose}; started at ${run.startedAt}`,
		`- Kernel: runtime revision ${kernel.revision}, version ${kernel.version}${commit}; scheduler ${code(scheduler.id)}, revision ${scheduler.revision}`,
		...(kernel.dirty === true ? [DIRTY] : []),
		`- Manifest: ${code(facts.manifestHash)}`,
		`- Signed head: ${code(facts.head)}`,
		...human(calls),
		...(facts.base === undefined ? [] : [`- Resumed from run ${code(facts.base.run)} after tick ${facts.base.tick}, snapshot ${code(facts.base.snapshotHash)}: the facts count from the last \`run_resumed\`, the base's part stands apart`]),
		...(facts.paused === true ? [PAUSED] : []),
	];
}

// P494: a run on a dirty tree says so; its commit does not hold the whole code of the run.
const DIRTY = "- Dirty tree: `kernel.dirty: true`, the source tree had changes that were not committed, so the commit does not hold the whole code of the run";
// P488: a paused run's facts are those up to the pause.
const PAUSED = "- Paused: the log ends at a signed head without `run_ended`; the facts are up to the pause";

// P452: the header says so when the Human Hand called a tool.
function human(calls: number): readonly string[] {
	return calls > 0 ? [`- Human-influenced: ${String(calls)} tool ${calls === 1 ? "call" : "calls"} of \`human\``] : [];
}

const perActor = (key: string): boolean => Object.values(ACTOR_KEYS).some((prefix) => key.startsWith(prefix));

// The actors with their drivers and models, what each asked and cost, its turns without a call, and the spend of
// the run. An actor without a model reads "absent" in the two columns of the model: it could not ask.
function spend(facts: RunFacts, manifest: RunManifest): readonly string[] {
	const { values } = facts;
	const rows = manifest.actors.map((actor) => [
		code(actor.id),
		code(actor.driver),
		actor.model === undefined ? "none" : `${actor.model.provider} ${code(actor.model.resolvedId)}`,
		shown(values[`${ACTOR_KEYS.requests}${actor.id}`]),
		shown(values[`${ACTOR_KEYS.costUsd}${actor.id}`]),
		shown(values[`${ACTOR_KEYS.noCalls}${actor.id}`]),
	]);
	return [...table(["Actor", "Driver", "Model", "Requests", "Cost (USD)", "Turns without a call"], rows, "no actor"), "", `The run: ${shown(values["models.costUsd"])} USD in ${shown(values["models.requests"])} model requests.`];
}

// P444: one line for every mechanic of the run whose metrics the report could not compute, ahead of the table.
const absentLines = (plugins: readonly string[]): readonly string[] => plugins.flatMap((plugin) => [`metrics absent: ${plugin}`, ""]);

// One row per key, in their order, without the keys per actor.
function factTable(values: RunFacts["values"], titles: Titles): readonly string[] {
	const rows = Object.entries(values).filter(([key]) => !perActor(key)).map(([key, value]) => {
		const { title, unit } = titleOf(key, titles);
		return [code(key), title, unit ?? "", shown(value)];
	});
	return table(["Key", "Title", "Unit", "Value"], rows, "no value");
}

/**
 * The heading of the section of a resumed run's report that holds its base's part (P493).
 *
 * @public
 */
export const BASE_HEADING = "## The base's part (before the resume)";

// P493: what the lines before the last `run_resumed` count, apart from the facts of the run.
function baseLines(base: BaseFacts, titles: Titles): readonly string[] {
	const { values } = base;
	return [
		`The lines of the log before the last \`run_resumed\`: run ${code(base.run)} up to tick ${base.tick}. None of them is counted above.`,
		"",
		...factTable(values, titles),
		"",
		`The base: ${shown(values["models.costUsd"])} USD in ${shown(values["models.requests"])} model requests.`,
	];
}

/**
 * What a run report knows beside the facts and the titles.
 *
 * @public
 */
export interface RunReportOptions {
	/** The plugin ids of the run's mechanics whose metric definitions were not found: each gets a line "metrics absent: <id>" at the head of the facts table. */
	readonly metricsAbsent?: readonly string[];
}

/**
 * Renders `REPORT.md` of one run: header, result, the facts table, the refusal table, the spend, and the section
 * of the loophole candidates.
 *
 * @remarks
 * Pure: facts and manifest in, Markdown out. The facts table has one row per key of `facts.values`, in their
 * order, without the keys per actor ({@link ACTOR_KEYS}): those stand in the table of the spend, one row per
 * actor. A value that was not measured is printed as the word `absent`, never as a zero. A run whose Human Hand
 * called a tool (`run.humanToolCalls` above 0, in the run or its base's part) has a header line "Human-influenced"
 * with the count. A manifest with `kernel.dirty: true` gives a header line "Dirty tree" (P494). A paused run
 * (`facts.paused`) has a header line "Paused", its result says so and its facts are headed "up to the pause"
 * (P488). A resumed run read from its resume (`facts.base`) has a header line that names the base, and its base's
 * part stands apart in a section {@link BASE_HEADING} before the last (P493). The report ends with
 * {@link LOOPHOLE_HEADING} and {@link NO_LOOPHOLE_PART}.
 *
 * @param facts - The facts of the run, as `readRun` computed them.
 * @param manifest - The manifest of the run.
 * @param titles - Title and unit by key (`<plugin id>.<metric id>`), from the metric definitions of the loaded
 * mechanics. A key without one gets the lab's title for its own keys, or the key itself.
 * @param options - The mechanics whose metrics are absent from the facts.
 * @returns The Markdown text, ending with a line break.
 * @example
 * ```ts
 * const facts = readRun(directory, metrics);
 * writeFileSync(join(directory, "REPORT.md"), renderRunReport(facts, manifest, { "quarry.tablePoints": { title: "Table points", unit: "points" } }));
 * ```
 *
 * @public
 */
export function renderRunReport(facts: RunFacts, manifest: RunManifest, titles: Readonly<Record<string, { readonly title: string; readonly unit?: string }>>, options: RunReportOptions = {}): string {
	const entries = Object.entries(facts.values);
	const refusals = entries.filter(([key]) => key.startsWith(REFUSALS)).map(([key, value]) => [code(key.slice(REFUSALS.length)), shown(value)]);
	const { reason, limit, tick } = facts.end;
	const result = facts.paused === true ? `The run is paused after tick ${tick}: the facts are up to the pause.` : `The run ended at tick ${tick}: ${reason}${limit === undefined ? "" : ` (${limit})`}.`;
	return [
		...header(facts, manifest),
		...section("## Result", [result]),
		...section(facts.paused === true ? "## Facts (up to the pause)" : "## Facts", [...absentLines(options.metricsAbsent ?? []), ...factTable(facts.values, titles)]),
		...section("## Refusals", table(["Code", "Count"], refusals, "none")),
		...section("## Spend", spend(facts, manifest)),
		...(facts.base === undefined ? [] : section(BASE_HEADING, baseLines(facts.base, titles))),
		...section(LOOPHOLE_HEADING, [NO_LOOPHOLE_PART]),
		"",
	].join("\n");
}
