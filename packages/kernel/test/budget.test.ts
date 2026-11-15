// SPDX-License-Identifier: Apache-2.0
/**
 * The kernel's own budget at M1 (specification of M1, 1.3). The cap of 1500 is tested in `scripts/gates`; the
 * lines between this gate and the cap are booked for what returns at M2 and M3.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The gate of the kernel. M1-38 set 1420; M5-02 raised it to 1490, the cap of A51 for `runEnded`, staged calls and
 * the stage `review`, so that the merges of M5-01, M5-02 and M5-04 stay green; M5-05 sets the measured count.
 */
const GATE = 1490;
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

describe("kernel budget of M1", () => {
	it("counts code lines only", () => {
		expect(codeLines("// a\n/** b */\n/**\n * c\n */\nconst a = 1; // d\n\n\tconst b = 2;\n")).toBe(2);
	});

	it("stays within the gate", () => {
		const files = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
		expect(files).toContain("kernel.ts");
		const total = files.reduce((sum, file) => sum + codeLines(readFileSync(join(SRC, file), "utf8")), 0);
		expect(total).toBeGreaterThan(1000);
		expect(total).toBeLessThanOrEqual(GATE);
	});
});
