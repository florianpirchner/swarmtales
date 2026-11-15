// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The kernel's own budget (specification of M1, 1.3; of M5, 1.3). The cap of 1500 is tested in `scripts/gates`; this
 * gate holds the kernel at its measured count, so that every new kernel line is booked by an issue.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * The gate of the kernel. M1-38 set 1420; M5-02 raised it to 1490, the cap of A51, so that the merges of M5-01,
 * M5-02 and M5-04 stayed green; M5-05 set it to the count measured after them: 1402 + 7 (`runEnded`, M5-01) + 37
 * (staged calls, M5-02) + 26 (the stage `review`, M5-04, A66) + 1 (the calls staged in `runEnded`, M5-63). A pull request that adds a kernel line raises it,
 * with an issue that names the missing extension point (`docs/ISSUE-RECORD.md`, "The kernel gate of M5").
 */
const GATE = 1473;
const SRC = join(import.meta.dirname, "../src");

// The lines that hold code: not blank, not only a comment. The files of the kernel open no comment behind code.
function codeLines(text: string): number {
	let inComment = false;
	return text.split("\n").filter((raw) => {
		const line = raw.trim();
		const comment = inComment || line.startsWith("//") || line.startsWith("/*");
		if (inComment || line.startsWith("/*")) inComment = !line.includes("*/");
		return line !== "" && !comment;
	}).length;
}

// The source files of a folder, tests left out, and the sum of their code lines.
function sourceFiles(folder: string): string[] {
	return readdirSync(folder, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
}
function linesOf(folder: string): number {
	return sourceFiles(folder).reduce((sum, file) => sum + codeLines(readFileSync(join(folder, file), "utf8")), 0);
}
function withinGate(folder: string): boolean {
	return linesOf(folder) <= GATE;
}

describe("kernel budget", () => {
	let scratch: string | undefined;
	afterEach(() => {
		if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
		scratch = undefined;
	});

	it("counts code lines only", () => {
		expect(codeLines("// a\n/** b */\n/**\n * c\n */\nconst a = 1; // d\n\n\tconst b = 2;\n")).toBe(2);
	});

	it("stays within the gate", () => {
		expect(sourceFiles(SRC)).toContain("kernel.ts");
		const total = linesOf(SRC);
		expect(total).toBeGreaterThan(1000);
		expect(withinGate(SRC)).toBe(true);
	});

	it("passes a kernel at the gate and fails one line above it", () => {
		scratch = mkdtempSync(join(tmpdir(), "kernel-gate-"));
		const lines = (n: number) => `/** head */\n${Array.from({ length: n }, (_, i) => `const a${i} = ${i};`).join("\n")}\n`;
		writeFileSync(join(scratch, "kernel.ts"), lines(GATE - 1));
		writeFileSync(join(scratch, "kernel.test.ts"), lines(5));
		writeFileSync(join(scratch, "extra.ts"), lines(1));
		expect(linesOf(scratch)).toBe(GATE);
		expect(withinGate(scratch)).toBe(true);
		writeFileSync(join(scratch, "extra.ts"), lines(2));
		expect(linesOf(scratch)).toBe(GATE + 1);
		expect(withinGate(scratch)).toBe(false);
	});
});
