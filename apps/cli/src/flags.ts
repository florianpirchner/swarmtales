// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The flags of `swt`: the table of the flags and of the commands (`swt --help` is written from it), the flags read
 * once from the arguments, and checked into what a fake run and a live run take.
 */
import { parseArgs } from "node:util";
import { SwtError, type ModelChoice, type RunManifest, type SwtIssue } from "@swarmtales/contracts";
import type { ThinkingLevel } from "@swarmtales/models";
import { badUsage } from "./errors.ts";

// A seed is a 32-bit number: the manifest and the log refuse a larger one, and it would play as its remainder.
const MAX_SEED = 4294967295;
const on = <W extends string>(what: W) => ({ type: "boolean", what }) as const;
const text = <V extends string, W extends string>(value: V, what: W) => ({ type: "string", value, what }) as const;

/**
 * The table of the flags: each as `parseArgs` takes it, with the placeholder of its value and what it does.
 * `swt --help` is written from this table and from `COMMANDS`.
 *
 * @public
 */
export const FLAGS = {
	help: on("print the commands, or with a command its flags and exit codes"),
	fake: on("play with the fake driver: seeded legal calls, no model, no cost"),
	json: on("print the result as one JSON line"),
	seed: text("<n>", "the seed, a whole number from 0 to 4294967295; it wins over the game's own"),
	set: { ...text("<name=json>", "override one param of a game family; may be repeated"), multiple: true as const },
	out: text("<dir>", "the folder the run folder is written into"),
	provider: text("<id>", "the provider of a live run"),
	model: text("<id>", "a model id or an alias of the provider"),
	thinking: text("<level>", "how much the model thinks: off, minimal, low, medium, high"),
	budget: text("<usd>", "the cost cap of a live run in US dollars; a live run needs one"),
	"director-model": { ...text("<name>=<provider>/<model>[:<thinking>[:<output cap>]]", "replace the model of one Director for this run; may be repeated"), multiple: true as const },
	ledger: text("<file>", "the spend ledger the cap must fit under"),
	plan: on("print the plan of an experiment and its caps, and play nothing"),
	purpose: text("<word>", "what the run is for: smoke (the default), pilot, exploratory, confirmatory"),
	replicate: text("<n>", "the index of the repetition; 0 when left out"),
	game: text("<game file>", "the game file of the run"),
	hand: text("<file>", "the JSON-lines file of the Human Hand, or `-` for standard input"),
	"snapshot-at": text("<ticks>", "write a snapshot after these numbers of finished ticks, a comma list"),
	"pause-on": text("<mechanic>.<event>", "pause after the tick in which this event is first written: a snapshot, exit 3"),
	snapshot: text("<file>", "the snapshot to resume from; the latest of the run folder when left out"),
	ticks: text("<n>", "stop after this many finished ticks"),
	previous: text("<run dir>", "the run folder this one was resumed from: the continuity is checked too"),
	depth: text("<plies>", "the search depth of the chess reference engine, 1 to 64; 10 when left out"),
};

const LOOP = ["hand", "snapshot-at", "pause-on"] as const;
const LIVE = ["provider", "model", "thinking", "director-model", "budget", "ledger", "purpose"] as const;
const ERROR = "an error before the work: the issues are printed";

/**
 * The table of the commands, by the words before the one argument: the argument, what the command does, the flags
 * it reads and what its exit codes mean.
 *
 * @public
 */
