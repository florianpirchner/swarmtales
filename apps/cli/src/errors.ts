// SPDX-License-Identifier: Apache-2.0
/**
 * The C codes of the commands: `SWT-C003`, `SWT-C010` and `SWT-C020`. `SWT-C001` and `SWT-C002` are beside the game
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
		why: "The commands are `swt run <game file> --fake [--seed n] [--out dir] [--json]` and `swt log verify <run dir> [--json]`; a seed is a whole number from 0 to 4294967295.",
		fix: "Write the command in one of the two forms.",
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
