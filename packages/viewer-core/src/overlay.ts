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

/** Events grouped by a key, in seq order; built once, so each node is one lookup. */
class Buckets {
	private readonly groups = new Map<string, RunEvent[]>();

	add(key: string | undefined, event: RunEvent): void {
		if (key === undefined) return;
		const group = this.groups.get(key);
		if (group === undefined) this.groups.set(key, [event]);
		else group.push(event);
	}

	get(key: string): readonly RunEvent[] {
		return this.groups.get(key) ?? [];
	}
}

/** The events the overlay reads, indexed in one pass over the log. */
interface Indexed {
	readonly events: readonly RunEvent[];
	readonly actions: Buckets;
	readonly skipped: Buckets;
	readonly levelUps: readonly RunEvent[];
	readonly levelTo: Buckets;
	readonly runEnds: readonly RunEvent[];
	readonly petitions: Buckets;
	readonly into: Buckets;
	readonly casts: Buckets;
	readonly actors: Buckets;
}

const key = (...parts: readonly string[]): string => parts.join("\u0000");

function indexed(input: readonly RunEvent[], vocabulary: OverlayVocabulary): Indexed {
	const events = [...input].sort((left, right) => left.seq - right.seq);
	const index = { events, actions: new Buckets(), skipped: new Buckets(), levelUps: new Array<RunEvent>(), levelTo: new Buckets(), runEnds: new Array<RunEvent>(), petitions: new Buckets(), into: new Buckets(), casts: new Buckets(), actors: new Buckets() };
	for (const event of events) {
		const rule = stringField(event, "rule");
		const action = stringField(event, "action");
		if (event.type === vocabulary.directorAction || event.type === vocabulary.directorSkipped) {
			const bucket = event.type === vocabulary.directorAction ? index.actions : index.skipped;
			if (rule !== undefined) {
				bucket.add(key(rule), event);
				if (action !== undefined) bucket.add(key(rule, action), event);
			}
		}
		if (event.type === vocabulary.levelUp) {
			index.levelUps.push(event);
			const to = numberField(event, "to");
			if (to !== undefined) index.levelTo.add(String(to), event);
		}
		if (event.type === vocabulary.runEnd) index.runEnds.push(event);
		const petition = stringField(event, "petition");
		if (petition !== undefined) {
			index.petitions.add(key(petition), event);
			const outcomes = new Set([stringField(event, "outcome"), stringField(event, "status"), stringField(event, "result")]);
			for (const outcome of outcomes) if (outcome !== undefined) index.petitions.add(key(petition, outcome), event);
		}
		index.into.add(stringField(event, "into"), event);
		const cast = stringField(event, "cast");
		index.casts.add(cast, event);
		if (event.actor !== undefined && event.actor !== cast) index.casts.add(event.actor, event);
		index.actors.add(event.actor, event);
	}
	return index;
}

/** What reaches a node, for the nodes that read the log directly (acts and roles follow their level). */
function reachingEvents(node: GraphNode, index: Indexed, firstLevel: number | undefined, lastLevel: number | undefined): readonly RunEvent[] | undefined {
	switch (node.kind) {
		case "start":
			return index.events.slice(0, 1);
		case "level":
			return node.level === firstLevel ? index.events.slice(0, 1) : index.levelTo.get(String(node.level));
		case "end":
			if (node.end === "run") return index.runEnds;
			return index.levelUps.filter((event) => lastLevel !== undefined && (numberField(event, "to") ?? 0) > lastLevel);
		case "rule":
			return index.actions.get(key(node.rule));
		case "trigger": {
			const minute = node.minute;
			if (minute === undefined) return index.actions.get(key(node.rule));
			const first = index.events.find((event) => event.minute >= minute);
			return first === undefined ? [] : [first];
		}
		case "action":
		case "lottery":
			return index.actions.get(key(node.rule, node.action));
		case "petition":
			return index.petitions.get(key(node.petition));
		case "outcome":
			return index.petitions.get(key(node.petition, node.outcome));
		case "collection":
			return index.into.get(node.into);
		case "cast":
			return index.casts.get(node.cast);
		case "overseer":
			return index.actors.get(node.overseer);
		case "act":
		case "role":
		case "mechanic":
			return undefined;
	}
}

/**
 * Lays a run (anything with its events, such as a `RunModel`) over a story graph. The log is indexed
 * once, so the cost is one pass over the events plus one lookup per node. `vocabulary` replaces
 * single names of {@link DEFAULT_VOCABULARY}.
 */
export function runOverlay(graph: StoryGraph, run: { readonly events: readonly RunEvent[] }, vocabulary: Partial<OverlayVocabulary> = {}): RunOverlay {
	const index = indexed(run.events, { ...DEFAULT_VOCABULARY, ...vocabulary });
	const levels = graph.nodes.flatMap((node) => (node.kind === "level" ? [node.level] : []));
	const firstLevel = levels.length === 0 ? undefined : Math.min(...levels);
	const lastLevel = levels.length === 0 ? undefined : Math.max(...levels);
	const visits = new Map<string, NodeVisit>();
	const skipped = new Map<string, number>();
	for (const node of graph.nodes) {
		const reaching = reachingEvents(node, index, firstLevel, lastLevel);
		const visit = reaching === undefined ? undefined : visitOf(reaching);
		if (visit !== undefined) visits.set(node.id, visit);
		if (node.kind === "rule" || node.kind === "action" || node.kind === "lottery") {
			const count = index.skipped.get(node.kind === "rule" ? key(node.rule) : key(node.rule, node.action)).length;
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
