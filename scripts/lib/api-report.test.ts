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

	it("changes a committed report only by the order of union members", () => {
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
