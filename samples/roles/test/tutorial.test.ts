// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The README of sample 3 as a test. Every `ts`, `yaml` and `sh` block of the README is an include: its lines stand,
 * in one piece, in the file of the sample that the last link before the block names; so is the `text` block of
 * `output.txt`. The commands of `commands.sh` run in process, in their order: the run prints the lines of
 * `output.txt` and records the four briefings, and it verifies and replays equal.
 */
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, type CliIo } from "@swarmtales/cli/src/main.ts";
import { afterAll, describe, expect, it } from "vitest";
import game from "../game.ts";

const SAMPLE = join(import.meta.dirname, "..");
const PREFIX = "node --conditions development apps/cli/src/bin.ts ";
const LINK = /\]\(([a-z./-]+\.(?:ts|yaml|sh|txt))\)/g;

const linesOf = (file: string): readonly string[] => readFileSync(file, "utf8").trimEnd().split("\n");

/** The included blocks of the README (code, and the printed lines of `output.txt`), each with the file the last link before it names. */
function blocks(): readonly { readonly file: string | undefined; readonly lines: readonly string[] }[] {
	const parts = readFileSync(join(SAMPLE, "README.md"), "utf8").split(/^```/m);
	return parts.flatMap((part, index) => {
		const type = /^(ts|yaml|sh|text)\n/.exec(part)?.[1];
		if (index % 2 === 0 || type === undefined) return [];
		const file = [...parts.slice(0, index).filter((_, at) => at % 2 === 0).join("").matchAll(LINK)].at(-1)?.[1];
		return type !== "text" || file === "output.txt" ? [{ file, lines: part.split("\n").slice(1, -1) }] : [];
	});
}

/** True when `part` stands in `whole` as consecutive lines. */
const within = (part: readonly string[], whole: readonly string[]): boolean => part.length > 0 && whole.some((_, at) => part.every((line, offset) => whole[at + offset] === line));

const cwd = mkdtempSync(join(tmpdir(), "swt-roles-"));
symlinkSync(join(SAMPLE, ".."), join(cwd, "samples"));
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

/** One command of `swt` in process, in the folder of the test, with a clock that stands still. */
async function swt(command: string): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: readonly string[] }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-16T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
	return { code: await main(command.slice(PREFIX.length).split(" "), io), out, err };
}

describe("the README of sample 3", () => {
	it("every ts and sh block, and the block of printed lines, stands in a file of the sample", () => {
		const found = blocks();
		expect(found.map((block) => block.file)).toEqual(["commands.sh", "output.txt", "game.ts", "game.ts", "game.ts"]);
		expect(found.filter((block) => block.file === undefined || !within(block.lines, linesOf(join(SAMPLE, block.file)))).map((block) => block.file ?? "(no link)")).toEqual([]);
		expect(within(["a line of no file"], linesOf(join(SAMPLE, "game.ts")))).toBe(false);
	});

	it("the commands run as the README says, and the run folder records every resident's briefing", async () => {
		const commands = linesOf(join(SAMPLE, "commands.sh")).filter((line) => line.startsWith(PREFIX));
		const printed: (readonly string[])[] = [];
		for (const command of commands) {
			const { code, out, err } = await swt(command);
			expect([command, code, err]).toEqual([command, 0, []]);
			printed.push(out);
		}
		expect(commands).toHaveLength(3);
		expect(printed[0]?.slice(0, 3)).toEqual(linesOf(join(SAMPLE, "output.txt")));
		expect(printed[1]).toEqual([expect.stringMatching(/^ok, \d+ lines, head [0-9a-f]{64}$/)]);
		expect(printed[2]).toEqual([expect.stringMatching(/^equal, \d+ lines$/)]);
		const texts: unknown = JSON.parse(readFileSync(join(cwd, "runs/roles-001/texts.json"), "utf8"));
		expect(texts).toMatchObject(Object.fromEntries(Object.entries(game.briefing ?? {}).map(([id, text]) => [`briefing/resident:${id}`, text])));
	});
});
