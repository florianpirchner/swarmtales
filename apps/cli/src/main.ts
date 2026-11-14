// SPDX-License-Identifier: Apache-2.0
/** The commands of `swt`: the flags are read in `flags.ts`, and every `SwtError` becomes printed issues and exit code 1. */
import { formatIssue, redactSecrets, redactValue, SwtError } from "@swarmtales/contracts";
import type { MechanicDefinition } from "@swarmtales/sdk";
import { readEnv } from "./env.ts";
import { badUsage } from "./errors.ts";
import { liveFlags, paramsOf, readFlags, seedOf } from "./flags.ts";
import { runLive } from "./live.ts";
import { logVerify } from "./log-verify.ts";
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

async function command(args: readonly string[], io: CliIo): Promise<number> {
	const { values, positionals } = readFlags(args);
	const [name, first, second, ...more] = positionals;
	const json = values.json === true;
	if (name === "run" && first !== undefined && second === undefined) {
		const run = { file: first, seed: seedOf(values.seed), params: paramsOf(values.set), out: values.out, json };
		if (values.fake === true) return runFake(run, io);
		return (await runLive({ ...run, ...liveFlags(values), env: io.env ?? readEnv() }, io)).code;
	}
	if (name === "log" && first === "verify" && second !== undefined && more.length === 0) return logVerify(second, json, io);
	throw new SwtError(badUsage({ problem: `\`swt ${positionals.join(" ")}\` is no command with its arguments` }));
}

/**
 * Runs one command of `swt`.
 *
 * @param args - The arguments after the program name, for example `["run", "game.ts", "--fake"]`.
 * @param io - The current directory, the clock and the two outputs; those of the process when left out.
 * @returns The exit code. `swt run`: 0 the run finished, 1 an `SwtError` before the run or a log that does not
 * verify, 2 the run ended with the reason `error`, 5 a live run (no `--fake`) ended at its cost cap (`--budget`). `swt log verify`: 0 the log holds, 1 it is broken, 3 the run has
 * no end. An error before the run is printed in the five-line form, or with `--json` as `{ "issues": [...] }`.
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
