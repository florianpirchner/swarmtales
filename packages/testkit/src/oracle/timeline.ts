// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Folds the log of a run on this platform into the entries of an oracle file, with the one declared mapping of
 * the specification of M1, section 7, and the mapping of the story games (`12-m5-spec.md` 3.4: a Director reads as
 * the old overseer, a review record as the old role line). Bookkeeping the oracle dropped is dropped here too:
 * `run_started`, `run_ended`, `tick_ended`, `job_ran`, `service_called`, a resident's `activation_closed`,
 * `pass_started`, what `roster` writes, a Director's `take` and the records of its driver.
 */
import { KERNEL_EVENTS, kindOf, type Envelope } from "@swarmtales/contracts";
import { DIRECTOR_KIND, DIRECTOR_TAKE, RESIDENT_KIND } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { OracleEntrySchema, type OracleEntry } from "./format.ts";

type Raw = Readonly<Record<string, unknown>>;

const Place = Type.Object({ pass: Type.Integer({ description: "The pass of the tick, from 1." }), block: Type.Integer({ description: "The block of the pass, from 1." }) }, { description: "Where in a tick the scheduler `turns` reached an actor." });
const Skipped = Type.Object({ actor: Type.String({ description: "The id of the actor that was not woken." }), ...Place.properties }, { description: "The payload of `activation_skipped` of the scheduler `turns`." });
const Asked = Type.Object({ answerer: Type.String({ description: "Who answers." }), question: Type.Unknown({ description: "The question." }) }, { description: "The record `asked` of the answerer port." });
const Answered = Type.Object({ answerer: Type.String({ description: "Who answered." }), ok: Type.Boolean({ description: "Whether the answer fits." }), answer: Type.Optional(Type.Unknown({ description: "The answer." })), costUsd: Type.Number({ description: "The cost." }), reason: Type.Optional(Type.String({ description: "Why there is none." })) }, { description: "The record `answered` of the answerer port." });

// The canonical source of the scheduler `turns`.
const SCHEDULER = "@swarmtales/engine/turns";
// The records of the answerer port (`REVIEW_RECORDS`); every other source of the engine is bookkeeping.
const REVIEW = "@swarmtales/engine/review";
const ENGINE = "@swarmtales/engine/";
const GAMEMAKER = "gamemaker";
const ROSTER = "roster";
// `resident:A01` reads `A01`; a canonical name `<package>/<id>[/<tool>]` reads its last part; the kernel as an actor reads `host`.
const nameOf = (actor: string): string => actor.slice(actor.indexOf(":") + 1);
const lastOf = (canonical: string): string => canonical.slice(canonical.lastIndexOf("/") + 1);
function isDirector(actor: string): boolean {
	return actor.startsWith(`${DIRECTOR_KIND}:`);
}
// A Director reads as the old overseer: `director:gamemaker` as `gamemaker`, any other `director:<name>` as `overseer:<name>`.
function actorOf(actor: string): string {
	if (actor === "kernel") return "host";
	if (!isDirector(actor)) return actor;
	return nameOf(actor) === GAMEMAKER ? GAMEMAKER : `overseer:${nameOf(actor)}`;
}
const core = (event: Envelope, type: string, payload: unknown): Raw => ({ k: "event", source: "core", type, actor: actorOf(event.actor), payload });
const overseer = (event: Envelope, actor: string, type: string): Raw => ({ ...core(event, type, { overseer: nameOf(actor) }), actor: actorOf(actor) });

// The kernel's events that open an entry of their own; an event that is not listed, or whose payload fails its schema, opens none.
const KERNEL: Readonly<Record<string, (event: Envelope) => Raw | undefined>> = {
	tick_started: (event) => ({ k: "minute", minute: event.tick }),
	activation_opened: (event) => {
		const { payload } = event;
		if (!Value.Check(KERNEL_EVENTS.activation_opened, payload)) return undefined;
		if (isDirector(payload.actor)) return overseer(event, payload.actor, "overseer_called");
		return Value.Check(Place, payload.detail) ? { k: "turn", resident: nameOf(payload.actor), pass: payload.detail.pass, block: payload.detail.block, inputs: payload.inputs } : undefined;
	},
	activation_closed: (event) => (Value.Check(KERNEL_EVENTS.activation_closed, event.payload) && isDirector(event.payload.actor) ? overseer(event, event.payload.actor, "overseer_answered") : undefined),
	tool_called: (event) => (Value.Check(KERNEL_EVENTS.tool_called, event.payload) && event.tool !== DIRECTOR_TAKE ? { k: "call", actor: actorOf(event.actor), tool: event.payload.as, params: event.payload.params, ok: false } : undefined),
	actor_suspended: (event) => (Value.Check(KERNEL_EVENTS.actor_suspended, event.payload) ? core(event, "resident_suspended", { resident: nameOf(event.payload.actor), by: event.payload.by, reason: event.payload.reason }) : undefined),
	tool_locked: (event) => (Value.Check(KERNEL_EVENTS.tool_locked, event.payload) ? core(event, event.type, { resident: nameOf(event.payload.actor), tool: lastOf(event.payload.tool), by: event.payload.by }) : undefined),
	tool_unlocked: (event) => (Value.Check(KERNEL_EVENTS.tool_unlocked, event.payload) ? core(event, event.type, { resident: nameOf(event.payload.actor), tool: lastOf(event.payload.tool), by: event.payload.by }) : undefined),
	limit_reached: (event) => core(event, "referee_intervened", event.payload),
};

