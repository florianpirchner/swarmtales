// SPDX-License-Identifier: LicenseRef-SUL-1.0
import type { Decision } from "@swarmtales/viewer-core";
import { brief } from "../timeline.ts";
import { Step } from "./Step.tsx";

interface Props {
	readonly decision: Decision;
	/** The current seq: the card shows the decision as it stood there. */
	readonly seq: number;
	readonly onSeq: (seq: number) => void;
}

/**
 * One decision as one item, as it stood at the current seq: proposed (kind, owner, proposal, deadline, holders),
 * each amendment (who, why), and the settlement (changed or not).
 *
 * @param props - The decision, the current seq and how to change it.
 * @returns The card.
 */
export function DecisionCard(props: Props) {
	const { decision, seq, onSeq } = props;
	const settled = decision.settled !== undefined && decision.settled.seq <= seq ? decision.settled : undefined;
	const state = settled === undefined ? { tag: "wait", text: `open until tick ${String(decision.deadline)}` } : settled.changed ? { tag: "bad", text: "settled, changed" } : { tag: "ok", text: "settled, unchanged" };
	return (
		<div className="stv-card stv-decision">
			<h3>Decision {decision.id} <span className={`stv-badge ${state.tag}`}>{state.text}</span></h3>
			<dl className="stv-kv">
				<dt>kind</dt><dd>{decision.kind}</dd>
				<dt>owner</dt><dd>{decision.owner}</dd>
				<dt>deadline</dt><dd>tick {decision.deadline}</dd>
				<dt>holders</dt><dd>{decision.holders.join(", ")}</dd>
			</dl>
			<ul className="stv-steps">
				<Step at={decision.seq} seq={seq} onSeq={onSeq}><span className="stv-record">proposed</span> at tick {decision.tick} <code>{brief(decision.proposal)}</code></Step>
				{decision.amendments.filter((amendment) => amendment.seq <= seq).map((amendment) => (
					<Step key={amendment.seq} at={amendment.seq} seq={seq} onSeq={onSeq}><span className="stv-record">amended</span> at tick {amendment.tick} by <strong>{amendment.by}</strong> <code>{brief(amendment.proposal)}</code>{amendment.reason === undefined ? "" : ` “${amendment.reason}”`}</Step>
				))}
				{settled !== undefined && <Step at={settled.seq} seq={seq} onSeq={onSeq}><span className="stv-record">settled</span> at tick {settled.tick}, {settled.changed ? "changed by an amendment" : "as proposed"} <code>{brief(settled.proposal)}</code></Step>}
			</ul>
		</div>
	);
}
