/**
 * The story graph as the Story tab draws it. viewer-core gives one node per trigger and per action;
 * drawn like that, a city of ten levels is a hundred tiny boxes. Folded, a rule is one card that says
 * what fires it and carries its actions as chips, so the picture is the backbone of levels, the rules
 * hanging off it, and the branches (petition outcomes, lotteries, collections) that lead on. With
 * `details`, the actions are nodes of their own again; a time trigger is an edge from the start in both.
 */
import type { GraphEdge, GraphNode, RunOverlay, StoryGraph } from "@swarmtales/viewer-core";

export type ViewEdgeKind = GraphEdge["kind"] | "time";

/** An action folded into the card of its rule (or petition outcome, or lottery). */
export interface Chip {
	readonly id: string;
	readonly label: string;
	readonly visit?: { readonly seq: number; readonly minute: number; readonly count: number };
	readonly skipped?: number;
}

export interface ViewNode {
	readonly id: string;
	readonly kind: GraphNode["kind"];
	readonly label: string;
	/** One line under the label: what fires a rule, a level's reward. */
	readonly subtitle: string;
	/** Conditions of a rule, one per line. */
	readonly conditions: readonly string[];
	readonly chips: readonly Chip[];
	/** The act a backbone node belongs to. */
	readonly parent?: string;
}

export interface ViewEdge {
	readonly id: string;
	readonly from: string;
	readonly to: string;
	readonly kind: ViewEdgeKind;
	readonly label?: string;
	/** The graph's edge ids this edge stands for (one, or several folded into one). */
	readonly sources: readonly string[];
}

export interface FoldedGraph {
	readonly nodes: readonly ViewNode[];
	readonly edges: readonly ViewEdge[];
}

