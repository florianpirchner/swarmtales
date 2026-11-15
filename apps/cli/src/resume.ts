// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt resume` (specification of M3, section 7.2; M5 4.5): a run goes on from a snapshot file in a new run folder,
 * whose log starts with the lines of the run before and then the marker `run_resumed`. A fake run plays on with the
 * fake driver; a live run plays on live under `--budget` (`live-resume.ts`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { EVENTS_FILE, jsonHash } from "@swarmtales/chain";
import { RunManifestSchema, StoredEnvelopeSchema, SwtError, type RunManifest, type SwtIssue } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS, REVIEW_RECORDS } from "@swarmtales/engine";
import { MANIFEST_FILE, nextRunFolder, readSnapshotFile, SNAPSHOTS_FOLDER, verifyRun, type SessionSnapshotFile } from "@swarmtales/runlog";
import type { ModelSource } from "@swarmtales/models";
import type { ResolvedGame } from "@swarmtales/sdk";
import { Check, Parse } from "typebox/value";
import { badUsage } from "./errors.ts";
import type { LiveFlags } from "./flags.ts";
import { handOf } from "./hand.ts";
import { resumeLive } from "./live-resume.ts";
import type { CliIo } from "./main.ts";
import { RUN_RECORDS } from "./records.ts";
import { pauseEvent } from "./assembly.ts";
import { playFake, resolveFile, type Resumed, type RunInput } from "./run.ts";

const HUMAN = "human";

/**
 * What `swt resume` was asked for.
 *
 * @public
 */
export interface ResumeRunInput extends Pick<RunInput, "out" | "json" | "hand" | "snapshotAt" | "pauseOn"> {
	/** The folder of the run to resume, absolute or relative to the current directory. */
	readonly directory: string;
	/** `--game`: the game file of the run; the manifest names the game by hash only. */
	readonly game?: string;
	/** `--snapshot`: the snapshot file; the one with the highest tick in `<run>/snapshots/` when absent. */
	readonly snapshot?: string;
	/** `--ticks`: the number of finished ticks the loop stops at; the ticks of the game when absent. */
	readonly ticks?: number;
	/** The flags of a live run; a live resume needs `budget`. A fake resume reads none of them. */
	readonly live?: LiveFlags;
	/** The environment of a live resume, as a plain record (`readEnv`). */
	readonly env?: Readonly<Record<string, string | undefined>>;
	/** The model source of a live resume; the provider's when absent. A test passes the scripted one. */
	readonly source?: ModelSource;
}

/**
 * `SWT-X010`: a run of live models is resumed without `--budget`, or a fake run with it.
 *
 * @param input - The run folder and whether its run was live.
 * @param input.file - The run folder.
 * @param input.live - True when the run was played by live models.
 * @returns The issue.
 *
 * @public
 */
export function liveResumeBudget(input: { readonly file: string; readonly live: boolean }): SwtIssue {
	return {
		code: "SWT-X010",
		summary: input.live ? `the run folder ${input.file} was played by live models, and \`swt resume\` was given no \`--budget\`` : `the run folder ${input.file} was played by fake models, and \`swt resume\` was given \`--budget\``,
		why: "A run is resumed the way it was played (decision A55): a live run plays on live under a cost cap of its own, counted from the resume; a fake run has no conversations to go on from.",
		fix: input.live ? "Give `--budget <usd>` (and `--provider`, `--model`, `--ledger`, `--purpose` as for `swt run`)." : "Leave out `--budget` and the flags of a live run.",
		where: { file: input.file },
	};
}

/**
 * `SWT-X008`: a run cannot be resumed: its folder holds no snapshot, or the snapshot of a live run holds no sessions.
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
		why: "`swt resume` goes on from a snapshot file: a fake run's drivers are built again; a live run's residents go on from the conversations in its section `sessions`, and a restart with empty contexts would be no resume.",
		fix: "Resume a run that wrote a snapshot (`--snapshot-at <ticks>`, `--pause-on`, a `snapshot` line of `--hand`, or a paused stop), or name the file with `--snapshot`.",
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
 * What a resume reads from the folder of the run before: its manifest, its game, the snapshot and the lines of its
 * log that the snapshot's checkpoint signed.
 *
 * @public
 */
export interface ResumeBase {
	/** The folder of the run that is resumed. */
	readonly previous: string;
	/** Its manifest. */
	readonly manifest: RunManifest;
	/** The game file as given with `--game`. */
	readonly gameFile: string;
	/** The game file, resolved with the seed and the params of the manifest. */
	readonly game: ResolvedGame;
	/** The snapshot file. */
	readonly path: string;
	/** The snapshot file, read and checked. */
	readonly file: SessionSnapshotFile;
	/** Its hash (`jsonHash`), for `resumedFrom` of the manifest and the marker. */
	readonly snapshotHash: string;
	/** The lines of the previous log up to the checkpoint, as written. */
	readonly prefix: readonly string[];
	/** The same lines, parsed. */
	readonly log: readonly unknown[];
	/** The calls of the Human Hand among them. */
	readonly calls: number;
}