export const COMMANDS = {
	run: {
		argument: "<game file>",
		what: "play a game into a new run folder: with `--fake`, or with live models under `--budget`",
		flags: ["fake", "seed", "set", "out", "json", ...LOOP, ...LIVE, "replicate"],
		exits: { 0: "the run finished", 1: `${ERROR}; or the log does not verify`, 2: "the run ended with the reason `error`", 3: "the run is paused (the Human Hand has ended, `SWT-X009`, or `--pause-on`); a snapshot is written", 4: "a live run wrote a key value into its folder", 5: "a live run ended at its cost cap" },
	},
	resume: {
		argument: "<run dir>",
		what: "play a run on from a snapshot into a new run folder beside the old one: a fake run, or a live run under `--budget`",
		flags: ["game", "snapshot", "ticks", "out", "json", ...LOOP, ...LIVE],
		exits: { 0: "the run finished", 1: `${ERROR}; or the log does not verify`, 2: "the run ended with the reason `error`", 3: "the run stopped open: paused (the Human Hand ended, `SWT-X009`, or `--pause-on`), or at `--ticks`", 4: "a live run wrote a key value into its folder", 5: "a live run ended at its cost cap" },
	},
	"log verify": { argument: "<run dir>", what: "check the hash chain of a run folder", flags: ["previous", "json"], exits: { 0: "the log holds and the run ended", 1: "the log is broken", 3: "the log holds and the run has no end" } },
	report: { argument: "<run dir>", what: "write the report of a run into its folder", flags: ["game"], exits: { 0: "the report is written", 1: ERROR, 4: "a file of the folder holds a key value (`SWT-X030`)" } },
	replay: { argument: "<run dir>", what: "replay a run from its log and compare; a resumed run from the snapshot of `--previous`", flags: ["game", "previous", "json"], exits: { 0: "the replayed log is equal", 1: "it differs (`SWT-C031`), the run is not replayable (`SWT-T005`, `SWT-T004`), or the folder does not verify" } },
	scan: { argument: "<folder>", what: "look through every file of a folder for the key values of the environment", flags: ["json"], exits: { 0: "no file holds a held key value", 1: "a file does (`SWT-X030`), or the folder is none", 3: "nothing was scanned: no key variable is set" } },
	"experiment run": { argument: "<spec file>", what: "play the runs of an experiment that are still missing", flags: ["out", "ledger", "plan"], exits: { 0: "the plan is complete; with `--plan`, the plan is printed", 1: ERROR, 4: "a run wrote a key value into its folder", 6: "stopped at the experiment's cap, or after three failed runs" } },
	"analyse chess": { argument: "<run dir>", what: "score every half-move of a chess run with the reference engine", flags: ["depth"], exits: { 0: "`analysis.json` and `ANALYSIS.md` are written", 1: ERROR, 4: "a file of the folder holds a key value (`SWT-X030`)" } },
	"experiment analyse": { argument: "<experiment dir>", what: "analyse the runs of an experiment against its pass rule", flags: [], exits: { 0: "the pass rule is kept, or the spec has none", 1: ERROR, 3: "the pass rule is not kept", 4: "a file holds a key value", 7: "no verdict: too few runs" } },
} as const satisfies Readonly<Record<string, CommandRow>>;

interface CommandRow {
	readonly argument: string;
	readonly what: string;
	readonly flags: readonly (keyof typeof FLAGS)[];
	readonly exits: Readonly<Record<number, string>>;
}

/**
 * The words of a command, for example `log verify`.
 *
 * @public
 */
export type CommandName = keyof typeof COMMANDS;

/**
 * Says whether the words are a command.
 *
 * @param words - The words before the argument, joined by one space.
 * @returns True for a key of `COMMANDS`.
 *
 * @public
 */
export function isCommand(words: string): words is CommandName {
	return Object.hasOwn(COMMANDS, words);
}

/**
 * The lines of `swt --help`: every command with its argument, or one command with its flags and exit codes.
 *
 * @param command - The command; all of them when left out.
 * @returns The lines to print.
 *
 * @public
 */
