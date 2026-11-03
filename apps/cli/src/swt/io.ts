/**
 * What every `swt` noun-verb command shares: where it writes, how it parses its flags, how it
 * prints a table or JSON. A command is a function of its arguments and an `Io`, and returns the
 * exit code, so a test runs it without a process.
 */
import { parseArgs } from "node:util";
import { UsageError } from "../args.ts";

export interface Io {
	out(text: string): void;
	err(text: string): void;
}

/** A command: the words after its name, where to write; the exit code. */
export type CommandRun = (argv: readonly string[], io: Io) => number | Promise<number>;

export const processIo: Io = {
	out: (text) => void process.stdout.write(`${text}\n`),
	err: (text) => void process.stderr.write(`${text}\n`),
};

export interface Parsed {
	readonly positionals: readonly string[];
	readonly flags: Readonly<Record<string, string | boolean | undefined>>;
}

/** Flags every command takes: `--json` for machine-readable output. */
export function parseFlags(argv: readonly string[], extra: Readonly<Record<string, "string" | "boolean">> = {}): Parsed {
	const options: Record<string, { type: "string" | "boolean"; short?: string }> = { json: { type: "boolean" }, help: { type: "boolean", short: "h" } };
	for (const [name, type] of Object.entries(extra)) options[name] = { type };
	try {
		const { values, positionals } = parseArgs({ args: [...argv], options, allowPositionals: true, strict: true });
		return { positionals, flags: values };
	} catch (error) {
		throw new UsageError(error instanceof Error ? error.message : String(error));
	}
}

/** Runs `body`, turning a `UsageError` into a message and exit code 2 with the usage text. */
export async function guarded(io: Io, usage: string, body: () => number | Promise<number>): Promise<number> {
	try {
		return await body();
	} catch (error) {
		if (error instanceof UsageError) {
			io.err(`${error.message}\n\n${usage}`);
			return 2;
		}
		throw error;
	}
}

/** A table with a header row, columns padded to the widest cell. */
export function table(header: readonly string[], rows: readonly (readonly string[])[]): string {
	const all = [header, ...rows];
	const widths = header.map((_, column) => Math.max(...all.map((row) => (row[column] ?? "").length)));
	const line = (row: readonly string[]) => row.map((cell, column) => (column === row.length - 1 ? cell : cell.padEnd(widths[column] ?? 0))).join("  ").trimEnd();
	return all.map(line).join("\n");
}

export function json(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

/** One verb of a noun: what `swt <noun> --help`, `swt --help` and the shell completion show. */
export interface Verb {
	/** Positional arguments and flags, as the usage line writes them, e.g. `<name> [--json]`. */
	readonly args?: string;
	readonly summary: string;
	readonly run: CommandRun;
}

/** A noun with verbs: `swt <noun> <verb> ...`. */
export interface Noun {
	readonly name: string;
	readonly verbs: Readonly<Record<string, Verb>>;
	/** Extra lines under the verbs in the usage text. */
	readonly note?: readonly string[];
}

function usageOf(noun: Noun): string {
	const lines = Object.entries(noun.verbs).map(([verb, { args, summary }]) => [`${verb}${args === undefined ? "" : ` ${args}`}`, summary] as const);
	const width = Math.max(...lines.map(([left]) => left.length));
	return [`Usage: swt ${noun.name} <verb> [options]`, "", ...lines.map(([left, summary]) => `  ${left.padEnd(width)}  ${summary}`), ...(noun.note === undefined ? [] : ["", ...noun.note])].join("\n");
}

/** Runs the verb named first in `argv`; a missing or unknown verb prints the usage. */
export function runNoun(noun: Noun): CommandRun {
	const usage = usageOf(noun);
	return (argv, io) =>
		guarded(io, usage, () => {
			const [verb, ...rest] = argv;
			if (verb === undefined || [verb, ...rest].some((word) => word === "--help" || word === "-h")) {
				io.out(usage);
				return 0;
			}
			const found = Object.hasOwn(noun.verbs, verb) ? noun.verbs[verb] : undefined;
			if (found === undefined) throw new UsageError(`Unknown verb "${verb}"`);
			return found.run(rest, io);
		});
}

export function usd(value: number): string {
	return value.toFixed(4);
}
