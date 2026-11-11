import { runOverlay, storyGraph, type GraphEdge, type RunOverlay, type StoryGraph } from "@swarmtales/viewer-core";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { parse } from "yaml";
import { storyOfRun } from "../story-lookup.ts";
import { layoutGraph, subtitleOf, type Box } from "../story-layout.ts";
import type { LoadedRun } from "../use-run.ts";
import { StoryNodeType, type StoryFlowNode } from "./StoryNode.tsx";

interface Props {
	readonly run: LoadedRun | undefined;
	readonly stories: Readonly<Record<string, unknown>>;
	readonly onJump: (seq: number) => void;
}

const NODE_TYPES = { story: StoryNodeType };
const EDGE_COLOR: Readonly<Record<GraphEdge["kind"], string>> = {
	sequence: "var(--s1)",
	trigger: "var(--s2)",
	condition: "var(--s5)",
	action: "var(--s3)",
	branch: "var(--s6)",
	role: "var(--s8)",
	cast: "var(--s8)",
	collection: "var(--s5)",
};
const DASHED: ReadonlySet<GraphEdge["kind"]> = new Set(["condition", "role", "cast", "collection"]);

/** The story file text (YAML or JSON) as the plain value the graph reads. */
export function parseStoryText(text: string): unknown {
	return parse(text);
}

function flowEdges(graph: StoryGraph, overlay: RunOverlay | undefined, boxes: ReadonlyMap<string, Box>): readonly Edge[] {
	return graph.edges
		.filter((edge) => boxes.has(edge.from) && boxes.has(edge.to))
		.map((edge) => {
			const taken = overlay?.edges.has(edge.id) === true;
			const dim = overlay !== undefined && !taken;
			const color = EDGE_COLOR[edge.kind];
			return {
				id: edge.id,
				source: edge.from,
				target: edge.to,
				...(edge.label === undefined || edge.label === "" ? {} : { label: edge.label }),
				type: "smoothstep",
				animated: taken && edge.kind !== "sequence",
				style: { stroke: color, strokeWidth: taken ? 3.2 : edge.kind === "sequence" || edge.kind === "branch" ? 2.2 : 1.4, opacity: dim ? 0.22 : 1, ...(DASHED.has(edge.kind) ? { strokeDasharray: "5 4" } : {}) },
				markerEnd: { type: MarkerType.ArrowClosed, color },
				labelBgPadding: [4, 2],
				labelBgBorderRadius: 4,
			} satisfies Edge;
		});
}

const EDGE_NAMES: Readonly<Record<GraphEdge["kind"], string>> = { sequence: "order", trigger: "fires", condition: "reads", action: "does", branch: "branch", role: "role", cast: "cast", collection: "collects" };

/** What the colours and lines mean: the node kinds and edge kinds this graph uses. */
function Key({ graph, overlay }: { readonly graph: StoryGraph; readonly overlay: boolean }) {
	const kinds = [...new Set(graph.nodes.map((node) => node.kind))];
	const edgeKinds = [...new Set(graph.edges.map((edge) => edge.kind))];
	return (
		<div className="stv-key" aria-label="Key">
			{kinds.map((kind) => <span key={kind} className={`stv-node k-${kind}`}>{kind}</span>)}
			{edgeKinds.map((kind) => (
				<span key={kind} className="edge">
					<svg viewBox="0 0 26 8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke={EDGE_COLOR[kind]} strokeWidth={2} strokeDasharray={DASHED.has(kind) ? "5 4" : undefined} /></svg>
					{EDGE_NAMES[kind]}
				</span>
			))}
			{overlay && <span>glow = reached by the run (click: replay at that point), faded = not reached</span>}
		</div>
	);
}

