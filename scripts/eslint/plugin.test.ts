// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";
import { swt } from "./plugin.ts";
import { BARE_ERROR, DOUBLE_CAST } from "./restricted.ts";

const linter = new Linter({ configType: "flat" });

function lint(code: string, rules: Linter.RulesRecord): readonly string[] {
	const config: Linter.Config = {
		files: ["**/*.ts"],
		linterOptions: { reportUnusedDisableDirectives: "off" },
		languageOptions: { parser: tseslint.parser },
		plugins: { swt },
		rules,
	};
	return linter.verify(code, [config], { filename: "sample.ts" }).map((message) => `${message.ruleId ?? "fatal"}@${message.line}: ${message.message}`);
}

const statements = (count: number): string => Array.from({ length: count }, (_, index) => `\tvalue += ${index};`).join("\n");

describe("swt/max-code-lines", () => {
	const rules: Linter.RulesRecord = { "swt/max-code-lines": ["error", { max: 3 }], "swt/code-lines-warning": ["warn", { max: 2 }] };

	it("counts code lines, not comments and blank lines", () => {
		expect(lint("// one\n\n/** two */\nconst a = 1;\nconst b = 2;\n", rules)).toEqual([]);
	});

	it("warns above the first step and fails above the second", () => {
		expect(lint("const a = 1;\nconst b = 2;\nconst c = 3;\n", rules)).toEqual([
			"swt/code-lines-warning@1: This file has 3 code lines; the limit is 2. Split the file.",
		]);
		expect(lint("const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\n", rules).map((line) => line.split("@")[0])).toEqual([
			"swt/max-code-lines",
			"swt/code-lines-warning",
		]);
	});
});

describe("swt/max-function-code-lines", () => {
	const rules: Linter.RulesRecord = { "swt/max-function-code-lines": ["error", { max: 5 }] };

	it("accepts a function at the limit, with comments on top", () => {
		expect(lint(`function f(): number {\n\tlet value = 0;\n\t// a comment\n\n${statements(1)}\n\treturn value;\n}\n`, rules)).toEqual([]);
	});

	it("rejects a longer function, also an arrow function and a method", () => {
		expect(lint(`function f(): number {\n\tlet value = 0;\n${statements(2)}\n\treturn value;\n}\n`, rules)).toEqual([
			"swt/max-function-code-lines@1: This function has 6 code lines; the limit is 5. Split the function.",
		]);
		expect(lint(`const f = (): number => {\n\tlet value = 0;\n${statements(2)}\n\treturn value;\n};\n`, rules)).toHaveLength(1);
		expect(lint(`class C {\n\tm(): number {\n\t\tlet value = 0;\n${statements(2)}\n\t\treturn value;\n\t}\n}\n`, rules)).toHaveLength(1);
	});
});

describe("swt/max-function-code-lines in tests", () => {
	const rules: Linter.RulesRecord = { "swt/max-function-code-lines": ["error", { max: 5, skipSuites: true }] };
	const body = `\tlet value = 0;\n${statements(5)}\n\texpect(value).toBe(10);\n`;

	it("leaves out the callback of describe, in every form", () => {
		expect(lint(`describe("x", () => {\n${body}});\n`, rules)).toEqual([]);
		expect(lint(`describe.skip("x", function () {\n${body}});\n`, rules)).toEqual([]);
		expect(lint(`describe.each([1])("x", () => {\n${body}});\n`, rules)).toEqual([]);
	});

	it("still limits a test, a helper and a function that only sits inside describe", () => {
		expect(lint(`it("x", () => {\n${body}});\n`, rules)).toHaveLength(1);
		expect(lint(`describe("x", () => {\n\tit("y", () => {\n${body}\t});\n});\n`, rules)).toHaveLength(1);
		expect(lint(`const describe = (): void => {\n${body}};\n`, rules)).toHaveLength(1);
	});
});

describe("swt/disable-needs-issue", () => {
	const rules: Linter.RulesRecord = { "swt/disable-needs-issue": "error" };

	it("rejects a disable comment without a reason or without an issue", () => {
		expect(lint("// eslint-disable-next-line complexity\nconst a = 1;\n", rules)).toHaveLength(1);
		expect(lint("// eslint-disable-next-line complexity -- it is fine\nconst a = 1;\n", rules)).toHaveLength(1);
		expect(lint("/* eslint-disable complexity */\nconst a = 1;\n", rules)).toHaveLength(1);
		expect(lint('/* eslint complexity: "off" */\nconst a = 1;\n', rules)).toHaveLength(1);
		expect(lint("// @ts-ignore\nconst a = 1;\n", rules)).toHaveLength(1);
	});

	it("accepts a reason with a linked issue", () => {
		expect(lint("// eslint-disable-next-line complexity -- the parser is one switch, see #212\nconst a = 1;\n", rules)).toEqual([]);
		expect(lint("// eslint-disable-next-line complexity -- https://github.com/o/r/issues/7\nconst a = 1;\n", rules)).toEqual([]);
	});

	it("leaves other comments alone", () => {
		expect(lint("// eslint is a linter\nconst a = 1;\n", rules)).toEqual([]);
	});
});

describe("restricted syntax", () => {
	const rules: Linter.RulesRecord = { "no-restricted-syntax": ["error", DOUBLE_CAST, BARE_ERROR] };

	it("rejects a double cast and a bare Error", () => {
		expect(lint("const a = 1 as unknown as string;\n", rules)).toHaveLength(1);
		expect(lint('function f(): never {\n\tthrow new Error("no");\n}\n', rules)).toHaveLength(1);
	});

	it("accepts `as const` and an error of another class", () => {
		expect(lint("const a = [1] as const;\n", rules)).toEqual([]);
		expect(lint('function f(): never {\n\tthrow new TypeError("no");\n}\n', rules)).toEqual([]);
	});
});
