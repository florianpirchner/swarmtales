// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Reading a run folder into the facts of the run. The folder is verified with `verifyRun` of the run log first:
 * facts are read only from a run whose log verifies, by default only from a finished one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EVENTS_FILE, jsonHash } from "@swarmtales/chain";
import { type Envelope, type MetricDefinition, type RunManifest, RunManifestSchema, StoredEnvelopeSchema } from "@swarmtales/contracts";
import { MANIFEST_FILE, verifyRun } from "@swarmtales/runlog";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { badRunFolder } from "../errors.ts";
import { type BaseFacts, factsOf, type RunFacts } from "./facts.ts";

const Ended = Type.Object({ reason: Type.String({ description: "Why the run ended" }) }, { description: "What the lab reads of a `run_ended` payload" });
const Limit = Type.Object({ limit: Type.String({ description: "The id of the limit" }) }, { description: "What the lab reads of a `limit_reached` payload" });
const Marker = Type.Object(
	{
		from: Type.String({ description: "The run the snapshot was taken from" }),
		tick: Type.Integer({ minimum: 0, description: "The finished ticks the run goes on from" }),
		snapshotHash: Type.String({ description: "The sha256 of the snapshot file" }),
	},
	{ description: "What the lab reads of the marker `run_resumed`" },
);
/** The record source of the marker a resumed run writes (`RUN_RECORDS.id` of the command line, which the lab may not import). */
const RESUME = "@swarmtales/cli/run";

type Metrics = Readonly<Record<string, readonly MetricDefinition[]>>;

/**
 * How {@link readRun} reads a run beside its default.
 *
 * @public
 */
export interface ReadRunOptions {
	/** True: a run that stopped at a signed head without `run_ended` (paused, or stopped after `--ticks`) is read too; its facts are up to the pause (P488). */
	readonly paused?: boolean;
	/** True: the values of a resumed run count from its last `run_resumed`; the lines before it are its base's part, in `base` (P493). */
	readonly fromResume?: boolean;
}

function json(directory: string, name: string, text: string): unknown {
	try {
		const value: unknown = JSON.parse(text);
		return value;
	} catch {
		throw badRunFolder(directory, `${name} holds a line that is not JSON`);
	}
}

function manifestOf(directory: string): RunManifest {
	const value = json(directory, MANIFEST_FILE, readFileSync(join(directory, MANIFEST_FILE), "utf8"));
	if (!Check(RunManifestSchema, value)) throw badRunFolder(directory, `${MANIFEST_FILE} is not a run manifest`);
	return value;
}

function eventsOf(directory: string): readonly Envelope[] {
	const lines = readFileSync(join(directory, EVENTS_FILE), "utf8").split("\n").filter((line) => line !== "");
	return lines.map((line, index) => {
		const value = json(directory, EVENTS_FILE, line);
		if (!Check(StoredEnvelopeSchema, value)) throw badRunFolder(directory, `line ${index + 1} of ${EVENTS_FILE} is not a stored envelope`);
		return value;
	});
}

// The end as the log says it: the kernel's `run_ended`, and the last `limit_reached` when a limit ended the run. A
// paused run has none: its end is `paused` after the ticks the kernel started.
function endOf(directory: string, events: readonly Envelope[], paused: boolean): RunFacts["end"] {
	if (paused) return { reason: "paused", tick: events.filter((event) => event.source === "kernel" && event.type === "tick_started").length };
	const last = events.at(-1);
	if (last?.type !== "run_ended" || !Check(Ended, last.payload)) throw badRunFolder(directory, "the log does not end with a `run_ended` that names its reason");
	const limit = last.payload.reason === "limit" ? events.findLast((event) => event.source === "kernel" && event.type === "limit_reached")?.payload : undefined;
	return { reason: last.payload.reason, ...(Check(Limit, limit) ? { limit: limit.limit } : {}), tick: last.tick };
}

// The base's part of a resumed run: the lines before its last marker `run_resumed`; the values count the lines after.
function split(manifest: RunManifest, events: readonly Envelope[], metrics: Metrics): Pick<RunFacts, "values" | "base"> {
	const at = events.findLastIndex((event) => event.source === RESUME && event.type === "run_resumed");
	const marker = events[at]?.payload;
	if (!Check(Marker, marker)) return { values: factsOf(manifest, events, metrics) };
	const base: BaseFacts = { run: marker.from, tick: marker.tick, snapshotHash: marker.snapshotHash, values: factsOf(manifest, events.slice(0, at), metrics) };
	return { values: factsOf(manifest, events.slice(at + 1), metrics), base };
}

/**
 * Reads a run folder: verifies it with `verifyRun` of the run log, parses the manifest and the log, and computes
 * every metric and every generic key (see {@link factsOf}).
 *
 * @remarks
 * By default the run must be finished, and its values count the whole log. With `paused`, a run that stopped at a
 * signed head without `run_ended` is read too: `paused` is set, and `end` is `{ reason: "paused", tick }` with the
 * ticks the kernel started. With `fromResume`, the values of a resumed run count the lines after its last marker
 * `run_resumed`, and `base` holds the values of the lines before it, with the run, tick and snapshot the marker names.
 *
 * @param directory - The run folder, with `events.jsonl`, `events.chain.jsonl`, `run.pub` and `manifest.json`.
 * @param metrics - The metric definitions by plugin id, as the heads of the installed mechanics declare them.
 * @param options - Whether a paused run is read, and whether a resumed run counts from its resume.
 * @returns The facts of the run.
 * @throws SwtError `SWT-E006` when the folder does not verify (the message names the first issue of the verdict),
 * when the run is unfinished (with `paused`: when its log has no signed head), or when a file of it is not what its
 * schema says.
 * @example
 * ```ts
 * const facts = readRun("runs/quarry-014", { "quarry": draftRounds.definition.head.metrics });
 * console.log(facts.end.reason, facts.values["quarry.tablePoints"]);
 * const act = readRun("runs/city-002", metrics, { paused: true, fromResume: true });
 * console.log(act.base?.values["run.ticks"], act.values["run.ticks"]);
 * ```
 *
 * @public
 */
export function readRun(directory: string, metrics: Readonly<Record<string, readonly MetricDefinition[]>>, options: ReadRunOptions = {}): RunFacts {
	const verdict = verifyRun(directory);
	const first = verdict.issues[0];
	if (first !== undefined) throw badRunFolder(directory, `the run does not verify (${verdict.issues.length} issues, the first: ${first.code} ${first.summary})`);
	if ((!verdict.finished && options.paused !== true) || verdict.head === undefined) throw badRunFolder(directory, "the run is unfinished: its log does not end with `run_ended` under a signed head");
	const manifest = manifestOf(directory);
	const events = eventsOf(directory);
	const paused = !verdict.finished;
	return {
		run: manifest.run.id,
		manifestHash: jsonHash(manifest),
		head: verdict.head,
		game: manifest.game.id,
		seed: manifest.seed,
		replicate: manifest.replicate,
		...(manifest.experiment === undefined ? {} : { arm: manifest.experiment.arm }),
		...(paused ? { paused } : {}),
		end: endOf(directory, events, paused),
		...(options.fromResume === true ? split(manifest, events, metrics) : { values: factsOf(manifest, events, metrics) }),
	};
}
