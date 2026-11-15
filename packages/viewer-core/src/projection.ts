// SPDX-License-Identifier: Apache-2.0
/**
 * The projection of an envelope log: what the views draw beside the plain list of events. It attaches every line
 * of an activation (its calls, their answers, the records of its driver) to the activation, reads a Director's
 * firings and finds the line that fired each (by the rule of `findFirings` in `@swarmtales/runlog`), notes which activations were open at the same time and the `basis` of each call, folds the three events of `decisions` into one item, marks the calls of the actor `human`, and finds
 * the pauses, the resume markers and the suspended actors. It reads only the log; a line of an old run (no
 * payload) projects to nothing.
 */
import { canonicalJson } from "@swarmtales/chain";
import { KERNEL_EVENTS } from "@swarmtales/contracts";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";
import type { RunEvent } from "./events.ts";
import type { Activation, Call, Decision, Firing, Pause, ResumeMarker, RunProjection, Suspension } from "./projection-model.ts";

/** The source of the kernel's events. */
const KERNEL = "kernel";
/**
 * The source of the events of the mechanic `decisions`.
 *
 * @public
 */
export const DECISIONS_SOURCE = "@swarmtales/mechanic-decisions/decisions";
/**
 * The source of the events of the mechanic `humanHand`.
 *
 * @public
 */
export const HUMAN_HAND_SOURCE = "@swarmtales/mechanic-human-hand/humanHand";
/**
 * The source of the records of the run assembly; `run_resumed` is one.
 *
 * @public
 */
export const RUN_SOURCE = "@swarmtales/cli/run";
/**
 * The canonical name of the tool a Director takes its firings with.
 *
 * @public
 */
export const TAKE_TOOL = "@swarmtales/sdk/directors/take";
/**
 * The id of the actor of the Human Hand.
 *
 * @public
 */
export const HUMAN = "human";

const text = Type.String({ description: "A text of the log" });
const whole = Type.Integer({ description: "A tick or a position of the log" });
const any = Type.Unknown({ description: "A value the owner of the event defines" });
const Take = Type.Object({ firings: Type.Array(Type.Object({ n: whole, tick: whole, event: text, payload: any }, { description: "One firing" })) }, { description: "The answer of a Director's `take`" });
const Proposed = Type.Object({ decision: text, kind: text, owner: text, proposal: any, deadline: whole, holders: Type.Array(text) }, { description: "The payload of `decision_proposed`" });
const Amended = Type.Object({ decision: text, by: text, reason: Type.Optional(text), proposal: any }, { description: "The payload of `decision_amended`" });
const Settled = Type.Object({ decision: text, changed: Type.Boolean(), proposal: any }, { description: "The payload of `decision_settled`" });
const Paused = Type.Object({ reason: Type.Optional(text) }, { description: "The payload of `paused`" });
const Marker = Type.Object({ from: text, snapshotHash: text, tick: whole }, { description: "The payload of `run_resumed`" });

type Mutable<Shape> = { -readonly [Key in keyof Shape]: Shape[Key] };

/** What the projection collects while it reads the log. */
interface Draft {
	readonly activations: Map<number, Mutable<Activation> & { calls: Call[]; records: RunEvent[]; overlaps: number[] }>;
	/** The seqs of the activations open at the current line, in the order they opened. */
	readonly open: Set<number>;
	readonly calls: Map<number, Mutable<Call>>;
	readonly decisions: Map<string, Mutable<Decision> & { amendments: Decision["amendments"][number][] }>;
	readonly humanCalls: Call[];
	readonly pauses: Mutable<Pause>[];
	readonly resumes: ResumeMarker[];
	readonly suspensions: Mutable<Suspension>[];
	readonly attached: Map<number, number>;
	/** The lines by tick and `<plugin id>.<event type>`, as a trigger names them. */
	readonly lines: Map<string, RunEvent[]>;
	/** By Director, tick, event and payload: how many firings of that kind are found already. */
	readonly used: Map<string, number>;
}

/** A line with its payload read by a schema. */
type Read<Schema extends TSchema> = (draft: Draft, event: RunEvent, payload: Static<Schema>) => void;

function cause(event: RunEvent): number | undefined {
	const { causedBy } = event.data;
	return typeof causedBy === "number" ? causedBy : undefined;
}

// The envelope's `basis`, as a field to spread: absent when the line has none.
function basisOf(event: RunEvent): { readonly basis?: number } {
	const { basis } = event.data;
	return typeof basis === "number" ? { basis } : {};
}

// The kind and the name of an actor id (`director:warden`); an id without a kind (`human`) is both.
function parts(id: string): { readonly kind: string; readonly name: string } {
	const colon = id.indexOf(":");
	return colon < 0 ? { kind: id, name: id } : { kind: id.slice(0, colon), name: id.slice(colon + 1) };
}