// What a result or a refusal adds to the `call` entry of the `tool_called` it was caused by. The old log kept no
// reply of a successful call whose caller is no resident.
function answerOf({ type, payload, actor }: Envelope): Raw | undefined {
	const reply = (text: string): Raw => (kindOf(actor) === RESIDENT_KIND ? { reply: text } : {});
	if (type === "tool_result" && Value.Check(KERNEL_EVENTS.tool_result, payload)) return { ok: true, ...reply(payload.reply), ...(payload.endsTurn === true ? { endsTurn: true } : {}) };
	if (type === "tool_refused" && Value.Check(KERNEL_EVENTS.tool_refused, payload)) return { ok: false, code: payload.code, stage: payload.stage, ...(payload.detail === undefined ? {} : { detail: payload.detail }) };
	return undefined;
}

// A record of the answerer port as the old role line: `asked` as `role_asked` with the tool, `answered` as `role_answered`.
function reviewOf(event: Envelope): Raw | undefined {
	const { payload } = event;
	if (event.type === "asked" && Value.Check(Asked, payload)) return core(event, "role_asked", { role: payload.answerer, tool: lastOf(event.tool ?? ""), question: payload.question });
	if (event.type !== "answered" || !Value.Check(Answered, payload)) return undefined;
	const { answerer, ...rest } = payload;
	return core(event, "role_answered", { role: answerer, ...rest });
}

// The entry an event of the engine opens: a skip of `turns`, a review record; its other sources are bookkeeping.
function engineOf(event: Envelope): Raw | undefined {
	if (event.source === REVIEW) return reviewOf(event);
	return event.source === SCHEDULER && event.type === "activation_skipped" && Value.Check(Skipped, event.payload) ? { k: "skip", resident: nameOf(event.payload.actor), pass: event.payload.pass, block: event.payload.block } : undefined;
}

// The entry an event opens: a kernel event by the table, an event of the engine, or the event of a mechanic.
function entryOf(event: Envelope): Raw | undefined {
	if (event.source === "kernel") return Object.hasOwn(KERNEL, event.type) ? KERNEL[event.type]?.(event) : undefined;
	if (event.source.startsWith(ENGINE)) return engineOf(event);
	const source = lastOf(event.source);
	if (!event.source.includes("/") || source === ROSTER) return undefined;
	return { k: "event", source, type: event.type, actor: actorOf(event.actor), ...(event.audience === undefined ? {} : { audience: event.audience }), payload: event.payload };
}

/**
 * Folds the envelopes of a run into oracle entries. `tick_started` is a `minute` entry, `activation_opened` a
 * `turn`, `activation_skipped` of `turns` a `skip`, `tool_called` with the `tool_result` or `tool_refused` it
 * caused a `call` (at the place of the call), an event of a plugin an `event` whose source is the plugin's id,
 * and `tool_locked`, `tool_unlocked`, `limit_reached` and `actor_suspended` the `core` events `tool_locked`,
 * `tool_unlocked`, `referee_intervened` and `resident_suspended`. The actor `kernel` reads `host`. A Director reads as
 * the old overseer (`director:gamemaker` as `gamemaker`, `director:<name>` as `overseer:<name>`): its activation is
 * `core.overseer_called` and `core.overseer_answered` with the payload `{ overseer }`, its `take` and the records of
 * its driver are left out. The records `asked` and `answered` of the answerer port are `core.role_asked` (with the
 * tool) and `core.role_answered`, `answerer` read as `role`. A successful call of a caller that is no resident has
 * no `reply`, as in the old log.
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
