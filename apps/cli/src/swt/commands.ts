/**
 * The command table of `swt` (docs/ideas/monorepo.md §3c) and the function that runs it. Noun-verb
 * commands (`story list`, `run show`, ...) are functions of their arguments and an `Io`. The older
 * commands (`run`, `report run`, `digest`, ...) are modules that read `process.argv` and run on
 * import, as `pnpm start` and the `report:*` scripts always did; `legacy` wraps them.
 */
import { archetypeNoun } from "./archetype-cmd.ts";
import { completionCommand, type CommandTree } from "./completion.ts";
import { doctorCommand } from "./doctor.ts";
import { runNoun, type CommandRun, type Io, type Noun } from "./io.ts";
import { moduleNoun } from "./module-cmd.ts";
import { promptNoun } from "./prompt-cmd.ts";
import { runInfoNoun } from "./run-cmd.ts";
import { storyNoun } from "./story-cmd.ts";

interface Command {
	/** The words that select it, e.g. `["report", "run"]`. */
	readonly words: readonly string[];
	readonly summary: string;
	readonly run: CommandRun;
}

/** A module that parses `process.argv.slice(2)` itself: leave it only its own options. */
function legacy(load: () => Promise<unknown>): CommandRun {
	return async (argv) => {
		process.argv = [...process.argv.slice(0, 2), ...argv];
		await load();
		return typeof process.exitCode === "number" ? process.exitCode : 0;
	};
}

const NOUNS: readonly Noun[] = [storyNoun, runInfoNoun, moduleNoun, promptNoun, archetypeNoun];

function nounCommands(noun: Noun): readonly Command[] {
	const run = runNoun(noun);
	return [
		...Object.entries(noun.verbs).map(([verb, { args, summary }]) => ({ words: [noun.name, verb], summary: `${args === undefined ? "" : `${args}: `}${summary}`, run: (rest: readonly string[], io: Io) => run([verb, ...rest], io) })),
		// `swt story` alone, or with a verb that does not exist: the noun's usage.
		{ words: [noun.name], summary: `see \`swt ${noun.name} --help\``, run },
	];
}

const PLAY = legacy(() => import("../main.ts"));

const BASE: readonly Command[] = [
	// `run list|show|cost` read a run; `run start` and a bare `run --story x` play one.
	...nounCommands(runInfoNoun).filter((command) => command.words.length === 2),
	{ words: ["run", "start"], summary: "play a story (pnpm start)", run: PLAY },
	{ words: ["run"], summary: "play a story, as `run start` (pnpm start)", run: PLAY },
	...NOUNS.filter((noun) => noun !== runInfoNoun).flatMap(nounCommands),
	{ words: ["validate"], summary: "validate every registered story and the prompt library (pnpm validate)", run: legacy(() => import("../validate.ts")) },
	{ words: ["report", "minutes"], summary: "rebuild minutes.md of a run (pnpm report:minutes)", run: legacy(() => import("../report.ts")) },
	{ words: ["report", "run"], summary: "write REPORT.md of a run (pnpm report:run)", run: legacy(() => import("../run-report.ts")) },
	{ words: ["report", "private"], summary: "write the private report of a run (pnpm report:private)", run: legacy(() => import("../private-report.ts")) },
	{ words: ["log", "verify"], summary: "check the signed event log of a run (pnpm log:verify)", run: legacy(() => import("../log-verify.ts")) },
	{ words: ["digest"], summary: "turn a run into a readable story (pnpm digest)", run: legacy(() => import("../digest.ts")) },
	{ words: ["novel"], summary: "write a novel from a run (pnpm novel)", run: legacy(() => import("../novel.ts")) },
	{
		words: ["migrate", "gamemaker"],
		summary: "migrate a gamemaker snapshot (pnpm migrate:gamemaker)",
		run: async (argv) => {
			(await import("../migrate-gamemaker.ts")).main([...argv]);
			return 0;
		},
	},
	{ words: ["doctor"], summary: "check node, the prompt library and which provider keys are set (never printed)", run: doctorCommand },
];

/** First word to the second words that follow it, for the shell completion. */
function treeOf(commands: readonly Command[]): CommandTree {
	const tree: Record<string, string[]> = {};
	for (const { words } of commands) {
		const [first, second] = words;
		if (first === undefined) continue;
		const verbs = (tree[first] ??= []);
		if (second !== undefined && !verbs.includes(second)) verbs.push(second);
	}
	return tree;
}

const COMMANDS: readonly Command[] = [...BASE, { words: ["completion"], summary: "print a completion script: bash, zsh or fish", run: completionCommand(treeOf(BASE)) }];

function usage(): string {
	const shown = COMMANDS.filter((command) => !(command.words.length === 1 && NOUNS.some((noun) => noun.name === command.words[0] && noun !== runInfoNoun)));
	const width = Math.max(...shown.map((command) => command.words.join(" ").length));
	return [
		"Usage: swt <command> [options]",
		"",
		"Commands:",
		...shown.map((command) => `  ${command.words.join(" ").padEnd(width)}  ${command.summary}`),
		"",
		"Run `swt <command> --help` for the options of one command; `swt <noun>` lists its verbs.",
	].join("\n");
}

function select(argv: readonly string[]): { readonly command: Command; readonly rest: readonly string[] } | undefined {
	for (const command of COMMANDS) {
		if (command.words.every((word, index) => argv[index] === word)) return { command, rest: argv.slice(command.words.length) };
	}
	return undefined;
}

/** Runs `swt` with the arguments after the binary name; the exit code. */
export async function execute(argv: readonly string[], io: Io): Promise<number> {
	if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
		io.out(usage());
		return 0;
	}
	const selected = select(argv);
	if (selected === undefined) {
		io.err(`Unknown command "${argv.join(" ")}".\n\n${usage()}`);
		return 1;
	}
	return selected.command.run(selected.rest, io);
}
