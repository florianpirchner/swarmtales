import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { Chip, ViewNode } from "../story-fold.ts";

type Visit = NonNullable<Chip["visit"]>;

export interface StoryNodeData extends Record<string, unknown> {
	readonly node: ViewNode;
	/** Set when a run reached the node: first seq and minute, and how often. */
	readonly visit?: Visit;
	readonly skipped?: number;
	/** A run is laid over the graph: unreached nodes and chips are dimmed. */
	readonly overlay: boolean;
	/** On the backbone (handles top and bottom are used). */
	readonly backbone: boolean;
	readonly onJump: (seq: number) => void;
}

export type StoryFlowNode = Node<StoryNodeData, "story">;

export interface ActNodeData extends Record<string, unknown> {
	readonly label: string;
	readonly reached: boolean;
}

export type ActFlowNode = Node<ActNodeData, "act">;

const HIDDEN = { opacity: 0, pointerEvents: "none" } as const;

function visitText(visit: Visit): string {
	return `first at minute ${String(visit.minute)} (#${String(visit.seq)})${visit.count > 1 ? `, ${String(visit.count)} times` : ""}; click to replay from there`;
}

function ChipView({ chip, overlay, onJump }: { readonly chip: Chip; readonly overlay: boolean; readonly onJump: (seq: number) => void }) {
	const visit = chip.visit;
	const className = `stv-chip${visit === undefined ? (overlay ? " dim" : "") : " visited"}`;
	const title = visit === undefined ? (overlay ? "not done in this run" : chip.label) : visitText(visit);
	return (
		<button
			type="button"
			className={className}
			title={title}
			disabled={visit === undefined}
			onClick={(event) => {
				event.stopPropagation();
				if (visit !== undefined) onJump(visit.seq);
			}}
		>
			{chip.label}
			{visit !== undefined && visit.count > 1 && <span className="n">{visit.count}×</span>}
			{chip.skipped !== undefined && <span className="skip">skipped {chip.skipped}×</span>}
		</button>
	);
}

function StoryNodeView({ data }: NodeProps<StoryFlowNode>) {
	const { node, visit, overlay } = data;
	const dim = overlay && visit === undefined;
	const className = `stv-node k-${node.kind}${dim ? " dim" : ""}${visit === undefined ? "" : " visited"}${data.backbone ? " backbone" : ""}`;
	const title = [node.label, node.subtitle, ...node.conditions.map((line) => `if ${line}`), visit === undefined ? (overlay ? "not reached in this run" : "") : visitText(visit)].filter((line) => line !== "").join("\n");
	return (
		<div className={className} title={title}>
			<Handle id="t" type="target" position={Position.Top} isConnectable={false} style={HIDDEN} />
			<Handle id="l" type="target" position={Position.Left} isConnectable={false} style={HIDDEN} />
			<div className="head">
				<span className="label">{node.label}</span>
				{data.skipped !== undefined && !node.chips.some((chip) => chip.skipped !== undefined) && <span className="badge skip" title={`fired but could not act ${String(data.skipped)} times`}>skipped {data.skipped}×</span>}
				{visit !== undefined && <span className="badge">m{visit.minute}{visit.count > 1 ? ` · ${String(visit.count)}×` : ""}</span>}
			</div>
			<small className="sub">{node.subtitle}</small>
			{node.conditions.map((line) => <small key={line} className="cond">if {line}</small>)}
			{node.chips.length > 0 && (
				<div className="chips">
					{node.chips.map((chip) => <ChipView key={chip.id} chip={chip} overlay={overlay} onJump={data.onJump} />)}
				</div>
			)}
			<Handle id="b" type="source" position={Position.Bottom} isConnectable={false} style={HIDDEN} />
			<Handle id="r" type="source" position={Position.Right} isConnectable={false} style={HIDDEN} />
		</div>
	);
}

function ActNodeView({ data }: NodeProps<ActFlowNode>) {
	return (
		<div className={`stv-act${data.reached ? " reached" : ""}`}>
			<span>{data.label}</span>
		</div>
	);
}

export const StoryNodeType = memo(StoryNodeView);
export const ActNodeType = memo(ActNodeView);
