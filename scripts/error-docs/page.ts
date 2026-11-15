// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The reference page of the error codes, `docs/reference/errors.md`: one section per code with its summary, why and
 * fix, read from the code catalogues of all packages (`extract.ts`). Every `SwtError` prints a link to the section
 * of its code (`formatIssue` of `@swarmtales/contracts`), so the anchor of a section is the code in lower case.
 */
import { isTestFile, listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { sitesOf, type Site, type Texts } from "./extract.ts";

/** The page, relative to the repository root. */
export const ERRORS_PAGE = "docs/reference/errors.md";

/** The folders whose source holds the catalogues. */
const SOURCE_FOLDERS = ["apps", "games", "mechanics", "packages", "samples"] as const;

/** The areas of the code letters, in the order of `SWT_CODE` of `@swarmtales/contracts`. */
const AREAS: readonly (readonly [string, string])[] = [
	["G", "Game"], ["M", "Mechanic"], ["D", "Director"], ["R", "Run and kernel"], ["X", "Models"], ["P", "Texts"],
	["L", "Log and chain"], ["C", "Command line"], ["E", "Experiments and the lab"], ["T", "Testkit"],
];

/** One code with its texts and the packages that name it. */
export interface Entry extends Texts {
	readonly code: string;
	readonly packages: readonly string[];
}

/**
 * Reads the source files of the packages: every TypeScript file that is no test and no declaration file.
 *
 * @param root - The repository root.
 * @returns The files with their texts, in a stable order.
 */
export function sourceTexts(root: string = REPO_ROOT): readonly { readonly file: string; readonly text: string }[] {
	const keep = (path: string): boolean => path.endsWith(".ts") && !path.endsWith(".d.ts") && !isTestFile(path);
	return SOURCE_FOLDERS.flatMap((folder) => listFiles(folder, keep, root)).map((file) => ({ file, text: readText(file, root) }));
}

/**
 * The texts the source does not give, by code. Each one is a gap of a catalogue outside this folder; the test of
 * this folder fails when the source starts to give the text, so the table only shrinks.
 */
export const SUPPLEMENT: Readonly<Record<string, Texts>> = {
	// The catalogue of `packages/runlog` names the case only in its module comment.
	"SWT-L002": { summary: "a head is not signed, or no head covers the tail of the log" },
	// `misfit` of `packages/kernel` takes the fix from each caller.
	"SWT-R002": { fix: "the fix depends on what does not fit; the summary of the error names it" },
};

/** A text that is only a placeholder says nothing about the code. */
const told = (text: string | undefined): text is string => text !== undefined && !/^\{[^}]*\}$/.test(text);

/** The literal part of a text: what is left without its placeholders. */
const literalLength = (text: string): number => text.replace(/\{[^}]*\}/g, "").length;

/**
 * Joins the sites of each code into one entry. The catalogue entry of a code (the site whose comment documents it)
 * gives the texts first; the other sites fill what it leaves out.
 *
 * The summary is the comment of the catalogue entry, else the summary with the most fixed text. A text that no site
 * gives comes from the supplement.
 *
 * @param sites - Every site, in the order of the files.
 * @param supplement - The texts the source does not give, by code.
 * @returns One entry per code, sorted by code.
 */
export function entriesOf(sites: readonly Site[], supplement: Readonly<Record<string, Texts>> = SUPPLEMENT): readonly Entry[] {
	const byCode = new Map<string, Site[]>();
	for (const site of sites) byCode.set(site.code, [...(byCode.get(site.code) ?? []), site]);
	return [...byCode.entries()]
		.sort(([a], [b]) => a.localeCompare(b, "en"))
		.map(([code, all]) => {
			const ordered = [...all.filter((site) => site.doc !== undefined), ...all.filter((site) => site.doc === undefined)];
			const first = (field: "why" | "fix"): string | undefined => ordered.map((site) => site[field]).find(told) ?? supplement[code]?.[field];
			const summaries = all.map((site) => site.summary).filter(told).sort((a, b) => literalLength(b) - literalLength(a));
			const summary = ordered.map((site) => site.doc).find(told) ?? summaries[0] ?? supplement[code]?.summary;
			const why = first("why");
			const fix = first("fix");
			const packages = [...new Set(all.map((site) => site.file.split("/").slice(0, 2).join("/")))].sort();
			return { code, packages, ...(summary === undefined ? {} : { summary }), ...(why === undefined ? {} : { why }), ...(fix === undefined ? {} : { fix }) };
		});
}

