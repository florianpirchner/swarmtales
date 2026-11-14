// SPDX-License-Identifier: Apache-2.0
/**
 * The state file of an experiment (`experiment.json`): the spec and the record of every run played so far. A record
 * names its run folder relative to the experiment's folder, so a folder that was moved is continued and analysed.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { type RunManifest, RunManifestSchema } from "@swarmtales/contracts";
import { MANIFEST_FILE } from "@swarmtales/runlog";
import { type Static, Type } from "typebox";
import { badFile } from "../errors.ts";
import { ExperimentSpecSchema, parseLabFile } from "./spec.ts";

/** The name of the state file in the experiment's folder. */
export const STATE_FILE = "experiment.json";

const Planned = Type.Object(
	{
		index: Type.Integer({ minimum: 0, description: "The place in the plan" }),
		arm: Type.String({ description: "The arm" }),
		seed: Type.Integer({ minimum: 0, description: "The seed" }),
		replicate: Type.Integer({ minimum: 0, description: "The replicate" }),
		params: Type.Record(Type.String(), Type.Unknown({ description: "The value of one param" }), { description: "The param overrides of the arm" }),
	},
	{ additionalProperties: false, description: "A planned run" },
);
const Played = Type.Object(
	{
		planned: Planned,
		directory: Type.String({ description: "The run folder, relative to the experiment's folder (absolute in a file of an earlier version); empty when the player failed before it named one" }),
		status: Type.Union([Type.Literal("included"), Type.Literal("excluded"), Type.Literal("stopped")], { description: "Whether the run counts: included, excluded by a rule of the spec, or stopped (failed, unreadable or not comparable)" }),
		reason: Type.Optional(Type.String({ description: "The exclusion rule, or why the run is stopped" })),
		replaces: Type.Optional(Type.Integer({ minimum: 0, description: "The plan index of the excluded run this one replaces" })),
		costUsd: Type.Number({ minimum: 0, description: "What the run cost; its whole cap when the player failed" }),
	},
	{ additionalProperties: false, description: "The record of one played run" },
);

/**
 * The schema of the state file `experiment.json` of an experiment's folder.
 *
 * @public
 */
export const ExperimentStateSchema = Type.Object(
	{
		spec: ExperimentSpecSchema,
		specHash: Type.String({ description: "The sha256 of the canonical JSON of the spec without `budget` and `concurrency`" }),
		runs: Type.Array(Played, { description: "The records, in the order the runs ended" }),
		spentUsd: Type.Number({ minimum: 0, description: "The sum of the costs of the records" }),
		code: Type.Optional(
			Type.Object(
				{ commit: Type.String({ description: "The commit of the platform's source tree, or `unknown`" }), kernelRevision: Type.Integer({ minimum: 1, description: "The runtime revision of the kernel" }) },
				{ additionalProperties: false, description: "The code that played the first run that was read" },
			),
		),
	},
	{ additionalProperties: false, description: "The state of an experiment: its spec and the record of every run played so far" },
);

/**
 * The record of one played run.
 *
 * @public
 */
export type RunRecord = Readonly<Static<typeof Played>>;

/**
 * The state of an experiment.
 *
 * @public
 */
export type ExperimentState = Readonly<Static<typeof ExperimentStateSchema>>;

function parsed(directory: string, name: string): unknown {
	try {
		const value: unknown = JSON.parse(readFileSync(join(directory, name), "utf8"));
		return value;
	} catch {
		throw badFile("file", "it cannot be read as JSON", join(directory, name));
	}
}

/**
 * Reads the manifest of a run folder.
 *
 * @param directory - The run folder.
 * @returns The manifest.
 * @throws LabError `SWT-E001` when the file is not JSON or does not match the manifest's schema.
 */
export function manifestOf(directory: string): RunManifest {
	return parseLabFile(RunManifestSchema, parsed(directory, MANIFEST_FILE), "run manifest", join(directory, MANIFEST_FILE));
}

/**
 * Reads the state file of an experiment's folder.
 *
 * @param directory - The experiment's folder.
 * @returns The state, or `undefined` when the folder has no state file yet.
 * @throws LabError `SWT-E001` when the file is not JSON or does not match `ExperimentStateSchema`.
 * @public
 */
export function readExperimentState(directory: string): ExperimentState | undefined {
	if (!existsSync(join(directory, STATE_FILE))) return undefined;
	return parseLabFile(ExperimentStateSchema, parsed(directory, STATE_FILE), "experiment state", join(directory, STATE_FILE));
}

/**
 * The run folder of a record: its `directory` resolved against the experiment's folder.
 *
 * @remarks
 * A state file written before the paths were relative holds absolute ones; they read as they are. When such a path
 * is gone (the experiment's folder was moved), the folder of the same name inside the experiment's folder is taken.
 *
 * @param directory - The experiment's folder.
 * @param recorded - The `directory` of a run record.
 * @returns The absolute path of the run folder.
 * @example
 * ```ts
 * const facts = state.runs.filter((run) => run.status !== "stopped").map((run) => readRun(resolveRunFolder(directory, run.directory), metrics));
 * ```
 *
 * @public
 */
export function resolveRunFolder(directory: string, recorded: string): string {
	const folder = resolve(directory, recorded);
	const beside = join(directory, basename(recorded));
	return !existsSync(folder) && existsSync(beside) ? resolve(beside) : folder;
}
