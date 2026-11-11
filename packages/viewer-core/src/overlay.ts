/**
 * A run laid over its story graph: which nodes the run reached, first at which seq and minute, and
 * how often. It reads the log's own vocabulary (a resident reaching a level, a director rule
 * acting, the run's end) and plain fields (`petition`, `into`, `cast`), never a game's words.
 */
import { numberField, type RunEvent, stringField } from "./events.ts";
import type { GraphNode, StoryGraph } from "./story-graph.ts";

/** The event types the overlay reads; a log with other names passes its own. */
export interface OverlayVocabulary {
	/** A resident reaching a level: its `to` is the level now open to it. */
	readonly levelUp: string;
	/** A director rule acting: `rule` and `action` (the action's kind). */
	readonly directorAction: string;
	/** A director rule that fired but could not act: `rule`, `action`. */
	readonly directorSkipped: string;
	readonly runEnd: string;
}

export const DEFAULT_VOCABULARY: OverlayVocabulary = { levelUp: "level_up", directorAction: "director_action", directorSkipped: "director_skipped", runEnd: "run_end" };

export interface NodeVisit {
	/** The first event that reached the node. */
	readonly seq: number;
	readonly minute: number;
	/** How many events reached it (a rule that acted three times: 3). */
	readonly count: number;
}

export interface RunOverlay {
	/** By node id; a node the run never reached has no entry. */
	readonly visits: ReadonlyMap<string, NodeVisit>;
	/** Rules (and their actions) that fired but were skipped, by node id, with how often. */
	readonly skipped: ReadonlyMap<string, number>;
	/** Edges whose both ends were reached. */
	readonly edges: ReadonlySet<string>;
}

function visitOf(events: readonly RunEvent[]): NodeVisit | undefined {
	const first = events[0];
	return first === undefined ? undefined : { seq: first.seq, minute: first.minute, count: events.length };
}

function matches(events: readonly RunEvent[], test: (event: RunEvent) => boolean): readonly RunEvent[] {
	return events.filter(test);
}

/** What reaches a node, for the nodes that read the log directly (acts and roles follow their level). */
function reachingEvents(node: GraphNode, events: readonly RunEvent[], vocabulary: OverlayVocabulary, firstLevel: number | undefined, lastLevel: number | undefined): readonly RunEvent[] | undefined {
	const field = (event: RunEvent, name: string) => stringField(event, name);
	const acted = (event: RunEvent, rule: string) => event.type === vocabulary.directorAction && field(event, "rule") === rule;
	switch (node.kind) {
		case "start":
			return events.slice(0, 1);
		case "level":
			if (node.level === firstLevel) return events.slice(0, 1);
			return matches(events, (event) => event.type === vocabulary.levelUp && numberField(event, "to") === node.level);
		case "end":
			if (node.end === "run") return matches(events, (event) => event.type === vocabulary.runEnd);
			return matches(events, (event) => event.type === vocabulary.levelUp && lastLevel !== undefined && (numberField(event, "to") ?? 0) > lastLevel);
		case "rule":
			return matches(events, (event) => acted(event, node.rule));
		case "trigger":
			if (node.minute !== undefined) {
				const minute = node.minute;
				return matches(events, (event) => event.minute >= minute).slice(0, 1);
			}
			return matches(events, (event) => acted(event, node.rule));
		case "action":
		case "lottery":
			return matches(events, (event) => acted(event, node.rule) && field(event, "action") === node.action);
		case "petition":
			return matches(events, (event) => field(event, "petition") === node.petition);
		case "outcome":
			return matches(events, (event) => field(event, "petition") === node.petition && [field(event, "outcome"), field(event, "status"), field(event, "result")].includes(node.outcome));
		case "collection":
			return matches(events, (event) => field(event, "into") === node.into);
		case "cast":
			return matches(events, (event) => field(event, "cast") === node.cast || event.actor === node.cast);
		case "overseer":
			return matches(events, (event) => event.actor === node.overseer);
		case "act":
		case "role":
		case "mechanic":
			return undefined;
	}
}

/** Lays a run (anything with its events, such as a `RunModel`) over a story graph. */
export function runOverlay(graph: StoryGraph, run: { readonly events: readonly RunEvent[] }, vocabulary: OverlayVocabulary = DEFAULT_VOCABULARY): RunOverlay {
	const events = [...run.events].sort((left, right) => left.seq - right.seq);
	const levels = graph.nodes.flatMap((node) => (node.kind === "level" ? [node.level] : []));
	const firstLevel = levels.length === 0 ? undefined : Math.min(...levels);
	const lastLevel = levels.length === 0 ? undefined : Math.max(...levels);
	const visits = new Map<string, NodeVisit>();
	const skipped = new Map<string, number>();
	for (const node of graph.nodes) {
		const reaching = reachingEvents(node, events, vocabulary, firstLevel, lastLevel);
		const visit = reaching === undefined ? undefined : visitOf(reaching);
		if (visit !== undefined) visits.set(node.id, visit);
		if (node.kind === "rule" || node.kind === "action" || node.kind === "lottery") {
			const action = node.kind === "rule" ? undefined : node.action;
			const count = events.filter((event) => event.type === vocabulary.directorSkipped && stringField(event, "rule") === node.rule && (action === undefined || stringField(event, "action") === action)).length;
			if (count > 0) skipped.set(node.id, count);
		}
	}
	// An act or a gamemaker role begins when its first level is reached.
	for (const node of graph.nodes) {
		if (node.kind !== "act" && node.kind !== "role") continue;
		const level = visits.get(`level:${String(node.fromLevel)}`);
		if (level !== undefined) visits.set(node.id, level);
	}
	const edges = new Set(graph.edges.filter((edge) => visits.has(edge.from) && visits.has(edge.to)).map((edge) => edge.id));
	return { visits, skipped, edges };
}
