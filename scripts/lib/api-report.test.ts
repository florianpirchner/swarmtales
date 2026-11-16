// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runApiReport } from "../api-report.ts";
import { normalizeReport, reportDifference } from "./api-report.ts";
import { REPO_ROOT } from "./files.ts";

describe("API report normal form", () => {
	it("sorts the members of a union of string literals", () => {
		expect(normalizeReport('}, "accuse" | "audit" | "viewConvoy" | "speak">;')).toBe('}, "accuse" | "audit" | "speak" | "viewConvoy">;');
		expect(normalizeReport('phase: "idle" | "vote" | "accuse";\nvotes: Record<string, "yes" | "no">;')).toBe('phase: "accuse" | "idle" | "vote";\nvotes: Record<string, "no" | "yes">;');
	});

	it("gives both orders of the same union one text", () => {
		expect(normalizeReport('type T = "audit" | "accuse";')).toBe(normalizeReport('type T = "accuse" | "audit";'));
	});

	it("keeps separators that span lines, and literals that hold a bar or a quote", () => {
		expect(normalizeReport('type T =\n| "b"\n| "a|z" | "a\\"q";')).toBe('type T =\n| "a\\"q"\n| "a|z" | "b";');
	});

	it("leaves every other text byte-equal", () => {
		const text = ['// @public', 'export type T = string | number | "only";', 'f("b", "a");', 'type U = Record<"k", number> | undefined;', "x: 'b' & 'a';", ""].join("\n");
		expect(normalizeReport(text)).toBe(text);
	});

	it("gives both member orders of an object type literal one text", () => {
		const one = ["export const o: Def<{", "factions: number;", "opens: number;", "by: \"a\" | \"b\";", "}>;"].join("\n");
		const other = ["export const o: Def<{", "opens: number;", "by: \"b\" | \"a\";", "factions: number;", "}>;"].join("\n");
		expect(normalizeReport(one)).toBe(normalizeReport(other));
		expect(normalizeReport(one)).toBe(["export const o: Def<{", 'by: "a" | "b";', "factions: number;", "opens: number;", "}>;"].join("\n"));
	});

	it("keeps a nested block whole, sorts it inside, and sorts the blocks of a union or a parameter list", () => {
		const text = ["x: {", "ultimatums: {", "number: number;", "debts: {", "needer: string;", "holder: string;", "}[];", "between: string[];", "}[];", "last: number;", "}, {", "b: Type.TArray<Type.TObject<{", "z: Type.TString;", "y: Type.TString;", "}>>;", "a: Type.TInteger;", "} | {", "fn: (input: {", "q: number;", "p: number;", "}) => void;", "c: 1;", "};"];
		const sorted = ["x: {", "last: number;", "ultimatums: {", "between: string[];", "debts: {", "holder: string;", "needer: string;", "}[];", "number: number;", "}[];", "}, {", "a: Type.TInteger;", "b: Type.TArray<Type.TObject<{", "y: Type.TString;", "z: Type.TString;", "}>>;", "} | {", "c: 1;", "fn: (input: {", "p: number;", "q: number;", "}) => void;", "};"];
		expect(normalizeReport(text.join("\n"))).toBe(sorted.join("\n"));
	});

	it("keeps a member's leading comment lines with it, and multi-line union members whole", () => {
		const text = ["t: {", "// (undocumented)", "readonly z: string;", "readonly m:", '| "x"', '| "y";', "/**", "* The a field {not a block}.", "*/", "readonly a: number;", "};"];
		const sorted = ["t: {", "/**", "* The a field {not a block}.", "*/", "readonly a: number;", "readonly m:", '| "x"', '| "y";', "// (undocumented)", "readonly z: string;", "};"];
		expect(normalizeReport(text.join("\n"))).toBe(sorted.join("\n"));
	});

	it("leaves declarations and blocks that do not split cleanly as they are", () => {
		const text = [
			"export interface I {",
			"    z: string;",
			"    a: number;",
			"}",
			"export enum E {",
			"    B = 0,",
			"    A = 1",
			"}",
			"export declare class C {",
			"    z(): void;",
			"    a(): void;",
			"}",
			"t: {",
			"z: string;",
			"// trailing",
			"};",
			"u: {",
			"z: string;",
			"",
			"a: string;",
			"};",
			"v: { b: 1; a: 2 };",
			"w: {",
			"z: 1;",
			"a: 2; }",
			"",
		].join("\n");
		expect(normalizeReport(text)).toBe(text);
	});

	it("drops an internal declaration with its notice lines and the blank line after it", () => {
		const notice = '// Warning: (ae-internal-missing-underscore) The name "seedFrom" should be prefixed with an underscore';
		const text = ["// @public", "export function a(): void;", "", notice, "//", "// @internal", "export const S: Type.TObject<{", "    b: Type.TString;", "}>;", "", "// @public", "export const c: 1;", ""];
		expect(normalizeReport(text.join("\n"))).toBe(["// @public", "export function a(): void;", "", "// @public", "export const c: 1;", ""].join("\n"));
	});

	it("drops a nested internal member and an internal declaration at the end of a report", () => {
		const text = ["// @public", "export class K {", "    a(): void;", "    // @internal (undocumented)", "    b(x: {", "        y: 1;", "    }): void;", "    c(): void;", "    // @internal", "    d(): void;", "}", "", "// @internal", "export function e(): void;", ""];
		expect(normalizeReport(text.join("\n"))).toBe(["// @public", "export class K {", "    a(): void;", "    c(): void;", "}", ""].join("\n"));
		expect(normalizeReport(["// @public", "export type T = 1;", "", "// @internal", "export type U = 2;"].join("\n"))).toBe(["// @public", "export type T = 1;"].join("\n"));
	});

	it("keeps a public export that names an internal type", () => {
		const text = ["// @internal", "export interface Inner {", "    readonly x: number;", "}", "", "// @public", "export function outer(inner: Inner): Inner;", ""];
		expect(normalizeReport(text.join("\n"))).toBe(["// @public", "export function outer(inner: Inner): Inner;", ""].join("\n"));
	});

	it("drops the imports that only an internal declaration used and keeps every import a remaining line names", () => {
		const imports = ["import { CtxOf } from '@swarmtales/sdk';", "import { Head as H } from '@swarmtales/sdk';", "import { Static } from 'typebox';", "import { Type } from 'typebox';", "import { $q } from 'q';", "import { Noted } from 'n';", "import { Gone } from 'g';"];
		const internal = ["// @internal", "export type Ctx = CtxOf<H, Gone>;", ""];
		const kept = ["// @public", "export const s: Type.TObject<{}> & $q;", "", "// Warning: the symbol \"Noted\" is not exported", "// @public", "export type T = Static<TypeX> | GoneAway;", ""];
		const text = ["```ts", "", ...imports, "", ...internal, ...kept].join("\n");
		const expected = ["```ts", "", "import { Static } from 'typebox';", "import { Type } from 'typebox';", "import { $q } from 'q';", "import { Noted } from 'n';", "", ...kept].join("\n");
		expect(normalizeReport(text)).toBe(expected);
		expect(normalizeReport(["import { A } from 'a';", "import 'side-effect';", "", "export const b: A;"].join("\n"))).toBe(["import { A } from 'a';", "import 'side-effect';", "", "export const b: A;"].join("\n"));
	});

	it("changes a committed report only by the order of union members and object type members", () => {
		const reports = ["packages", "mechanics", "games", "samples", "apps"].flatMap((group) =>
			readdirSync(join(REPO_ROOT, group))
				.filter((name) => statSync(join(REPO_ROOT, group, name)).isDirectory())
				.flatMap((name) => readdirSync(join(REPO_ROOT, group, name)).filter((file) => file.endsWith(".api.md")).map((file) => join(REPO_ROOT, group, name, file))),
		);
		expect(reports.length).toBeGreaterThan(10);
		for (const path of reports) {
			const text = readFileSync(path, "utf8");
			const normal = normalizeReport(text);
			expect(normal.length).toBe(text.length);
			expect(normalizeReport(normal)).toBe(normal);
			expect(Array.from(normal).sort().join("")).toBe(Array.from(text).sort().join(""));
		}
	});
});

