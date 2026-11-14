// SPDX-License-Identifier: Apache-2.0
/**
 * The lines of `events.jsonl` as open records. Every story writes its own event types, so the core
 * reads only what every line has (`type`, `seq`, `minute`, `at`), who acted (the actor) and whom the
 * line was about (the subject). Anything else stays in `data` for the views.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";

/**
 * Something in a run folder the loader could not read; the rest of the run still loads.
 *
 * @public
 */
export interface LoadIssue {
	/** The path of the file. */
	readonly file: string;
	/** 1-based line of a JSONL file. */
	readonly line?: number;
	/** What is wrong, as a short phrase. */
	readonly reason: string;
}

/**
 * One line of the log, as every view reads it.
 *
 * @public
 */
export interface RunEvent {
	/** The line's own `seq`, or its line number when it has none. */
	readonly seq: number;
	/** The line's `minute`, or the minute of the line before it. */
	readonly minute: number;
	/** The event type. */
	readonly type: string;
	/** Wall-clock stamp (ISO 8601), when the line has one. */
	readonly at?: string;
	/** Who acted: the field its type's {@link ActorRule} names, else the first of `ACTOR_FIELDS` the line carries. */
	readonly actor?: string;
	/** Whom the line was about, when its type's rule names a subject field (the member a group admitted, the resident a rule acted on). */
	readonly subject?: string;
	/** 1-based line number in `events.jsonl` (what the chain's `seq` counts). */
	readonly line: number;
	/** The whole parsed line. */
	readonly data: Readonly<Record<string, unknown>>;
	/** The id of the envelope's actor (`resident:A01`, `director:warden`, `human`, `kernel`); only a line of the envelope reader has one. */
	readonly actorId?: string;
	/** The envelope's payload as written, with the fields `data` shadows (`actor` of `actor_suspended`); only a line of the envelope reader has one. */
	readonly payload?: unknown;
}

/** The fields that name who acted, in the order they are looked up when a type has no rule of its own. */
export const ACTOR_FIELDS = ["actor", "agent", "by", "from", "author", "voter", "seat", "resident"] as const;

/**
 * Who did a line and whom it was about, for an event type whose fields do not say it in the order of
 * `ACTOR_FIELDS`. `actor` is a field, or a fixed name for a doer the line does not name (the
 * director, a guard); without `actor` the line keeps the default order, leaving out the subject field.
 *
 * @public
 */
export interface ActorRule {
	/** The field that names who acted, or a fixed name. */
	readonly actor?: string | { readonly name: string };
	/** The field that names whom the line was about. */
	readonly subject?: string;
}

/**
 * Actor rules by event type. A caller's rules are added to `DEFAULT_ACTORS`; a type given replaces its default rule (`{}`: the plain order).
 *
 * @public
 */
export type ActorVocabulary = Readonly<Record<string, ActorRule>>;

/**
 * The types of the recorded logs whose first actor field names the subject: a group member added by
 * someone else, a resident a director rule or a guard acted on, an exiled resident, an audited seat,
 * a resident whose message was forged, the one a piece was bought from, and the resident the city
 * dealt a goal or a gate to (no actor: the city did it).
 */
export const DEFAULT_ACTORS: ActorVocabulary = {
	group_membership: { actor: "by", subject: "agent" },
	director_action: { actor: { name: "director" }, subject: "actor" },
	director_skipped: { actor: { name: "director" }, subject: "actor" },
	guard_verdict: { actor: { name: "guard" }, subject: "agent" },
	exiled: { actor: "by", subject: "agent" },
	convoy_audited: { actor: "by", subject: "seat" },
	receipt_forged: { actor: "by", subject: "from" },
	piece_claimed: { actor: "agent", subject: "from" },
	goal_dealt: { subject: "agent" },
	goal_resolved: { subject: "agent" },
	exile_gate: { subject: "agent" },
	factor_burned: { subject: "agent" },
};

const EventLine = Type.Object({ type: Type.String() }, { additionalProperties: true });

/** The largest minute a line may name (a run of 100 000 minutes is far beyond any story); beyond it the charts' arrays would explode. */
const MAX_MINUTE = 100_000;

