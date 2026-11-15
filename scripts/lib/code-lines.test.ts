// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { codeLineNumbers, countCodeLines } from "./code-lines.ts";

describe("code lines", () => {
	it("does not count blank lines and comment lines", () => {
		const text = ["// a line comment", "", "/**", " * A doc comment.", " */", "export const a = 1;", "", "/* block */", "const b = 2; // trailing"].join("\n");
		expect([...codeLineNumbers(text)]).toEqual([6, 9]);
		expect(countCodeLines(text)).toBe(2);
	});

	it("counts every line of a statement that spans lines", () => {
		const text = ["const list = [", "\t1,", "\t// not this one", "\t2,", "];"].join("\n");
		expect([...codeLineNumbers(text)]).toEqual([1, 2, 4, 5]);
	});

	it("counts the lines inside a template literal as code", () => {
		const text = ["const text = `one", "", "three`;"].join("\n");
		expect(countCodeLines(text)).toBe(3);
	});

	it("does not take a comment marker inside a string for a comment", () => {
		expect(countCodeLines('const url = "https://example.org"; const b = "/* no */";')).toBe(1);
	});

	it("is not fooled by comment markers in strings, templates and regular expressions, or by code after a block comment", () => {
		const text = ["const a = `/*`;", "const b = 1;", "const c = `*/`;", "const d = /\\/\\*/;", "const e = 2;", "/* c */ const f = 3; /*", "still a comment", "*/ const g = 4;", "const h = '//'; // real"].join("\n");
		expect([...codeLineNumbers(text)]).toEqual([1, 2, 3, 4, 5, 6, 8, 9]);
	});

	it("reads JSX in a .tsx file, where text between tags counts like a template literal", () => {
		const text = ["const view = (", "\t<div>", "\t\t{/* a comment in braces */}", "\t\ttext // not a comment", "", "\t</div>", ");"].join("\n");
		expect(countCodeLines(text, "view.tsx")).toBe(7);
	});

	it("counts nothing in an empty text or a text of comments only", () => {
		expect(countCodeLines("")).toBe(0);
		expect(countCodeLines("// only\n/* comments */\n")).toBe(0);
	});
});