describe("API report comparison", () => {
	it("passes on an equal report and fails on a changed or missing one", () => {
		expect(reportDifference("a\nb\n", "a\r\nb\r\n")).toBeUndefined();
		expect(reportDifference("a\nc\n", "a\nb\n")).toBe('line 2: committed "b", built "c"');
		expect(reportDifference("a\n", undefined)).toBe("the committed report is missing");
	});
});

describe("the api step on a package", () => {
	const folder = mkdtempSync(join(tmpdir(), "swt-api-report-"));
	afterAll(() => {
		rmSync(folder, { recursive: true, force: true });
	});
	const config = join(folder, "api-extractor.json");
	const write = (members: string): void => {
		mkdirSync(join(folder, "dist"), { recursive: true });
		writeFileSync(join(folder, "dist", "index.d.ts"), `/**\n * A tool name.\n *\n * @public\n */\nexport type Tool = ${members};\n`);
	};
	writeFileSync(join(folder, "package.json"), JSON.stringify({ name: "fixture", version: "0.0.0", types: "dist/index.d.ts" }));
	writeFileSync(
		config,
		JSON.stringify({
			projectFolder: ".",
			compiler: { overrideTsconfig: { compilerOptions: { strict: true, skipLibCheck: true }, include: ["dist/**/*.d.ts"] } },
			mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
			newlineKind: "lf",
			apiReport: { enabled: true, reportFolder: "<projectFolder>/", reportTempFolder: "<projectFolder>/temp/", reportFileName: "<unscopedPackageName>.api.md" },
			docModel: { enabled: false },
			dtsRollup: { enabled: false },
			tsdocMetadata: { enabled: false },
		}),
	);

	it("writes the normal form, passes on a new member order and fails on a real API change", () => {
		write('"speak" | "accuse"');
		expect(runApiReport(config, false).code).toBe(1);
		expect(runApiReport(config, true).code).toBe(0);
		expect(readFileSync(join(folder, "fixture.api.md"), "utf8")).toContain('export type Tool = "accuse" | "speak";');
		write('"accuse" | "speak"');
		expect(runApiReport(config, false).code).toBe(0);
		write('"accuse" | "speak" | "audit"');
		const changed = runApiReport(config, false);
		expect(changed.code).toBe(1);
		expect(changed.messages.join("\n")).toContain("the API changed");
		expect(readFileSync(join(folder, "fixture.api.md"), "utf8")).toContain('export type Tool = "accuse" | "speak";');
	}, 60_000);
});
