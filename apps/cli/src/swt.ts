#!/usr/bin/env node
/**
 * `swt` (alias `swarmtales`): the one binary. It names a command and hands the rest of the command
 * line to the module that has always run it, so `swt run --story whispers` is `pnpm start --story
 * whispers`. The noun-and-verb command set of docs/ideas/monorepo.md §3c grows from here.
 */

interface Command {
	/** The words that select it, e.g. `["report", "run"]`. */
	readonly words: readonly string[];
	readonly summary: string;
	/** Runs the command; the modules read `process.argv` themselves. */
	readonly load: () => Promise<unknown>;
}

const COMMANDS: readonly Command[] = [
	{ words: ["run"], summary: "play a story (pnpm start)", load: () => import("./main.ts") },
	{ words: ["validate"], summary: "validate every registered story and the prompt library (pnpm validate)", load: () => import("./validate.ts") },
	{ words: ["report", "minutes"], summary: "rebuild minutes.md of a run (pnpm report:minutes)", load: () => import("./report.ts") },
	{ words: ["report", "run"], summary: "write REPORT.md of a run (pnpm report:run)", load: () => import("./run-report.ts") },
	{ words: ["report", "private"], summary: "write the private report of a run (pnpm report:private)", load: () => import("./private-report.ts") },
	{ words: ["log", "verify"], summary: "check the signed event log of a run (pnpm log:verify)", load: () => import("./log-verify.ts") },
	{ words: ["digest"], summary: "turn a run into a readable story (pnpm digest)", load: () => import("./digest.ts") },
	{ words: ["novel"], summary: "write a novel from a run (pnpm novel)", load: () => import("./novel.ts") },
	{ words: ["migrate", "gamemaker"], summary: "migrate a gamemaker snapshot (pnpm migrate:gamemaker)", load: async () => {
		(await import("./migrate-gamemaker.ts")).main(process.argv.slice(2));
	} },
];

function usage(): string {
	const width = Math.max(...COMMANDS.map((command) => command.words.join(" ").length));
	return [
		"Usage: swt <command> [options]",
		"",
		"Commands:",
		...COMMANDS.map((command) => `  ${command.words.join(" ").padEnd(width)}  ${command.summary}`),
		"",
		"Run `swt <command> --help` for the options of one command.",
	].join("\n");
}

function select(argv: readonly string[]): { readonly command: Command; readonly rest: readonly string[] } | undefined {
	for (const command of COMMANDS) {
		if (command.words.every((word, index) => argv[index] === word)) return { command, rest: argv.slice(command.words.length) };
	}
	return undefined;
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
	process.stdout.write(`${usage()}\n`);
} else {
	const selected = select(argv);
	if (selected === undefined) {
		process.stderr.write(`Unknown command "${argv.join(" ")}".\n\n${usage()}\n`);
		process.exitCode = 1;
	} else {
		// The command modules parse `process.argv.slice(2)`: leave them only their own options.
		process.argv = [...process.argv.slice(0, 2), ...selected.rest];
		await selected.command.load();
	}
}
