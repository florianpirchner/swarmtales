// SPDX-License-Identifier: Apache-2.0
/**
 * The Markdown pieces both reports are built from. Pure text functions: no file access and no clock.
 */
import type { FactValue } from "../facts/facts.ts";

/** The word a value that was not measured is printed as. A report never prints a zero in its place. */
export const ABSENT = "absent";

/**
 * Prints a value: the word `absent`, an integer as it is, another number with four significant digits.
 *
 * @param value - The value, or `undefined` when there is none.
 * @returns The text of a table cell.
 */
export function shown(value: FactValue | undefined): string {
	if (value === undefined || value === ABSENT) return ABSENT;
	return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));
}

/**
 * Prints an id or a hash as code, or the word `absent` when it is empty.
 *
 * @param text - The id.
 * @param length - The number of characters that are kept; all of them without it.
 * @returns The text of a table cell.
 */
export function code(text: string | undefined, length?: number): string {
	return text === undefined || text === "" ? ABSENT : `\`${text.slice(0, length)}\``;
}

const line = (cells: readonly string[]): string => `| ${cells.map((cell) => cell.replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`;

/**
 * A Markdown table, or one line of text when it has no row.
 *
 * @param head - The column titles.
 * @param rows - The rows, each with one cell per column.
 * @param none - The line that stands for an empty table.
 * @returns The lines of the table.
 */
export function table(head: readonly string[], rows: readonly (readonly string[])[], none: string): readonly string[] {
	return rows.length === 0 ? [none] : [line(head), line(head.map(() => "---")), ...rows.map(line)];
}

/**
 * A section: a blank line, the heading, a blank line and the body.
 *
 * @param heading - The heading line, with its `##`.
 * @param body - The lines of the section.
 * @returns The lines of the section.
 */
export function section(heading: string, body: readonly string[]): readonly string[] {
	return ["", heading, "", ...body];
}
