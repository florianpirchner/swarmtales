/**
 * Series the charts and the replay draw, derived from the events alone: cost and tokens per minute,
 * events per actor (lanes), counts by type and tool, and who wrote to whom up to a seq.
 */
import { numberField, type RunEvent, stringField } from "./events.ts";

/** The log's line type for one model call's usage (`agent`, `model`, tokens, `costUsd`). */
export const USAGE_EVENT = "usage";
/** The log's line type for a tool call (`agent`, `tool`). */
export const TOOL_CALL_EVENT = "tool_call";

export interface UsageTotals {
	readonly requests: number;
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly costUsd: number;
}

export interface UsagePoint extends UsageTotals {
	readonly minute: number;
	/** The group: the actor, the model, or `"total"`. */
	readonly key: string;
}

const ZERO: UsageTotals = { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 };

function added(sum: UsageTotals, event: RunEvent): UsageTotals {
	return {
		requests: sum.requests + 1,
		input: sum.input + (numberField(event, "input") ?? 0),
		output: sum.output + (numberField(event, "output") ?? 0),
		cacheRead: sum.cacheRead + (numberField(event, "cacheRead") ?? 0),
		cacheWrite: sum.cacheWrite + (numberField(event, "cacheWrite") ?? 0),
		costUsd: sum.costUsd + (numberField(event, "costUsd") ?? 0),
	};
}

/**
 * Cost and tokens per minute from the usage lines, grouped by actor (the role or resident that
 * made the call), by model, or in total. Minutes without a call are left out; sorted by minute, then key.
 */
