export function usd(value: number | undefined): string {
	if (value === undefined) return "-";
	return value >= 100 ? `$${value.toFixed(0)}` : value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(3)}`;
}

export function count(value: number | undefined): string {
	if (value === undefined) return "-";
	if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
	if (value >= 1e4) return `${(value / 1e3).toFixed(0)}k`;
	return value.toLocaleString("en-US");
}

export function number(value: number | undefined, digits = 2): string {
	return value === undefined ? "-" : Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function day(iso: string | undefined): string {
	return iso === undefined ? "" : iso.slice(0, 10);
}

/** One line of an event for a list: its first short text-like fields. */
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
