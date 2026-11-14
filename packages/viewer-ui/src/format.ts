// SPDX-License-Identifier: Apache-2.0
/**
 * Writes an amount in US dollars.
 *
 * @param value - The amount.
 * @returns The text; `-` for no amount.
 */
export function usd(value: number | undefined): string {
	if (value === undefined) return "-";
	return value >= 100 ? `$${value.toFixed(0)}` : value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(3)}`;
}

/**
 * Writes a count: with thousands separators below 10,000, then in thousands (`k`) and millions (`M`).
 *
 * @param value - The number.
 * @returns The text; `-` for no number.
 */
export function count(value: number | undefined): string {
	if (value === undefined) return "-";
	if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
	if (value >= 1e4) return `${(value / 1e3).toFixed(0)}k`;
	return value.toLocaleString("en-US");
}

/**
 * Writes a number: a whole number as it is, any other with a fixed count of digits after the point.
 *
 * @param value - The number.
 * @param digits - The digits after the point.
 * @returns The text; `-` for no number.
 */
export function number(value: number | undefined, digits = 2): string {
	return value === undefined ? "-" : Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

/**
 * Writes the day of an ISO 8601 time.
 *
 * @param iso - The time.
 * @returns The day; an empty text for no time.
 */
export function day(iso: string | undefined): string {
	return iso === undefined ? "" : iso.slice(0, 10);
}

/**
 * One line of an event for a list: its first short text-like fields.
 *
 * @param data - The parsed line of the event.
 * @returns A short text for the event list.
 */
export function summaryOf(data: Readonly<Record<string, unknown>>): string {
	const skip = new Set(["type", "seq", "minute", "at"]);
	const parts: string[] = [];
	for (const [key, value] of Object.entries(data)) {
		if (skip.has(key)) continue;
		if (typeof value === "string") parts.push(`${key}=${value.replace(/\s+/g, " ").slice(0, 80)}`);
		else if (typeof value === "number" || typeof value === "boolean") parts.push(`${key}=${String(value)}`);
		if (parts.length >= 4) break;
	}
	return parts.join("  ");
}
