/**
 * The event envelope and the events the core itself writes. Mechanics declare their own events as
 * Typebox schemas; the host checks every payload against its schema when it is emitted.
 */
import { Type, type Static, type TSchema } from "typebox";
import type { Actor } from "./values.ts";

/** One entry of the append-only event log. */
export interface EventEnvelope<T extends string = string, P = unknown> {
	/** Position in the log, from 1, without gaps. */
	readonly seq: number;
	/** The virtual minute the event happened in (from 0). */
	readonly minute: number;
	readonly type: T;
	/** `core` or the id of the mechanic that declared the event. */
	readonly source: string;
	/** Who caused the chain this event belongs to. */
	readonly actor: Actor;
	/** The event this one is a consequence of (a tool call, a service call, an event a listener reacted to). */
	readonly causedBy?: number;
	readonly payload: P;
}

/** The events a mechanic declares: event type to payload schema. */
export type EventSchemas = Readonly<Record<string, TSchema>>;

/**
 * Events declared apart from the mechanic that emits them (`defineEvents`), in a shared place like
 * an API: listeners take this, not the mechanic, so they need no value import of it. A loaded
 * mechanic whose `id` is `id` must declare each of these events with the very same schema.
 * Every `MechanicDefinition` is one too.
 */
export interface EventsDefinition<Id extends string = string, E extends EventSchemas = EventSchemas> {
	readonly id: Id;
	readonly events: E;
}

/** The typed envelopes of one mechanic's events, for exhaustive consumers (chronicle, reporter). */
export type EventOf<Source extends string, E extends EventSchemas> = {
	readonly [K in keyof E & string]: EventEnvelope<K, Static<E[K]>> & { readonly source: Source };
}[keyof E & string];

/** Read access to the log, for facts, listeners and roles. */
export interface EventLogView {
	readonly length: number;
	all(): readonly EventEnvelope[];
	/** Events with `seq` greater than `seq`. */
	since(seq: number): readonly EventEnvelope[];
	ofType(source: string, type: string): readonly EventEnvelope[];
}

const Stage = Type.String();

/** The events the core writes; their names are reserved, no mechanic may declare them. */
export const CORE_EVENTS = {
	run_started: Type.Object({
		story: Type.String(),
		seed: Type.Number(),
		minutes: Type.Number(),
		residents: Type.Array(Type.String()),
		/** In load order. */
		mechanics: Type.Array(Type.String()),
	}),
	minute_started: Type.Object({}),
	minute_ended: Type.Object({}),
	/** A pass of the turn policy: its seeded order cut into blocks. */
	pass_started: Type.Object({ pass: Type.Integer(), order: Type.Array(Type.String()), blocks: Type.Array(Type.Array(Type.String())) }),
	turn_started: Type.Object({
		resident: Type.String(),
		pass: Type.Integer(),
		block: Type.Integer(),
		/** What the turn shows, tagged with the mechanic that contributed it. */
		inputs: Type.Array(Type.Object({ source: Type.String(), kind: Type.Optional(Type.String()), text: Type.String() })),
	}),
	/** `activation: "onNews"` and nothing new for this resident. */
	turn_skipped: Type.Object({ resident: Type.String(), pass: Type.Integer(), block: Type.Integer() }),
	tool_called: Type.Object({ tool: Type.String(), params: Type.Unknown() }),
	tool_refused: Type.Object({ tool: Type.String(), stage: Stage, code: Type.String(), detail: Type.Optional(Type.String()) }),
	guard_verdict: Type.Object({
		tool: Type.String(),
		/** The policy's id, or its text. */
		rule: Type.String(),
		allowed: Type.Boolean(),
		reason: Type.String(),
		/** `check`: a mechanic's check without a model; `model`: the guard model; `none`: no model in this run. */
		by: Type.Union([Type.Literal("check"), Type.Literal("model"), Type.Literal("none")]),
		error: Type.Optional(Type.String()),
	}),
	role_asked: Type.Object({ role: Type.String(), tool: Type.String(), question: Type.Unknown() }),
	role_answered: Type.Object({ role: Type.String(), ok: Type.Boolean(), answer: Type.Optional(Type.Unknown()), error: Type.Optional(Type.String()), costUsd: Type.Number() }),
	service_called: Type.Object({ api: Type.String(), method: Type.String(), caller: Type.String(), input: Type.Unknown() }),
	job_ran: Type.Object({ owner: Type.String(), job: Type.String() }),
	resident_suspended: Type.Object({ resident: Type.String(), by: Type.String(), reason: Type.String() }),
	resident_resumed: Type.Object({ resident: Type.String(), by: Type.String() }),
	tool_locked: Type.Object({ resident: Type.String(), tool: Type.String(), by: Type.String() }),
	tool_unlocked: Type.Object({ resident: Type.String(), tool: Type.String(), by: Type.String() }),
	referee_intervened: Type.Object({ limit: Type.String(), reason: Type.String() }),
	run_ended: Type.Object({ reason: Type.String() }),
} as const;

export type CoreEvent = EventOf<"core", typeof CORE_EVENTS>;

/** The envelope as stored in `events.jsonl`; parse a log with it before trusting it. */
export const EventEnvelopeSchema = Type.Object({
	seq: Type.Integer({ minimum: 1 }),
	minute: Type.Integer({ minimum: 0 }),
	type: Type.String(),
	source: Type.String(),
	actor: Type.Union([Type.TemplateLiteral("resident:${string}"), Type.Literal("gamemaker"), Type.Literal("script"), Type.Literal("host")]),
	causedBy: Type.Optional(Type.Integer({ minimum: 1 })),
	payload: Type.Unknown(),
});
