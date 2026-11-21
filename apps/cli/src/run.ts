// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt run --fake`: a game file to a verified run folder, in the four steps `play` of the testkit takes too
 * (resolve the game, create the kernel, check the win fact, run), with the sink of the run folder.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatIssue, SwtError, type ActorDriver, type DriverTable, type EventSink, type Kernel, type PromptLookup, type RecordSource, type ResumeInput, type RunEnd, type SwtIssue } from "@swarmtales/contracts";
import { createDirectorDrivers, createReviewPort, DIRECTOR_RECORDS, REVIEW_RECORDS, turns, type ManifestRun } from "@swarmtales/engine";
import { createKernel, RUNTIME_REVISION } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { briefingKey, nextRunFolder, openRunFolder, verifyRun, type RunFolder, type RunFolderOptions, type RunVerdict } from "@swarmtales/runlog";
import { scriptedAsker } from "@swarmtales/models";
import { definitionsOf, isGameFamily, resolveGame, RESIDENT_KIND, type MechanicDefinition, type ResolvedGame } from "@swarmtales/sdk";
import { fakeDriver } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import { loopOf, pauseEvent, runManifest, type LoopOptions } from "./assembly.ts";
import { toolWithoutSample } from "./errors.ts";
import type { PauseOn } from "./flags.ts";
import { handEnded, handOf } from "./hand.ts";
import { installedPackages, installedPromptFolders, packageFilesFor, type InstalledPackages } from "./installed.ts";
import { loadGame } from "./load-game.ts";
import { runLoop, type HandSource, type LoopStop } from "./loop.ts";
import type { CliIo } from "./main.ts";
import { handLine, watched, type HandCount } from "./watch.ts";

const FAKE = "fake/sample";
const PACKAGE_FILE = fileURLToPath(new URL("../package.json", import.meta.url));
const Versioned = Type.Object({ version: Type.String({ description: "The version of the package" }) }, { description: "The field of the command line's `package.json` that a run records" });
const Breach = Type.Object({ reason: Type.String({ description: "What the limit says about its breach" }) }, { description: "The payload of `limit_reached`, as far as the result line reads it" });

/**
 * What `swt run --fake` was asked for.
 *
 * @public
 */
export interface RunInput {
	/** The game file, absolute or relative to the current directory. */
	readonly file: string;
	/** The seed; it wins over the game's own. */
	readonly seed: number | undefined;
	/** The overrides of a game family's params by name (`--set`); none when absent. */
	readonly params?: Readonly<Record<string, unknown>>;
	/** The folder that holds the runs; `runs` under the current directory when absent. */
	readonly out: string | undefined;
	/** Print the result as one JSON line. */
	readonly json: boolean;
	/** `--hand`: the JSON-lines file of the Human Hand, or `-` for standard input; no Human Hand when absent. */
	readonly hand?: string;
	/** `--snapshot-at`: the numbers of finished ticks after which a snapshot is written; none when absent. */
	readonly snapshotAt?: readonly number[];
	/** `--pause-on`: the event after whose first tick the run pauses; no pause when absent. */
	readonly pauseOn?: PauseOn;
}

/**
 * A game file, resolved: step one of a fake run and of a live run.
 *
 * @public
 */
export interface ResolvedFile {
	/** The resolved game. */
	readonly game: ResolvedGame;
	/** The definitions of the game's mechanics. */
	readonly mechanics: readonly MechanicDefinition[];
	/** The prompt lookup the game was resolved with: the library, and the game's own folder `prompts/` beside its file. */
	readonly texts: PromptLookup;
}

// The installed table of a data game: a test's mechanics (and no Director), else the packages of the project's
// `package.json` (the nearest above the game file) and of the command line's own (A121).
async function tableOf(file: string, io: Pick<CliIo, "installed">): Promise<InstalledPackages> {
	if (io.installed !== undefined) return { mechanics: io.installed, directors: {} };
	return installedPackages(packageFilesFor(dirname(file), PACKAGE_FILE));
}

