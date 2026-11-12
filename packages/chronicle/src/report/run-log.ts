/**
 * Reads the files of a run directory for the run report: `events.jsonl`
 * (every event, checked against the snapshot's full event schema),
 * `000-run.json` and `usage.json`. All three are untrusted input: they are
 * parsed with typebox, unusable lines are reported as issues, and a missing
 * or malformed file yields an empty description instead of an error.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { type RecordedEvent, withCurrentType } from "@swarmtales/legacy-log";
import { RecordedEventSchema } from "../snapshot/event-schema.ts";

export interface FullEventLog {
	/** Valid events in `seq` order. */
	readonly events: readonly RecordedEvent[];
	/** Lines that could not be used, with their line number. */
	readonly issues: readonly string[];
}

const BaseEventSchema = Type.Object({ seq: Type.Integer({ minimum: 1 }), minute: Type.Integer({ minimum: 0 }), type: Type.String() });

/** Parses the text of an `events.jsonl` file into recorded events. */
export function parseFullEventLog(text: string): FullEventLog {
	const events: RecordedEvent[] = [];
	const issues: string[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		if (line.trim().length === 0) return;
		const where = `line ${index + 1}`;
		let value: unknown;
		try {
			value = withCurrentType(JSON.parse(line));
		} catch {
			issues.push(`${where}: not valid JSON`);
			return;
		}
		if (!Check(BaseEventSchema, value)) {
			issues.push(`${where}: not an event (needs seq, minute and type)`);
			return;
		}
		if (!Check(RecordedEventSchema, value)) {
			issues.push(`${where}: event "${value.type}" (seq ${value.seq}) does not match its schema`);
			return;
		}
		events.push(value);
	});
	events.sort((a, b) => a.seq - b.seq);
	return { events, issues };
}

export type EventOf<T extends RecordedEvent["type"]> = Extract<RecordedEvent, { type: T }>;

export function ofType<T extends RecordedEvent["type"]>(events: readonly RecordedEvent[], type: T): readonly EventOf<T>[] {
	return events.filter((event): event is EventOf<T> => event.type === type);
}

const MetadataSchema = Type.Object({
	run: Type.Optional(Type.String()),
	startedAt: Type.Optional(Type.String()),
	/** Runtime revision (docs/RUNTIME-REVISIONS.md); absent in runs before revision 2, which are revision 1. */
	runtime: Type.Optional(Type.Integer({ minimum: 1 })),
	storyId: Type.Optional(Type.String()),
	effective: Type.Optional(Type.Object({ seed: Type.Optional(Type.Integer()), startLevel: Type.Optional(Type.Integer()), minutes: Type.Optional(Type.Integer()) })),
	resumedFrom: Type.Optional(
		Type.Object({ file: Type.String(), level: Type.Integer(), round: Type.Integer(), minute: Type.Integer(), run: Type.Optional(Type.String()) }),
	),
	agents: Type.Optional(
		Type.Array(Type.Object({ agent: Type.String(), provider: Type.String(), model: Type.String(), persona: Type.Optional(Type.Union([Type.String(), Type.Null()])) })),
	),
	story: Type.Optional(
		Type.Object({
			id: Type.Optional(Type.String()),
			title: Type.Optional(Type.String()),
			run: Type.Optional(Type.Object({ survivors: Type.Optional(Type.Integer()) })),
			rules: Type.Optional(Type.Unknown()),
			acts: Type.Optional(Type.Array(Type.Object({ title: Type.String(), fromLevel: Type.Integer() }))),
			levels: Type.Optional(Type.Array(Type.Object({ number: Type.Integer(), title: Type.String(), task: Type.Optional(Type.String()) }))),
		}),
	),
});

/** The parts of `000-run.json` the report uses. */
export type RunMetadata = Static<typeof MetadataSchema>;

/** Parses the text of `000-run.json`; unusable metadata yields an empty description. */
export function parseMetadata(text: string | undefined): RunMetadata {
	if (text === undefined) return {};
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return {};
	}
	return Check(MetadataSchema, value) ? value : {};
}

const TotalsSchema = Type.Object({
	requests: Type.Number(),
	input: Type.Number(),
	output: Type.Number(),
	cacheRead: Type.Number(),
	cacheWrite: Type.Number(),
	costUsd: Type.Number(),
});
const UsageReportSchema = Type.Object({ totals: TotalsSchema, perAgent: Type.Array(Type.Object({ agent: Type.String(), costUsd: Type.Number(), requests: Type.Number() })) });
const UsageFileSchema = Type.Object({
	totals: TotalsSchema,
	perAgent: UsageReportSchema.properties.perAgent,
	prefix: Type.Optional(UsageReportSchema),
	own: Type.Optional(UsageReportSchema),
});

export type UsageFile = Static<typeof UsageFileSchema>;

/** Parses the text of `usage.json`; `undefined` when it is missing or malformed. */
export function parseUsageFile(text: string | undefined): UsageFile | undefined {
	if (text === undefined) return undefined;
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return undefined;
	}
	return Check(UsageFileSchema, value) ? value : undefined;
}

/** The texts of a run directory's files; absent files are `undefined`. */
export interface RunFiles {
	readonly events: string;
	readonly metadata?: string;
	readonly usage?: string;
}

export function readRunFiles(directory: string): RunFiles {
	const read = (name: string): string | undefined => {
		const path = join(directory, name);
		return existsSync(path) ? readFileSync(path, "utf8") : undefined;
	};
	const events = read("events.jsonl");
	if (events === undefined) throw new Error(`No events.jsonl in ${directory}`);
	const metadata = read("000-run.json");
	const usage = read("usage.json");
	return { events, ...(metadata === undefined ? {} : { metadata }), ...(usage === undefined ? {} : { usage }) };
}