// A `seq` the viewer can use: a whole number from 0 that a JavaScript number holds exactly.
function goodSeq(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function goodMinute(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_MINUTE;
}

/**
 * Says whether a value is a JSON object.
 *
 * @param value - Any parsed JSON value.
 * @returns True for an object that is no array and not null.
 */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function named(data: Readonly<Record<string, unknown>>, field: string): string | undefined {
	const value = data[field];
	return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * The actor and subject of a parsed line under a rule (none: the first `ACTOR_FIELDS` entry that holds a non-empty string).
 *
 * @param data - The parsed line.
 * @param rule - The rule of the line's type.
 * @returns The actor and the subject, each left out when the line names none.
 */
export function actorOf(data: Readonly<Record<string, unknown>>, rule: ActorRule = {}): { readonly actor?: string; readonly subject?: string } {
	const subject = rule.subject === undefined ? undefined : named(data, rule.subject);
	const ruled = rule.actor;
	const actor =
		ruled === undefined
			? ACTOR_FIELDS.filter((field) => field !== rule.subject)
					.map((field) => named(data, field))
					.find((value) => value !== undefined)
			: typeof ruled === "string"
				? named(data, ruled)
				: ruled.name;
	return { ...(actor === undefined ? {} : { actor }), ...(subject === undefined ? {} : { subject }) };
}

/** A parsed line that is an event: a JSON object with a string `type`. */
type EventRecord = Readonly<Record<string, unknown>> & { readonly type: string };

/**
 * Splits the text of a JSONL file into its lines; the empty part after the last line break is no line.
 *
 * @param text - The text of the file.
 * @returns The lines in file order.
 */
export function linesOf(text: string): readonly string[] {
	const lines = text.split("\n");
	if (lines.at(-1) === "") lines.pop();
	return lines;
}

// Reads one line as an event record, or says why it is none.
function recordOf(raw: string): EventRecord | string {
	if (raw.trim() === "") return "an empty line";
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return "not a JSON line";
	}
	return isRecord(value) && Check(EventLine, value) ? value : "not an event (no string type)";
}

// What is wrong with the `seq` and the `minute` of a line; the line keeps its line number and the minute before it.
function stampFaults(value: EventRecord): readonly string[] {
	const faults: string[] = [];
	if (value.seq !== undefined && !goodSeq(value.seq)) faults.push("seq is not a whole number from 0");
	if (value.minute !== undefined && !goodMinute(value.minute)) faults.push(`minute is not a number from 0 to ${String(MAX_MINUTE)}`);
	return faults;
}

function eventOf(value: EventRecord, line: number, minute: number, rules: ActorVocabulary): RunEvent {
	const { seq, at } = value;
	const { actor, subject } = actorOf(value, Object.hasOwn(rules, value.type) ? rules[value.type] : undefined);
	return {
		seq: goodSeq(seq) ? seq : line,
		minute,
		type: value.type,
		...(typeof at === "string" ? { at } : {}),
		...(actor === undefined ? {} : { actor }),
		...(subject === undefined ? {} : { subject }),
		line,
		data: value,
	};
}

/**
 * Parses `events.jsonl`; a line that is not a JSON object with a string `type` becomes an issue, never
 * an exception. `actors` are added to `DEFAULT_ACTORS`.
 *
 * @param text - The text of the file.
 * @param file - The path of the file, for the issues.
 * @param actors - The caller's actor rules, by event type.
 * @returns The events in file order and the lines that could not be read.
 */
export function parseEvents(text: string, file = "events.jsonl", actors: ActorVocabulary = {}): { readonly events: readonly RunEvent[]; readonly issues: readonly LoadIssue[] } {
	const events: RunEvent[] = [];
	const issues: LoadIssue[] = [];
	const rules: ActorVocabulary = { ...DEFAULT_ACTORS, ...actors };
	let minute = 0;
	for (const [index, raw] of linesOf(text).entries()) {
		const line = index + 1;
		const value = recordOf(raw);
		if (typeof value === "string") {
			issues.push({ file, line, reason: value });
			continue;
		}
		for (const reason of stampFaults(value)) issues.push({ file, line, reason });
		if (goodMinute(value.minute)) minute = value.minute;
		events.push(eventOf(value, line, minute, rules));
	}
	return { events, issues };
}

/**
 * A string field of an event, or undefined.
 *
 * @param event - The event.
 * @param field - The name of the field.
 * @returns The value, or `undefined` when the field is no string.
 */
export function stringField(event: RunEvent, field: string): string | undefined {
	const value = event.data[field];
	return typeof value === "string" ? value : undefined;
}

/**
 * A finite number field of an event, or undefined.
 *
 * @param event - The event.
 * @param field - The name of the field.
 * @returns The value, or `undefined` when the field is no finite number.
 */
export function numberField(event: RunEvent, field: string): number | undefined {
	const value = event.data[field];
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
