// SPDX-License-Identifier: Apache-2.0
/** The exception format, enforced on the text of every source file, where no comment can switch it off. */
import { describe, expect, it } from "vitest";
import { commentsOf, exceptionOffences } from "../lib/exceptions.ts";
import { isSourceFile, isTestFile, listFiles, readText } from "../lib/files.ts";

describe("exceptions to lint rules", () => {
	it("are well-formed in every source file", () => {
		const files = listFiles(".", isSourceFile);
		expect(files).toContain("eslint.config.js");
		expect(files).toContain("scripts/lib/exceptions.ts");
		expect(files.flatMap((file) => exceptionOffences(readText(file), isTestFile(file)).map((offence) => `${file}:${offence}`))).toEqual([]);
	});

	it("reads comments, and not the text of strings and template literals", () => {
		const text = ['const a = "// eslint-disable";', "const b = `", "/* eslint-disable */", "`; // trailing", "/* block */ const c = 1;", "/** doc */", "export const d = 1;"].join("\n");
		expect(commentsOf(text).map((comment) => comment.value.trim())).toEqual(["trailing", "block", "* doc"]);
	});

	it("rejects an exception without a reason, without an issue or without a rule", () => {
		expect(exceptionOffences("// eslint-disable-next-line complexity\nconst a = 1;\n", false)).toHaveLength(1);
		expect(exceptionOffences("// eslint-disable-next-line complexity -- it is fine\nconst a = 1;\n", false)).toHaveLength(1);
		expect(exceptionOffences("/* eslint-disable */\nconst a = 1;\n", false)).toHaveLength(1);
		expect(exceptionOffences("/* eslint-disable -- everything, see #4 */\nconst a = 1;\n", false)[0]).toContain("names the rule");
		expect(exceptionOffences("const a = 1; // eslint-disable-line\n", false)).toHaveLength(1);
	});

	it("rejects a comment that disables the exception rule or configures the linter", () => {
		expect(exceptionOffences("/* eslint-disable swt/disable-needs-issue, complexity -- see #4 */\n", false)[0]).toContain("cannot be disabled");
		expect(exceptionOffences('/* eslint complexity: "off" */\n', false)[0]).toContain("may not configure the linter");
	});

	it("rejects @ts-ignore and @ts-nocheck, and @ts-expect-error outside tests without an issue", () => {
		expect(exceptionOffences("// @ts-nocheck\n", true)).toHaveLength(1);
		expect(exceptionOffences("// @ts-ignore\nconst a = 1;\n", true)).toHaveLength(1);
		expect(exceptionOffences("// @ts-expect-error a wrong service name is an error\nuse();\n", true)).toEqual([]);
		expect(exceptionOffences("// @ts-expect-error because\nuse();\n", false)).toHaveLength(1);
		expect(exceptionOffences("// @ts-expect-error the library types are wrong, see #31\nuse();\n", false)).toEqual([]);
	});

	it("accepts a reason with a linked issue, and leaves other comments alone", () => {
		expect(exceptionOffences("// eslint-disable-next-line complexity -- the parser is one switch, see #212\nconst a = 1;\n", false)).toEqual([]);
		expect(exceptionOffences("// eslint-disable-next-line @typescript-eslint/no-x -- https://github.com/o/r/issues/7\n", false)).toEqual([]);
		expect(exceptionOffences("// eslint is a linter; globals are few\nconst a = 1;\n", false)).toEqual([]);
	});
});
