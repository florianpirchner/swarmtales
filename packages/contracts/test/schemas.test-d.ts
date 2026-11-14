// SPDX-License-Identifier: Apache-2.0
/**
 * The type test of the kernel-facing schemas (M1 specification, 2.6): the static type of each schema equals the
 * interface of issue 01. `tsc -b` compiles this file; nothing here runs. A JSON schema cannot say `readonly`, so both
 * sides are compared with every property and every list made readonly. The lines that must not compile show that the
 * comparison is strict.
 */
import type { Static, TSchema } from "typebox";
import type { JsonValue, RunEnd } from "../src/values.ts";
import type {
	ActorId,
	ActorIdSchema,
	Envelope,
	EnvelopeSchema,
	EventSchemas,
	InputNote,
	InputNoteSchema,
	Job,
	JobSchema,
	KernelSnapshot,
	KernelSnapshotSchema,
	RunEndSchema,
	StoredEnvelopeSchema,
} from "../src/kernel/index.ts";
import { KERNEL_EVENTS } from "../src/kernel/index.ts";

/** The type with `readonly` on every property and every list, at every depth. A JSON value is readonly already. */
type Frozen<T> = JsonValue extends T ? T : T extends object ? { readonly [K in keyof T]: Frozen<T[K]> } : T;

/** True when the two types are the same type, not only assignable to each other. */
type Same<A, B> = (<T>(probe: T) => T extends Frozen<A> ? 1 : 2) extends <T>(probe: T) => T extends Frozen<B> ? 1 : 2 ? true : false;

/** Compiles only for `true`. */
type Holds<T extends true> = T;

/** A line of `events.jsonl`, as 2.2 describes it. */
interface StoredEnvelope extends Envelope {
	readonly at: string;
}

export type Equalities = [
	Holds<Same<Static<typeof ActorIdSchema>, ActorId>>,
	Holds<Same<Static<typeof InputNoteSchema>, InputNote>>,
	Holds<Same<Static<typeof RunEndSchema>, RunEnd>>,
	Holds<Same<Static<typeof EnvelopeSchema>, Envelope>>,
	Holds<Same<Static<typeof StoredEnvelopeSchema>, StoredEnvelope>>,
	Holds<Same<Static<typeof JobSchema>, Job>>,
	Holds<Same<Exclude<Static<typeof JobSchema>["data"], undefined>, JsonValue>>,
	Holds<Same<Static<typeof KernelSnapshotSchema>, KernelSnapshot>>,
	Holds<Same<Static<(typeof KERNEL_EVENTS)["activation_opened"]>["inputs"], InputNote[]>>,
];

// The kernel's events are an event table like a plugin's.
export const events: EventSchemas = KERNEL_EVENTS;
export const eventSchema: TSchema = KERNEL_EVENTS.tool_result;

// The comparison is strict: an optional field, a wider field and a missing field are each another type.
export type Strict = [
	// @ts-expect-error -- `kind` is optional in the schema
	Holds<Same<Static<typeof InputNoteSchema>, { source: string; kind: string; text: string }>>,
	// @ts-expect-error -- the reason of a run end is one of three words
	Holds<Same<Static<typeof RunEndSchema>, { reason: string; tick: number; limit?: string }>>,
	// @ts-expect-error -- an envelope has no wall-clock stamp
	Holds<Same<Static<typeof EnvelopeSchema>, StoredEnvelope>>,
	// @ts-expect-error -- an actor id is not any string
	Holds<Same<Static<typeof ActorIdSchema>, string>>,
];
