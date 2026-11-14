// SPDX-License-Identifier: Apache-2.0
/**
 * `swt resume` (specification of M3, section 7.2): a fake run goes on from a snapshot file in a new run folder,
 * whose log starts with the lines of the run before and then the marker `run_resumed`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { EVENTS_FILE, jsonHash } from "@swarmtales/chain";
import { RunManifestSchema, StoredEnvelopeSchema, SwtError, type SwtIssue } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { MANIFEST_FILE, nextRunFolder, readSnapshotFile, SNAPSHOTS_FOLDER, verifyRun } from "@swarmtales/runlog";
import { Check, Parse } from "typebox/value";
import { badUsage } from "./errors.ts";
import { handOf } from "./hand.ts";
import type { CliIo } from "./main.ts";
import { RUN_RECORDS } from "./records.ts";
import { playFake, resolveFile, type Resumed, type RunInput } from "./run.ts";

const HUMAN = "human";

/**
 * What `swt resume` was asked for.
 *
 * @public
 */
export interface ResumeRunInput extends Pick<RunInput, "out" | "json" | "hand" | "snapshotAt"> {
	/** The folder of the run to resume, absolute or relative to the current directory. */
	readonly directory: string;
	/** `--game`: the game file of the run; the manifest names the game by hash only. */
	readonly game?: string;
	/** `--snapshot`: the snapshot file; the one with the highest tick in `<run>/snapshots/` when absent. */
	readonly snapshot?: string;
	/** `--ticks`: the number of finished ticks the loop stops at; the ticks of the game when absent. */
	readonly ticks?: number;
}

/**
 * `SWT-X008`: a run cannot be resumed: it was played by live models, or its folder holds no snapshot.
 *
 * @param input - What is wrong.
 * @param input.problem - What is wrong, as one sentence without a full stop.
 * @param input.file - The run folder.
 * @returns The issue.
 *
 * @public
 */
export function resumeRefused(input: { readonly problem: string; readonly file: string }): SwtIssue {
	return {
		code: "SWT-X008",
		summary: input.problem,
		why: "`swt resume` goes on from a snapshot file of a run with fake models. The drivers are built again, not restored; the contexts of live models are not in a snapshot, and a restart with empty contexts would be no resume.",
		fix: "Resume a run of `swt run --fake` that wrote a snapshot (`--snapshot-at <ticks>`, a `snapshot` line of `--hand`, or a paused stop), or name the file with `--snapshot`.",
		where: { file: input.file },
	};
}

// The snapshot file of the folder with the highest tick.
function latest(previous: string): string {
	const folder = join(previous, SNAPSHOTS_FOLDER);
	let names: readonly string[] = [];
	try {
		names = readdirSync(folder);
	} catch {
		// No folder is no snapshot.
	}
	const ticks = names.flatMap((name) => /^t(\d+)\.json$/.exec(name)?.[1] ?? []).map(Number);
	if (ticks.length === 0) throw new SwtError(resumeRefused({ problem: `the run folder ${previous} holds no snapshot to resume from`, file: previous }));
	return join(folder, `t${String(Math.max(...ticks))}.json`);
}

/**
 * Resumes a fake run. The folder of the run must verify. Its game file is resolved with the seed and the params of
 * the manifest; the snapshot must be of that run and that game. The new folder (`<game id>-<NNN>` under `out`, or
 * beside the resumed folder) starts with the lines of the previous log that the snapshot's checkpoint signed; then
 * comes the marker `run_resumed` of `RUN_RECORDS` (`{ from, snapshotHash, tick }`, actor `script`), then the run.
 *
 * The hand file is the one of the straight run: the lines that run applied before the snapshot are dropped (see
 * `handOf`). The fake driver draws from the basis of an activation, which every marker of the log moves by one; a
 * resumed run gives it the basis without the markers, so the residents play what they play in the straight run.
 *
 * @param input - The run folder, the game file, the snapshot, the ticks, and the flags `swt run` has too.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code, as `playFake` gives it: 0, 1, 2, or 3 for a run that is still open.
 * @throws SwtError The issues of a folder that does not verify; `SWT-X008` for a run of live models ("live resume
 * is M5"), a folder without a snapshot, and a hand the game cannot take; `SWT-C003` without `--game`; `SWT-L008` for
 * a snapshot that is none, or is of another run or another game than the game file; `SWT-L007` and `SWT-R021` from
 * the folder and the kernel; and what `resolveFile` throws. No run folder is written then.
 *
 * @public
 */
export async function resumeRun(input: ResumeRunInput, io: CliIo): Promise<number> {
	const previous = resolve(io.cwd, input.directory);
	const verdict = verifyRun(previous);
	if (!verdict.ok) throw new SwtError(verdict.issues);
	const manifest = Parse(RunManifestSchema, JSON.parse(readFileSync(join(previous, MANIFEST_FILE), "utf8")));
	if (manifest.actors.some((actor) => actor.model !== undefined)) throw new SwtError(resumeRefused({ problem: `the run "${manifest.run.id}" was played by live models: live resume is M5`, file: previous }));
	if (input.game === undefined) throw new SwtError(badUsage({ problem: "`swt resume` needs `--game <game file>`: the manifest names the game by hash, not by path" }));
	const params = Object.keys(manifest.game.params).length === 0 ? {} : { params: manifest.game.params };
	const { game } = await resolveFile({ file: input.game, seed: manifest.seed, ...params }, io, [DIRECTOR_RECORDS, RUN_RECORDS]);
	const path = input.snapshot === undefined ? latest(previous) : resolve(io.cwd, input.snapshot);
	const file = await readSnapshotFile(path, { runId: manifest.run.id, gameHash: game.definition.game.hash });
	const prefix = readFileSync(join(previous, EVENTS_FILE), "utf8").split("\n").slice(0, file.checkpoint.lines);
	const log = prefix.map((line): unknown => JSON.parse(line));
	const before = log.flatMap((event) => (Check(StoredEnvelopeSchema, event) ? [event] : []));
	const calls = before.filter((event) => event.type === "tool_called" && event.actor === HUMAN).length;
	const hand = handOf(input.hand, game, io, { calls, tick: file.tick });
	const snapshotHash = jsonHash(file);
	const resumed: Resumed = {
		run: { purpose: manifest.run.purpose, replicate: manifest.replicate },
		snapshotHash,
		folder: { resumedFrom: { file: relative(previous, path), run: manifest.run.id, checkpoint: file.checkpoint }, prefix },
		input: { snapshot: file.snapshot, log },
		began: (kernel, fake) => {
			const markers = [...before.filter((event) => event.source === RUN_RECORDS.id).map((event) => event.seq), kernel.record(RUN_RECORDS.id, "script", "run_resumed", { from: manifest.run.id, snapshotHash, tick: file.tick }).seq];
			return (activation) => fake({ ...activation, basis: activation.basis - markers.filter((seq) => seq <= activation.basis).length });
		},
	};
	const directory = nextRunFolder(resolve(io.cwd, input.out ?? dirname(previous)), game.definition.game.id);
	return playFake({ game, directory, json: input.json, hand, snapshotAt: input.snapshotAt, ticks: input.ticks, resumed }, io);
}