/**
 * Loads a game file and resolves it: the file, the installed table for a data game, the prompts. A game family is
 * built from the defaults of its params with the overrides on top. A data game names its mechanics and its
 * Directors by id; the ids come from the packages that the project's `package.json` (the nearest one above the game
 * file) and the command line's own list as dependencies, the project's first.
 *
 * @param input - The game file, the seed and the overrides of the params.
 * @param io - The current directory and the installed table of a test.
 * @param records - The record sources of the run's drivers; none for a fake run.
 * @returns The resolved game, the definitions of its mechanics and the prompt lookup.
 * @throws SwtError `SWT-C001`, `SWT-C002`, `SWT-C030`, and what game resolution reports, with `SWT-G041` for an
 * override that names no param, has the wrong type, or is given to a game that is no family.
 *
 * @public
 */
export async function resolveFile(input: Pick<RunInput, "file" | "seed" | "params">, io: Pick<CliIo, "cwd" | "installed">, records: readonly RecordSource[] = []): Promise<ResolvedFile> {
	const loaded = await loadGame(input.file, io.cwd);
	const table = loaded.type === "module" ? undefined : await tableOf(loaded.file, io);
	const installed = table?.mechanics;
	const folder = join(dirname(loaded.file), "prompts");
	// The prompt folders of the installed mechanics, under those of a clone's `mechanics/` (errata K36, M6-08).
	const mechanics = { ...installedPromptFolders(packageFilesFor(dirname(loaded.file), PACKAGE_FILE)), ...mechanicPromptFolders() };
	const texts = createPromptLookup({ mechanics, ...(existsSync(folder) ? { game: folder } : {}) });
	const game = resolveGame({
		game: loaded.game,
		schedulers: { turns },
		prompts: texts,
		...(input.params === undefined ? {} : { params: input.params }),
		...(records.length === 0 ? {} : { records }),
		...(table === undefined ? {} : { installed: table.mechanics, directors: table.directors }),
		...(input.seed === undefined ? {} : { seed: input.seed }),
	});
	// The family resolved, so its effective params build the game the definitions are read from.
	const built = isGameFamily(loaded.game) ? loaded.game.build(game.params) : loaded.game;
	return { game, mechanics: Object.values(definitionsOf(built, installed)), texts };
}

// `SWT-C010`, once per tool: a tool in the grant of a resident whose body has no `sample`. The fake driver never calls it.
function unsampled({ definition }: ResolvedGame, mechanics: readonly MechanicDefinition[]): readonly SwtIssue[] {
	const mute = new Set(mechanics.flatMap((mechanic) => mechanic.head.tools.filter((tool) => tool.sampled === false).map((tool) => `${mechanic.source}/${tool.name}`)));
	const grants = [...new Set(definition.actors.filter((actor) => actor.kind === RESIDENT_KIND).map((actor) => actor.grant))];
	const found = new Map(grants.flatMap((grant) => (definition.grants[grant] ?? []).filter((tool) => mute.has(tool)).map((tool): [string, string] => [tool, grant])).reverse());
	return [...found].reverse().map(([tool, grant]) => toolWithoutSample({ tool: (Object.hasOwn(definition.names, tool) ? definition.names[tool] : undefined) ?? tool, grant }));
}

/**
 * The facts of a run that the platform knows: its id, its start, and the kernel and the Node.js that play it.
 *
 * @param directory - The run folder; its name is the id of the run.
 * @param now - The wall clock.
 * @returns The fields of `ManifestRun` that are the same for a fake run and a live run.
 *
 * @public
 */
export function runFacts(directory: string, now: () => Date): Pick<ManifestRun, "id" | "startedAt" | "kernelRevision" | "kernelVersion" | "node"> {
	const raw: unknown = JSON.parse(readFileSync(PACKAGE_FILE, "utf8"));
	return { id: basename(directory), startedAt: now().toISOString(), kernelRevision: RUNTIME_REVISION, kernelVersion: Parse(Versioned, raw).version, node: process.version };
}

/**
 * The texts of a run folder: every text of the game by its key, and each actor's briefing under
 * `briefing/<actor id>` (`briefingKey` of the runlog).
 *
 * @param game - The resolved game.
 * @returns What `texts.json` holds.
 *
 * @public
 */