export function usageByMinute(events: readonly RunEvent[], by: "actor" | "model" | "total" = "total"): readonly UsagePoint[] {
	const sums = new Map<string, { minute: number; key: string; totals: UsageTotals }>();
	for (const event of events) {
		if (event.type !== USAGE_EVENT) continue;
		const key = by === "total" ? "total" : by === "actor" ? (event.actor ?? "?") : (stringField(event, "model") ?? "?");
		const id = `${String(event.minute)}\u0000${key}`;
		const sum = sums.get(id);
		sums.set(id, { minute: event.minute, key, totals: added(sum?.totals ?? ZERO, event) });
	}
	return [...sums.values()]
		.map(({ minute, key, totals }) => ({ minute, key, ...totals }))
		.sort((left, right) => left.minute - right.minute || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
}

/** The usage lines summed, per key (actor, model) or in total. */
export function usageTotals(events: readonly RunEvent[], by: "actor" | "model" | "total" = "total"): ReadonlyMap<string, UsageTotals> {
	const totals = new Map<string, UsageTotals>();
	for (const point of usageByMinute(events, by)) {
		const sum = totals.get(point.key) ?? ZERO;
		totals.set(point.key, {
			requests: sum.requests + point.requests,
			input: sum.input + point.input,
			output: sum.output + point.output,
			cacheRead: sum.cacheRead + point.cacheRead,
			cacheWrite: sum.cacheWrite + point.cacheWrite,
			costUsd: sum.costUsd + point.costUsd,
		});
	}
	return totals;
}

export interface Lane {
	readonly actor: string;
	/** The seqs of the actor's events, in order. */
	readonly seqs: readonly number[];
	/** Events per minute, as `[minute, count]` in minute order. */
	readonly perMinute: readonly (readonly [number, number])[];
}

/** One lane per actor, in the order the actors first act; events without an actor are left out. */
export function actorLanes(events: readonly RunEvent[]): readonly Lane[] {
	const lanes = new Map<string, { seqs: number[]; perMinute: Map<number, number> }>();
	for (const event of events) {
		if (event.actor === undefined) continue;
		const lane = lanes.get(event.actor) ?? { seqs: [], perMinute: new Map<number, number>() };
		lane.seqs.push(event.seq);
		lane.perMinute.set(event.minute, (lane.perMinute.get(event.minute) ?? 0) + 1);
		lanes.set(event.actor, lane);
	}
	return [...lanes].map(([actor, lane]) => ({ actor, seqs: lane.seqs, perMinute: [...lane.perMinute].sort((left, right) => left[0] - right[0]) }));
}

export interface Count {
	readonly key: string;
	readonly count: number;
}

function counted(keys: Iterable<string>): readonly Count[] {
	const counts = new Map<string, number>();
	for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
	return [...counts].map(([key, count]) => ({ key, count })).sort((left, right) => right.count - left.count || (left.key < right.key ? -1 : 1));
}

function* upTo(events: readonly RunEvent[], seq: number | undefined): Generator<RunEvent> {
	for (const event of events) if (seq === undefined || event.seq <= seq) yield event;
}

/** Events per type (up to a seq), most frequent first. */
export function typeCounts(events: readonly RunEvent[], seq?: number): readonly Count[] {
	return counted([...upTo(events, seq)].map((event) => event.type));
}

/** Tool calls per tool (up to a seq), most frequent first. */
export function toolCounts(events: readonly RunEvent[], seq?: number): readonly Count[] {
	return counted([...upTo(events, seq)].flatMap((event) => (event.type === TOOL_CALL_EVENT ? [stringField(event, "tool") ?? "?"] : [])));
}

/** A message between actors: an event with a `text`, an actor, and a recipient. */
export interface Message {
	readonly seq: number;
	readonly from: string;
	/** Actors, `"all"`, a cast member, or a channel as `group:<id>` / `team:<id>`. */
	readonly to: readonly string[];
	readonly type: string;
}

/**
 * The message an event carries, if any: it has a string `text` and an actor, and names its
 * recipients in `to` (one or a list), a cast member in `cast`, or a channel in `group` or `team`. A delivery receipt
 * without text is no message, so a message counts once.
 */
export function messageOf(event: RunEvent): Message | undefined {
	if (event.actor === undefined || typeof event.data.text !== "string") return undefined;
	const to = event.data.to;
	const recipients = typeof to === "string" ? [to] : Array.isArray(to) ? to.filter((entry): entry is string => typeof entry === "string") : [];
	const cast = stringField(event, "cast");
	const group = stringField(event, "group");
	const team = stringField(event, "team");
	const channel = cast ?? (group === undefined ? (team === undefined ? undefined : `team:${team}`) : `group:${group}`);
	const targets = recipients.length > 0 ? recipients : channel === undefined ? [] : [channel];
	const from = event.actor;
	const others = targets.filter((target) => target !== from);
	return others.length === 0 ? undefined : { seq: event.seq, from, to: others, type: event.type };
}

export interface MessageEdge {
	readonly from: string;
	readonly to: string;
	readonly count: number;
	readonly firstSeq: number;
	readonly lastSeq: number;
	/** The event types the messages came in (e.g. a direct message and a channel post). */
	readonly types: readonly string[];
}

export interface MessageGraph {
	/** Senders and recipients, in the order they first occur. */
	readonly nodes: readonly string[];
	readonly edges: readonly MessageEdge[];
}

/** Who wrote to whom up to and including `seq` (all of the run without it). */
export function messageGraph(events: readonly RunEvent[], seq?: number): MessageGraph {
	const nodes = new Set<string>();
	const edges = new Map<string, { from: string; to: string; count: number; firstSeq: number; lastSeq: number; types: Set<string> }>();
	for (const event of upTo(events, seq)) {
		const message = messageOf(event);
		if (message === undefined) continue;
		nodes.add(message.from);
		for (const to of message.to) {
			nodes.add(to);
			const id = `${message.from}\u0000${to}`;
			const edge = edges.get(id) ?? { from: message.from, to, count: 0, firstSeq: message.seq, lastSeq: message.seq, types: new Set<string>() };
			edge.count += 1;
			edge.lastSeq = message.seq;
			edge.types.add(message.type);
			edges.set(id, edge);
		}
	}
	return { nodes: [...nodes], edges: [...edges.values()].map((edge) => ({ ...edge, types: [...edge.types] })) };
}
