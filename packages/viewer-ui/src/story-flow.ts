/**
 * The folded, laid-out story as React Flow nodes and edges: colours and line styles per edge kind,
 * branch labels in their outcome's colour, and the run's path along the backbone as a thick line.
 */
import type { RunOverlay } from "@swarmtales/viewer-core";
import { MarkerType, type Edge } from "@xyflow/react";
import type { ActFlowNode, StoryFlowNode } from "./components/StoryNode.tsx";
import type { FoldedGraph, ViewEdge, ViewEdgeKind } from "./story-fold.ts";
import type { StoryLayout } from "./story-layout.ts";

export const EDGE_COLOR: Readonly<Record<ViewEdgeKind, string>> = {
	sequence: "var(--s1)",
	trigger: "var(--s2)",
	condition: "var(--s5)",
	action: "var(--s3)",
	branch: "var(--s6)",
	role: "var(--s8)",
	cast: "var(--s8)",
	collection: "var(--s5)",
	time: "var(--s8)",
};

export const EDGE_NAMES: Readonly<Record<ViewEdgeKind, string>> = { sequence: "next level", trigger: "fires", condition: "reads", action: "does", branch: "branch", role: "role", cast: "cast", collection: "collects", time: "at a time" };

const LABELLED: ReadonlySet<ViewEdgeKind> = new Set(["branch", "cast", "role"]);
const LABEL_PADDING: [number, number] = [5, 2];

export const DASHED: ReadonlySet<ViewEdgeKind> = new Set(["condition", "role", "cast", "collection", "time"]);

/** A branch's colour by its label: a passed petition green, a failed one red, a lottery draw violet. */
function branchColor(label: string | undefined): string {
	if (label === "passed") return "var(--ok)";
	if (label === "failed") return "var(--bad)";
	if (label === "drawn") return "var(--s4)";
	return EDGE_COLOR.branch;
}

/** Whether the run took an edge: one of the graph edges it stands for has both ends reached. */
function taken(edge: ViewEdge, overlay: RunOverlay | undefined): boolean {
	if (overlay === undefined) return false;
	return edge.sources.some((id) => overlay.edges.has(id)) || (overlay.visits.has(edge.from) && overlay.visits.has(edge.to));
}

export function flowEdges(graph: FoldedGraph, layout: StoryLayout, overlay: RunOverlay | undefined): readonly Edge[] {
	const backbone = new Set(layout.backbone);
	// A condition read back from a later column (a rule that waits on a collection its neighbour opened)
	// is on the rule's card; drawn, it would cut through the cards between.
	// A role or cast member left of the backbone keeps only its line to its level; a rule that names it says so.
	const column = (id: string) => layout.column.get(id) ?? 0;
	const backwards = (edge: ViewEdge) =>
		(edge.kind === "condition" && column(edge.to) <= column(edge.from)) ||
		((column(edge.from) < 0 || column(edge.to) < 0) && column(edge.from) !== 0 && column(edge.to) !== 0);
	return graph.edges
		.filter((edge) => layout.boxes.has(edge.from) && layout.boxes.has(edge.to) && !backwards(edge))
		.map((edge): Edge => {
			const run = taken(edge, overlay);
			const dim = overlay !== undefined && !run;
			const spine = edge.kind === "sequence" && backbone.has(edge.from) && backbone.has(edge.to);
			const color = edge.kind === "branch" ? branchColor(edge.label) : EDGE_COLOR[edge.kind];
			const width = spine ? (run ? 7 : 3) : edge.kind === "branch" ? 2.6 : run ? 2.4 : 1.6;
			// What fires a rule and what it reads are written on its card; on the lines they would crowd the fan
			// of a busy level. Lines keep the labels nothing else shows: branches and a cast's public level.
			const label = edge.label === undefined || edge.label === "" || !LABELLED.has(edge.kind) ? undefined : edge.label;
			return {
				id: edge.id,
				source: edge.from,
				target: edge.to,
				sourceHandle: spine ? "b" : "r",
				targetHandle: spine ? "t" : "l",
				type: spine ? "straight" : "smoothstep",
				...(label === undefined ? {} : { label }),
				className: `k-${edge.kind}${spine && run ? " path" : ""}${run ? " taken" : ""}`,
				zIndex: spine ? 0 : 1,
				style: { stroke: spine && run ? "var(--accent)" : color, strokeWidth: width, opacity: dim ? (spine ? 0.45 : 0.22) : 1, ...(DASHED.has(edge.kind) ? { strokeDasharray: edge.kind === "time" ? "2 4" : "6 4" } : {}) },
				markerEnd: { type: MarkerType.ArrowClosed, color: spine && run ? "var(--accent)" : color, width: spine ? 20 : 15, height: spine ? 20 : 15, markerUnits: "userSpaceOnUse" },
				...(label === undefined ? {} : {
					labelStyle: { fill: edge.kind === "branch" ? color : "var(--muted)", fontWeight: edge.kind === "branch" ? 700 : 500, fontSize: edge.kind === "branch" ? 12 : 10.5 },
					labelBgStyle: { fill: "var(--panel)", stroke: edge.kind === "branch" ? color : "none", strokeWidth: 1 },
					labelBgPadding: LABEL_PADDING,
					labelBgBorderRadius: 6,
				}),
			};
		});
}

export function flowNodes(graph: FoldedGraph, layout: StoryLayout, overlay: RunOverlay | undefined, onJump: (seq: number) => void): readonly (StoryFlowNode | ActFlowNode)[] {
	const backbone = new Set(layout.backbone);
	const acts = layout.acts.map((act): ActFlowNode => ({
		id: `box:${act.id}`,
		type: "act",
		position: { x: act.x, y: act.y },
		width: act.width,
		height: act.height,
		draggable: false,
		selectable: false,
		zIndex: -1,
		data: { label: act.label, reached: overlay?.visits.has(act.id) === true },
	}));
	const nodes = graph.nodes.flatMap((node): StoryFlowNode[] => {
		const box = layout.boxes.get(node.id);
		if (box === undefined) return [];
		const visit = overlay?.visits.get(node.id);
		const skipped = overlay?.skipped.get(node.id);
		return [{
			id: node.id,
			type: "story",
			position: { x: box.x, y: box.y },
			width: box.width,
			height: box.height,
			draggable: false,
			data: { node, overlay: overlay !== undefined, backbone: backbone.has(node.id), onJump, ...(visit === undefined ? {} : { visit }), ...(skipped === undefined ? {} : { skipped }) },
		}];
	});
	return [...acts, ...nodes];
}
