// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Test 11 of section 3.7 of the M4 specification: the tutorial `docs/tutorials/scheduler.md` as a test. Every code
 * block of the tutorial is an include: its lines stand, in one piece, in the file of the sample that the last link
 * before the block names.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SAMPLE = fileURLToPath(new URL("..", import.meta.url));
const TUTORIAL = fileURLToPath(new URL("../../../docs/tutorials/scheduler.md", import.meta.url));
const LINK = /\]\(\.\.\/\.\.\/samples\/own-scheduler\/([^)#]+)\)/g;

const linesOf = (file: string): readonly string[] => readFileSync(file, "utf8").trimEnd().split("\n");

/** The code blocks of the tutorial, each with the sample file the last link before it names. */
function blocks(): readonly { readonly file: string; readonly lines: readonly string[] }[] {
	const parts = readFileSync(TUTORIAL, "utf8").split(/^```/m);
	return parts.flatMap((part, index) => {
		if (index % 2 === 0) return [];
		const before = parts.slice(0, index).filter((_, at) => at % 2 === 0).join("");
		const file = [...before.matchAll(LINK)].at(-1)?.[1] ?? "(no link)";
		return [{ file, lines: part.split("\n").slice(1, -1) }];
	});
}

/** True when `part` stands in `whole` as consecutive lines. */
const within = (part: readonly string[], whole: readonly string[]): boolean => whole.some((_, at) => part.length > 0 && part.every((line, offset) => whole[at + offset] === line));

describe("the tutorial of the scheduler sample", () => {
	it("every code block is an include of a file of the sample", () => {
		const found = blocks();
		expect(found.length).toBeGreaterThan(8);
		expect(found.filter((block) => block.file === "README.md" || !within(block.lines, linesOf(join(SAMPLE, block.file)))).map((block) => block.file)).toEqual([]);
	});

	it("finds a block that is not an include", () => {
		const changed = blocks().map((block) => ({ ...block, lines: [...block.lines, "// a line of no file"] }));
		expect(changed.filter((block) => !within(block.lines, linesOf(join(SAMPLE, block.file))))).toHaveLength(changed.length);
	});
});
