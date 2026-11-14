// SPDX-License-Identifier: Apache-2.0
/** The commands of `swt`: the arguments are read here, and every `SwtError` becomes printed issues and exit code 1. */
import { parseArgs } from "node:util";
import { formatIssue, SwtError } from "@swarmtales/contracts";
import type { MechanicDefinition } from "@swarmtales/sdk";
import { badUsage, liveRunTooEarly } from "./errors.ts";
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
}

// A seed is a 32-bit number: the manifest and the log refuse a larger one, and it would play as its remainder.
const MAX_SEED = 4294967295;
const FLAGS = { fake: { type: "boolean" }, json: { type: "boolean" }, seed: { type: "string" }, out: { type: "string" } } as const;

// The flags and the words before and between them; a flag that no command has is `SWT-C003`.
function read(args: readonly string[]): ReturnType<typeof parseArgs<{ options: typeof FLAGS; allowPositionals: true }>> {
	try {
		return parseArgs({ args: [...args], options: FLAGS, allowPositionals: true });
	} catch (cause) {
		throw new SwtError(badUsage({ problem: cause instanceof Error ? cause.message : "the arguments cannot be read" }), { cause });
	}
}

function seedOf(text: string | undefined): number | undefined {
	if (text === undefined) return undefined;
	if (!/^\d+$/.test(text) || Number(text) > MAX_SEED) throw new SwtError(badUsage({ problem: `the seed "${text}" is no whole number from 0 to ${String(MAX_SEED)}` }));
	return Number(text);
}

async function command(args: readonly string[], io: CliIo): Promise<number> {
	const { values, positionals } = read(args);
	const [name, first, second, ...more] = positionals;
	const json = values.json === true;
	if (name === "run" && first !== undefined && second === undefined) {
		if (values.fake !== true) throw new SwtError(liveRunTooEarly());
		return runFake({ file: first, seed: seedOf(values.seed), out: values.out, json }, io);
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
 * verify, 2 the run ended with the reason `error`. `swt log verify`: 0 the log holds, 1 it is broken, 3 the run has
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
		if (args.includes("--json")) io.out(JSON.stringify({ issues: error.issues }));
		else for (const issue of error.issues) io.err(formatIssue(issue));
		return 1;
	}
}
