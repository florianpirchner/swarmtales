// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The English-only test: no German umlauts and no common German words in any text file of the repository. */
import { describe, expect, it } from "vitest";
import { findGerman } from "../lib/english.ts";
import { listFiles, readText } from "../lib/files.ts";

/** Files that are not text. Every other file is scanned, whatever its name: a new kind of file is covered at once. */
const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|otf|zip|gz|tgz|wasm)$/i;

/** Files the scan leaves out: the word list, this test with its German samples, and generated inventories of other people's names. */
const EXEMPT = new Set(["scripts/lib/english.ts", "scripts/gates/english-only.test.ts", "pnpm-lock.yaml", "THIRD-PARTY-LICENSES.md"]);

/** Vendored files are other people's text. */
const isVendored = (path: string): boolean => /^third_party\/[^/]+\//.test(path);

function isTextFile(path: string): boolean {
	return !EXEMPT.has(path) && !BINARY.test(path) && !isVendored(path);
}

describe("English only", () => {
	const files = listFiles(".", isTextFile);

	it("scans sources, tests, docs, templates and workflows", () => {
		expect(files).toContain("README.md");
		expect(files).toContain("package.json");
		expect(files).toContain("NOTICE");
		expect(files).toContain("LICENSE");
		expect(files).toContain(".github/workflows/check.yml");
		expect(files).toContain("third_party/README.md");
		expect(files.some((file) => file.startsWith("docs/"))).toBe(true);
		expect(files.some((file) => file.startsWith("scripts/"))).toBe(true);
		expect(files.some((file) => file.startsWith(".github/"))).toBe(true);
		expect(files.some((file) => file.includes("node_modules"))).toBe(false);
	});

	it("contains no German umlauts, sharp s or common German words", () => {
		const offences = files.flatMap((file) => findGerman(readText(file)).map((finding) => `${file}:${finding}`));
		expect(offences).toEqual([]);
	});

	it("recognizes German text and leaves English alone", () => {
		expect(findGerman("Das ist nicht gut")).toEqual(['1 German word "ist"']);
		expect(findGerman("fine\nGrüße")).toEqual(['2 umlaut "ü"']);
		expect(findGerman("This list is not dist, nor mitigated by sindex")).toEqual([]);
	});
});
