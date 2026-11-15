// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The commands of `swt`: the flags are read in `flags.ts`, and every `SwtError` becomes printed issues and exit code 1. */
import { formatIssue, redactSecrets, redactValue, SwtError } from "@swarmtales/contracts";
import type { MechanicDefinition } from "@swarmtales/sdk";
import { analyseChess } from "./chess.ts";
import { readEnv } from "./env.ts";
import { badUsage } from "./errors.ts";
import { experimentAnalyse, experimentRun } from "./experiment.ts";
import { helpOf, isCommand, liveFlags, loopFlags, paramsOf, readFlags, resumeFlags, seedOf, type CommandName, type Flags } from "./flags.ts";
import { runLive } from "./live.ts";
import { logVerify } from "./log-verify.ts";
import { replayRun } from "./replay.ts";
import { report } from "./report.ts";
import { resumeRun } from "./resume.ts";
import { runFake } from "./run.ts";
import { scan } from "./scan.ts";

/**
 * What a command reads and writes outside its arguments; a test passes its own.
 *
 * @public
 */
export interface CliIo {
	/** The current directory: relative paths start here. */
	readonly cwd: string;
	/** The wall clock: it stamps the manifest and every line of the log. */
	readonly now: () => Date;
	/** Prints one line of the result. */
	readonly out: (line: string) => void;
	/** Prints one line of an error or a warning. */
	readonly err: (line: string) => void;
	/** Mechanic id to definition for a game in its data form; the table of the installed packages when absent. */
	readonly installed?: Readonly<Record<string, MechanicDefinition>>;
	/** The environment of a live run, as a plain record; the named variables of the process (`readEnv`) when absent. */
	readonly env?: Readonly<Record<string, string | undefined>>;
	/** The lines of standard input for `--hand -`; those of the process when absent. */
	readonly stdin?: AsyncIterable<string>;
}

type Command = (argument: string, values: Flags, io: CliIo) => Promise<number> | number;

// The commands by the words before their one argument: one for every row of the table in `flags.ts`.
const COMMANDS: Readonly<Record<CommandName, Command>> = {
	run: async (file, values, io) => {
		const run = { file, seed: seedOf(values.seed), params: paramsOf(values.set), out: values.out, json: values.json === true, ...loopFlags(values) };
		if (values.fake === true) return runFake(run, io);
		return (await runLive({ ...run, ...liveFlags(values), env: io.env ?? readEnv() }, io)).code;
	},
	resume: (directory, values, io) => resumeRun({ directory, out: values.out, json: values.json === true, ...resumeFlags(values), ...loopFlags(values), live: liveFlags(values), env: io.env ?? readEnv() }, io),
	"log verify": (directory, values, io) => logVerify(directory, values.json === true, io, values.previous),
	report: (directory, values, io) => report({ directory, ...(values.game === undefined ? {} : { game: values.game }) }, io),
	replay: (directory, values, io) => replayRun({ directory, json: values.json === true, ...(values.game === undefined ? {} : { game: values.game }), ...(values.previous === undefined ? {} : { previous: values.previous }) }, io),
	scan: (directory, values, io) => scan(directory, values.json === true, io),
	"analyse chess": (directory, values, io) => analyseChess({ directory, ...(values.depth === undefined ? {} : { depth: values.depth }) }, io),
	"experiment run": (spec, values, io) => experimentRun({ spec, out: values.out, ...(values.ledger === undefined ? {} : { ledger: values.ledger }), plan: values.plan === true, env: io.env ?? readEnv() }, io),
	"experiment analyse": (directory, _values, io) => experimentAnalyse(directory, io),
};

async function command(args: readonly string[], io: CliIo): Promise<number> {
	const { values, positionals } = readFlags(args);
	const words = positionals.slice(0, -1).join(" ");
	const argument = positionals.at(-1);
	if (values.help === true || argument === undefined) {
		// `swt run --help` and `swt run game.ts --help` are the help of `run`; anything else is the list of the commands.
		for (const line of helpOf([positionals.join(" "), words].find(isCommand))) io.out(line);
		return 0;
	}
	const found = isCommand(words) ? COMMANDS[words] : undefined;
	if (found === undefined) throw new SwtError(badUsage({ problem: `\`swt ${positionals.join(" ")}\` is no command with its arguments` }));
	return found(argument, values, io);
}

/**
 * Runs one command of `swt`.
 *
 * @param args - The arguments after the program name, for example `["run", "game.ts", "--fake"]`.
 * @param io - The current directory, the clock and the two outputs; those of the process when left out.
 * @returns The exit code. `swt`, `swt --help` and `swt <command> --help` print the commands, or the flags and the
 * exit codes of one command, from the table in `flags.ts`, and exit with 0. `swt run`: 0 the run finished, 1 an `SwtError` before the run or a log that does not
 * verify, 2 the run ended with the reason `error`, 3 the run is paused and the Human Hand of `--hand` has ended (`SWT-X009`; a snapshot is written), 5 a live run (no `--fake`) ended at its cost cap (`--budget`). `swt resume`: as `swt run --fake` (a live run as `swt run`), and 3 also when
 * `--ticks` stopped the run before its end. `swt log verify`: 0 the log holds, 1 it is broken, 3 the run has
 * no end. `swt report`: 0 the report is written, 1 the run folder is unreadable, 4 a file of it holds a key value.
 * `swt replay`: 0 the replayed log is equal, 1 it differs (`SWT-C031`), the run is not replayable (`SWT-T005`,
 * `SWT-T004`) or its folder does not verify. `swt scan`: 0 no file holds a held key value, 1 a file does (`SWT-X030`) or
 * the folder is none, 3 nothing was scanned because no key is held. `swt analyse chess`: 0 the analysis is written, 1
 * the folder does not verify, holds no chess game or the engine cannot measure, 4 a file holds a key value.
 * `swt experiment run`: 0 complete, 1 an `SwtError`, 4 a leak, 6 stopped at the experiment's cap or after three failed
 * runs. `swt experiment analyse`: 0 the pass rule is kept or there is none, 1 an `SwtError`, 3 not kept, 4 a leak,
 * 7 no verdict. An error before the run is printed in the five-line form, or with `--json` as `{ "issues": [...] }`.
 * @throws Whatever is no `SwtError`: a failure of the file system, a fault in the platform.
 * @example
 * ```ts
 * process.exitCode = await main(process.argv.slice(2));
 * ```
 *
 * @public
 */
export async function main(args: readonly string[], io: CliIo = { cwd: process.cwd(), now: () => new Date(), out: console.log, err: console.error }): Promise<number> {
	try {
		return await command(args, io);
	} catch (error) {
		if (!(error instanceof SwtError)) throw error;
		// An issue of the flags echoes what was typed; no key broker exists yet, so the patterns take a key of a known shape out.
		const issues = redactValue(error.issues, redactSecrets);
		if (args.includes("--json")) io.out(JSON.stringify({ issues }));
		else for (const issue of issues) io.err(formatIssue(issue));
		return 1;
	}
}