export function helpOf(command?: CommandName): readonly string[] {
	const usage = (name: CommandName): string => `swt ${name} ${COMMANDS[name].argument}`;
	if (command === undefined) {
		const names = Object.keys(COMMANDS).filter(isCommand);
		return ["swt: the command line of Swarm Tales", "", "Commands:", ...names.map((name) => `  ${usage(name).padEnd(42)}${COMMANDS[name].what}`), "", "`swt <command> --help` prints the flags and the exit codes of a command; docs/reference/cli.md has the rest."];
	}
	const row: CommandRow = COMMANDS[command];
	const flags = [...row.flags, "help" as const].map((name) => {
		const flag = FLAGS[name];
		return `  ${`--${name}${"value" in flag ? ` ${flag.value}` : ""}`.padEnd(24)}${flag.what}`;
	});
	return [`${usage(command)} [flags]`, `  ${row.what}`, "", "Flags:", ...flags, "", "Exit codes:", ...Object.entries(row.exits).map(([code, what]) => `  ${code}  ${what}`)];
}

const THINKING: readonly ThinkingLevel[] = ["off", "minimal", "low", "medium", "high"];
const PURPOSES: readonly Purpose[] = ["smoke", "pilot", "exploratory", "confirmatory"];

type Purpose = RunManifest["run"]["purpose"];
type Parsed = ReturnType<typeof parseArgs<{ options: typeof FLAGS; allowPositionals: true }>>;

/**
 * The flags of a command as they were written, before any check of their values.
 *
 * @public
 */
export type Flags = Parsed["values"];

/**
 * What the flags of a live run say, checked.
 *
 * @public
 */
export interface LiveFlags {
	/** `--provider`: the provider id. */
	readonly provider?: string;
	/** `--model`: a model id or an alias of the provider. */
	readonly modelId?: string;
	/** `--thinking`: how much the model thinks. */
	readonly thinking?: ThinkingLevel;
	/** `--budget`: the cost cap of the run in US dollars; a live run without one is refused (`SWT-X005`). */
	readonly budget?: number;
	/** `--ledger`: the spend ledger file the run's cap must fit under (`SWT-C025`); no ledger when absent. */
	readonly ledger?: string;
	/** `--purpose`: what the run is for; `smoke` when absent. */
	readonly purpose: Purpose;
	/** `--replicate`: the index of the repetition; 0 when absent. */
	readonly replicate: number;
	/** `--director-model`: the model of a Director by its name, which replaces the model of its use for this run (decision A52); none when absent. */
	readonly directorModels?: Readonly<Record<string, ModelChoice>>;
}

/**
 * `SWT-C021`: a `--set` that is not `name=json`.
 *
 * @param input - The flag value.
 * @param input.set - What was written after `--set`.
 * @returns The issue.
 *
 * @public
 */
export function badSet(input: { readonly set: string }): SwtIssue {
	return {
		code: "SWT-C021",
		summary: `\`--set ${input.set}\` is not a param name, \`=\` and a JSON value`,
		why: "`--set` overrides one param of a game family, and the value is read as JSON so that a number, a boolean and a string stay apart.",
		fix: 'Write `--set name=value` with a JSON value: `--set games=2`, `--set brain=false`, `--set label=\'"a"\'`.',
	};
}

/**
 * `SWT-C022`: a `--purpose` or a `--thinking` that is none of the known words.
 *
 * @param input - The flag and its value.
 * @param input.flag - The name of the flag, without the dashes.
 * @param input.value - What was written.
 * @param input.known - The words the flag takes.
 * @returns The issue.
 *
 * @public
 */
export function unknownWord(input: { readonly flag: string; readonly value: string; readonly known: readonly string[] }): SwtIssue {
	return { code: "SWT-C022", summary: `\`--${input.flag} ${input.value}\` is none of the values the flag takes`, why: "The value goes into the run manifest, which holds a fixed set of words.", fix: `Use one of: ${input.known.join(", ")}.` };
}

/**
 * Reads the flags and the words before and between them.
 *
 * @param args - The arguments after the program name.
 * @returns The flags as written, and the words that are no flag.
 * @throws SwtError `SWT-C003` for a flag that no command has, or a flag without its value.
 *
 * @public
 */
export function readFlags(args: readonly string[]): { readonly values: Flags; readonly positionals: readonly string[] } {
	try {
		return parseArgs({ args: [...args], options: FLAGS, allowPositionals: true });
	} catch (cause) {
		throw new SwtError(badUsage({ problem: cause instanceof Error ? cause.message : "the arguments cannot be read" }), { cause });
	}
}

