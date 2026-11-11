import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";

export interface StoryNodeData extends Record<string, unknown> {
	readonly label: string;
	readonly subtitle: string;
	readonly kind: string;
	readonly tooltip: string;
	/** Set when a run reached the node: first minute and count. */
	readonly visit?: { readonly seq: number; readonly minute: number; readonly count: number };
	readonly skipped?: number;
	/** A run is laid over the graph: unvisited nodes are dimmed. */
	readonly overlay: boolean;
}

export type StoryFlowNode = Node<StoryNodeData, "story">;

function StoryNodeView({ data }: NodeProps<StoryFlowNode>) {
	const dim = data.overlay && data.visit === undefined;
	const className = `stv-node k-${data.kind}${dim ? " dim" : ""}${data.visit === undefined ? "" : " visited"}`;
	return (
		<div className={className} title={data.tooltip}>
			<Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
			<div>{data.label}</div>
			<small>{data.subtitle}</small>
			{data.visit !== undefined && <span className="visit">minute {data.visit.minute}{data.visit.count > 1 ? ` · ${String(data.visit.count)}×` : ""} → #{data.visit.seq}</span>}
			{data.skipped !== undefined && data.skipped > 0 && <span className="skip">skipped {data.skipped}×</span>}
			<Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
		</div>
	);
}

export const StoryNodeType = memo(StoryNodeView);
