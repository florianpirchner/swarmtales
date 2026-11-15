// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The two budget tests (DECISIONS.md, D13): kernel at most 1500 code lines, engine total at most 4100. */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUDGETS, codeLinesOf, ENGINE_FOLDERS, isBudgetFile, OUTSIDE_ENGINE } from "../lib/budget.ts";
import { REPO_ROOT } from "../lib/files.ts";

describe("code-line budgets", () => {
	it.each(BUDGETS)("$name stays within $max code lines", (budget) => {
		expect(codeLinesOf(budget.folders)).toBeLessThanOrEqual(budget.max);
	});

	it("does not pass on nothing: an engine package that exists has code under src/", () => {
		for (const folder of ENGINE_FOLDERS.filter((entry) => existsSync(join(REPO_ROOT, entry)))) expect(codeLinesOf([folder])).toBeGreaterThan(0);
	});

	it("has the decided numbers", () => {
		expect(BUDGETS.map((budget) => [budget.name, budget.max])).toEqual([
			["kernel", 1500],
			["engine total", 4100],
		]);
		expect(ENGINE_FOLDERS).toContain("packages/kernel");
	});

	it("knows every package as inside or outside the engine", () => {
		const known = new Set<string>([...ENGINE_FOLDERS, ...OUTSIDE_ENGINE]);
		const packages = readdirSync(join(REPO_ROOT, "packages"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => `packages/${entry.name}`);
		expect(packages.filter((folder) => !known.has(folder))).toEqual([]);
	});
});

describe("budget counting", () => {
	it("counts source files under src and leaves out tests and declarations", () => {
		expect(isBudgetFile("packages/kernel/src/log/log.ts")).toBe(true);
		expect(isBudgetFile("packages/kernel/src/log/log.test.ts")).toBe(false);
		expect(isBudgetFile("packages/kernel/src/test/helper.ts")).toBe(true);
		expect(isBudgetFile("packages/kernel/test/log.ts")).toBe(false);
		expect(isBudgetFile("packages/kernel/src/types.d.ts")).toBe(true);
		expect(isBudgetFile("packages/kernel/tsdown.config.ts")).toBe(false);
	});

	it("sums code lines over folders and takes a missing folder as empty", () => {
		const root = mkdtempSync(join(tmpdir(), "swt-budget-"));
		mkdirSync(join(root, "packages/a/src"), { recursive: true });
		mkdirSync(join(root, "packages/b/src"), { recursive: true });
		writeFileSync(join(root, "packages/a/src/one.ts"), "// comment\nexport const a = 1;\n\nexport const b = 2;\n");
		writeFileSync(join(root, "packages/a/src/one.test.ts"), "export const ignored = 1;\n");
		writeFileSync(join(root, "packages/b/src/two.ts"), "export const c = [\n\t1,\n];\n");
		expect(codeLinesOf(["packages/a"], root)).toBe(2);
		expect(codeLinesOf(["packages/a", "packages/b", "packages/none"], root)).toBe(5);
	});
});
