// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The normal form of an API report (decision A87, issue M5-74). The type checker prints the members of a union of
 * string literals in the order it happened to visit them, which changes from one build to the next
 * (`"accuse" | "audit"` against `"audit" | "accuse"`). Sorting the members of every run of adjacent string
 * literals in a union makes the report change only when the API does. The members of an inferred object type (the
 * fields of a Typebox `Static` type) flip the same way (decision A90, issue M5-75), so the member lines of every object
 * type literal are sorted too, each member with its nested block and its leading comment lines. A declaration marked
 * `// @internal` leaves the report (decision A104, issue M5-94), with its leading comment lines and the blank line
 * after it, so that the report holds the public API only; an import that no remaining line names leaves with it
 * (decision A106, issue M5-96). Everything else stays byte for byte.
 */

/** One string literal in double or single quotes, with escapes. */
const LITERAL = String.raw`(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`;
/** The separator of two union members, which may span a line break. */
const BAR = String.raw`\s*\|\s*`;
/** A run of at least two string literals joined by `|`. */
const RUN = new RegExp(`${LITERAL}(?:${BAR}${LITERAL})+`, "g");
const ONE_LITERAL = new RegExp(LITERAL, "g");

function compareCodeUnits(a: string, b: string): number {
	if (a === b) {
		return 0;
	}
	return a < b ? -1 : 1;
}

/** Sorts the literals of one run and keeps its separators in place. */
function sortRun(run: string): string {
	const literals = run.match(ONE_LITERAL) ?? [];
	const separators = run.split(ONE_LITERAL).slice(1, -1);
	const sorted = [...literals].sort(compareCodeUnits);
	return sorted.map((literal, index) => literal + (separators[index] ?? "")).join("");
}

/** A block that is a declaration, not a type literal: its members keep their order (an enum's order is its values). */
const DECLARATION = /^\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:interface|class|namespace|module|enum)\b/;
/** A line that is only a comment, or a line of a block comment. */
const COMMENT = /^\s*(?:\/\/|\/\*|\*)/;
const OPENERS = "{<([";
const CLOSERS = "}>)]";

/** Returns the index after the string, template or line comment that starts at `index`, or `index` when none does. */
function skipOpaque(line: string, index: number): number {
	const quote = line[index] ?? "";
	if (line.startsWith("//", index)) {
		return line.length;
	}
	if (quote !== '"' && quote !== "'" && quote !== "`") {
		return index;
	}
	let at = index + 1;
	while (at < line.length && line[at] !== quote) {
		at += line[at] === "\\" ? 2 : 1;
	}
	return at + 1;
}

/** The change of bracket depth over one character: braces only with `curly`, else `{<([` against `}>)]` (not `=>`). */
function step(line: string, index: number, curly: boolean): number {
	const char = line[index] ?? "";
	if (curly) {
		return char === "{" ? 1 : char === "}" ? -1 : 0;
	}
	if (OPENERS.includes(char)) {
		return 1;
	}
	return CLOSERS.includes(char) && !(char === ">" && line[index - 1] === "=") ? -1 : 0;
}

/**
 * Walks one line from depth `start`, outside strings and comments. Returns the depth after the line, and the index
 * of the bracket where the depth first falls below zero (-1 when it does not).
 */
function walk(line: string, curly: boolean, start: number): { readonly depth: number; readonly fell: number } {
	let depth = start;
	let index = 0;
	while (index < line.length) {
		const next = skipOpaque(line, index);
		if (next !== index) {
			index = next;
			continue;
		}
		depth += step(line, index, curly);
		if (depth < 0) {
			return { depth, fell: index };
		}
		index += 1;
	}
	return { depth, fell: -1 };
}