/**
 * Reads `--seed`.
 *
 * @param seed - The value as written; absent when the flag is.
 * @returns The seed, or undefined without the flag.
 * @throws SwtError `SWT-C003` when the value is no whole number from 0 to 4294967295.
 *
 * @public
 */
export function seedOf(seed: string | undefined): number | undefined {
	if (seed === undefined) return undefined;
	if (!/^\d+$/.test(seed) || Number(seed) > MAX_SEED) throw new SwtError(badUsage({ problem: `the seed "${seed}" is no whole number from 0 to ${String(MAX_SEED)}` }));
	return Number(seed);
}

/**
 * Reads every `--set name=json` into the overrides of a game family's params. Whether a name is a param, and
 * whether its value fits, is checked by game resolution (`SWT-G041`).
 *
 * @param sets - The values of the flag, in order; a later one wins over an earlier one of the same name.
 * @returns The overrides by param name; empty without the flag.
 * @throws SwtError `SWT-C021`, one issue per value that has no name, no `=` or no JSON value.
 *
 * @public
 */
export function paramsOf(sets: readonly string[] = []): Readonly<Record<string, unknown>> {
	const params = new Map<string, unknown>();
	const issues: SwtIssue[] = [];
	for (const set of sets) {
		const cut = set.indexOf("=");
		try {
			if (cut < 1) throw new SyntaxError("no name");
			params.set(set.slice(0, cut), JSON.parse(set.slice(cut + 1)));
		} catch {
			issues.push(badSet({ set }));
		}
	}
	if (issues.length > 0) throw new SwtError(issues);
	return Object.fromEntries(params);
}

function wordOf<W extends string>(flag: string, value: string | undefined, known: readonly W[]): W | undefined {
	const word = known.find((item) => item === value);
	if (value !== undefined && word === undefined) throw new SwtError(unknownWord({ flag, value, known }));
	return word;
}

// A plain decimal number: `Number` alone would also read "", "0x10" and "1e3".
function numberOf(flag: string, value: string | undefined, form: RegExp, what: string): number | undefined {
	if (value === undefined) return undefined;
	if (!form.test(value)) throw new SwtError(badUsage({ problem: `\`--${flag} ${value}\` is no ${what}` }));
	return Number(value);
}

// `<name>=<provider>/<model>[:<thinking>[:<output cap>]]`; a model id may hold slashes and colons of its own (`:free`), so only a known thinking level ends it.
const DIRECTOR_MODEL = /^([^=]+)=([^/=]+\/.+?)(?::(off|minimal|low|medium|high)(?::([1-9]\d{0,8}))?)?$/;

/**
 * Reads the values of `--director-model`.
 *
 * @param values - The values as written.
 * @returns The model of each named Director, in the form of a game's `model` of a use; the last value of a name wins.
 * @throws SwtError `SWT-C003` for a value of another form. A suffix that is no thinking level is part of the model id.
 *
 * @public
 */
export function directorModelsOf(values: readonly string[]): Readonly<Record<string, ModelChoice>> {
	return Object.fromEntries(
		values.map((value): [string, ModelChoice] => {
			const [, name, id, level, cap] = DIRECTOR_MODEL.exec(value) ?? [];
			if (name === undefined || id === undefined) throw new SwtError(badUsage({ problem: `\`--director-model ${value}\` is no \`<name>=<provider>/<model>[:<thinking>[:<output cap>]]\`` }));
			const thinking = wordOf("thinking", level, THINKING);
			return [name, { id, ...(thinking === undefined ? {} : { thinking }), ...(cap === undefined ? {} : { maxOutputTokens: Number(cap) }) }];
		}),
	);
}

