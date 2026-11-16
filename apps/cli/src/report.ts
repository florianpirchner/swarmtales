// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt report`: the computed report of one run, finished or paused. The facts are read from the verified run folder with the
 * metric definitions of the game's mechanics; `REPORT.md` is a new file of the folder, so the folder is scanned
 * for a held key value after it is written.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatIssue, RunManifestSchema, type RunManifest } from "@swarmtales/contracts";
import { parseLabFile, readRun, renderRunReport, type MetricTable } from "@swarmtales/lab";
import { createKeyBroker } from "@swarmtales/models";
import { MANIFEST_FILE } from "@swarmtales/runlog";
import type { MechanicDefinition } from "@swarmtales/sdk";
import { readEnv } from "./env.ts";
import { installedPackages, packageFilesFor } from "./installed.ts";
import { scanFolder } from "./leak-scan.ts";
import type { CliIo } from "./main.ts";
import { resolveFile } from "./run.ts";

const PACKAGE_FILE = fileURLToPath(new URL("../package.json", import.meta.url));

/**
 * The name of the report in a run folder.
 *
 * @public
 */
export const REPORT_FILE = "REPORT.md";

/**
 * What `swt report` was asked for.
 *
 * @public
 */
export interface ReportInput {
	/** The run folder, absolute or relative to the current directory. */
	readonly directory: string;
	/** `--game`: the game file of the run, for the metrics of its mechanics; the installed table when absent. */
	readonly game?: string;
}

/**
 * Reads a JSON file for a parser of the lab.
 *
 * @param file - The absolute path of the file.
 * @returns The parsed value, or `undefined` when the file is missing or no JSON; the parser then refuses it.
 *
 * @public
 */
export function jsonFile(file: string): unknown {
	try {
		const value: unknown = JSON.parse(readFileSync(file, "utf8"));
		return value;
	} catch {
		return undefined;
	}
}

/**
 * The metric definitions of mechanics by plugin id, as `readRun` and `runExperiment` of the lab take them.
 *
 * @param mechanics - The definitions of the mechanics.
 * @returns The table of `definition.head.metrics` by mechanic id.
 *
 * @public
 */
export function metricTable(mechanics: readonly MechanicDefinition[]): MetricTable {
	return Object.fromEntries(mechanics.map((mechanic) => [mechanic.id, mechanic.head.metrics]));
}

// The plugins the SDK adds to a game (`roster`, `directors`): no mechanic definition, and no metric.
const SDK = "@swarmtales/sdk";

// The mechanics the run's metrics come from: of its game file, resolved with the seed and the params of the
// manifest, or the installed ones that the manifest's plugin ids name (P444). A plugin of the run that neither
// gives is named as absent.
async function mechanicsOf(input: ReportInput, manifest: RunManifest, io: CliIo): Promise<{ readonly mechanics: readonly MechanicDefinition[]; readonly absent: readonly string[] }> {
	const plugins = manifest.plugins.filter((plugin) => plugin.package !== SDK).map((plugin) => plugin.id);
	let mechanics: readonly MechanicDefinition[];
	if (input.game === undefined) {
		const installed = new Map(Object.entries(io.installed ?? (await installedPackages(packageFilesFor(resolve(io.cwd, input.directory), PACKAGE_FILE))).mechanics));
		mechanics = plugins.flatMap((id) => installed.get(id) ?? []);
	} else {
		const params = Object.keys(manifest.game.params).length === 0 ? {} : { params: manifest.game.params };
		mechanics = (await resolveFile({ file: input.game, seed: manifest.seed, ...params }, io)).mechanics;
	}
	return { mechanics, absent: plugins.filter((id) => !mechanics.some((mechanic) => mechanic.id === id)) };
}

/**
 * Writes `REPORT.md` of a run folder: reads the run (`readRun` of the lab, which verifies the log first), renders
 * the report with the titles and units of the metrics, writes it through the redaction of the key broker and scans
 * the folder for a held key value. Without `--game` the mechanics are those of the installed table that the
 * plugin ids of the manifest name (the packages of the nearest `package.json` above the run folder, then of the
 * command line's own); a plugin of the run without a definition (neither in the table nor, with
 * `--game`, in the game) is named in a line "metrics absent: <id>" at the head of the facts table.
 *
 * A paused run (its log ends at a signed head without `run_ended`) gets a report too, its facts marked "up to the
 * pause" (P488). A resumed run is counted from its last `run_resumed`; the header names the base, and the base's
 * part stands apart in a section of its own (P493). A run on a dirty tree has a header line that names
 * `kernel.dirty: true` (P494).
 *
 * @param input - The run folder and, for a game whose mechanics are not installed with the command line, its game file.
 * @param io - The current directory, the two outputs, and for a test the installed table and the environment.
 * @returns The exit code: 0 the report is written, 4 a file of the folder holds a key value (`SWT-X030`; the marker file `LEAK` is written).
 * @throws SwtError `SWT-E001` for a missing or unreadable manifest, `SWT-E006` for a run that does not verify or
 * stopped at no signed head, and what `resolveFile` reports for `--game`. The command exits with 1 then.
 * @example
 * ```ts
 * process.exitCode = await report({ directory: "runs/quarry-001", game: "games/quarry/game.ts" }, io);
 * ```
 *
 * @public
 */
export async function report(input: ReportInput, io: CliIo): Promise<number> {
	const directory = resolve(io.cwd, input.directory);
	const broker = createKeyBroker(io.env ?? readEnv());
	const manifest = parseLabFile(RunManifestSchema, jsonFile(join(directory, MANIFEST_FILE)), "run manifest", join(directory, MANIFEST_FILE));
	const { mechanics, absent } = await mechanicsOf(input, manifest, io);
	const facts = readRun(directory, metricTable(mechanics), { paused: true, fromResume: true });
	const titles = Object.fromEntries(mechanics.flatMap((mechanic) => mechanic.head.metrics.map((metric) => [`${mechanic.id}.${metric.id}`, metric])));
	writeFileSync(join(directory, REPORT_FILE), broker.redact(renderRunReport(facts, manifest, titles, { metricsAbsent: absent })));
	const leak = scanFolder(directory, (text) => broker.leaks(text));
	for (const issue of leak) io.err(broker.redact(formatIssue(issue)));
	io.out(broker.redact(`report: ${join(relative(io.cwd, directory), REPORT_FILE)}`));
	return leak.length > 0 ? 4 : 0;
}