// The firings of a `take` answer; a reply that is no such JSON has none.
function takenOf(reply: string): Static<typeof Take>["firings"] {
	try {
		const value: unknown = JSON.parse(reply);
		return Check(Take, value) ? value.firings : [];
	} catch {
		return [];
	}
}

// What a trigger names a line by: its tick and `<plugin id>.<event type>`; the plugin id ends the canonical source.
const nameOf = (event: RunEvent, source: string): string => `${String(event.minute)} ${source.slice(source.lastIndexOf("/") + 1)}.${event.type}`;

// The firings of a `take` answer, each with the line that fired it: the line of its tick with its type and payload;
// the k-th such firing of a Director is the k-th such line. `answer` stands in when the log does not hold the line.
function firingsOf(draft: Draft, actor: string, reply: string, answer: number): readonly Firing[] {
	return takenOf(reply).map((firing) => {
		const payload = canonicalJson(firing.payload);
		const key = `${actor} ${String(firing.tick)} ${firing.event} ${payload}`;
		const rank = draft.used.get(key) ?? 0;
		draft.used.set(key, rank + 1);
		const fired = (draft.lines.get(`${String(firing.tick)} ${firing.event}`) ?? []).filter((line) => canonicalJson(line.payload) === payload)[rank];
		return { ...firing, seq: fired?.seq ?? answer };
	});
}

// An activation that opens while others are open overlaps each of them, and each of them overlaps it.
const opened: Read<typeof KERNEL_EVENTS.activation_opened> = (draft, event, payload) => {
	for (const seq of draft.open) draft.activations.get(seq)?.overlaps.push(event.seq);
	draft.activations.set(event.seq, { seq: event.seq, tick: event.minute, actor: payload.actor, ...parts(payload.actor), ...basisOf(event), overlaps: [...draft.open], calls: [], records: [], firings: [] });
	draft.open.add(event.seq);
};

const closed: Read<typeof KERNEL_EVENTS.activation_closed> = (draft, event, payload) => {
	const activation = draft.activations.get(cause(event) ?? -1);
	if (activation === undefined) return;
	draft.open.delete(activation.seq);
	activation.closedSeq = event.seq;
	activation.outcome = payload.outcome;
	draft.attached.set(event.seq, activation.seq);
};

const called: Read<typeof KERNEL_EVENTS.tool_called> = (draft, event, payload) => {
	const actor = event.actorId ?? "";
	const activation = draft.activations.get(cause(event) ?? -1);
	const tool = typeof event.data.tool === "string" ? event.data.tool : payload.as;
	const call: Mutable<Call> = { seq: event.seq, tick: event.minute, actor, as: payload.as, tool, params: payload.params, human: actor === HUMAN, take: tool === TAKE_TOOL, ...(activation === undefined ? {} : { activation: activation.seq }), ...basisOf(event) };
	draft.calls.set(event.seq, call);
	if (call.human) draft.humanCalls.push(call);
	if (activation === undefined) return;
	activation.calls.push(call);
	draft.attached.set(event.seq, activation.seq);
};

// The answer of a call: the reply of `tool_result`, or the code and the detail of `tool_refused`.
function answered(draft: Draft, event: RunEvent, answer: Omit<NonNullable<Call["answer"]>, "seq">): void {
	const call = draft.calls.get(cause(event) ?? -1);
	if (call === undefined) return;
	call.answer = { seq: event.seq, ...answer };
	const activation = draft.activations.get(call.activation ?? -1);
	if (activation === undefined) return;
	draft.attached.set(event.seq, activation.seq);
	if (call.take && answer.ok) activation.firings = firingsOf(draft, call.actor, answer.text, event.seq);
}

const result: Read<typeof KERNEL_EVENTS.tool_result> = (draft, event, payload) => {
	answered(draft, event, { ok: true, text: payload.reply });
};
const refused: Read<typeof KERNEL_EVENTS.tool_refused> = (draft, event, payload) => {
	answered(draft, event, { ok: false, text: payload.detail ?? "", code: payload.code });
};

const suspended: Read<typeof KERNEL_EVENTS.actor_suspended> = (draft, event, payload) => {
	draft.suspensions.push({ seq: event.seq, tick: event.minute, actor: payload.actor, name: parts(payload.actor).name, by: payload.by, reason: payload.reason });
};

const lifted: Read<typeof KERNEL_EVENTS.actor_resumed> = (draft, event, payload) => {
	const open = draft.suspensions.find((entry) => entry.actor === payload.actor && entry.by === payload.by && entry.endSeq === undefined);
	if (open !== undefined) open.endSeq = event.seq;
};

const proposed: Read<typeof Proposed> = (draft, event, payload) => {
	const { decision, kind, owner, proposal, deadline, holders } = payload;
	draft.decisions.set(decision, { id: decision, seq: event.seq, tick: event.minute, kind, owner, proposal, deadline, holders, amendments: [] });
};

