// SPDX-License-Identifier: Apache-2.0
/**
 * Who wrote to whom. A message is a line of a type the {@link MessageVocabulary} names: a direct
 * message, a channel post, table talk. Deliveries and receipts (`notice`, a city's board posts),
 * strategy files (`brain_written`) and every other line with a `text` are not messages, so a direct
 * message counts once.
 */
import { type RunEvent, stringField } from "./events.ts";
import { upTo } from "./series.ts";

/**
 * Where a message type names its recipients: a field (one name or a list; with `prefix`, a channel
 * read as `<prefix><value>`, e.g. `group:G1`), or a fixed recipient for a line spoken to everyone at
 * once (`table`, `board`). `from` is the sender's field; the line's actor without it. `except` names
 * recipients this type does not count, because another line already records the same message.
 *
 * @public
 */
export interface MessageRule {
	/** Where the recipients are named. */
	readonly to: { readonly field: string; readonly prefix?: string } | { readonly fixed: string };
	/** The field that names the sender; the actor of the line without it. */
	readonly from?: string;
	/** Recipients this type does not count. */
	readonly except?: readonly string[];
}

/**
 * The message types and the authors whose lines are system notices. A caller's `types` are added to
 * `DEFAULT_MESSAGES` (`false` takes a default type out); `systemAuthors` replace the default list.
 *
 * @public
 */
export interface MessageVocabulary {
	/** Message rules by event type; `false` takes a default type out. */
	readonly types?: Readonly<Record<string, MessageRule | false>>;
	/** The authors whose lines are system notices. */
	readonly systemAuthors?: readonly string[];
}

/**
 * The message types of the recorded logs, and the city as the one system author (its board posts and
 * group notices are announcements). A gamemaker's note to the board is also written as a board post,
 * so it counts there once.
 */
export const DEFAULT_MESSAGES: { readonly types: Readonly<Record<string, MessageRule>>; readonly systemAuthors: readonly string[] } = {
	types: {
		dm_sent: { to: { field: "to" } },
		market_said: { to: { field: "to" } },
		gamemaker_note: { to: { field: "to" }, except: ["board"] },
		cast_dm: { to: { field: "cast" } },
		group_post: { to: { field: "group", prefix: "group:" } },
		team_post: { to: { field: "team", prefix: "team:" } },
		board_post: { to: { fixed: "board" } },
		convoy_spoken: { to: { fixed: "table" } },
	},
	systemAuthors: ["CITY"],
};

/** A message between actors. */
export interface Message {
	readonly seq: number;
	readonly from: string;
	/** Actors, a cast member, a channel as `group:<id>` / `team:<id>`, or a fixed audience (`table`, `board`). */
	readonly to: readonly string[];
	readonly type: string;
}

interface Resolved {
	readonly types: ReadonlyMap<string, MessageRule>;
	readonly system: ReadonlySet<string>;
}

function resolved(vocabulary: MessageVocabulary): Resolved {
	const types = new Map(Object.entries(DEFAULT_MESSAGES.types));
	for (const [type, rule] of Object.entries(vocabulary.types ?? {})) {
		if (rule === false) types.delete(type);
		else types.set(type, rule);
	}
	return { types, system: new Set(vocabulary.systemAuthors ?? DEFAULT_MESSAGES.systemAuthors) };
}

function recipients(event: RunEvent, rule: MessageRule): readonly string[] {
	if ("fixed" in rule.to) return [rule.to.fixed];
	const value = event.data[rule.to.field];
	const names = typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
	const prefix = rule.to.prefix ?? "";
	const except = new Set(rule.except ?? []);
	return names.filter((name) => name !== "" && !except.has(name)).map((name) => `${prefix}${name}`);
}

function messageWith(event: RunEvent, vocabulary: Resolved): Message | undefined {
	const rule = vocabulary.types.get(event.type);
	if (rule === undefined) return undefined;
	const from = rule.from === undefined ? event.actor : stringField(event, rule.from);
	if (from === undefined || vocabulary.system.has(from)) return undefined;
	const to = recipients(event, rule).filter((target) => target !== from);
	return to.length === 0 ? undefined : { seq: event.seq, from, to, type: event.type };
}

/**
 * The messages of the events up to and including `seq` (all without it), each once, in log order.
 *
 * @param events - The events of the run.
 * @param seq - The last seq to read; all events without it.
 * @param vocabulary - The caller's message types and system authors.
 * @returns The messages in log order.
 */
export function messagesOf(events: readonly RunEvent[], seq?: number, vocabulary: MessageVocabulary = {}): readonly Message[] {
	const words = resolved(vocabulary);
	const found: Message[] = [];
	for (const event of upTo(events, seq)) {
		const message = messageWith(event, words);
		if (message !== undefined) found.push(message);
	}
	return found;
}

/**
 * The messages one actor wrote to one recipient.
 *
 * @public
 */
export interface MessageEdge {
	/** The sender. */
	readonly from: string;
	/** The recipient. */
	readonly to: string;
	/** The number of messages. */
	readonly count: number;
	/** The seq of the first message. */
	readonly firstSeq: number;
	/** The seq of the last message. */
	readonly lastSeq: number;
	/** The event types the messages came in (e.g. a direct message and a channel post). */
	readonly types: readonly string[];
}

/**
 * Who wrote to whom.
 *
 * @public
 */
export interface MessageGraph {
	/** Senders and recipients, in the order they first occur. */
	readonly nodes: readonly string[];
	/** One edge per pair of sender and recipient. */
	readonly edges: readonly MessageEdge[];
}

/**
 * Who wrote to whom up to and including `seq` (all of the run without it).
 *
 * @param events - The events of the run.
 * @param seq - The last seq to read; all events without it.
 * @param vocabulary - The caller's message types and system authors.
 * @returns The senders and recipients, and one edge per pair.
 * @public
 */
export function messageGraph(events: readonly RunEvent[], seq?: number, vocabulary: MessageVocabulary = {}): MessageGraph {
	const nodes = new Set<string>();
	const edges = new Map<string, { from: string; to: string; count: number; firstSeq: number; lastSeq: number; types: Set<string> }>();
	for (const message of messagesOf(events, seq, vocabulary)) {
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
