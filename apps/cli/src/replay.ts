// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** `swt replay`: plays a run folder again from its log alone (`replay` of the testkit) and says whether the log comes out the same. */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EVENTS_FILE, jsonHash } from "@swarmtales/chain";
import { redactSecrets, RunManifestSchema, StoredEnvelopeSchema, SwtError, type Envelope, type EventSink, type KernelPorts, type RecordSource, type RunManifest, type SwtIssue } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS, REVIEW_RECORDS } from "@swarmtales/engine";
import { chargeOf, parseLabFile } from "@swarmtales/lab";
import { createCostMeter, DIRECTOR_MODEL_RECORDS, RESIDENT_RECORDS } from "@swarmtales/models";
import { MANIFEST_FILE, readSnapshotFile, SNAPSHOTS_FOLDER, verifyRun, type SessionSnapshotFile } from "@swarmtales/runlog";
import { replay, type ReplayInput, type ReplayResult } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { badUsage } from "./errors.ts";
import type { CliIo } from "./main.ts";
import { RUN_RECORDS } from "./records.ts";
import { jsonFile } from "./report.ts";
import { resolveFile } from "./run.ts";

const Events = Type.Array(StoredEnvelopeSchema, { description: "The lines of `events.jsonl`" });
const count = (description: string) => Type.Number({ description });
const Usage = Type.Object(
	{ input: count("Input tokens"), output: count("Output tokens"), cacheRead: count("Tokens read from the cache"), cacheWrite: count("Tokens written to the cache"), costUsd: count("The cost in USD") },
	{ description: "What the replay meter counts of a `response` record" },
);

const Closed = Type.Object({ reason: Type.String({ description: "What could not be counted" }) }, { description: "What the replay meter reads of a `cost_unknown` record" });

// The cost cap of a live run as the manifest holds it: a meter that a sink feeds with the replayed answers, as the drivers fed it in the run.
function capOf(manifest: RunManifest): Pick<KernelPorts, "limits" | "sinks"> {
	const cap = manifest.limits.budgetUsd;
	if (cap === undefined || cap <= 0) return {};
	// A run of an older runtime revision is metered by the rule it was played with.
	const meter = createCostMeter(cap, { revision: manifest.kernel.revision });
	const answers = new Set([RESIDENT_RECORDS.id, DIRECTOR_MODEL_RECORDS.id]);
	// A review's answer is counted under the Director that answered, as its asker counted it in the run (P482).
	const charge = chargeOf(manifest);
	const sink: EventSink = {
		write(event) {
			const payer = charge(event);
			if (!answers.has(event.source)) return;
			if (event.type === "response") meter.add(payer, Parse(Usage, event.payload));
			// Runtime revision 6: the line where the run's meter closed, an answer whose cost is not known.
			if (event.type === "cost_unknown") meter.close(Parse(Closed, event.payload).reason);
		},
	};
	return { limits: [meter.limit], sinks: [sink] };
}

/**
 * What `swt replay` was asked for.
 *
 * @public
 */
export interface ReplayRunInput {
	/** The run folder, absolute or relative to the current directory. */
	readonly directory: string;
	/** `--game`: the game file of the run; the manifest names the game by hash only. */
	readonly game?: string;
	/** `--json`: print the result as one JSON line. */
	readonly json: boolean;
	/** `--previous`: the folder of the run this one resumed from; the replay starts at its snapshot. From the start of the log when absent. */
	readonly previous?: string;
}

/**
 * `SWT-C031`: the replayed log of a run folder differs from its log.
 *
 * @param input - Where and how the logs differ.
 * @param input.file - The log file of the run folder.
 * @param input.line - The first line that differs, counted from 1.
 * @param input.difference - What the log has there and what the replay wrote, as one sentence without a full stop.
 * @param input.otherGame - True when the game file resolves to another hash than the manifest names.
 * @param input.expected - The line of the log, without its stamp; undefined where the log has ended.
 * @param input.got - The line the replay wrote; undefined where the replay has ended.
 * @returns The issue.
 *
 * @public
 */
