// SPDX-License-Identifier: Apache-2.0
/**
 * `REPORT.md` of one run. Every number comes from the facts of the run; the only part a model will write is the
 * last section, and at this milestone nothing writes it.
 */
import type { RunManifest } from "@swarmtales/contracts";
import { ACTOR_KEYS, type RunFacts } from "../facts/facts.ts";
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
	const commit = kernel.commit === undefined ? "" : `, commit ${code(kernel.commit)}${kernel.dirty === true ? " with changes that are not committed" : ""}`;
	return [
		`# Run ${facts.run}`,
		"",
		`- Game: ${code(game.id)}${game.title === undefined ? "" : ` (${game.title})`}, params \`${JSON.stringify(game.params)}\``,
		`- Seed ${facts.seed}, replicate ${facts.replicate}${experiment === undefined ? "" : `, arm ${code(experiment.arm)} of experiment ${code(experiment.id)}`}`,
		`- Purpose: ${run.purpose}; started at ${run.startedAt}`,
		`- Kernel: runtime revision ${kernel.revision}, version ${kernel.version}${commit}; scheduler ${code(scheduler.id)}, revision ${scheduler.revision}`,
		`- Manifest: ${code(facts.manifestHash)}`,
		`- Signed head: ${code(facts.head)}`,
	];
}

const perActor = (key: string): boolean => key.startsWith(ACTOR_KEYS.requests) || key.startsWith(ACTOR_KEYS.costUsd);

// The actors with their drivers and models, what each asked and cost, and the spend of the run. An actor without
// a model reads "absent" in both columns: it could not ask.
function spend(facts: RunFacts, manifest: RunManifest): readonly string[] {
	const { values } = facts;
	const rows = manifest.actors.map((actor) => [
		code(actor.id),
		code(actor.driver),
		actor.model === undefined ? "none" : `${actor.model.provider} ${code(actor.model.resolvedId)}`,
		shown(values[`${ACTOR_KEYS.requests}${actor.id}`]),
		shown(values[`${ACTOR_KEYS.costUsd}${actor.id}`]),
	]);
	return [...table(["Actor", "Driver", "Model", "Requests", "Cost (USD)"], rows, "no actor"), "", `The run: ${shown(values["models.costUsd"])} USD in ${shown(values["models.requests"])} model requests.`];
}

/**
 * Renders `REPORT.md` of one run: header, result, the facts table, the refusal table, the spend, and the section
 * of the loophole candidates.
 *
 * @remarks
 * Pure: facts and manifest in, Markdown out. The facts table has one row per key of `facts.values`, in their
 * order, without the keys per actor (`models.requests.<actor id>`, `models.costUsd.<actor id>`): those stand in
 * the table of the spend, one row per actor. A value that was not measured is printed as the word `absent`, never as a zero. The report ends with
 * {@link LOOPHOLE_HEADING} and {@link NO_LOOPHOLE_PART}.
 *
 * @param facts - The facts of the run, as `readRun` computed them.
 * @param manifest - The manifest of the run.
 * @param titles - Title and unit by key (`<plugin id>.<metric id>`), from the metric definitions of the loaded
 * mechanics. A key without one gets the lab's title for its own keys, or the key itself.
 * @returns The Markdown text, ending with a line break.
 * @example
 * ```ts
 * const facts = readRun(directory, metrics);
 * writeFileSync(join(directory, "REPORT.md"), renderRunReport(facts, manifest, { "draft-rounds.tablePoints": { title: "Table points", unit: "points" } }));
 * ```
 *
 * @public
 */
export function renderRunReport(facts: RunFacts, manifest: RunManifest, titles: Readonly<Record<string, { readonly title: string; readonly unit?: string }>>): string {
	const entries = Object.entries(facts.values);
	const rows = entries.filter(([key]) => !perActor(key)).map(([key, value]) => {
		const { title, unit } = titleOf(key, titles);
		return [code(key), title, unit ?? "", shown(value)];
	});
	const refusals = entries.filter(([key]) => key.startsWith(REFUSALS)).map(([key, value]) => [code(key.slice(REFUSALS.length)), shown(value)]);
	const { reason, limit, tick } = facts.end;
	return [
		...header(facts, manifest),
		...section("## Result", [`The run ended at tick ${tick}: ${reason}${limit === undefined ? "" : ` (${limit})`}.`]),
		...section("## Facts", table(["Key", "Title", "Unit", "Value"], rows, "no value")),
		...section("## Refusals", table(["Code", "Count"], refusals, "none")),
		...section("## Spend", spend(facts, manifest)),
		...section(LOOPHOLE_HEADING, [NO_LOOPHOLE_PART]),
		"",
	].join("\n");
}