export function folderTexts(game: ResolvedGame): Readonly<Record<string, string>> {
	return { ...game.texts, ...Object.fromEntries(Object.entries(game.briefings).map(([actor, text]): [string, string] => [briefingKey(actor), text])) };
}

// The run folder, opened at the first event: a game that fails before its run leaves no folder behind.
function lazyFolder(open: () => RunFolder): { readonly sink: EventSink; readonly opened: () => RunFolder | undefined } {
	let folder: RunFolder | undefined;
	const sink: EventSink = {
		write(event) {
			(folder ??= open()).sink.write(event);
		},
		close(end) {
			folder?.sink.close?.(end);
		},
	};
	return { sink, opened: () => folder };
}

/**
 * Runs the kernel through the run loop to its end, or to where the loop stops. A run that failed has its end and
 * its log; the issues of the failure are what the command reports. The Human Hand is closed afterwards.
 *
 * @param kernel - The kernel of the run.
 * @param drivers - The drivers by actor id.
 * @param loop - The ticks, the Human Hand and the snapshots (`loopOf`); to the end of the run, with neither, when absent.
 * @returns The end of the run and the issues of an `SwtError` that ended it; or the stop of the loop, with
 * `SWT-X009` when the run is paused and the Human Hand has ended. `hand` counts the calls of the Human Hand and the
 * refused ones, for a run that has one. Through `loop.warn` a refused call is printed as it happens, and after the
 * loop a `--snapshot-at` that wrote no snapshot (`watched`).
 * @throws Whatever ends the run without a recorded end, and whatever is no `SwtError`.
 *
 * @public
 */
export async function played(kernel: Kernel, drivers: DriverTable, loop: LoopOptions = { ticks: Infinity, snapshotAt: [], writeSnapshot: () => Promise.resolve() }): Promise<{ readonly end: RunEnd | LoopStop; readonly issues: readonly SwtIssue[]; readonly hand?: HandCount }> {
	const watch = watched(loop);
	try {
		const end = await runLoop({ kernel, drivers, ...watch.loop });
		return { end, issues: "stopped" in end && end.stopped === "paused" && end.on === undefined ? [handEnded(end)] : [], ...watch.close(end) };
	} catch (error) {
		if (!(error instanceof SwtError) || kernel.ended === undefined) throw error;
		return { end: kernel.ended, issues: error.issues, ...watch.close(kernel.ended) };
	} finally {
		loop.hand?.close?.();
	}
}

/**
 * Says why a run ended, for the result line.
 *
 * @param kernel - The kernel of the run, for the reason of a limit.
 * @param end - The end of the run, or the stop of the run loop.
 * @returns "limit grid.match: the match is over", "tick limit" or "error"; for a stop "paused", "paused on
 * <mechanic>.<event>" or "open".
 *
 * @public
 */
export function whyOf(kernel: Kernel, end: RunEnd | LoopStop): string {
	if ("stopped" in end) return end.stopped === "paused" ? `paused${end.on === undefined ? "" : ` on ${end.on}`}` : "open";
	if (end.reason !== "limit") return end.reason === "ticks" ? "tick limit" : "error";
	const breach = kernel.log.all().findLast((event) => event.type === "limit_reached")?.payload;
	return `limit ${end.limit ?? ""}${Check(Breach, breach) ? `: ${breach.reason}` : ""}`;
}

interface Outcome {
	readonly game: string;
	readonly seed: number;
	readonly end: RunEnd | LoopStop;
	readonly why: string;
	readonly result?: { readonly fact: string; readonly value: unknown };
	readonly verdict: RunVerdict;
	readonly run: string;
	readonly issues: readonly SwtIssue[];
	readonly hand?: HandCount;
}

