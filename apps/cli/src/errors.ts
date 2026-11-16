// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The C codes of the commands: `SWT-C003`, `SWT-C010`, `SWT-C020`, `SWT-C024`, `SWT-C026` and `SWT-C034`.`SWT-C001` and `SWT-C002` are beside the game
 * file loader (`load-game.ts`), `SWT-C030` beside the installed table (`installed.ts`).
 */
import type { SwtIssue } from "@swarmtales/contracts";

/**
 * `SWT-C003`: the command line cannot be read: an unknown command or flag, a missing argument, a bad flag value.
 *
 * @param input - What is wrong.
 * @param input.problem - What is wrong, as one sentence without a full stop.
 * @returns The issue.
 *
 * @public
 */
export function badUsage(input: { readonly problem: string }): SwtIssue {
	return {
		code: "SWT-C003",
		summary: input.problem,
		why: "The commands are `swt run <game file>` (with `--fake`, or with `--budget <usd>` for a live run; `--hand <file>` and `--snapshot-at <ticks>` for the Human Hand and snapshots), `swt resume <run dir> --game <game file>` (with `--snapshot <file>`, `--ticks <n>`, `--out <dir>`, `--hand` and `--snapshot-at`), `swt log verify <run dir> [--previous <run dir>]`, `swt report <run dir> [--game <game file>]`, `swt replay <run dir> --game <game file>`, `swt scan <folder>`, `swt experiment run <spec file> [--out dir] [--ledger file]` and `swt experiment analyse <experiment dir>`; a seed is a whole number from 0 to 4294967295.",
		fix: "Write the command in one of these forms; `swt --help` lists the commands, and `swt <command> --help` the flags and the exit codes of one.",
	};
}

/**
 * `SWT-C010`, a warning: the fake driver cannot call a granted tool, because the tool has no `sample`.
 *
 * @param input - The tool.
 * @param input.tool - The shown name of the tool.
 * @param input.grant - The grant that holds it.
 * @returns The issue.
 *
 * @public
 */
export function toolWithoutSample(input: { readonly tool: string; readonly grant: string }): SwtIssue {
	return {
		code: "SWT-C010",
		summary: `the tool "${input.tool}" of the grant "${input.grant}" has no \`sample\`, so \`--fake\` never calls it`,
		why: "The fake driver plays seeded legal calls from the `sample` function of each tool; the run still plays without the tool.",
		fix: "Give the tool a `sample` in the body of its mechanic.",
	};
}

/**
 * `SWT-C020`: a run with live models was asked for.
 *
 * @returns The issue.
 *
 * @public
 */
export function liveRunTooEarly(): SwtIssue {
	return {
		code: "SWT-C020",
		summary: "a run without `--fake` needs live models, which this milestone does not have",
		why: "At milestone M1 the command line plays a game with the fake driver only; model drivers arrive with M2.",
		fix: "Add `--fake` to the command.",
	};
}

/**
 * `SWT-C024`: an experiment file is not there: the spec file, or the state file of an experiment's folder.
 *
 * @param input - What is missing.
 * @param input.path - The file or the folder that was looked at.
 * @param input.what - What was expected there.
 * @returns The issue.
 *
 * @public
 */
export function experimentNotFound(input: { readonly path: string; readonly what: string }): SwtIssue {
	return {
		code: "SWT-C024",
		summary: `there is no ${input.what} at "${input.path}"`,
		why: "`swt experiment run` reads the spec file of an experiment, and `swt experiment analyse` the folder that `swt experiment run` wrote.",
		fix: "Give the path of a spec file (for example `games/quarry/experiments/open-quarries.json`), or the folder that holds `experiment.json`.",
		where: { file: input.path },
	};
}

/**
 * `SWT-C026`: a `--director-model` names no Director of the game.
 *
 * @param input - The name and the Directors there are.
 * @param input.name - The name the flag gave.
 * @param input.known - The names of the game's Directors.
 * @returns The issue.
 *
 * @public
 */
export function noSuchDirector(input: { readonly name: string; readonly known: readonly string[] }): SwtIssue {
	return {
		code: "SWT-C026",
		summary: `\`--director-model ${input.name}=...\` names no Director of the game`,
		why: "The flag replaces the model of one Director of this game for the run (decision A52); a name of no Director would replace nothing.",
		fix: input.known.length === 0 ? "The game has no Director: leave the flag out." : `Name one of the game's Directors: ${input.known.join(", ")}.`,
	};
}

/**
 * `SWT-C034`: `swt resume --ticks <n>` with an `n` that is not above the finished ticks of the snapshot.
 *
 * @param input - The flag and the snapshot.
 * @param input.ticks - The value of `--ticks`.
 * @param input.tick - The finished ticks of the snapshot.
 * @param input.file - The snapshot file.
 * @returns The issue.
 *
 * @public
 */
export function ticksBehind(input: { readonly ticks: number; readonly tick: number; readonly file: string }): SwtIssue {
	return {
		code: "SWT-C034",
		summary: `\`--ticks ${String(input.ticks)}\` is not above the ${String(input.tick)} finished ticks of the snapshot, so the resume would play no tick`,
		why: "`--ticks` counts the finished ticks of the whole run, those before the snapshot included (decision A111), so the loop stops at once when the snapshot is already there.",
		fix: `Give \`--ticks\` the ticks of the snapshot plus the ticks to play, for example \`--ticks ${String(input.tick + 1)}\` for one more tick, or leave it out to play to the end.`,
		where: { file: input.file },
	};
}
