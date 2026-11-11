import type { GraphEdge, GraphNode, StoryGraph } from "@swarmtales/viewer-core";
import ELK from "elkjs/lib/elk.bundled.js";

export interface Box {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/** A second line under the node's label: what kind of node it is and its one useful detail. */
export function subtitleOf(node: GraphNode): string {
	switch (node.kind) {
		case "level":
			return node.reward === undefined ? "level" : `level, reward ${String(node.reward)}`;
		case "act":
			return `act from level ${String(node.fromLevel)}`;
		case "role":
			return `role from level ${String(node.fromLevel)}`;
		case "rule":
			return `rule on ${node.trigger}`;
		case "trigger":
			return node.minute === undefined ? "trigger" : `at minute ${String(node.minute)}`;
		case "action":
		case "lottery":
			return node.action;
		case "outcome":
			return `outcome of ${node.petition}`;
		case "end":
			return node.minutes === undefined ? "end" : `end, ${String(node.minutes)} min`;
		case "overseer":
			return `overseer (${node.mechanic})`;
		case "start":
		case "cast":
		case "petition":
		case "collection":
		case "mechanic":
			return node.kind;
	}
}

/** The size a node needs for its label and subtitle. */
export function sizeOf(node: GraphNode): { readonly width: number; readonly height: number } {
	const longest = Math.max(node.label.length, subtitleOf(node).length * 0.85);
	return { width: Math.max(96, Math.min(240, Math.round(longest * 6.8 + 28))), height: 58 };
}

function edgeLabelSize(edge: GraphEdge): { readonly width: number; readonly height: number } | undefined {
	return edge.label === undefined || edge.label === "" ? undefined : { width: Math.min(220, edge.label.length * 6 + 10), height: 16 };
}

/** Auto layout with ELK (layered, left to right); the positions by node id. */
export async function layoutGraph(graph: StoryGraph): Promise<ReadonlyMap<string, Box>> {
	// elkjs is a CommonJS module that sets `default` on its export; the typings declare it as the default export.
	const elk = new ELK.default();
	const ids = new Set(graph.nodes.map((node) => node.id));
	const result = await elk.layout({
		id: "root",
		layoutOptions: {
			"elk.algorithm": "layered",
			"elk.direction": "RIGHT",
			"elk.spacing.nodeNode": "22",
			"elk.layered.spacing.nodeNodeBetweenLayers": "70",
			"elk.layered.spacing.edgeNodeBetweenLayers": "20",
			"elk.spacing.edgeLabel": "4",
			"elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
			"elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
			"elk.edgeLabels.placement": "CENTER",
		},
		children: graph.nodes.map((node) => ({ id: node.id, ...sizeOf(node) })),
		edges: graph.edges
			.filter((edge) => ids.has(edge.from) && ids.has(edge.to))
			.map((edge) => {
				const label = edgeLabelSize(edge);
				return { id: edge.id, sources: [edge.from], targets: [edge.to], ...(label === undefined ? {} : { labels: [{ text: edge.label ?? "", ...label }] }) };
			}),
	});
	const boxes = new Map<string, Box>();
	for (const child of result.children ?? []) boxes.set(child.id, { x: child.x ?? 0, y: child.y ?? 0, width: child.width, height: child.height });
	return boxes;
}