/**
 * Checks the flags of a live run.
 *
 * @param flags - The flags as written.
 * @returns The provider, the model and its thinking level, the cost cap, the spend ledger, the purpose and the replicate.
 * @throws SwtError `SWT-C022` for an unknown `--purpose` or `--thinking`; `SWT-C003` for a `--budget` that is no
 * amount in US dollars or a `--replicate` that is no whole number; what `directorModelsOf` throws.
 *
 * @public
 */
export function liveFlags(flags: Flags): LiveFlags {
	const thinking = wordOf("thinking", flags.thinking, THINKING);
	const budget = numberOf("budget", flags.budget, /^\d+(\.\d+)?$/, "amount in US dollars");
	return {
		...(flags.provider === undefined ? {} : { provider: flags.provider }),
		...(flags.model === undefined ? {} : { modelId: flags.model }),
		...(thinking === undefined ? {} : { thinking }),
		...(budget === undefined ? {} : { budget }),
		...(flags.ledger === undefined ? {} : { ledger: flags.ledger }),
		purpose: wordOf("purpose", flags.purpose, PURPOSES) ?? "smoke",
		replicate: numberOf("replicate", flags.replicate, /^\d{1,9}$/, "whole number from 0") ?? 0,
		...(flags["director-model"] === undefined ? {} : { directorModels: directorModelsOf(flags["director-model"]) }),
	};
}

/**
 * Reads `--hand`, `--snapshot-at` and `--pause-on`, the flags of the run loop.
 *
 * @param flags - The flags as written.
 * @returns The file of the Human Hand (`-` for standard input) when the flag is there, the numbers of finished ticks
 * after which a snapshot is written, and the event of `--pause-on`.
 * @throws SwtError `SWT-C003` for a `--snapshot-at` that is no comma list of whole numbers, and a `--pause-on` that is
 * no `<mechanic>.<event>`.
 *
 * @public
 */
export function loopFlags(flags: Flags): { readonly hand?: string; readonly snapshotAt: readonly number[]; readonly pauseOn?: PauseOn } {
	const ticks = flags["snapshot-at"]?.split(",") ?? [];
	const bad = ticks.find((tick) => !/^\d{1,9}$/.test(tick));
	if (bad !== undefined) throw new SwtError(badUsage({ problem: `\`--snapshot-at ${flags["snapshot-at"] ?? ""}\` is no comma list of whole numbers of ticks` }));
	const pauseOn = flags["pause-on"] === undefined ? undefined : pauseOf(flags["pause-on"]);
	return { ...(flags.hand === undefined ? {} : { hand: flags.hand }), snapshotAt: ticks.map(Number), ...(pauseOn === undefined ? {} : { pauseOn }) };
}

function pauseOf(value: string): PauseOn {
	const [, mechanic, event] = /^([^.\s]+)\.([^.\s]+)$/.exec(value) ?? [];
	if (mechanic === undefined || event === undefined) throw new SwtError(badUsage({ problem: `\`--pause-on ${value}\` is no \`<mechanic>.<event>\`` }));
	return { mechanic, event };
}

/**
 * What `--pause-on` names: an event of one mechanic of the game, by the mechanic's id and the event's type.
 *
 * @public
 */
export interface PauseOn {
	/** The id of the mechanic in the game. */
	readonly mechanic: string;
	/** The type of the event. */
	readonly event: string;
}

/**
 * Reads `--game`, `--snapshot` and `--ticks`, the flags of `swt resume` beside those of the run loop.
 *
 * @param flags - The flags as written.
 * @returns The game file, the snapshot file and the number of finished ticks to stop at, each when its flag is there.
 * @throws SwtError `SWT-C003` for a `--ticks` that is no whole number.
 *
 * @public
 */
export function resumeFlags(flags: Flags): { readonly game?: string; readonly snapshot?: string; readonly ticks?: number } {
	const ticks = numberOf("ticks", flags.ticks, /^\d{1,9}$/, "whole number of ticks");
	return { ...(flags.game === undefined ? {} : { game: flags.game }), ...(flags.snapshot === undefined ? {} : { snapshot: flags.snapshot }), ...(ticks === undefined ? {} : { ticks }) };
}
