/**
 * Type-level guard for the digest's hand-written event schemas, checked by
 * `pnpm typecheck` and never executed.
 *
 * For every event type the digest reads, the event the engine records must
 * be assignable to the digest's schema type, and the type must exist in the
 * engine. If the engine renames or retypes a field the digest relies on,
 * this file stops compiling instead of the digest silently dropping those
 * events as "does not match its schema".
 */
import type { ArenaEventType, RecordedEvent } from "@swarmtales/legacy-log";
import type { DigestEventOf, DigestEventType } from "@swarmtales/chronicle";

type DeepReadonly<T> = T extends readonly (infer Item)[]
	? readonly DeepReadonly<Item>[]
	: T extends object
		? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
		: T;

type Matches<T extends DigestEventType> = [Extract<RecordedEvent, { type: T }>] extends [DeepReadonly<DigestEventOf<T>>] ? true : false;

type Mismatched = { [T in DigestEventType]: Matches<T> extends true ? never : T }[DigestEventType];
type Unknown = Exclude<DigestEventType, ArenaEventType>;

const everySchemaMatchesTheEngine: [Mismatched] extends [never] ? true : Mismatched = true;
const everySchemaNamesAnEngineEvent: [Unknown] extends [never] ? true : Unknown = true;

export const checks = [everySchemaMatchesTheEngine, everySchemaNamesAnEngineEvent] as const;
