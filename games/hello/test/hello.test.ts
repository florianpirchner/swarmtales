// SPDX-License-Identifier: Apache-2.0
/**
 * The Hello Game (sample 1): it plays to the end with the fake driver, one activation per move; `swt run --fake`
 * writes a run folder whose log verifies; and the README shows the game file itself and a line the command prints.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeDriver, play } from "@swarmtales/testkit";
import { afterAll, describe, expect, it } from "vitest";
import game from "../game.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const GAME_FILE = join(import.meta.dirname, "..", "game.ts");
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const out = mkdtempSync(join(tmpdir(), "swt-hello-"));
afterAll(() => {
	rmSync(out, { recursive: true, force: true });
});

/**
 * Runs the `swt` program as a reader of the README does, from the repository root.
 *
 * @param args - The arguments of `swt`.
 * @returns The lines it printed.
 * @throws Error When the program exits with another code than 0.
 */
function swt(...args: readonly string[]): readonly string[] {
	return execFileSync(process.execPath, ["--conditions", "development", "apps/cli/src/bin.ts", ...args], { cwd: ROOT, encoding: "utf8" }).trimEnd().split("\n");
}

// The lines of the game file that are code: no comment, no blank line.
const codeLines = (text: string): readonly string[] => text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("//"));

describe("the Hello Game", () => {
	it.each(SEEDS)("seed %i: the match ends by its run limit, with one activation per move, between 5 and 9", async (seed) => {
		const { end, events, kernel } = await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		const count = (type: string): number => events.filter((event) => event.type === type).length;
		expect(end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
		expect(count("match_ended")).toBe(1);
		expect(count("activation_opened")).toBeGreaterThanOrEqual(5);
		expect(count("activation_opened")).toBeLessThanOrEqual(9);
		expect(count("activation_opened")).toBe(count("move_played"));
		expect(count("tool_refused")).toBe(0);
		expect(Object.values(kernel.fact("grid-game.tally") ?? {})).toHaveLength(3);
	});

	it("does not play the same match at every seed", async () => {
		const lengths = await Promise.all(SEEDS.map(async (seed) => (await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) })).events.length));
		expect(new Set(lengths).size).toBeGreaterThan(1);
	});

	it("plays to the end with `swt run --fake`, and the log of the run folder verifies", () => {
		const lines = swt("run", GAME_FILE, "--fake", "--out", out);
		const head = /head ([0-9a-f]{64})$/.exec(lines[3] ?? "")?.[1] ?? "?";
		expect(lines.slice(0, 4)).toEqual([
			"fake models: no result",
			"hello-game seed 1: ended after 6 ticks (limit grid-game.match: the match is over)",
			'result grid-game.tally: {"X":1,"O":0,"draw":0}',
			`log verified: 90 lines, head ${head}`,
		]);
		expect(swt("log", "verify", join(out, "hello-game-001"))).toEqual([`ok, 90 lines, head ${head}`]);
		const opened = readFileSync(join(out, "hello-game-001", "events.jsonl"), "utf8").split("\n").filter((line) => line.includes('"type":"activation_opened"'));
		expect(opened).toHaveLength(9);
	});
});

describe("sample 1 in the README", () => {
	const file = readFileSync(GAME_FILE, "utf8");
	const readme = readFileSync(join(ROOT, "README.md"), "utf8");

	it("the game file has eleven code lines", () => {
		expect(codeLines(file)).toHaveLength(11);
	});

	it("the code block of the README is the game file, without its licence line", () => {
		const block = /```ts\n([\s\S]*?)```/.exec(readme)?.[1];
		expect(block).toBe(file.replace("// SPDX-License-Identifier: Apache-2.0\n", ""));
		expect(readme.match(/```ts\n/g)).toHaveLength(1);
	});

	it("the README names the command and shows the lines it prints", () => {
		expect(readme).toContain("apps/cli/src/bin.ts run games/hello/game.ts --fake");
		expect(readme).toContain("hello-game seed 1: ended after 6 ticks (limit grid-game.match: the match is over)");
		expect(readme).toContain('result grid-game.tally: {"X":1,"O":0,"draw":0}');
	});
});
