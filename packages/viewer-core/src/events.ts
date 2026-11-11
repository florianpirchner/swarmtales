/**
 * The lines of `events.jsonl` as open records. Every story writes its own event types, so the core
 * reads only what every line has (`type`, `seq`, `minute`, `at`), who acted (the actor) and whom the
 * line was about (the subject). Anything else stays in `data` for the views.
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
	/** Who acted: the field its type's {@link ActorRule} names, else the first of {@link ACTOR_FIELDS} the line carries. */
	readonly actor?: string;
	/** Whom the line was about, when its type's rule names a subject field (the member a group admitted, the resident a rule acted on). */
	readonly subject?: string;
	/** 1-based line number in `events.jsonl` (what the chain's `seq` counts). */
	readonly line: number;
	/** The whole parsed line. */
	readonly data: Readonly<Record<string, unknown>>;
}

/** The fields that name who acted, in the order they are looked up when a type has no rule of its own. */
export const ACTOR_FIELDS = ["actor", "agent", "by", "from", "author", "voter", "seat", "resident"] as const;

/**
 * Who did a line and whom it was about, for an event type whose fields do not say it in the order of
 * {@link ACTOR_FIELDS}. `actor` is a field, or a fixed name for a doer the line does not name (the
 * director, a guard); without `actor` the line keeps the default order, leaving out the subject field.
 */
export interface ActorRule {
	readonly actor?: string | { readonly name: string };
	readonly subject?: string;
}

/** Actor rules by event type. A caller's rules are added to {@link DEFAULT_ACTORS}; a type given replaces its default rule (`{}`: the plain order). */
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

function named(data: Readonly<Record<string, unknown>>, field: string): string | undefined {
	const value = data[field];
	return typeof value === "string" && value !== "" ? value : undefined;
}

/** The actor and subject of a parsed line under a rule (none: the first {@link ACTOR_FIELDS} entry that holds a non-empty string). */
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

/**
 * Parses `events.jsonl`; a line that is not a JSON object with a string `type` becomes an issue, never
 * an exception. `actors` are added to {@link DEFAULT_ACTORS}.
 */
export function parseEvents(text: string, file = "events.jsonl", actors: ActorVocabulary = {}): { readonly events: readonly RunEvent[]; readonly issues: readonly LoadIssue[] } {
	const events: RunEvent[] = [];
	const issues: LoadIssue[] = [];
	const rules: ActorVocabulary = { ...DEFAULT_ACTORS, ...actors };
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
		const { actor, subject } = actorOf(value, Object.hasOwn(rules, value.type) ? rules[value.type] : undefined);
		events.push({
			seq: value.seq ?? line,
			minute,
			type: value.type,
			...(value.at === undefined ? {} : { at: value.at }),
			...(actor === undefined ? {} : { actor }),
			...(subject === undefined ? {} : { subject }),
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