export function StoryView({ run, stories, onJump }: Props) {
	const fromRun = useMemo(() => (run === undefined ? undefined : storyOfRun(run.model, stories)), [run, stories]);
	const [picked, setPicked] = useState<string>("");
	const [file, setFile] = useState<{ readonly name: string; readonly value: unknown } | undefined>(undefined);
	const [fileError, setFileError] = useState<string | undefined>(undefined);
	const [showOverlay, setShowOverlay] = useState(true);
	const names = Object.keys(stories).sort();
	const choice = file !== undefined ? { id: file.name, story: file.value } : picked !== "" ? { id: picked, story: Object.entries(stories).find(([key]) => key === picked)?.[1] } : fromRun;
	const graph = useMemo(() => (choice?.story === undefined ? undefined : storyGraph(choice.story)), [choice?.story]);
	const overlay = useMemo(() => (graph === undefined || run === undefined || !showOverlay || choice !== fromRun ? undefined : runOverlay(graph, run.model)), [graph, run, showOverlay, choice, fromRun]);
	const [boxes, setBoxes] = useState<ReadonlyMap<string, Box> | undefined>(undefined);
	const [layoutError, setLayoutError] = useState<string | undefined>(undefined);
	useEffect(() => {
		setBoxes(undefined);
		setLayoutError(undefined);
		if (graph === undefined || graph.nodes.length === 0) return undefined;
		let cancelled = false;
		layoutGraph(graph)
			.then((result) => { if (!cancelled) setBoxes(result); })
			.catch((reason: unknown) => { if (!cancelled) setLayoutError(reason instanceof Error ? reason.message : String(reason)); });
		return () => { cancelled = true; };
	}, [graph]);
	const nodes = useMemo<readonly StoryFlowNode[]>(() => {
		if (graph === undefined || boxes === undefined) return [];
		return graph.nodes.flatMap((node) => {
			const box = boxes.get(node.id);
			if (box === undefined) return [];
			const visit = overlay?.visits.get(node.id);
			const skipped = overlay?.skipped.get(node.id);
			const detail = node.kind === "rule" && node.conditions.length > 0 ? `${node.label}\nwhen ${node.conditions.join(" and ")}` : node.label;
			return [{
				id: node.id,
				type: "story" as const,
				position: { x: box.x, y: box.y },
				width: box.width,
				height: box.height,
				draggable: false,
				data: { label: node.label, subtitle: subtitleOf(node), kind: node.kind, tooltip: detail, overlay: overlay !== undefined, ...(visit === undefined ? {} : { visit }), ...(skipped === undefined ? {} : { skipped }) },
			}];
		});
	}, [graph, boxes, overlay]);
	const edges = useMemo(() => (graph === undefined || boxes === undefined ? [] : flowEdges(graph, overlay, boxes)), [graph, boxes, overlay]);
	return (
		<>
			<div className="stv-tools">
				<select aria-label="Story" value={file === undefined ? picked : "__file"} onChange={(event) => { setFile(undefined); setPicked(event.target.value); }}>
					<option value="">{fromRun === undefined ? "choose a story" : `the run's story (${fromRun.id})`}</option>
					{file !== undefined && <option value="__file">{file.name}</option>}
					{names.map((name) => <option key={name} value={name}>{name}</option>)}
				</select>
				<label className="small">
					<span className="muted">open a story file </span>
					<input
						type="file"
						accept=".yaml,.yml,.json"
						onChange={(event) => {
							const chosen = event.target.files?.item(0);
							if (chosen === undefined || chosen === null) return;
							chosen.text()
								.then((text) => { setFile({ name: chosen.name, value: parseStoryText(text) }); setFileError(undefined); })
								.catch((reason: unknown) => { setFileError(reason instanceof Error ? reason.message : String(reason)); });
						}}
					/>
				</label>
				{run !== undefined && choice === fromRun && fromRun !== undefined && (
					<label className="small"><input type="checkbox" checked={showOverlay} onChange={(event) => { setShowOverlay(event.target.checked); }} /> overlay this run</label>
				)}
				{graph !== undefined && <span className="muted small">{graph.kind} story, {graph.nodes.length} nodes, {graph.edges.length} edges{overlay === undefined ? "" : `, ${String(overlay.visits.size)} reached by the run`}</span>}
			</div>
			{graph !== undefined && graph.nodes.length > 0 && <Key graph={graph} overlay={overlay !== undefined} />}
			{fileError !== undefined && <div className="stv-issue">{fileError}</div>}
			{graph?.issues.map((issue) => <div key={issue} className="stv-issue small">{issue}</div>)}
			{graph === undefined || graph.nodes.length === 0 ? (
				<div className="stv-empty">{run !== undefined && fromRun === undefined ? "This build has no story for this run. Choose one above or open a story file (.yaml or .json)." : "Choose a story or open a story file (.yaml or .json)."}</div>
			) : layoutError !== undefined ? (
				<div className="stv-empty stv-issue">{layoutError}</div>
			) : boxes === undefined ? (
				<div className="stv-loading">Laying out {graph.nodes.length} nodes…</div>
			) : (
				<div className="stv-flow">
					<ReactFlow
						nodes={[...nodes]}
						edges={[...edges]}
						nodeTypes={NODE_TYPES}
						colorMode="system"
						fitView
						minZoom={0.05}
						maxZoom={2}
						nodesDraggable={false}
						nodesConnectable={false}
						onNodeClick={(_event, node) => { if (node.data.visit !== undefined) onJump(node.data.visit.seq); }}
						proOptions={{ hideAttribution: true }}
					>
						<Background gap={22} />
						<Controls showInteractive={false} />
						<MiniMap pannable zoomable nodeStrokeWidth={2} />
					</ReactFlow>
				</div>
			)}
		</>
	);
}
