// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../lib/files.ts";
import { ENV_FILE, PROCESS_ENV } from "./restricted.ts";

const linter = new Linter({ configType: "flat" });

function lint(code: string): number {
	const config: Linter.Config = { files: ["**/*.ts"], languageOptions: { parser: tseslint.parser }, rules: { "no-restricted-syntax": ["error", ...PROCESS_ENV] } };
	return linter.verify(code, [config], { filename: "sample.ts" }).length;
}

/** The selectors of `no-restricted-syntax` that the real configuration gives a file. */
async function selectorsOf(file: string): Promise<readonly string[]> {
	const config: unknown = await new ESLint({ cwd: REPO_ROOT }).calculateConfigForFile(file);
	return JSON.stringify(config).match(/"selector":"[^"]+"/g) ?? [];
}

describe("the environment is read in one file", () => {
	it("rejects every way to read the environment", () => {
		const reads = [
			"const key = process.env.SWT_KEY;\n",
			'const key = process["env"].SWT_KEY;\n',
			"const key = globalThis.process.env.SWT_KEY;\n",
			'const all = globalThis.process["env"];\n',
			"const { env } = process;\n",
			"const { env: mine } = globalThis.process;\n",
			'import { env } from "node:process";\n',
			'import { argv, env as mine } from "process";\n',
		];
		for (const code of reads) expect(lint(code), code).toBe(1);
	});

	it("leaves other uses of process and of a name env alone", () => {
		expect(lint("const args = process.argv;\nconst env = { a: 1 };\nconst b = env.a;\nconst c = settings.env;\n")).toBe(0);
		expect(lint('import { argv } from "node:process";\n')).toBe(0);
	});

	it("is switched on for every package file, tests included, and off for the one file and for scripts", async () => {
		const first = JSON.stringify(PROCESS_ENV[0].selector);
		const planted = ["packages/models/src/keys.ts", "packages/models/test/keys.test.ts", "packages/kernel/src/a.test.ts", "mechanics/econ-games/src/index.ts",
			"games/quarry/src/index.ts", "samples/one/src/index.ts", "apps/cli/src/main.ts", "apps/cli/test/env.test.ts"];
		for (const file of planted) expect((await selectorsOf(file)).filter((entry) => entry.includes(first)), file).toHaveLength(1);
		for (const file of [ENV_FILE, "scripts/check.ts", "scripts/gates/names.test.ts"]) {
			const selectors = await selectorsOf(file);
			expect(selectors.length, file).toBeGreaterThan(0);
			expect(selectors.filter((entry) => entry.includes(first)), file).toEqual([]);
		}
	});

	it("keeps the rule against a bare Error in package code", async () => {
		expect((await selectorsOf("packages/models/src/keys.ts")).join()).toContain("ThrowStatement");
		expect((await selectorsOf("packages/models/test/keys.test.ts")).join()).not.toContain("ThrowStatement");
	});
});
