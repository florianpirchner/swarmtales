// SPDX-License-Identifier: Apache-2.0
/**
 * The gate of the error reference: `docs/reference/errors.md` is what `pnpm docs:errors` writes (the `--check` of
 * the generator), every code in the source has an anchor there and every anchor a code. The codes are found here
 * without the generator: every string literal of a source file that is a code.
 */
import { describe, expect, it } from "vitest";
import { readText } from "../lib/files.ts";
import { namesAndStrings } from "../lib/words.ts";
import { sitesOf } from "../error-docs/extract.ts";
import { anchorProblems, entriesOf, errorPage, ERRORS_PAGE, gaps, sourceTexts, SUPPLEMENT } from "../error-docs/page.ts";

const sources = sourceTexts();
const codes = [...new Set(sources.flatMap(({ text }) => namesAndStrings(text).match(/\bSWT-[GMDRXPLCET][0-9]{3}\b/g) ?? []))].sort();

describe("the error reference", () => {
	it("is current, and gives every code a summary, why and fix", () => {
		const page = errorPage();
		expect(page.gaps).toEqual([]);
		expect(readText(ERRORS_PAGE), "run `pnpm docs:errors`").toBe(page.text);
	});

	it("has an anchor for every code of the source and a code for every anchor", () => {
		expect(codes.length).toBeGreaterThanOrEqual(90);
		expect(anchorProblems(codes, readText(ERRORS_PAGE))).toEqual([]);
	});

	it("fails on a code without an anchor and on an anchor without a code", () => {
		expect(anchorProblems(["SWT-G001", "SWT-G002"], "# Error codes\n\n### SWT-G001\n\n### SWT-G999\n")).toEqual([
			"SWT-G002: no anchor #swt-g002 in docs/reference/errors.md",
			"#swt-g999: an anchor of docs/reference/errors.md without a code in the source",
		]);
		expect(anchorProblems(codes, errorPage().text.replace("### SWT-R003\n", ""))).toEqual(["SWT-R003: no anchor #swt-r003 in docs/reference/errors.md"]);
	});

	it("keeps only supplement rows whose text the source still does not give", () => {
		const needed = Object.entries(SUPPLEMENT).flatMap(([code, texts]) => Object.keys(texts).map((field) => `${code}: no ${field}`));
		const missing = gaps(entriesOf(sitesOf(sources), {})).map((line) => line.replace(/ found in .*$/, ""));
		expect(missing).toEqual(needed);
	});
});