/** The index of the line that closes the block opened at the end of line `open`, when that `}` starts the line. */
function closingLine(lines: readonly string[], open: number): number | undefined {
	let depth = 0;
	for (let index = open + 1; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (COMMENT.test(line)) {
			continue;
		}
		const { depth: after, fell } = walk(line, true, depth);
		if (fell !== -1) {
			return line.length - line.trimStart().length === fell ? index : undefined;
		}
		depth = after;
	}
	return undefined;
}

/**
 * Splits the lines inside a type literal into members: a member runs until its brackets are balanced and its line
 * ends with `;`, and takes the comment lines before it. Returns `undefined` when the lines do not split cleanly
 * (a blank line, a trailing comment, a bracket that closes too early), so that the block is left as it is.
 */
function splitMembers(lines: readonly string[]): string[][] | undefined {
	const members: string[][] = [];
	let current: string[] = [];
	let depth = 0;
	for (const line of lines) {
		if (depth === 0 && line.trim() === "") {
			return undefined;
		}
		current.push(line);
		if (COMMENT.test(line)) {
			continue;
		}
		depth = walk(line, false, depth).depth;
		if (depth < 0) {
			return undefined;
		}
		if (depth === 0 && line.trimEnd().endsWith(";")) {
			members.push(current);
			current = [];
		}
	}
	return current.length === 0 ? members : undefined;
}

/** Orders two members by their code (without the leading comment lines), then by their whole text. */
function compareMembers(a: readonly string[], b: readonly string[]): number {
	const code = (member: readonly string[]): string => member.slice(member.findIndex((line) => !COMMENT.test(line))).join("\n");
	return compareCodeUnits(code(a), code(b)) || compareCodeUnits(a.join("\n"), b.join("\n"));
}

/** Sorts the members of every type literal among the lines, innermost first, and keeps all other lines in place. */
function sortBlocks(lines: readonly string[]): string[] {
	const out: string[] = [];
	let index = 0;
	while (index < lines.length) {
		const line = lines[index] ?? "";
		out.push(line);
		const close = line.trimEnd().endsWith("{") && !DECLARATION.test(line) ? closingLine(lines, index) : undefined;
		const members = close === undefined ? undefined : splitMembers(lines.slice(index + 1, close));
		if (close === undefined || members === undefined) {
			index += 1;
			continue;
		}
		const sorted = members.map((member) => sortBlocks(member)).sort(compareMembers);
		out.push(...sorted.flat());
		index = close;
	}
	return out;
}

/** The release tag line of an internal declaration, at any indent. */
const INTERNAL = /^(\s*)\/\/ @internal\b/;
/** The last line of a report, or a line that closes a block. */
const CLOSER_LINE = /^\s*(?:[}\]]|$)/;

/** The index of the last line of the declaration that starts at line `start`: where its brackets balance at `;` or `}`. */
function declarationEnd(lines: readonly string[], start: number): number {
	let depth = 0;
	for (let index = start; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (COMMENT.test(line)) {
			continue;
		}
		depth = walk(line, false, depth).depth;
		if (depth <= 0 && /[;}]$/.test(line.trimEnd())) {
			return index;
		}
	}
	return lines.length - 1;
}

/** The index of the first comment line of the run of comment lines at `indent` that ends at line `tag`. */
function commentStart(lines: readonly string[], tag: number, indent: string): number {
	let first = tag;
	while (first > 0) {
		const line = lines[first - 1] ?? "";
		if (!line.startsWith(`${indent}//`)) {
			break;
		}
		first -= 1;
	}
	return first;
}

/**
 * Takes out the blank line that separated a dropped declaration: the one after it (returns the index after that
 * line), or at the end of a block or of the report the one before it (popped from `out`).
 */
function dropSeparator(lines: readonly string[], index: number, out: string[]): number {
	const after = lines[index];
	if (after?.trim() === "" && index + 1 < lines.length) {
		return index + 1;
	}
	if (out.at(-1)?.trim() === "" && (after === undefined || CLOSER_LINE.test(after))) {
		out.pop();
	}
	return index;
}