/**
 * Resumes a run. The folder of the run must verify. Its game file is resolved with the seed and the params of
 * the manifest; the snapshot must be of that run and that game. The new folder (`<game id>-<NNN>` under `out`, or
 * beside the resumed folder) starts with the lines of the previous log that the snapshot's checkpoint signed; then
 * comes the marker `run_resumed` of `RUN_RECORDS` (`{ from, snapshotHash, tick }`, actor `script`), then the run.
 * A run of live models plays on live (`resumeLive`, with `--budget`); any other with the fake driver.
 *
 * The hand file is the one of the straight run: the lines that run applied before the snapshot are dropped (see
 * `handOf`). The fake driver draws from the basis of an activation, which every marker of the log moves by one; a
 * resumed run gives it the basis without the markers, so the residents play what they play in the straight run.
 *
 * @param input - The run folder, the game file, the snapshot, the ticks, and the flags `swt run` has too.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code, as `playFake` gives it: 0, 1, 2, or 3 for a run that is still open; a live resume's as
 * `runLive` gives it.
 * @throws SwtError The issues of a folder that does not verify; `SWT-X010` for a live run without `--budget` and a
 * fake run with it; `SWT-X008` for a folder without a snapshot, a live snapshot without sessions, and a hand the game
 * cannot take; `SWT-C003` without `--game`; `SWT-L008` for a snapshot that is none, or is of another run or another
 * game than the game file; `SWT-L007` and `SWT-R021` from the folder and the kernel; and what `resolveFile` throws.
 * No run folder is written then.
 *
 * @public
 */
export async function resumeRun(input: ResumeRunInput, io: CliIo): Promise<number> {
	const base = await baseOf(input, io);
	const live = base.manifest.actors.some((actor) => actor.model !== undefined);
	if (live !== (input.live?.budget !== undefined)) throw new SwtError(liveResumeBudget({ file: base.previous, live }));
	if (live && base.file.sessions === undefined) throw new SwtError(resumeRefused({ problem: `the snapshot ${base.path} of the live run "${base.manifest.run.id}" holds no sessions`, file: base.previous }));
	return live ? resumeLive(base, input, io) : resumeFake(base, input, io);
}

const eventsOf = (log: readonly unknown[]) => log.flatMap((event) => (Check(StoredEnvelopeSchema, event) ? [event] : []));

async function baseOf(input: ResumeRunInput, io: CliIo): Promise<ResumeBase> {
	const previous = resolve(io.cwd, input.directory);
	const verdict = verifyRun(previous);
	if (!verdict.ok) throw new SwtError(verdict.issues);
	const manifest = Parse(RunManifestSchema, JSON.parse(readFileSync(join(previous, MANIFEST_FILE), "utf8")));
	if (input.game === undefined) throw new SwtError(badUsage({ problem: "`swt resume` needs `--game <game file>`: the manifest names the game by hash, not by path" }));
	const params = Object.keys(manifest.game.params).length === 0 ? {} : { params: manifest.game.params };
	const { game } = await resolveFile({ file: input.game, seed: manifest.seed, ...params }, io, [DIRECTOR_RECORDS, REVIEW_RECORDS, RUN_RECORDS]);
	const path = input.snapshot === undefined ? latest(previous) : resolve(io.cwd, input.snapshot);
	const file = await readSnapshotFile(path, { runId: manifest.run.id, gameHash: game.definition.game.hash });
	const prefix = readFileSync(join(previous, EVENTS_FILE), "utf8").split("\n").slice(0, file.checkpoint.lines);
	const log = prefix.map((line): unknown => JSON.parse(line));
	const calls = eventsOf(log).filter((event) => event.type === "tool_called" && event.actor === HUMAN).length;
	return { previous, manifest, gameFile: input.game, game, path, file, snapshotHash: jsonHash(file), prefix, log, calls };
}

async function resumeFake(base: ResumeBase, input: ResumeRunInput, io: CliIo): Promise<number> {
	const { previous, manifest, game, path, file, snapshotHash, prefix, log } = base;
	const before = eventsOf(log);
	const hand = handOf(input.hand, game, io, { calls: base.calls, tick: file.tick });
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
	const pauseOn = input.pauseOn === undefined ? {} : { pauseOn: pauseEvent(game, input.pauseOn) };
	const directory = nextRunFolder(resolve(io.cwd, input.out ?? dirname(previous)), game.definition.game.id);
	return playFake({ game, directory, json: input.json, hand, snapshotAt: input.snapshotAt, ticks: input.ticks, resumed, ...pauseOn }, io);
}
