// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { afterAll, describe, expect, it } from "vitest";
import { lintFiles, ownFiles, readProjects, typecheck } from "./lint.ts";

const folder = mkdtempSync(join(tmpdir(), "swt-lint-"));
afterAll(() => {
	rmSync(folder, { recursive: true, force: true });
});

/** Writes a composite project `name` with one file, referencing the projects in `references`. */
function project(name: string, source: string, references: readonly string[] = []): string {
	mkdirSync(join(folder, name, "src"), { recursive: true });
	const compilerOptions = { composite: true, strict: true, rootDir: ".", outDir: "dist-types", emitDeclarationOnly: true, allowImportingTsExtensions: true, types: [], module: "NodeNext", target: "ES2023" };
	const config = { compilerOptions, include: ["src"], references: references.map((path) => ({ path: `../${path}` })) };
	writeFileSync(join(folder, name, "tsconfig.json"), JSON.stringify(config));
	writeFileSync(join(folder, name, "src", "index.ts"), source);
	return join(folder, name, "tsconfig.json");
}

/** ESLint with one typed rule only, so the test does not depend on the repository's configuration. */
const isolated = (overrideConfig: ESLint.Options["overrideConfig"]): ESLint.Options => ({ cwd: folder, overrideConfigFile: true, overrideConfig });

describe("pnpm lint: the typecheck and lint in one pass", () => {
	const base = project("base", "export async function later(): Promise<number> {\n\treturn 1;\n}\n");
	const top = project("top", 'import { later } from "../../base/src/index.ts";\n\nexport function now(): void {\n\tlater();\n}\n', ["base"]);

	it("orders every project after the projects it references, and gives each file to one project", () => {
		const projects = readProjects(top);
		expect(projects.map((entry) => entry.config)).toEqual([base, top]);
		expect(projects[1]?.references).toEqual([base]);
		const own = ownFiles([...projects, { config: join(folder, "tsconfig.json"), references: [], files: projects.flatMap((entry) => entry.files) }]);
		expect(own.get(top)).toEqual([join(folder, "top", "src", "index.ts")]);
		expect(own.get(join(folder, "tsconfig.json"))).toEqual([]);
	});

	it("fails on a planted type error, as tsc -b does", () => {
		const broken = project("broken", "export const count: number = \"three\";\n");
		const typed = typecheck(broken, false);
		expect(typed.ok).toBe(false);
		expect(typed.output).toContain("error TS2322");
		expect(typecheck(base, false).ok).toBe(true);
	});

	it("finds a planted type-aware offence in a dependent project with the program the typecheck built", async () => {
		expect(typecheck(base, false).ok).toBe(true);
		const typed = typecheck(top, false);
		expect(typed.ok).toBe(true);
		// The program types `top` against the declarations of `base`, as `tsc -b` does.
		expect(typed.program.getSourceFiles().some((file) => file.fileName.endsWith("base/dist-types/src/index.d.ts"))).toBe(true);
		const config = [
			{
				files: ["**/*.ts"],
				languageOptions: { parser: tseslint.parser, parserOptions: { programs: [typed.program] } },
				plugins: { "@typescript-eslint": tseslint.plugin },
				rules: { "@typescript-eslint/no-floating-promises": "error" as const },
			},
		];
		const linted = await lintFiles(isolated(config), [join(folder, "top", "src", "index.ts")]);
		expect(linted).toMatchObject({ errors: 1, files: 1 });
		expect(linted.output).toContain("no-floating-promises");
	});
});
