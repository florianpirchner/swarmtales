// SPDX-License-Identifier: Apache-2.0
/**
 * Folds the log of a run on this platform into the entries of an oracle file, with the one declared mapping of
 * the specification of M1, section 7. Bookkeeping the oracle dropped is dropped here too: `run_started`,
 * `run_ended`, `tick_ended`, `job_ran`, `service_called`, `activation_closed`, `pass_started`, and what `roster` writes.
 */
import { KERNEL_EVENTS, type Envelope } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { OracleEntrySchema, type OracleEntry } from "./format.ts";

type Raw = Readonly<Record<string, unknown>>;

const Place = Type.Object({ pass: Type.Integer({ description: "The pass of the tick, from 1." }), block: Type.Integer({ description: "The block of the pass, from 1." }) }, { description: "Where in a tick the scheduler `turns` reached an actor." });
const Skipped = Type.Object({ actor: Type.String({ description: "The id of the actor that was not woken." }), ...Place.properties }, { description: "The payload of `activation_skipped` of the scheduler `turns`." });

// The canonical source of the scheduler `turns`.
const SCHEDULER = "@swarmtales/engine/turns";
const ROSTER = "roster";
// `resident:A01` reads `A01`; a canonical name `<package>/<id>[/<tool>]` reads its last part; the kernel as an actor reads `host`.
const nameOf = (actor: string): string => actor.slice(actor.indexOf(":") + 1);
const lastOf = (canonical: string): string => canonical.slice(canonical.lastIndexOf("/") + 1);
const actorOf = (actor: string): string => (actor === "kernel" ? "host" : actor);
const core = (event: Envelope, type: string, payload: unknown): Raw => ({ k: "event", source: "core", type, actor: actorOf(event.actor), payload });

// The kernel's events that open an entry of their own; an event that is not listed, or whose payload fails its schema, opens none.
const KERNEL: Readonly<Record<string, (event: Envelope) => Raw | undefined>> = {
	tick_started: (event) => ({ k: "minute", minute: event.tick }),
	activation_opened: ({ payload }) => (Value.Check(KERNEL_EVENTS.activation_opened, payload) && Value.Check(Place, payload.detail) ? { k: "turn", resident: nameOf(payload.actor), pass: payload.detail.pass, block: payload.detail.block, inputs: payload.inputs } : undefined),
	tool_called: (event) => (Value.Check(KERNEL_EVENTS.tool_called, event.payload) ? { k: "call", actor: event.actor, tool: event.payload.as, params: event.payload.params, ok: false } : undefined),
	tool_locked: (event) => (Value.Check(KERNEL_EVENTS.tool_locked, event.payload) ? core(event, event.type, { resident: nameOf(event.payload.actor), tool: lastOf(event.payload.tool), by: event.payload.by }) : undefined),
	tool_unlocked: (event) => (Value.Check(KERNEL_EVENTS.tool_unlocked, event.payload) ? core(event, event.type, { resident: nameOf(event.payload.actor), tool: lastOf(event.payload.tool), by: event.payload.by }) : undefined),
	limit_reached: (event) => core(event, "referee_intervened", event.payload),
};

// What a result or a refusal adds to the `call` entry of the `tool_called` it was caused by.
function answerOf({ type, payload }: Envelope): Raw | undefined {
	if (type === "tool_result" && Value.Check(KERNEL_EVENTS.tool_result, payload)) return { ok: true, reply: payload.reply, ...(payload.endsTurn === true ? { endsTurn: true } : {}) };
	if (type === "tool_refused" && Value.Check(KERNEL_EVENTS.tool_refused, payload)) return { ok: false, code: payload.code, stage: payload.stage, ...(payload.detail === undefined ? {} : { detail: payload.detail }) };
	return undefined;
}

// The entry an event opens: a kernel event by the table, a skip of `turns`, or the event of a mechanic.
function entryOf(event: Envelope): Raw | undefined {
	if (event.source === "kernel") return Object.hasOwn(KERNEL, event.type) ? KERNEL[event.type]?.(event) : undefined;
	if (event.source === SCHEDULER) return event.type === "activation_skipped" && Value.Check(Skipped, event.payload) ? { k: "skip", resident: nameOf(event.payload.actor), pass: event.payload.pass, block: event.payload.block } : undefined;
	const source = lastOf(event.source);
	if (!event.source.includes("/") || source === ROSTER) return undefined;
	return { k: "event", source, type: event.type, actor: actorOf(event.actor), ...(event.audience === undefined ? {} : { audience: event.audience }), payload: event.payload };
}

/**
 * Folds the envelopes of a run into oracle entries. `tick_started` is a `minute` entry, `activation_opened` a
 * `turn`, `activation_skipped` of `turns` a `skip`, `tool_called` with the `tool_result` or `tool_refused` it
 * caused a `call` (at the place of the call), an event of a plugin an `event` whose source is the plugin's id,
 * and `tool_locked`, `tool_unlocked` and `limit_reached` the `core` events `tool_locked`, `tool_unlocked` and
 * `referee_intervened`. The actor `kernel` reads `host`.
 *
 * @param events - The log of the run, in its order.
 * @returns The entries in the order of the log. An event that folds into no valid entry (a refusal stage or an
 * actor the oracle format does not know) is left out, so it shows as a missing entry in a comparison.
 * @example
 * ```ts
 * const { events } = await play(game, { seed: 7 });
 * const entries = timelineOf(events);
 * ```
 *
 * @public
 */
export function timelineOf(events: readonly Envelope[]): readonly OracleEntry[] {
	const entries: Raw[] = [];
	const calls = new Map<number, number>();
	for (const event of events) {
		const answer = event.source === "kernel" ? answerOf(event) : undefined;
		const call = answer === undefined ? undefined : calls.get(event.causedBy ?? 0);
		if (answer !== undefined && call !== undefined) entries[call] = { ...entries[call], ...answer };
		const entry = answer === undefined ? entryOf(event) : undefined;
		if (entry === undefined) continue;
		if (entry.k === "call") calls.set(event.seq, entries.length);
		entries.push(entry);
	}
	return entries.flatMap((entry) => (Value.Check(OracleEntrySchema, entry) ? [entry] : []));
}