/** Drops every declaration whose release tag line is `// @internal`, at any depth, with the comment lines before it. */
function dropInternal(lines: readonly string[]): string[] {
	const out: string[] = [];
	let index = 0;
	while (index < lines.length) {
		const line = lines[index] ?? "";
		const tag = INTERNAL.exec(line);
		if (tag === null) {
			out.push(line);
			index += 1;
			continue;
		}
		const indent = tag[1] ?? "";
		out.length -= index - commentStart(lines, index, indent);
		index = dropSeparator(lines, declarationEnd(lines, index + 1) + 1, out);
	}
	return out;
}

/** An import line with named bindings, as api-extractor writes it: `import { A } from 'x';` (also `A as B`, a list). */
const NAMED_IMPORT = /^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+(?:'[^']*'|"[^"]*");?\s*$/;
/** An import line with one binding: `import * as A from 'x';` or `import A from 'x';`. */
const SINGLE_IMPORT = /^import\s+(?:type\s+)?(?:\*\s+as\s+)?([\w$]+)\s+from\s+(?:'[^']*'|"[^"]*");?\s*$/;

/** The local names an import line binds, or `undefined` when the line is no import. */
function importedNames(line: string): string[] | undefined {
	const named = NAMED_IMPORT.exec(line);
	if (named !== null) {
		const specifiers = (named[1] ?? "").split(",").map((specifier) => specifier.trim());
		return specifiers.filter((specifier) => specifier !== "").map((specifier) => specifier.split(/\s+as\s+/).at(-1) ?? specifier);
	}
	const single = SINGLE_IMPORT.exec(line);
	return single === null ? undefined : [single[1] ?? ""];
}

/**
 * Drops every import line none of whose names stands as a whole word in a line that is no import: once the internal
 * declarations are gone, the imports that only they used. A name in a comment or a string counts as used, so an
 * import that may be needed always stays.
 */
function dropUnusedImports(lines: readonly string[]): string[] {
	const rest = lines.filter((line) => importedNames(line) === undefined).join("\n");
	const used = (name: string): boolean => new RegExp(`(?<![\\w$])${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(rest);
	return lines.filter((line) => importedNames(line)?.some(used) ?? true);
}

/**
 * Brings an API report into its normal form: line ends become `\n`, every declaration marked `// @internal` is
 * dropped with its leading comment lines, so is every import line whose names no other line uses, the members of every run of adjacent string literals in a union are sorted
 * by code unit, and so are the member lines of every object type literal (not those of an interface, class,
 * namespace or enum), each member with its nested block and its leading comment lines. All other text is left as it
 * is.
 *
 * @param report - The text of a report as api-extractor wrote it.
 * @returns The report in normal form.
 * @example
 * ```ts
 * normalizeReport('type T = "b" | "a";'); // 'type T = "a" | "b";'
 * ```
 */
export function normalizeReport(report: string): string {
	return sortBlocks(dropUnusedImports(dropInternal(report.replace(/\r\n/g, "\n").replace(RUN, sortRun).split("\n")))).join("\n");
}

/**
 * Compares a freshly built report in normal form with the committed one.
 *
 * @param fresh - The report of the current build, already in normal form.
 * @param committed - The committed report, or `undefined` when there is none.
 * @returns `undefined` when they are equal, otherwise why they differ (with the first differing line).
 */
export function reportDifference(fresh: string, committed: string | undefined): string | undefined {
	if (committed === undefined) {
		return "the committed report is missing";
	}
	const expected = committed.replace(/\r\n/g, "\n");
	if (fresh === expected) {
		return undefined;
	}
	const freshLines = fresh.split("\n");
	const expectedLines = expected.split("\n");
	const line = freshLines.findIndex((text, index) => text !== expectedLines[index]);
	const at = line === -1 ? freshLines.length : line;
	return `line ${String(at + 1)}: committed ${JSON.stringify(expectedLines[at] ?? "")}, built ${JSON.stringify(freshLines[at] ?? "")}`;
}
