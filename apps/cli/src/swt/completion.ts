/**
 * `swt completion bash|zsh|fish`: a completion script for the command words. It completes the first
 * word (a command or noun) and the second (a verb) from the same table `swt --help` prints, so a
 * new command is completed without touching this file. Install, e.g.:
 * `swt completion bash > ~/.local/share/bash-completion/completions/swt`.
 */
import { UsageError } from "../args.ts";
import { guarded, parseFlags, type CommandRun } from "./io.ts";

/** First word to the second words that follow it (empty for a command with none). */
export type CommandTree = Readonly<Record<string, readonly string[]>>;

const BINARIES = ["swt", "swarmtales"];
const SHELLS = ["bash", "zsh", "fish"] as const;
type Shell = (typeof SHELLS)[number];

function bash(tree: CommandTree): string {
	const cases = Object.entries(tree)
		.filter(([, verbs]) => verbs.length > 0)
		.map(([word, verbs]) => `    ${word}) COMPREPLY=($(compgen -W "${verbs.join(" ")}" -- "$cur")) ;;`);
	return [
		"# bash completion for swt (swt completion bash)",
		"_swt() {",
		'  local cur="${COMP_WORDS[COMP_CWORD]}"',
		'  if [ "$COMP_CWORD" -eq 1 ]; then',
		`    COMPREPLY=($(compgen -W "${Object.keys(tree).join(" ")}" -- "$cur"))`,
		"    return",
		"  fi",
		'  if [ "$COMP_CWORD" -eq 2 ]; then',
		'    case "${COMP_WORDS[1]}" in',
		...cases,
		"    esac",
		"  fi",
		"}",
		`complete -F _swt ${BINARIES.join(" ")}`,
	].join("\n");
}

function zsh(tree: CommandTree): string {
	const cases = Object.entries(tree)
		.filter(([, verbs]) => verbs.length > 0)
		.map(([word, verbs]) => `      ${word}) compadd -- ${verbs.join(" ")} ;;`);
	return [
		`#compdef ${BINARIES.join(" ")}`,
		"# zsh completion for swt (swt completion zsh)",
		"_swt() {",
		"  if (( CURRENT == 2 )); then",
		`    compadd -- ${Object.keys(tree).join(" ")}`,
		"  elif (( CURRENT == 3 )); then",
		"    case $words[2] in",
		...cases,
		"    esac",
		"  fi",
		"}",
		'_swt "$@"',
	].join("\n");
}

function fish(tree: CommandTree): string {
	return [
		"# fish completion for swt (swt completion fish)",
		...BINARIES.flatMap((binary) => [
			`complete -c ${binary} -f`,
			`complete -c ${binary} -n '__fish_use_subcommand' -a '${Object.keys(tree).join(" ")}'`,
			...Object.entries(tree)
				.filter(([, verbs]) => verbs.length > 0)
				.map(([word, verbs]) => `complete -c ${binary} -n '__fish_seen_subcommand_from ${word}' -a '${verbs.join(" ")}'`),
		]),
	].join("\n");
}

const SCRIPTS: Readonly<Record<Shell, (tree: CommandTree) => string>> = { bash, zsh, fish };

const USAGE = `Usage: swt completion <${SHELLS.join("|")}>`;

export function completionCommand(tree: CommandTree): CommandRun {
	return (argv, io) =>
		guarded(io, USAGE, () => {
			const { positionals } = parseFlags(argv);
			const [shell, ...rest] = positionals;
			const script = SHELLS.find((candidate) => candidate === shell);
			if (script === undefined || rest.length > 0) throw new UsageError(`Name one shell: ${SHELLS.join(", ")}`);
			io.out(SCRIPTS[script](tree));
			return 0;
		});
}