export function replayDiffers(input: { readonly file: string; readonly line: number; readonly difference: string; readonly otherGame: boolean; readonly expected?: unknown; readonly got?: unknown }): SwtIssue {
	return {
		code: "SWT-C031",
		summary: input.difference,
		where: { file: input.file, line: input.line },
		why: "A replay repeats the tool calls and the records of a log; with the game of the run and the code of the run every other line comes out the same.",
		fix: input.otherGame
			? "The game file resolves to another game than the manifest names (`game.hash`): give the game file of the run with `--game`, at the state the run was played with."
			: "The game file is the run's, so a mechanic, the scheduler or the kernel changed since the run: replay with the commit the manifest names (`kernel.commit`).",
		details: { line: input.line, expected: input.expected ?? null, got: input.got ?? null },
	};
}

// The record sources the run's assembly declared: those of the drivers the manifest names, and the marker of a resumed run.
function recordsOf(manifest: RunManifest): readonly RecordSource[] {
	const live = manifest.actors.some((actor) => actor.model !== undefined);
	return [...(live ? [RESIDENT_RECORDS, DIRECTOR_RECORDS, DIRECTOR_MODEL_RECORDS] : [DIRECTOR_RECORDS]), REVIEW_RECORDS, ...(manifest.resumedFrom === undefined ? [] : [RUN_RECORDS])];
}

// The lines of the log; undefined when the file is missing or a line is no event.
function logOf(file: string): readonly Envelope[] | undefined {
	try {
		const lines = readFileSync(file, "utf8").trimEnd().split("\n");
		return Parse(Events, lines.map((line): unknown => JSON.parse(line)));
	} catch {
		return undefined;
	}
}

// Replays the log of a folder that verifies. A crashed run has no signed head, so it does not verify: `SWT-T005`
// says why it cannot be replayed, before the issues of the chain.
async function verified(directory: string, file: string, again: (log: readonly Envelope[]) => Promise<ReplayResult>, previous?: string): Promise<ReplayResult> {
	const verdict = verifyRun(directory, previous === undefined ? {} : { previous });
	const log = logOf(file);
	if (log === undefined) throw new SwtError(verdict.ok ? badUsage({ problem: `the log ${file} cannot be read` }) : verdict.issues);
	const result = await again(log).catch((error: unknown) => {
		throw verdict.ok || (error instanceof SwtError && error.issues[0]?.code === "SWT-T005") ? error : new SwtError(verdict.issues);
	});
	if (!verdict.ok) throw new SwtError(verdict.issues);
	return result;
}

// The snapshot of the folder `previous` whose hash the manifest of the resumed run names; `SWT-C003` when there is none.
async function baseSnapshot(manifest: RunManifest, previous: string): Promise<SessionSnapshotFile> {
	const hash = manifest.resumedFrom?.snapshotHash;
	const refuse = (problem: string): SwtError => new SwtError(badUsage({ problem }));
	if (hash === undefined) throw refuse(`\`--previous\` is for a resumed run, and the run "${manifest.run.id}" did not resume`);
	let names: readonly string[] = [];
	try {
		names = readdirSync(join(previous, SNAPSHOTS_FOLDER)).filter((name) => name.endsWith(".json"));
	} catch {
		// No folder is no snapshot.
	}
	for (const name of names) {
		const found = await readSnapshotFile(join(previous, SNAPSHOTS_FOLDER, name)).catch(() => undefined);
		if (found !== undefined && jsonHash(found) === hash) return found;
	}
	throw refuse(`the folder ${previous} holds no snapshot with the hash the run "${manifest.run.id}" resumed from`);
}