const amended: Read<typeof Amended> = (draft, event, payload) => {
	const { decision, by, reason, proposal } = payload;
	draft.decisions.get(decision)?.amendments.push({ seq: event.seq, tick: event.minute, by, ...(reason === undefined ? {} : { reason }), proposal });
};

const settled: Read<typeof Settled> = (draft, event, payload) => {
	const decision = draft.decisions.get(payload.decision);
	if (decision !== undefined) decision.settled = { seq: event.seq, tick: event.minute, changed: payload.changed, proposal: payload.proposal };
};

const paused: Read<typeof Paused> = (draft, event, payload) => {
	draft.pauses.push({ seq: event.seq, tick: event.minute, by: event.actorId ?? "", ...(payload.reason === undefined ? {} : { reason: payload.reason }) });
};

const resumed: Read<typeof Paused> = (draft, event) => {
	const open = draft.pauses.findLast((entry) => entry.endSeq === undefined);
	if (open === undefined) return;
	open.endSeq = event.seq;
	open.endTick = event.minute;
};

const marker: Read<typeof Marker> = (draft, event, payload) => {
	draft.resumes.push({ seq: event.seq, tick: payload.tick, from: payload.from, snapshotHash: payload.snapshotHash });
};

// One reader of a line: the payload is checked against the schema first; a payload that does not fit is not read.
function reader<Schema extends TSchema>(schema: Schema, read: Read<Schema>): (draft: Draft, event: RunEvent) => void {
	return (draft, event) => {
		if (Check(schema, event.payload)) read(draft, event, event.payload);
	};
}

/** The readers by `<source> <type>`. */
const READERS: Readonly<Record<string, (draft: Draft, event: RunEvent) => void>> = {
	[`${KERNEL} activation_opened`]: reader(KERNEL_EVENTS.activation_opened, opened),
	[`${KERNEL} activation_closed`]: reader(KERNEL_EVENTS.activation_closed, closed),
	[`${KERNEL} tool_called`]: reader(KERNEL_EVENTS.tool_called, called),
	[`${KERNEL} tool_result`]: reader(KERNEL_EVENTS.tool_result, result),
	[`${KERNEL} tool_refused`]: reader(KERNEL_EVENTS.tool_refused, refused),
	[`${KERNEL} actor_suspended`]: reader(KERNEL_EVENTS.actor_suspended, suspended),
	[`${KERNEL} actor_resumed`]: reader(KERNEL_EVENTS.actor_resumed, lifted),
	[`${DECISIONS_SOURCE} decision_proposed`]: reader(Proposed, proposed),
	[`${DECISIONS_SOURCE} decision_amended`]: reader(Amended, amended),
	[`${DECISIONS_SOURCE} decision_settled`]: reader(Settled, settled),
	[`${HUMAN_HAND_SOURCE} paused`]: reader(Paused, paused),
	[`${HUMAN_HAND_SOURCE} resumed`]: reader(Paused, resumed),
	[`${RUN_SOURCE} run_resumed`]: reader(Marker, marker),
};

// A line no reader knows: the record of a driver when an activation caused it and the kernel did not write it.
function record(draft: Draft, event: RunEvent, source: string): void {
	const activation = source === KERNEL ? undefined : draft.activations.get(cause(event) ?? -1);
	if (activation === undefined) return;
	activation.records.push(event);
	draft.attached.set(event.seq, activation.seq);
}

/**
 * Projects the events of a run for the views: activations with their calls and driver records, decisions, the
 * calls of the human, pauses, resume markers and suspensions.
 *
 * @param events - The events of the run, in the order of the log (`RunModel.events`).
 * @returns The projection; empty for a log of the old format, whose lines have no payload.
 * @example
 * ```ts
 * const projection = projectRun(model.events);
 * const directors = projection.activations.filter((activation) => activation.kind === "director");
 * ```
 * @public
 */
export function projectRun(events: readonly RunEvent[]): RunProjection {
	const draft: Draft = { activations: new Map(), open: new Set(), calls: new Map(), decisions: new Map(), humanCalls: [], pauses: [], resumes: [], suspensions: [], attached: new Map(), lines: new Map(), used: new Map() };
	for (const event of events) {
		const source = event.data.source;
		if (event.actorId === undefined || typeof source !== "string") continue;
		const read = READERS[`${source} ${event.type}`];
		if (read === undefined) record(draft, event, source);
		else read(draft, event);
		const name = nameOf(event, source);
		const same = draft.lines.get(name);
		if (same === undefined) draft.lines.set(name, [event]);
		else same.push(event);
	}
	const { activations, decisions, humanCalls, ...rest } = draft;
	return { activations: [...activations.values()], decisions: [...decisions.values()], humanCalls, humanInfluenced: humanCalls.length > 0, pauses: rest.pauses, resumes: rest.resumes, suspensions: rest.suspensions, attached: rest.attached };
}
