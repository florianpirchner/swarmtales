/**
 * The lines of `events.jsonl` as open records. Every story writes its own event types, so the core
 * reads only what every line has (`type`, `seq`, `minute`, `at`) and who acted, from the first of
 * the actor fields a line carries. Anything else stays in `data` for the views.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";

/** Something in a run folder the loader could not read; the rest of the run still loads. */
export interface LoadIssue {
	readonly file: string;
	/** 1-based line of a JSONL file. */
	readonly line?: number;
	readonly reason: string;
}

export interface RunEvent {
	/** The line's own `seq`, or its line number when it has none. */
	readonly seq: number;
	/** The line's `minute`, or the minute of the line before it. */
	readonly minute: number;
	readonly type: string;
	/** Wall-clock stamp (ISO 8601), when the line has one. */
	readonly at?: string;
	/** Who acted, from the first actor field the line carries ({@link ACTOR_FIELDS}). */
	readonly actor?: string;
	/** 1-based line number in `events.jsonl` (what the chain's `seq` counts). */
	readonly line: number;
	/** The whole parsed line. */
	readonly data: Readonly<Record<string, unknown>>;
}

/** The fields that name who acted, in the order they are looked up. */
export const ACTOR_FIELDS = ["actor", "agent", "by", "from", "author", "voter", "seat", "resident"] as const;

const EventLine = Type.Object(
	{
		type: Type.String(),
		seq: Type.Optional(Type.Integer()),
		minute: Type.Optional(Type.Number()),
		at: Type.Optional(Type.String()),
	},
	{ additionalProperties: true },
);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The actor of a parsed line: the first {@link ACTOR_FIELDS} entry that holds a non-empty string. */
export function actorOf(data: Readonly<Record<string, unknown>>): string | undefined {
	for (const field of ACTOR_FIELDS) {
		const value = data[field];
		if (typeof value === "string" && value !== "") return value;
	}
	return undefined;
}

/** Parses `events.jsonl`; a line that is not a JSON object with a string `type` becomes an issue, never an exception. */
export function parseEvents(text: string, file = "events.jsonl"): { readonly events: readonly RunEvent[]; readonly issues: readonly LoadIssue[] } {
	const events: RunEvent[] = [];
	const issues: LoadIssue[] = [];
	let minute = 0;
	const lines = text.split("\n");
	if (lines.at(-1) === "") lines.pop();
	for (const [index, raw] of lines.entries()) {
		const line = index + 1;
		if (raw.trim() === "") {
			issues.push({ file, line, reason: "an empty line" });
			continue;
		}
		let value: unknown;
		try {
			value = JSON.parse(raw);
		} catch {
			issues.push({ file, line, reason: "not a JSON line" });
			continue;
		}
		if (!isRecord(value) || !Check(EventLine, value)) {
			issues.push({ file, line, reason: "not an event (no string type)" });
			continue;
		}
		minute = value.minute ?? minute;
		const actor = actorOf(value);
		events.push({
			seq: value.seq ?? line,
			minute,
			type: value.type,
			...(value.at === undefined ? {} : { at: value.at }),
			...(actor === undefined ? {} : { actor }),
			line,
			data: value,
		});
	}
	return { events, issues };
}

/** A string field of an event, or undefined. */
export function stringField(event: RunEvent, field: string): string | undefined {
	const value = event.data[field];
	return typeof value === "string" ? value : undefined;
}

/** A finite number field of an event, or undefined. */
export function numberField(event: RunEvent, field: string): number | undefined {
	const value = event.data[field];
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