// Where the replay starts: at the start of the log, or at the snapshot of the folder a resumed run went on from.
async function startOf(manifest: RunManifest, previous: string | undefined): Promise<{ readonly previous?: string; readonly from: (log: readonly Envelope[]) => Pick<ReplayInput, "resume"> }> {
	if (previous === undefined) return { from: () => ({}) };
	const base = await baseSnapshot(manifest, previous);
	return { previous, from: (log) => ({ resume: { snapshot: base.snapshot, log: log.slice(0, base.checkpoint.lines) } }) };
}

/**
 * Replays a run folder. The folder must verify; a log that stops inside a tick (a crashed run) is `SWT-T005`. Its game file is resolved with the seed and the params of the
 * manifest and with the record sources the manifest names: those of a live run's drivers when an actor has a
 * model, the Director's, and the marker `run_resumed` for a resumed run. The cost cap of the manifest
 * (`limits.budgetUsd`) is metered again from the replayed `response` records and closed at a `cost_unknown` record,
 * so a run that ended at its cap, or whose meter closed, replays equal. Prints `equal, <n> lines`, or with `json`
 * `{ "equal": true, "lines": n }`. A log that differs prints its line and the replay's line, then `SWT-C031`.
 * With `previous`, a resumed run is replayed from the snapshot of that folder it resumed from (its hash is in the
 * manifest) and the lines of its own log up to the snapshot's checkpoint; the continuity of the two folders must
 * hold. The meter of the cap then counts from the resume, as the resumed live run's did.
 *
 * @param input - The run folder, the game file and whether to print JSON.
 * @param io - The current directory and the two outputs.
 * @returns The exit code 0: the replayed log is equal.
 * @throws SwtError `SWT-C031` when the logs differ; `SWT-T005` for a log that stops inside a tick and `SWT-T004`
 * for an input inside a tick outside an activation; `SWT-C003` without `--game`, and for a `--previous` of a run that
 * did not resume or of a folder without its snapshot; `SWT-E001` for a missing or
 * unreadable manifest; the issues of a folder that does not verify; and what `resolveFile` throws. The command
 * exits with 1 then.
 * @example
 * ```ts
 * process.exitCode = await replayRun({ directory: "runs/city-slice-001", game: "games/city-slice/game.ts", json: false }, io);
 * ```
 *
 * @public
 */
export async function replayRun(input: ReplayRunInput, io: CliIo): Promise<number> {
	const directory = resolve(io.cwd, input.directory);
	if (input.game === undefined) throw new SwtError(badUsage({ problem: "`swt replay` needs `--game <game file>`: the manifest names the game by hash, not by path" }));
	const manifest = parseLabFile(RunManifestSchema, jsonFile(join(directory, MANIFEST_FILE)), "run manifest", join(directory, MANIFEST_FILE));
	const records = recordsOf(manifest);
	const params = Object.keys(manifest.game.params).length === 0 ? {} : { params: manifest.game.params };
	const { game } = await resolveFile({ file: input.game, seed: manifest.seed, ...params }, io, records);
	const file = join(directory, EVENTS_FILE);
	const { previous, from } = await startOf(manifest, input.previous === undefined ? undefined : resolve(io.cwd, input.previous));
	const again = await verified(directory, file, (log) => replay({ game, log, records, ports: capOf(manifest), ...from(log) }), previous);
	const { firstDifference: first, issue } = again;
	if (first === undefined || issue === undefined) {
		io.out(input.json ? JSON.stringify({ equal: true, lines: again.log.length }) : `equal, ${String(again.log.length)} lines`);
		return 0;
	}
	if (!input.json) for (const [name, value] of [["log", first.expected], ["replay", first.got]]) io.err(redactSecrets(`${String(name)}: ${value === undefined ? "(ended)" : JSON.stringify(value)}`));
	throw new SwtError(replayDiffers({ file, line: first.line, difference: issue.summary, otherGame: game.definition.game.hash !== manifest.game.hash, expected: first.expected, got: first.got }));
}