/** `onFirstEnter` → `first enter`, `collectionEnded` → `collection ended`: a trigger kind in words. */
export function words(kind: string): string {
	const plain = /^on[A-Z]/.test(kind) ? kind.slice(2) : kind;
	return plain.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

/** A described trigger or condition in words: `onFirstEnter level 2` → `on first enter level 2`, `every minutes 6 from 12` → `every minutes 6, from 12`. */
export function described(text: string): string {
	const [kind = "", ...rest] = text.split(" ");
	const pairs: string[] = [];
	const head = /^on[A-Z]/.test(kind) ? `on ${words(kind)}` : words(kind);
	for (let index = 0; index < rest.length; index += 2) {
		// `competitorsAtLevel level 8` reads `competitors at level 8`, not `... at level level 8`.
		const key = words(rest[index] ?? "");
		pairs.push(`${index === 0 && head.endsWith(` ${key}`) ? "" : key} ${rest[index + 1] ?? ""}`.trim());
	}
	return `${head} ${pairs.join(", ")}`.trim();
}

function chipLabel(node: Extract<GraphNode, { kind: "action" | "lottery" }>): string {
	const target = node.cast ?? (node.into === undefined ? undefined : `into ${node.into}`);
	return target === undefined ? node.action : `${node.action} ${target}`;
}

/** The second line of a node. */
export function subtitleOf(node: GraphNode): string {
	switch (node.kind) {
		case "level":
			return node.reward === undefined ? "level" : `level · reward ${String(node.reward)}`;
		case "act":
			return `act from level ${String(node.fromLevel)}`;
		case "role":
			return `gamemaker from level ${String(node.fromLevel)}`;
		case "rule":
			return described(node.trigger);
		case "trigger":
			return node.minute === undefined ? "trigger" : `at minute ${String(node.minute)}`;
		case "action":
		case "lottery":
			return node.cast ?? (node.into === undefined ? node.kind : `into ${node.into}`);
		case "outcome":
			return `petition ${node.petition}`;
		case "end":
			return node.end === "finished" ? "past the last level" : node.minutes === undefined ? "the run ends" : `after ${String(node.minutes)} minutes`;
		case "overseer":
			return `overseer (${node.mechanic})`;
		case "cast":
			return node.level === undefined ? "cast" : `cast · public at level ${String(node.level)}`;
		case "start":
			return "the run begins";
		case "petition":
		case "collection":
		case "mechanic":
			return node.kind;
	}
}

function viewNode(node: GraphNode, chips: readonly Chip[]): ViewNode {
	return {
		id: node.id,
		kind: node.kind,
		label: node.label,
		subtitle: subtitleOf(node),
		conditions: node.kind === "rule" ? node.conditions.map(described) : [],
		chips,
		...(node.parent === undefined ? {} : { parent: node.parent }),
	};
}

/**
 * Folds the graph: with `details` false, every action whose parent is a rule, an outcome or a lottery
 * becomes a chip of that parent, and every trigger node (a time or another trigger without a node)
 * becomes an edge from the start, labelled with the trigger. Edges are moved onto the cards that
 * stand for their ends; doubles and edges inside one card are dropped. The overlay fills the chips.
 */
export function foldGraph(graph: StoryGraph, details: boolean, overlay?: RunOverlay): FoldedGraph {
	const byId = new Map(graph.nodes.map((node) => [node.id, node]));
	const owner = new Map<string, string>();
	if (!details) {
		for (const edge of graph.edges) {
			const target = byId.get(edge.to);
			const parent = byId.get(edge.from);
			if (target?.kind !== "action" || parent === undefined || (edge.kind !== "action" && edge.kind !== "branch")) continue;
			if (parent.kind === "rule" || parent.kind === "outcome" || parent.kind === "lottery") owner.set(target.id, parent.id);
		}
	}
	// A trigger without a node of its own (a time) is written on its rule's card in both modes.
	for (const node of graph.nodes) if (node.kind === "trigger" && byId.has(`rule:${node.rule}`)) owner.set(node.id, `rule:${node.rule}`);
	const home = (id: string): string => owner.get(id) ?? id;
	const chips = new Map<string, Chip[]>();
	for (const node of graph.nodes) {
		if (node.kind !== "action" || !owner.has(node.id)) continue;
		const visit = overlay?.visits.get(node.id);
		const skipped = overlay?.skipped.get(node.id);
		const list = chips.get(home(node.id)) ?? [];
		list.push({ id: node.id, label: chipLabel(node), ...(visit === undefined ? {} : { visit }), ...(skipped === undefined ? {} : { skipped }) });
		chips.set(home(node.id), list);
	}
	const nodes = graph.nodes.filter((node) => !owner.has(node.id)).map((node) => viewNode(node, chips.get(node.id) ?? []));
	const edges = new Map<string, { from: string; to: string; kind: ViewEdgeKind; label?: string; sources: string[] }>();
	const add = (from: string, to: string, kind: ViewEdgeKind, source: string, label?: string) => {
		if (from === to) return;
		const id = `${kind}:${from}->${to}`;
		const known = edges.get(id);
		if (known === undefined) edges.set(id, { from, to, kind, ...(label === undefined ? {} : { label }), sources: [source] });
		else known.sources.push(source);
	};
	for (const edge of graph.edges) {
		const from = byId.get(edge.from);
		if (from?.kind === "trigger" && owner.has(from.id)) {
			add("start", home(edge.to), "time", edge.id, from.minute === undefined ? described(from.label) : `minute ${String(from.minute)}`);
			continue;
		}
		// A folded action's cast is named on its chip; the line to the cast card would only cross the backbone.
		if (!details && edge.kind === "cast" && owner.has(edge.from)) continue;
		add(home(edge.from), home(edge.to), edge.kind, edge.id, edge.kind === "trigger" && edge.label !== undefined ? words(edge.label) : edge.label);
	}
	// A timed rule that also reads a level hangs off that level; its time is on the card already.
	const fed = new Set([...edges.values()].filter((edge) => edge.kind !== "time").map((edge) => edge.to));
	const kept = [...edges.entries()].filter(([, edge]) => edge.kind !== "time" || !fed.has(edge.to));
	return { nodes, edges: kept.map(([id, edge]) => ({ id, ...edge })) };
}
