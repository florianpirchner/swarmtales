/**
 * The legacy event adapter (wave 2b): the new core's envelope stays the truth inside the run, and
 * this log sink writes today's flat events (`{ type, ...fields, seq, minute }`) from it, byte for
 * byte, so the golden runs and every reader of `events.jsonl` (digest, reporter, novelist) keep
 * working while `World` is carved into mechanics.
 *
 * - An event of a mechanic or of the app is flattened: its payload's fields after `type`.
 * - A core event is dropped unless a translator turns it into legacy events: `pass_started` gives
 *   `round_start` (first pass) and `pass_start`, `turn_skipped` and `guard_verdict` keep their
 *   names. Tool calls, service calls, jobs and locks have no legacy form.
 * - A shared event the old engine never wrote (`LEGACY_SILENT`: signals between mechanics that
 *   stood for a direct call) is dropped too.
 * - `seq` counts the written events, so it matches the old log where the core wrote extra events.
 *   Fields that name another event by its seq (`LEGACY_SEQ_FIELDS`: the classifier's
 *   `interpretation.ref`, the weaver's `fate_shift.evidence`) are translated from the envelope's
 *   seq to the legacy seq of the line that envelope became (or, for a dropped envelope, the last
 *   legacy line before it); a seq the adapter has not seen (a resumed run's prefix) is kept.
 *
 * `envelopeFromLegacy` reads an old line back into an envelope (source from the owner table); a
 * round trip through it and the adapter gives the same bytes (test/log/legacy-events.test.ts).
 */
import { Type, type Static } from "typebox";
import { Compile } from "typebox/compile";
import { EventEnvelopeSchema, type Actor, type EventEnvelope, type RecordedEvent } from "@swarmtales/contracts";
import { RecordedEventSchema } from "../snapshot/event-schema.ts";
import { legacyOwner } from "./legacy-owners.ts";

/** A legacy event before it is numbered: `type` first, then its fields. */
export interface LegacyFields {
	readonly type: string;
	readonly [field: string]: unknown;
}

/** Turns one envelope into legacy events; an empty list drops it. */
export type LegacyTranslator = (event: EventEnvelope) => readonly LegacyFields[];

const PassStarted = Compile(Type.Object({ pass: Type.Integer(), order: Type.Array(Type.String()), blocks: Type.Array(Type.Array(Type.String())) }));
const TurnSkipped = Compile(Type.Object({ resident: Type.String(), pass: Type.Integer(), block: Type.Integer() }));
const GuardVerdict = Compile(
	Type.Object({
		tool: Type.String(),
		rule: Type.String(),
		allowed: Type.Boolean(),
		reason: Type.String(),
		by: Type.Union([Type.Literal("check"), Type.Literal("model"), Type.Literal("none")]),
		error: Type.Optional(Type.String()),
	}),
);

/**
 * Events of mechanics with no line in the old log, keyed `<source>.<type>`. The same list is
 * `LEGACY_SILENT_EVENTS` in mechanics/shared (the chronicle may not import mechanics;
 * test/mechanics/shared-frozen.test.ts keeps the two equal).
 */
export const LEGACY_SILENT: readonly string[] = ["progression.level_entered", "progression.act_started", "progression.act_ended", "cast.cast_collected"];

/**
 * Payload fields that hold the seq of another event, keyed `<source>.<type>`: an integer or a list
 * of integers (step 18, C1 request 4). The models see envelope numbers (the host log is what the
 * overseers read); the written legacy log points at its own lines.
 */
export const LEGACY_SEQ_FIELDS: Readonly<Record<string, readonly string[]>> = {
	"classifier.interpretation": ["ref"],
	"weaver.fate_shift": ["evidence"],
};

function residentOf(actor: Actor): string {
	return actor.startsWith("resident:") ? actor.slice("resident:".length) : actor;
}