function print(outcome: Outcome, json: boolean, io: CliIo): void {
	const { game, seed, end, result, verdict, run, issues, hand } = outcome;
	if (json) {
		io.out(JSON.stringify({ driver: FAKE, game, seed, end, ...(result === undefined ? {} : { result }), log: { ok: verdict.ok, lines: verdict.lines, head: verdict.head }, ...(hand === undefined ? {} : { hand }), run, issues }));
		return;
	}
	io.out("fake models: no result");
	io.out(`${game} seed ${String(seed)}: ${"stopped" in end ? "stopped" : "ended"} after ${String(end.tick)} ticks (${outcome.why})`);
	if (result !== undefined) io.out(`result ${result.fact}: ${JSON.stringify(result.value)}`);
	for (const line of handLine(hand)) io.out(line);
	for (const issue of issues) io.err(formatIssue(issue));
	if (verdict.ok) io.out(`log verified: ${String(verdict.lines)} lines, head ${verdict.head ?? "none"}`);
	io.out(`run: ${run}`);
}

/**
 * What makes a fake run a resumed one (`swt resume`).
 *
 * @public
 */
export interface Resumed {
	/** The purpose and the replicate of the run that is resumed: the resumed run keeps them. */
	readonly run: Pick<ManifestRun, "purpose" | "replicate">;
	/** The hash of the snapshot file, for `resumedFrom` of the manifest. */
	readonly snapshotHash: string;
	/** The checkpoint the new folder chains from, and the lines of the previous log it starts with. */
	readonly folder: Required<Pick<RunFolderOptions, "resumedFrom" | "prefix">>;
	/** The snapshot and the log the kernel resumes from. */
	readonly input: ResumeInput;
	/** Called once with the resumed kernel, before the loop: writes the marker and gives the driver of the residents. */
	readonly began: (kernel: Kernel, fake: ActorDriver) => ActorDriver;
}

/**
 * What `playFake` plays.
 *
 * @public
 */
export interface FakePlay {
	/** The resolved game. */
	readonly game: ResolvedGame;
	/** The run folder to write; it is created at the first event. */
	readonly directory: string;
	/** Print the result as one JSON line. */
	readonly json: boolean;
	/** The Human Hand; none when absent. */
	readonly hand?: HandSource | undefined;
	/** The numbers of finished ticks after which a snapshot is written; none when absent. */
	readonly snapshotAt?: readonly number[] | undefined;
	/** The loop stops after this many finished ticks; the ticks of the game when absent. */
	readonly ticks?: number | undefined;
	/** The event of `--pause-on`, found by `pauseEvent`; no pause when absent. */
	readonly pauseOn?: LoopOptions["pauseOn"];
	/** Set for a resumed run. */
	readonly resumed?: Resumed;
}

function exitOf(failed: boolean, verified: boolean, end: RunEnd | LoopStop): number {
	if (failed || !verified) return failed ? 2 : 1;
	return "stopped" in end ? 3 : 0;
}

// Opens the run folder of a fake run; a resumed one names its snapshot in the manifest and starts with the prefix.
function openFolder({ game, directory, resumed }: FakePlay, io: CliIo): RunFolder {
	const manifest = runManifest(game, { ...runFacts(directory, io.now), purpose: "smoke", replicate: 0, ...resumed?.run }, FAKE);
	return openRunFolder(directory, resumed === undefined ? manifest : { ...manifest, resumedFrom: { snapshotHash: resumed.snapshotHash } }, { now: io.now, game: game.data, texts: folderTexts(game), ...resumed?.folder });
}

/**
 * Plays a resolved game with the fake driver into its run folder, from the start or from a snapshot, verifies the
 * folder and prints the result. A Director acts on its fallback: its model port is a script without an answer; one
 * that acts by tool use plays its look with the fake driver, and a review it answers is told no.
 *
 * @param play - The game, the folder, the flags of the run loop and, for a resumed run, what it resumes from.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code: 0 the run finished, 1 its log does not verify, 2 it ended with the reason `error`, 3 the
 * loop stopped with the run open (paused with the Human Hand ended, `SWT-X009`, or at `ticks`). A line of the Human
 * Hand that the game refused is printed on the error output as it happens and counted in a result line ("Human
 * Hand: 1 of 3 calls refused"; `hand` in the JSON line); a `--snapshot-at` that wrote no snapshot gets a warning
 * line. Neither changes the exit code.
 * @throws SwtError `SWT-R002`, `SWT-R015` when `win.fact` names no fact, `SWT-R021` for a snapshot that does not fit
 * its log, `SWT-L007` for a prefix that is not what the checkpoint signed.
 *
 * @public
 */
