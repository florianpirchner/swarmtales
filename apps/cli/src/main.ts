// SPDX-License-Identifier: Apache-2.0
/** The commands of `swt`: the flags are read in `flags.ts`, and every `SwtError` becomes printed issues and exit code 1. */
import { formatIssue, redactSecrets, redactValue, SwtError } from "@swarmtales/contracts";
import type { MechanicDefinition } from "@swarmtales/sdk";
import { readEnv } from "./env.ts";
import { badUsage } from "./errors.ts";
import { experimentAnalyse, experimentRun } from "./experiment.ts";
import { liveFlags, paramsOf, readFlags, seedOf, type Flags } from "./flags.ts";
import { runLive } from "./live.ts";
import { logVerify } from "./log-verify.ts";
import { report } from "./report.ts";
import { runFake } from "./run.ts";

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
}

type Command = (argument: string, values: Flags, io: CliIo) => Promise<number> | number;

// The commands by the words before their one argument.
const COMMANDS: Readonly<Record<string, Command>> = {
	run: async (file, values, io) => {
		const run = { file, seed: seedOf(values.seed), params: paramsOf(values.set), out: values.out, json: values.json === true };
		if (values.fake === true) return runFake(run, io);
		return (await runLive({ ...run, ...liveFlags(values), env: io.env ?? readEnv() }, io)).code;
	},
	"log verify": (directory, values, io) => logVerify(directory, values.json === true, io),
	report: (directory, values, io) => report({ directory, ...(values.game === undefined ? {} : { game: values.game }) }, io),
	"experiment run": (spec, values, io) => experimentRun({ spec, out: values.out, ...(values.ledger === undefined ? {} : { ledger: values.ledger }), env: io.env ?? readEnv() }, io),
	"experiment analyse": (directory, _values, io) => experimentAnalyse(directory, io),
};

async function command(args: readonly string[], io: CliIo): Promise<number> {
	const { values, positionals } = readFlags(args);
	const words = positionals.slice(0, -1).join(" ");
	const argument = positionals.at(-1);
	const found = Object.hasOwn(COMMANDS, words) ? COMMANDS[words] : undefined;
	if (found === undefined || argument === undefined) throw new SwtError(badUsage({ problem: `\`swt ${positionals.join(" ")}\` is no command with its arguments` }));
	return found(argument, values, io);
}

/**
 * Runs one command of `swt`.
 *
 * @param args - The arguments after the program name, for example `["run", "game.ts", "--fake"]`.
 * @param io - The current directory, the clock and the two outputs; those of the process when left out.
 * @returns The exit code. `swt run`: 0 the run finished, 1 an `SwtError` before the run or a log that does not
 * verify, 2 the run ended with the reason `error`, 5 a live run (no `--fake`) ended at its cost cap (`--budget`). `swt log verify`: 0 the log holds, 1 it is broken, 3 the run has
 * no end. `swt report`: 0 the report is written, 1 the run folder is unreadable, 4 a file of it holds a key value.
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