/**
 * Says what an entry lacks.
 *
 * @param entries - The entries.
 * @returns One line per code and missing text.
 */
export function gaps(entries: readonly Entry[]): readonly string[] {
	return entries.flatMap((entry) => (["summary", "why", "fix"] as const).filter((field) => entry[field] === undefined).map((field) => `${entry.code}: no ${field} found in ${entry.packages.join(", ")}`));
}

/** A text as a sentence: a capital letter first and a full stop at the end. */
function sentence(text: string): string {
	const upper = text.charAt(0).toUpperCase() + text.slice(1);
	return /[.!?]$/.test(upper) ? upper : `${upper}.`;
}

function section(entry: Entry): string {
	const lines = [`### ${entry.code}`, ""];
	if (entry.summary !== undefined) lines.push(sentence(entry.summary), "");
	if (entry.why !== undefined) lines.push(`- **Why:** ${sentence(entry.why)}`);
	if (entry.fix !== undefined) lines.push(`- **Fix:** ${sentence(entry.fix)}`);
	lines.push(`- **Named in:** ${entry.packages.map((name) => `\`${name}\``).join(", ")}`);
	return lines.join("\n");
}

/**
 * Renders the page.
 *
 * @param entries - The entries, sorted by code.
 * @returns The Markdown text of `docs/reference/errors.md`.
 */
export function renderPage(entries: readonly Entry[]): string {
	const parts = [
		"# Error codes",
		"",
		"<!-- Written by `pnpm docs:errors` from the code catalogues of the packages; edit those, not this file. -->",
		"",
		"Every load error and run error is an `SwtError` with a code, a summary, why and a fix, and it prints a link to the section of its code on this page. A refused tool call is a tool outcome with its own mnemonic code, and is not listed here. A code is never reused or renumbered. A part in braces, such as `{tool}`, is filled in by the case that raises the code.",
	];
	for (const [letter, area] of AREAS) {
		const inArea = entries.filter((entry) => entry.code.startsWith(`SWT-${letter}`));
		if (inArea.length > 0) parts.push("", `## ${letter}: ${area}`, "", inArea.map(section).join("\n\n"));
	}
	return `${parts.join("\n")}\n`;
}

/**
 * Builds the page from the source of the repository.
 *
 * @param root - The repository root.
 * @returns The page text, its entries, and what the source leaves out.
 */
export function errorPage(root: string = REPO_ROOT): { readonly text: string; readonly entries: readonly Entry[]; readonly gaps: readonly string[] } {
	const entries = entriesOf(sitesOf(sourceTexts(root)));
	return { text: renderPage(entries), entries, gaps: gaps(entries) };
}

/**
 * Compares the codes with the anchors of a page: the sections `### SWT-...`.
 *
 * @param codes - The codes the source names.
 * @param markdown - The text of the page.
 * @returns One line per code without an anchor and per anchor without a code; empty when they match.
 */
export function anchorProblems(codes: readonly string[], markdown: string): readonly string[] {
	const anchors = new Set([...markdown.matchAll(/^### (SWT-[A-Z][0-9]{3})$/gm)].map((match) => match[1] ?? ""));
	const known = new Set(codes);
	return [
		...[...known].filter((code) => !anchors.has(code)).map((code) => `${code}: no anchor #${code.toLowerCase()} in ${ERRORS_PAGE}`),
		...[...anchors].filter((code) => !known.has(code)).map((code) => `#${code.toLowerCase()}: an anchor of ${ERRORS_PAGE} without a code in the source`),
	];
}
