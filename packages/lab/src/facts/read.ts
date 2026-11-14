// SPDX-License-Identifier: Apache-2.0
/**
 * Reading a run folder into the facts of the run. The folder is verified with `verifyRun` of the run log first:
 * facts are read only from a finished run whose log verifies.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EVENTS_FILE, jsonHash } from "@swarmtales/chain";
import { type Envelope, type MetricDefinition, type RunManifest, RunManifestSchema, StoredEnvelopeSchema } from "@swarmtales/contracts";
import { MANIFEST_FILE, verifyRun } from "@swarmtales/runlog";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { badRunFolder } from "../errors.ts";
import { factsOf, type RunFacts } from "./facts.ts";

const Ended = Type.Object({ reason: Type.String({ description: "Why the run ended" }) }, { description: "What the lab reads of a `run_ended` payload" });
const Limit = Type.Object({ limit: Type.String({ description: "The id of the limit" }) }, { description: "What the lab reads of a `limit_reached` payload" });

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

// The end as the log says it: the kernel's `run_ended`, and the last `limit_reached` when a limit ended the run.
function endOf(directory: string, events: readonly Envelope[]): RunFacts["end"] {
	const last = events.at(-1);
	if (last?.type !== "run_ended" || !Check(Ended, last.payload)) throw badRunFolder(directory, "the log does not end with a `run_ended` that names its reason");
	const limit = last.payload.reason === "limit" ? events.findLast((event) => event.source === "kernel" && event.type === "limit_reached")?.payload : undefined;
	return { reason: last.payload.reason, ...(Check(Limit, limit) ? { limit: limit.limit } : {}), tick: last.tick };
}

/**
 * Reads a run folder: verifies it with `verifyRun` of the run log, parses the manifest and the log, and computes
 * every metric and every generic key (see {@link factsOf}).
 *
 * @param directory - The run folder, with `events.jsonl`, `events.chain.jsonl`, `run.pub` and `manifest.json`.
 * @param metrics - The metric definitions by plugin id, as the heads of the installed mechanics declare them.
 * @returns The facts of the run.
 * @throws SwtError `SWT-E006` when the folder does not verify (the message names the first issue of the verdict),
 * when the run is unfinished, or when a file of it is not what its schema says.
 * @example
 * ```ts
 * const facts = readRun("runs/quarry-014", { "draft-rounds": draftRounds.definition.head.metrics });
 * console.log(facts.end.reason, facts.values["draft-rounds.tablePoints"]);
 * ```
 *
 * @public
 */
export function readRun(directory: string, metrics: Readonly<Record<string, readonly MetricDefinition[]>>): RunFacts {
	const verdict = verifyRun(directory);
	const first = verdict.issues[0];
	if (first !== undefined) throw badRunFolder(directory, `the run does not verify (${verdict.issues.length} issues, the first: ${first.code} ${first.summary})`);
	if (!verdict.finished || verdict.head === undefined) throw badRunFolder(directory, "the run is unfinished: its log does not end with `run_ended` under a signed head");
	const manifest = manifestOf(directory);
	const events = eventsOf(directory);
	return {
		run: manifest.run.id,
		manifestHash: jsonHash(manifest),
		head: verdict.head,
		game: manifest.game.id,
		seed: manifest.seed,
		replicate: manifest.replicate,
		...(manifest.experiment === undefined ? {} : { arm: manifest.experiment.arm }),
		end: endOf(directory, events),
		values: factsOf(manifest, events, metrics),
	};
}
