// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rename of original games (`13-m6-spec.md` 4.4, issue M6-05). `node scripts/rename/rename.ts` is the dry run:
 * it lists every move, every changed line and every line that keeps an old id by an exception, and exits 1 on a
 * clash. `--apply` writes the lines, moves the folders and files with `git mv`, then runs the install (offline) and
 * the generators (`pnpm docs:mechanics`, `pnpm docs:games`, then `pnpm build` and `pnpm api:update`, whose reports
 * read the built types); `--no-generators` leaves them out. `--root <dir>` renames another tree. The apply commits
 * nothing.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { planRename, type Plan } from "./plan.ts";
import { EXCEPTIONS, RENAMES } from "./table.ts";

/** The steps an apply runs after the moves, in order. */
export const GENERATORS: readonly (readonly string[])[] = [["install", "--offline"], ["docs:mechanics"], ["docs:games"], ["build"], ["api:update"]];

function run(root: string, command: string, args: readonly string[]): void {
	const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
	if (result.status !== 0) throw new Error(`rename: \`${command} ${args.join(" ")}\` failed in ${root}`);
}

/**
 * Applies a plan to a tree: the changed lines first, then the moves in their order.
 *
 * @param root - The tree's root, a git work tree.
 * @param plan - The plan of {@link planRename} for that tree.
 * @param generators - Whether the install and the generators run after the moves.
 * @throws Error on a plan with a clash, or when `git mv` or a generator fails.
 */
export function applyRename(root: string, plan: Plan, generators: boolean): void {
	if (plan.clashes.length > 0) throw new Error(`rename: ${String(plan.clashes.length)} clash(es), nothing applied: ${plan.clashes.join("; ")}`);
	for (const path of new Set(plan.edits.map((edit) => edit.path))) {
		const lines = readFileSync(join(root, path), "utf8").split("\n");
		for (const edit of plan.edits.filter((one) => one.path === path)) lines[edit.line - 1] = edit.after;
		writeFileSync(join(root, path), lines.join("\n"));
	}
	for (const move of plan.moves) {
		mkdirSync(dirname(join(root, move.to)), { recursive: true });
		run(root, "git", ["mv", move.from, move.to]);
	}
	if (generators) for (const args of GENERATORS) run(root, "pnpm", args);
}

/**
 * The dry run as text: the moves, the changed lines, the kept lines and the clashes, then a count.
 *
 * @param plan - The plan.
 * @returns The lines to print.
 */
export function describePlan(plan: Plan): readonly string[] {
	return [
		...plan.moves.map((move) => `move ${move.from} -> ${move.to}`),
		...plan.edits.flatMap((edit) => [`edit ${edit.path}:${String(edit.line)}`, `  - ${edit.before.trim()}`, `  + ${edit.after.trim()}`]),
		...plan.kept.map((kept) => `keep ${kept.path}:${String(kept.line)} (${kept.reason}): ${kept.text.trim()}`),
		...plan.clashes.map((clash) => `clash ${clash}`),
		`${String(plan.moves.length)} moves, ${String(plan.edits.length)} changed lines in ${String(new Set(plan.edits.map((edit) => edit.path)).size)} files, ${String(plan.kept.length)} kept lines, ${String(plan.clashes.length)} clashes`,
	];
}

if (import.meta.main) {
	const at = process.argv.indexOf("--root");
	const root = at < 0 ? REPO_ROOT : resolve(process.argv[at + 1] ?? ".");
	const plan = planRename(root, RENAMES, EXCEPTIONS);
	for (const line of describePlan(plan)) console.log(line);
	if (process.argv.includes("--apply")) applyRename(root, plan, !process.argv.includes("--no-generators"));
	process.exitCode = plan.clashes.length === 0 ? 0 : 1;
}
