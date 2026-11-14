// SPDX-License-Identifier: Apache-2.0
/**
 * `swt run --fake`: a game file to a verified run folder, in the four steps `play` of the testkit takes too
 * (resolve the game, create the kernel, check the win fact, run), with the sink of the run folder.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatIssue, SwtError, type DriverTable, type EventSink, type Kernel, type RunEnd, type SwtIssue } from "@swarmtales/contracts";
import { buildManifest, turns } from "@swarmtales/engine";
import { createKernel, RUNTIME_REVISION } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { nextRunFolder, openRunFolder, verifyRun, type RunFolder, type RunVerdict } from "@swarmtales/runlog";
import { resolveGame, type ResolvedGame } from "@swarmtales/sdk";
import { fakeDriver } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import { installedTable } from "./installed.ts";
import { loadGame } from "./load-game.ts";
import type { CliIo } from "./main.ts";

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
	/** The folder that holds the runs; `runs` under the current directory when absent. */
	readonly out: string | undefined;
	/** Print the result as one JSON line. */
	readonly json: boolean;
}

// Step one: the file, the installed table for a data game, the prompts (the game's own folder is `prompts/` beside its file).
async function resolved(input: RunInput, io: CliIo): Promise<ResolvedGame> {
	const loaded = await loadGame(input.file, io.cwd);
	const installed = loaded.type === "module" ? undefined : (io.installed ?? (await installedTable(PACKAGE_FILE)));
	const folder = join(dirname(loaded.file), "prompts");
	return resolveGame({
		game: loaded.game,
		schedulers: { turns },
		prompts: createPromptLookup(existsSync(folder) ? { game: folder } : {}),
		...(installed === undefined ? {} : { installed }),
		...(input.seed === undefined ? {} : { seed: input.seed }),
	});
}

// The run folder, opened at the first event: a game that fails before its run leaves no folder behind.
function lazyFolder(directory: string, game: ResolvedGame, io: CliIo): { readonly sink: EventSink; readonly opened: () => RunFolder | undefined } {
	let folder: RunFolder | undefined;
	const open = (): RunFolder => {
		const drivers = Object.fromEntries(game.definition.actors.map((actor) => [actor.id, FAKE]));
		const raw: unknown = JSON.parse(readFileSync(PACKAGE_FILE, "utf8"));
		const manifest = buildManifest(game, { id: basename(directory), startedAt: io.now().toISOString(), drivers, kernelRevision: RUNTIME_REVISION, kernelVersion: Parse(Versioned, raw).version, node: process.version });
		const briefings = Object.entries(game.briefings).map(([actor, text]): [string, string] => [`briefing/${actor}`, text]);
		folder = openRunFolder(directory, manifest, { now: io.now, game: game.data, texts: { ...game.texts, ...Object.fromEntries(briefings) } });
		return folder;
	};
	const sink: EventSink = {
		write(event) {
			(folder ?? open()).sink.write(event);
		},
		close(end) {
			folder?.sink.close?.(end);
		},
	};
	return { sink, opened: () => folder };
}

// Step four. A run that failed has its end and its log; the issues of the failure are what the command reports.
async function played(kernel: Kernel, drivers: DriverTable): Promise<{ readonly end: RunEnd; readonly issues: readonly SwtIssue[] }> {
	try {
		const end = await kernel.run(drivers);
		if (end === undefined) throw new RangeError("the run stopped without an end");
		return { end, issues: [] };
	} catch (error) {
		if (!(error instanceof SwtError) || kernel.ended === undefined) throw error;
		return { end: kernel.ended, issues: error.issues };
	}
}

// "limit grid-game.match: the match is over", "tick limit" or "error".
function whyOf(kernel: Kernel, end: RunEnd): string {
	if (end.reason !== "limit") return end.reason === "ticks" ? "tick limit" : "error";
	const breach = kernel.log.all().findLast((event) => event.type === "limit_reached")?.payload;
	return `limit ${end.limit ?? ""}${Check(Breach, breach) ? `: ${breach.reason}` : ""}`;
}

interface Outcome {
	readonly game: string;
	readonly seed: number;
	readonly end: RunEnd;
	readonly why: string;
	readonly result?: { readonly fact: string; readonly value: unknown };
	readonly verdict: RunVerdict;
	readonly run: string;
	readonly issues: readonly SwtIssue[];
}

function print(outcome: Outcome, json: boolean, io: CliIo): void {
	const { game, seed, end, result, verdict, run, issues } = outcome;
	if (json) {
		io.out(JSON.stringify({ driver: FAKE, game, seed, end, ...(result === undefined ? {} : { result }), log: { ok: verdict.ok, lines: verdict.lines, head: verdict.head }, run, issues }));
		return;
	}
	io.out("fake models: no result");
	io.out(`${game} seed ${String(seed)}: ended after ${String(end.tick)} ticks (${outcome.why})`);
	if (result !== undefined) io.out(`result ${result.fact}: ${JSON.stringify(result.value)}`);
	for (const issue of issues) io.err(formatIssue(issue));
	if (verdict.ok) io.out(`log verified: ${String(verdict.lines)} lines, head ${verdict.head ?? "none"}`);
	io.out(`run: ${run}`);
}

/**
 * Loads the game file, resolves it, plays it with the fake driver into a new run folder, verifies the folder and
 * prints the result. `texts.json` holds every text of the game by its key and each actor's briefing under
 * `briefing/<actor id>`.
 *
 * @param input - The game file, the seed, the folder of the runs and the form of the output.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code: 0 the run finished, 1 its log does not verify, 2 it ended with the reason `error`.
 * @throws SwtError Before the run: `SWT-C001`, `SWT-C002`, `SWT-C030`, what game resolution reports, `SWT-R002`,
 * and `SWT-R015` when `win.fact` names no fact. No run folder is written then.
 *
 * @public
 */
export async function runFake(input: RunInput, io: CliIo): Promise<number> {
	const game = await resolved(input, io);
	const directory = nextRunFolder(resolve(io.cwd, input.out ?? "runs"), game.definition.game.id);
	const folder = lazyFolder(directory, game, io);
	const kernel = createKernel(game.definition, { sinks: [folder.sink] });
	if (game.win !== undefined) kernel.fact(game.win);
	const driver = fakeDriver(kernel, game.definition.seed);
	const { end, issues } = await played(kernel, Object.fromEntries(game.definition.actors.map((actor) => [actor.id, driver]))).finally(() => folder.opened()?.close());
	const failed = end.reason === "error";
	const verdict = verifyRun(directory);
	const result = game.win === undefined || failed ? {} : { result: { fact: game.win, value: kernel.fact(game.win) } };
	print({ game: game.definition.game.id, seed: game.definition.seed, end, why: whyOf(kernel, end), ...result, verdict, run: relative(io.cwd, directory), issues: [...issues, ...verdict.issues] }, input.json, io);
	return failed ? 2 : verdict.ok ? 0 : 1;
}
