import { runOverlay, storyGraph, type RunOverlay, type Vocabulary } from "@swarmtales/viewer-core";
import { Background, Controls, MiniMap, ReactFlow, type ReactFlowInstance } from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { parse } from "yaml";
import { foldGraph, type FoldedGraph } from "../story-fold.ts";
import { DASHED, EDGE_COLOR, EDGE_NAMES, flowEdges, flowNodes } from "../story-flow.ts";
import { layoutStory, type StoryLayout } from "../story-layout.ts";
import { storyOfRun } from "../story-lookup.ts";
import type { LoadedRun } from "../use-run.ts";
import { ActNodeType, StoryNodeType, type ActFlowNode, type StoryFlowNode } from "./StoryNode.tsx";

interface Props {
	readonly run: LoadedRun | undefined;
	readonly stories: Readonly<Record<string, unknown>>;
	readonly onJump: (seq: number) => void;
	readonly vocabulary: Vocabulary;
	/** The story shown first (the host's `initialStory`), until the user picks another. */
	readonly initial?: { readonly name: string; readonly story: unknown };
}

const NODE_TYPES = { story: StoryNodeType, act: ActNodeType };
/** Below this zoom the labels are too small to read; a wide story is panned instead. */
const MIN_READABLE_ZOOM = 0.62;

/** The story file text (YAML or JSON) as the plain value the graph reads. */
export function parseStoryText(text: string): unknown {
	return parse(text);
}

/** What the colours and lines mean: the node kinds and edge kinds this graph uses. */
function Key({ graph, overlay }: { readonly graph: FoldedGraph; readonly overlay: boolean }) {
	const kinds = [...new Set(graph.nodes.map((node) => node.kind))].filter((kind) => kind !== "act");
	const edgeKinds = [...new Set(graph.edges.map((edge) => edge.kind))];
	const chips = graph.nodes.some((node) => node.chips.length > 0);
	return (
		<div className="stv-key" aria-label="Key">
			{kinds.map((kind) => <span key={kind} className={`stv-node k-${kind}`}>{kind}</span>)}
			{chips && <span className="stv-chip">action</span>}
			{edgeKinds.map((kind) => (
				<span key={kind} className="edge">
					<svg viewBox="0 0 26 8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke={EDGE_COLOR[kind]} strokeWidth={2} strokeDasharray={DASHED.has(kind) ? "5 4" : undefined} /></svg>
					{EDGE_NAMES[kind]}
				</span>
			))}
			{overlay && <span>thick blue line = the run's way down the levels; m12 = first reached at minute 12 (click: replay from there); faded = not reached</span>}
		</div>
	);
}

function StoryFlow({ graph, layout, overlay, onJump }: { readonly graph: FoldedGraph; readonly layout: StoryLayout; readonly overlay: RunOverlay | undefined; readonly onJump: (seq: number) => void }) {
	const box = useRef<HTMLDivElement>(null);
	const nodes = useMemo(() => flowNodes(graph, layout, overlay, onJump), [graph, layout, overlay, onJump]);
	const edges = useMemo(() => flowEdges(graph, layout, overlay), [graph, layout, overlay]);
	// Open at a readable zoom, fitted to the width and scrolled to the top: the backbone reads downwards.
	const onInit = useCallback((flow: ReactFlowInstance<StoryFlowNode | ActFlowNode>) => {
		const width = box.current?.clientWidth ?? 1200;
		const zoom = Math.max(MIN_READABLE_ZOOM, Math.min(1.1, (width - 24) / layout.width));
		void flow.setViewport({ x: Math.max(12, (width - layout.width * zoom) / 2), y: 12, zoom });
	}, [layout]);
	return (
		<div className="stv-flow" ref={box}>
			<ReactFlow<StoryFlowNode | ActFlowNode>
				nodes={[...nodes]}
				edges={[...edges]}
				nodeTypes={NODE_TYPES}
				colorMode="system"
				onInit={onInit}
				minZoom={0.08}
				maxZoom={2}
				panOnScroll
				nodesDraggable={false}
				nodesConnectable={false}
				onNodeClick={(_event, node) => { if (node.type === "story" && node.data.visit !== undefined) onJump(node.data.visit.seq); }}
				proOptions={{ hideAttribution: true }}
			>
				<Background gap={22} />
				<Controls showInteractive={false} />
				<MiniMap pannable zoomable nodeStrokeWidth={2} />
			</ReactFlow>
		</div>
	);
}

export function StoryView({ run, stories, onJump, vocabulary, initial }: Props) {
	const fromRun = useMemo(() => (run === undefined ? undefined : storyOfRun(run.model, stories)), [run, stories]);
	const [picked, setPicked] = useState<string>("");
	const [file, setFile] = useState<{ readonly name: string; readonly value: unknown } | undefined>(initial === undefined ? undefined : { name: initial.name, value: initial.story });
	const [fileError, setFileError] = useState<string | undefined>(undefined);
	const [showOverlay, setShowOverlay] = useState(true);
	const [details, setDetails] = useState(false);
	const names = Object.keys(stories).sort();
	const choice = file !== undefined ? { id: file.name, story: file.value } : picked !== "" ? { id: picked, story: Object.entries(stories).find(([key]) => key === picked)?.[1] } : fromRun;
	const graph = useMemo(() => (choice?.story === undefined ? undefined : storyGraph(choice.story)), [choice?.story]);
	const overlay = useMemo(() => (graph === undefined || run === undefined || !showOverlay || choice !== fromRun ? undefined : runOverlay(graph, run.model, vocabulary.overlay)), [graph, run, showOverlay, choice, fromRun, vocabulary.overlay]);
	const folded = useMemo(() => (graph === undefined ? undefined : foldGraph(graph, details, overlay)), [graph, details, overlay]);
	const layout = useMemo(() => (folded === undefined ? undefined : layoutStory(folded)), [folded]);
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
				<label className="small"><input type="checkbox" checked={details} onChange={(event) => { setDetails(event.target.checked); }} /> show details (every action as a node)</label>
				{graph !== undefined && folded !== undefined && (
					<span className="muted small">{graph.kind} story, {folded.nodes.filter((node) => node.kind !== "act").length} cards ({graph.nodes.length} graph nodes){overlay === undefined ? "" : `, ${String(overlay.visits.size)} reached by the run`}</span>
				)}
			</div>
			{folded !== undefined && folded.nodes.length > 0 && <Key graph={folded} overlay={overlay !== undefined} />}
			{fileError !== undefined && <div className="stv-issue">{fileError}</div>}
			{graph?.issues.map((issue) => <div key={issue} className="stv-issue small">{issue}</div>)}
			{graph === undefined || folded === undefined || layout === undefined || graph.nodes.length === 0 ? (
				<div className="stv-empty">{run !== undefined && fromRun === undefined ? "This build has no story for this run. Choose one above or open a story file (.yaml or .json)." : "Choose a story or open a story file (.yaml or .json)."}</div>
			) : (
				<StoryFlow key={`${choice?.id ?? ""}:${String(details)}`} graph={folded} layout={layout} overlay={overlay} onJump={onJump} />
			)}
		</>
	);
}
