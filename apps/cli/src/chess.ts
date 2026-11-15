// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt analyse chess`: the engine analysis of a chess run (Garbochess-JS of the lab), offline and without a model.
 * `analysis.json` and `ANALYSIS.md` are new files of the folder, so the folder is scanned for a held key value after
 * they are written.
 */
import { writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { formatIssue, SwtError } from "@swarmtales/contracts";
import { analyseRun, analysisMarkdown } from "@swarmtales/lab";
import { createKeyBroker } from "@swarmtales/models";
import { DEFAULT_DEPTH, ENGINE, GARBOCHESS } from "./chess-engine.ts";
import { readEnv } from "./env.ts";
import { badUsage } from "./errors.ts";
import { scanFolder } from "./leak-scan.ts";
import type { CliIo } from "./main.ts";

/**
 * The names of the two files `swt analyse chess` writes into the run folder.
 *
 * @public
 */
export const ANALYSIS_FILES = { json: "analysis.json", markdown: "ANALYSIS.md" } as const;

/**
 * What `swt analyse chess` was asked for.
 *
 * @public
 */
export interface ChessAnalysisInput {
	/** The run folder, absolute or relative to the current directory. */
	readonly directory: string;
	/** `--depth`: the search depth as written; {@link DEFAULT_DEPTH} when absent. */
	readonly depth?: string;
}

/**
 * Reads `--depth`.
 *
 * @param depth - The value as written; absent when the flag is.
 * @returns The depth: a whole number from 1 to 64, {@link DEFAULT_DEPTH} without the flag.
 * @throws SwtError `SWT-C003` for any other value.
 *
 * @public
 */
export function depthOf(depth: string | undefined): number {
	if (depth === undefined) return DEFAULT_DEPTH;
	if (!/^\d{1,2}$/.test(depth) || Number(depth) < 1 || Number(depth) > 64) throw new SwtError(badUsage({ problem: `\`--depth ${depth}\` is no whole number of plies from 1 to 64` }));
	return Number(depth);
}

/**
 * Analyses every game of a chess run with the reference engine, writes `analysis.json` (the engine, its commit and
 * hash, the depth, every half-move) and `ANALYSIS.md` (per game and side: average centipawn loss, inaccuracies,
 * mistakes, blunders, missed mates) into the folder, prints the Markdown and scans the folder.
 *
 * @param input - The run folder and the depth.
 * @param io - The current directory, the two outputs, and for a test the environment.
 * @returns The exit code: 0 the analysis is written, 4 a file of the folder holds a key value (`SWT-X030`).
 * @throws SwtError `SWT-C003` for a bad `--depth`, `SWT-E006` for a folder that does not verify or holds no chess
 * game, `SWT-E008` when the engine cannot measure. The command exits with 1 then.
 * @example
 * ```ts
 * process.exitCode = await analyseChess({ directory: "runs/chess-001", depth: "10" }, io);
 * ```
 *
 * @public
 */
export function analyseChess(input: ChessAnalysisInput, io: CliIo): number {
	const depth = depthOf(input.depth);
	const directory = resolve(io.cwd, input.directory);
	const games = analyseRun(GARBOCHESS, directory, depth);
	const broker = createKeyBroker(io.env ?? readEnv());
	const markdown = analysisMarkdown(GARBOCHESS, games, depth);
	writeFileSync(join(directory, ANALYSIS_FILES.json), broker.redact(`${JSON.stringify({ ...ENGINE, depth, games }, null, "\t")}\n`));
	writeFileSync(join(directory, ANALYSIS_FILES.markdown), broker.redact(markdown));
	const leak = scanFolder(directory, (text) => broker.leaks(text));
	for (const issue of leak) io.err(broker.redact(formatIssue(issue)));
	for (const line of markdown.trimEnd().split("\n")) io.out(broker.redact(line));
	io.out(`analysis: ${join(relative(io.cwd, directory), ANALYSIS_FILES.markdown)}`);
	return leak.length > 0 ? 4 : 0;
}
