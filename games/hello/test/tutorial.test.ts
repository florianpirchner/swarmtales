// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tutorial test of sample 1 (`13-m6-spec.md` 3.5): the game tutorial `docs/tutorials/game.md` shows the game file
 * and the command of this folder's README, and the tutorials gate (`scripts/gates/tutorials.test.ts`) checks that
 * each block is an include. This test runs the commands of the README's `bash` blocks as a reader does, from the root
 * of the repository, in a folder of its own for the runs: each exits 0 and prints the end and the result.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PREFIX = "node --conditions development apps/cli/src/bin.ts ";
const out = mkdtempSync(join(tmpdir(), "swt-hello-tutorial-"));
afterAll(() => {
	rmSync(out, { recursive: true, force: true });
});

/** The command lines of the `bash` blocks of the README. */
const commands = (readme: string): readonly string[] =>
	readme
		.split(/^```/m)
		.filter((part, index) => index % 2 === 1 && part.startsWith("bash\n"))
		.flatMap((part) => part.split("\n").filter((line) => line.startsWith(PREFIX)));

describe("the tutorial of sample 1", () => {
	it("the command of the README plays the game with the fake model and prints its end and result", () => {
		const lines = commands(readFileSync(join(import.meta.dirname, "..", "README.md"), "utf8"));
		expect(lines).toEqual([`${PREFIX}run games/hello/game.ts --fake`]);
		for (const line of lines) {
			const args = [...line.slice("node ".length).split(" "), "--out", out];
			const { status, stdout, stderr } = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
			expect([line, status, stderr]).toEqual([line, 0, ""]);
			expect(stdout.split("\n").slice(0, 3)).toEqual([
				"fake models: no result",
				"hello-game seed 1: ended after 6 ticks (limit grid.match: the match is over)",
				'result grid.tally: {"X":1,"O":0,"draw":0}',
			]);
		}
	});
});
