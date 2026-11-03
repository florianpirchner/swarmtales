/**
 * The harness of the differential tests of team C1 (classifier, weaver, judge as overseers): the
 * new side is a real host with the overseer and a scripted runtime; the events the old roles read
 * are written with `host.record` as app events (the overseers go by the event type, as the old
 * roles did). The old roles' side is recorded in `test/fixtures/old-engine` (they were fed the same
 * events with the same `seq` numbers).
 */
import { Type } from "typebox";
import { createHost, defineMechanic } from "@swarmtales/kernel";
import type { EventEnvelope, EventSchemas, Host, MechanicUse, OverseerRuntime, OverseerUse } from "@swarmtales/contracts";
import { createPromptLookup } from "@swarmtales/prompts";
import { idleAgent } from "@swarmtales/testkit";

/** An event the old roles read, flat as in the old log, to be written in a minute. */
export type Fields = Readonly<Record<string, unknown>>;

/** The fields of an input; a function sees the `seq` the earlier inputs got in the new log (a reference to a message needs its number). */
export type FieldsOf = Fields | ((seqs: readonly number[]) => Fields);

export interface Input {
	readonly minute: number;
	readonly type: string;
	readonly fields: FieldsOf;
}

function fieldsOf(fields: FieldsOf, seqs: readonly number[]): Fields {
	return typeof fields === "function" ? fields(seqs) : fields;
}

const OPEN = Type.Object({}, { additionalProperties: true });

/** Every event type the roles read, as an app event with an open payload. */
export const INPUT_TYPES = [
	"thinking", "text", "dm_sent", "board_post", "group_post", "cast_dm", "group_created", "group_membership", "group_removed",
	"factions_formed", "blame", "interpretation", "tribunal_opened", "exile_gate", "ransomed", "exiled", "ultimatum_resolved", "piece_kept",
	"act_started", "act_ended",
] as const;

/** A mechanic that shows A02 as Maren in every text, the way `names` does. */
export const nameplate = defineMechanic({ id: "nameplate", summary: "Shows A02 as Maren.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
	presentation: { display: (text: string) => text.replaceAll("A02", "Maren") },
}));

export const displayName = (text: string): string => text.replaceAll("A02", "Maren");

export interface NewSide {
	readonly host: Host;
	readonly events: readonly EventEnvelope[];
	/** For each input, the `seq` of its event in the new log. */
	readonly seqs: readonly number[];
}

export interface NewSpec {
	readonly inputs: readonly Input[];
	readonly minutes: number;
	readonly residents?: number;
	readonly overseers: readonly OverseerUse[];
	readonly runtime?: OverseerRuntime;
	readonly names?: boolean;
	/** Further app events the host declares (the `usage` line of a model runtime). */
	readonly appEvents?: EventSchemas;
}

export function newHost(spec: NewSpec, resume?: { readonly snapshot: unknown; readonly events: readonly unknown[] }, more: readonly MechanicUse[] = []): Host {
	const grants = Object.fromEntries(spec.overseers.map((use) => [use.name, []]));
	return createHost({
		story: {
			id: "c1",
			seed: 5,
			minutes: spec.minutes,
			residents: spec.residents ?? 4,
			mechanics: [...(spec.names === true ? [nameplate.with()] : []), ...more],
			overseers: spec.overseers,
			grants,
		},
		prompts: createPromptLookup(),
		app: { events: { ...Object.fromEntries(INPUT_TYPES.map((type) => [type, OPEN])), ...spec.appEvents } },
		...(spec.runtime === undefined ? {} : { overseers: spec.runtime }),
		...(resume === undefined ? {} : { resume }),
	});
}

/** Plays minutes `from` to `to` (exclusive): the inputs of each minute, then the minute. */
export async function playInputs(host: Host, spec: NewSpec, from: number, to: number, seqs: number[]): Promise<void> {
	for (let minute = from; minute < to; minute++) {
		for (const input of spec.inputs.filter((entry) => entry.minute === minute)) {
			host.record("host", input.type, fieldsOf(input.fields, seqs));
			seqs.push(host.log.all().at(-1)?.seq ?? 0);
		}
		await host.playMinute(idleAgent);
	}
}

export async function playNew(spec: NewSpec): Promise<NewSide> {
	const host = newHost(spec);
	host.start();
	const seqs: number[] = [];
	await playInputs(host, spec, 0, spec.minutes, seqs);
	return { host, events: host.log.all(), seqs };
}

/** The events the overseer of `source` wrote, as the legacy adapter would flatten them (`type` and payload). */
export function flat(events: readonly EventEnvelope[], source: string): readonly Record<string, unknown>[] {
	return events
		.filter((event) => event.source === source)
		.map((event) => {
			const payload = event.payload;
			return { type: event.type, ...(typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {}) };
		});
}