/** The core events that have a legacy form, keyed `core.<type>`. */
export const LEGACY_CORE_TRANSLATORS: Readonly<Record<string, LegacyTranslator>> = {
	"core.pass_started": (event) => {
		const { pass, order, blocks } = PassStarted.Parse(event.payload);
		const round = event.minute + 1;
		return [...(pass === 1 ? [{ type: "round_start", round }] : []), { type: "pass_start", round, pass, order, blocks }];
	},
	"core.turn_skipped": (event) => {
		const { resident, pass, block } = TurnSkipped.Parse(event.payload);
		return [{ type: "turn_skipped", agent: resident, pass, block }];
	},
	"core.guard_verdict": (event) => {
		const { tool, rule, allowed, reason, by, error } = GuardVerdict.Parse(event.payload);
		return [{ type: "guard_verdict", tool, agent: residentOf(event.actor), rule, allowed, reason, by, ...(error === undefined ? {} : { error }) }];
	},
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `{ type, ...payload }`; the payload must be an object without `type`, `seq` or `minute`. */
export function flatten(event: EventEnvelope): LegacyFields {
	const payload = event.payload;
	if (!isRecord(payload)) throw new Error(`legacy log: the payload of ${event.source}.${event.type} is not an object`);
	for (const reserved of ["type", "seq", "minute"]) {
		if (Object.hasOwn(payload, reserved)) throw new Error(`legacy log: ${event.source}.${event.type} has a field "${reserved}"`);
	}
	return { type: event.type, ...payload };
}

export interface LegacyAdapterOptions {
	/** Added to (and overriding) the built-in core translators, keyed `<source>.<type>`. */
	readonly translators?: Readonly<Record<string, LegacyTranslator>>;
	/** The last legacy `seq` already written (a resumed run continues the old numbering). */
	readonly lastSeq?: number;
}

/** A legacy event with its number and minute, in today's key order. */
export interface LegacyEvent extends LegacyFields {
	readonly seq: number;
	readonly minute: number;
}

export class LegacyEventAdapter {
	readonly #translators: Readonly<Record<string, LegacyTranslator>>;
	/** Envelope seq to the legacy seq it became (or the last legacy seq before it, when dropped). */
	readonly #legacySeq = new Map<number, number>();
	#seq: number;

	constructor(options: LegacyAdapterOptions = {}) {
		const silent = Object.fromEntries(LEGACY_SILENT.map((key): [string, LegacyTranslator] => [key, () => []]));
		this.#translators = { ...silent, ...LEGACY_CORE_TRANSLATORS, ...options.translators };
		this.#seq = options.lastSeq ?? 0;
	}

	get lastSeq(): number {
		return this.#seq;
	}

	/** The legacy seq an envelope seq became; `undefined` for a seq this adapter has not seen. */
	legacySeqOf(seq: number): number | undefined {
		return this.#legacySeq.get(seq);
	}

	/** The legacy events one envelope becomes (none for most core events). */
	write(event: EventEnvelope): readonly LegacyEvent[] {
		const key = `${event.source}.${event.type}`;
		const translator = this.#translators[key];
		const fields = translator === undefined ? (event.source === "core" ? [] : [flatten(event)]) : translator(event);
		const references = LEGACY_SEQ_FIELDS[key] ?? [];
		this.#legacySeq.set(event.seq, fields.length === 0 ? this.#seq : this.#seq + 1);
		return fields.map((entry) => {
			this.#seq += 1;
			return { ...this.#translated(entry, references), seq: this.#seq, minute: event.minute };
		});
	}

	#translated(entry: LegacyFields, references: readonly string[]): LegacyFields {
		if (references.length === 0) return entry;
		const map = (value: unknown): unknown => (typeof value === "number" ? (this.#legacySeq.get(value) ?? value) : value);
		const out: Record<string, unknown> = { ...entry };
		for (const field of references) {
			const value = out[field];
			if (value !== undefined) out[field] = Array.isArray(value) ? value.map(map) : map(value);
		}
		return { ...out, type: entry.type };
	}
}

/**
 * One line of a legacy log. `stamp` holds what a sink wrote behind `minute` (the JSONL log's
 * wall-clock `at`, see `legacyStamp`); it is not part of the event.
 */
export function legacyLine(event: LegacyEvent, stamp: Readonly<Record<string, unknown>> = {}): string {
	return JSON.stringify({ ...event, ...stamp });
}

/**
 * What a sink wrote behind `minute` in an old line (live logs carry the wall clock as `at`): kept
 * beside the envelope, never in its payload, so a line reads back and writes out unchanged.
 */
export function legacyStamp(raw: unknown): Readonly<Record<string, unknown>> {
	if (!isRecord(raw)) return {};
	const keys = Object.keys(raw);
	const at = keys.indexOf("minute");
	return at < 0 ? {} : Object.fromEntries(keys.slice(at + 1).map((key) => [key, raw[key]]));
}

const recorded = Compile(RecordedEventSchema);

/** A legacy event checked against the engine's event union, for today's sinks (`JsonlEventLog`, reporter, digest). */
export function toRecorded(event: LegacyEvent): RecordedEvent {
	if (!recorded.Check(event)) throw new Error(`legacy log: ${event.type} #${String(event.seq)} does not match the event schema`);
	const checked: Static<typeof RecordedEventSchema> = event;
	return checked;
}

/** A host sink that hands every legacy event to `record` (an `EventSink`'s record, say). */
export function legacySink(record: (event: RecordedEvent) => void, options: LegacyAdapterOptions = {}): (event: EventEnvelope) => void {
	const adapter = new LegacyEventAdapter(options);
	return (event) => {
		for (const legacy of adapter.write(event)) record(toRecorded(legacy));
	};
}

const LegacyLine = Compile(Type.Object({ type: Type.String(), seq: Type.Integer({ minimum: 1 }), minute: Type.Integer({ minimum: 0 }) }, { additionalProperties: true }));
const envelope = Compile(EventEnvelopeSchema);

/**
 * An old event (untrusted) as an envelope: the source from the owner table, the fields as payload
 * in their order, and for `guard_verdict` the core's payload with the author as actor. A sink's
 * stamp behind `minute` (`at`) is left out; `legacyStamp` reads it.
 */
export function envelopeFromLegacy(raw: unknown): EventEnvelope {
	if (!LegacyLine.Check(raw) || !isRecord(raw)) throw new Error("legacy log: not an event line");
	const { type, seq, minute } = raw;
	const stamped = Object.keys(legacyStamp(raw));
	const without = (...keys: readonly string[]): Record<string, unknown> => Object.fromEntries(Object.entries(raw).filter(([key]) => !keys.includes(key) && !stamped.includes(key)));
	const fields = without("type", "seq", "minute");
	const source = legacyOwner(type);
	if (source === "core") {
		const agent = fields.agent;
		if (type !== "guard_verdict" || typeof agent !== "string") throw new Error(`legacy log: no core form of ${type}`);
		const verdict = GuardVerdict.Parse(without("type", "seq", "minute", "agent"));
		const built: unknown = { seq, minute, type, source, actor: `resident:${agent}`, payload: verdict };
		return envelope.Parse(built);
	}
	const built: unknown = { seq, minute, type, source, actor: "host", payload: fields };
	return envelope.Parse(built);
}
