// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tutorial `docs/tutorials/mechanic.md` as a test. Every code block of the tutorial is an include: its lines
 * stand, in one piece, in the file of the sample that the last link before the block names. The READMEs of `exile`
 * and `decisions` hold blocks of the sample too: each block whose last link before it names a file of the sample is
 * an include of that file. The commands of `commands.sh` run in process, in their order; the first prints the lines
 * of `output.txt`.
 */
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, type CliIo } from "@swarmtales/cli/src/main.ts";
import { afterAll, describe, expect, it } from "vitest";

const SAMPLE = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SAMPLE, "..", "..");
const PREFIX = "node --conditions development apps/cli/src/bin.ts ";
const SAMPLE_LINK = /\]\(\.\.\/\.\.\/samples\/own-mechanic\/([^)#]+)\)/g;
const ANY_LINK = /\]\(([^)#]+)\)/g;

/** One code block: the sample file it is an include of, or undefined when the last link before it names none. */
interface Block { readonly file: string | undefined; readonly lines: readonly string[] }

const linesOf = (file: string): readonly string[] => readFileSync(file, "utf8").trimEnd().split("\n");

/** The code blocks of a document, each with the sample file that the last link (of `links`) before it names. */
function blocks(document: string, links: RegExp): readonly Block[] {
	const parts = readFileSync(join(ROOT, document), "utf8").split(/^```/m);
	return parts.flatMap((part, index) => {
		if (index % 2 === 0) return [];
		const before = parts.slice(0, index).filter((_, at) => at % 2 === 0).join("");
		const last = [...before.matchAll(links)].at(-1)?.[0] ?? "";
		return [{ file: [...last.matchAll(SAMPLE_LINK)].at(0)?.[1], lines: part.split("\n").slice(1, -1) }];
	});
}

/** True when `part` stands in `whole` as consecutive lines. */
const within = (part: readonly string[], whole: readonly string[]): boolean => whole.some((_, at) => part.length > 0 && part.every((line, offset) => whole[at + offset] === line));

/** The blocks that are not an include of the file they name. */
const strays = (found: readonly Block[]): readonly string[] => found.filter((block) => block.file === undefined || !within(block.lines, linesOf(join(SAMPLE, block.file)))).map((block) => block.file ?? "(no link)");

/** The blocks of a mechanic's README that name a file of the sample. */
const included = (readme: string): readonly Block[] => blocks(readme, ANY_LINK).filter((block) => block.file !== undefined);

const cwd = mkdtempSync(join(tmpdir(), "swt-own-mechanic-"));
symlinkSync(join(SAMPLE, ".."), join(cwd, "samples"));
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

/** One command of `swt` in process, in the folder of the test, with a clock that stands still. */
async function swt(args: readonly string[]): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: readonly string[] }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-15T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
	return { code: await main(args, io), out, err };
}

describe("the tutorial of sample 5", () => {
	it("every code block of the tutorial is an include of a file of the sample", () => {
		const found = blocks("docs/tutorials/mechanic.md", SAMPLE_LINK);
		expect(found.length).toBeGreaterThan(10);
		expect(strays(found)).toEqual([]);
	});

	it("the READMEs of exile and decisions include the listener and the owner from the sample", () => {
		const exile = included("mechanics/exile/README.md");
		const decisions = included("mechanics/decisions/README.md");
		expect([exile.length, decisions.length]).toEqual([2, 2]);
		expect(strays([...exile, ...decisions])).toEqual([]);
		expect(exile.some((block) => block.lines.some((line) => line.includes('{ after: ["marks"] }')))).toBe(true);
		expect(decisions.some((block) => block.lines.some((line) => line.includes('"decision_settled"')))).toBe(true);
	});

	it("finds a block that is not an include", () => {
		const changed = [...blocks("docs/tutorials/mechanic.md", SAMPLE_LINK), ...included("mechanics/exile/README.md")].map((block) => ({ ...block, lines: [...block.lines, "// a line of no file"] }));
		expect(strays(changed)).toHaveLength(changed.length);
		expect(strays([{ file: undefined, lines: ["const a = 1;"] }])).toEqual(["(no link)"]);
	});

	it("the commands run as the tutorial says: the fake run prints its lines, verifies and replays equal", async () => {
		const commands = linesOf(join(SAMPLE, "commands.sh")).filter((line) => line.startsWith(PREFIX));
		const printed: (readonly string[])[] = [];
		for (const command of commands) {
			const { code, out, err } = await swt(command.slice(PREFIX.length).split(" "));
			expect([command, code, err]).toEqual([command, 0, []]);
			printed.push(out);
		}
		expect(commands).toHaveLength(3);
		expect(printed[0]?.slice(0, 2)).toEqual(linesOf(join(SAMPLE, "output.txt")));
		expect(printed[1]).toEqual([expect.stringMatching(/^ok, \d+ lines, head [0-9a-f]{64}$/)]);
		expect(printed[2]).toEqual([expect.stringMatching(/^equal, \d+ lines$/)]);
		const sentenced = linesOf(join(cwd, "runs/own-mechanic-001/events.jsonl")).filter((line) => line.includes('"type":"sentenced"'));
		expect(sentenced).toHaveLength(1);
		expect(sentenced[0]).toContain('"payload":{"changed":false,"exiled":true,"resident":"A02"}');
	});
});