export async function playFake(play: FakePlay, io: CliIo): Promise<number> {
	const { game, directory, resumed } = play;
	const folder = lazyFolder(() => openFolder(play, io));
	const ask = scriptedAsker({});
	const kernel: Kernel = createKernel(game.definition, { sinks: [folder.sink], review: createReviewPort({ game, ask, facts: (key) => kernel.fact(key) }) }, resumed?.input);
	if (game.win !== undefined) kernel.fact(game.win);
	const fake = fakeDriver(kernel, game.definition.seed);
	const driver = resumed === undefined ? fake : resumed.began(kernel, fake);
	// A Director that acts by tool use plays its look with the fake driver, from the `sample` functions of its tools;
	// in a resumed run through the same wrapper as a resident, so the marker `run_resumed` does not move its basis.
	const drivers: DriverTable = { ...Object.fromEntries(game.definition.actors.map((actor) => [actor.id, driver])), ...createDirectorDrivers({ game, ask, facts: (key) => kernel.fact(key), look: (activation) => driver(activation).then(() => undefined) }) };
	const loop = loopOf(game, kernel, folder.opened, { hand: play.hand, snapshotAt: play.snapshotAt, warn: io.err, pauseOn: play.pauseOn });
	const { end, issues, hand } = await played(kernel, drivers, { ...loop, ticks: play.ticks ?? loop.ticks }).finally(() => folder.opened()?.close());
	const failed = whyOf(kernel, end) === "error";
	const verdict = verifyRun(directory);
	const result = game.win === undefined || failed ? {} : { result: { fact: game.win, value: kernel.fact(game.win) } };
	print({ game: game.definition.game.id, seed: game.definition.seed, end, why: whyOf(kernel, end), ...result, verdict, run: relative(io.cwd, directory), issues: [...issues, ...verdict.issues], ...(hand === undefined ? {} : { hand }) }, play.json, io);
	return exitOf(failed, verdict.ok, end);
}

/**
 * Loads the game file, resolves it, plays it with the fake driver into a new run folder, verifies the folder and
 * prints the result. Before the run it warns once (`SWT-C010`, on the error output) about each tool an actor is
 * granted that has no `sample`; the run still plays. `texts.json` holds every text of the game by its key and each actor's briefing under
 * `briefing/<actor id>` (`briefingKey` of the runlog).
 *
 * @param input - The game file, the seed, the overrides of a family's params, the folder of the runs and the form of the output.
 * @param io - The current directory, the clock and the two outputs.
 * A Director of the game acts on its fallback: its model port is a script without an answer. With `hand` and
 * `snapshotAt` the run loop applies the Human Hand and writes snapshots into `<run>/snapshots/`.
 *
 * @returns The exit code: 0 the run finished, 1 its log does not verify, 2 it ended with the reason `error`, 3 it
 * is paused and the Human Hand has ended (`SWT-X009`): the folder holds a snapshot and verifies as unfinished.
 * @throws SwtError Before the run: `SWT-C001`, `SWT-C002`, `SWT-C030`, what game resolution reports (`SWT-G041` for a `--set` that fits no param), `SWT-R002`,
 * `SWT-R015` when `win.fact` names no fact, `SWT-X008` for a `--hand` the game cannot take, and `SWT-C003` for a
 * `--pause-on` that names no event of the game. No run folder is written then.
 *
 * @public
 */
export async function runFake(input: RunInput, io: CliIo): Promise<number> {
	const { game, mechanics } = await resolveFile(input, io, [DIRECTOR_RECORDS, REVIEW_RECORDS]);
	const hand = handOf(input.hand, game, io);
	for (const warning of unsampled(game, mechanics)) io.err(formatIssue(warning).replace(/^error /, "warning "));
	const pauseOn = input.pauseOn === undefined ? {} : { pauseOn: pauseEvent(game, input.pauseOn) };
	const directory = nextRunFolder(resolve(io.cwd, input.out ?? "runs"), game.definition.game.id);
	return playFake({ game, directory, json: input.json, hand, snapshotAt: input.snapshotAt, ...pauseOn }, io);
}
