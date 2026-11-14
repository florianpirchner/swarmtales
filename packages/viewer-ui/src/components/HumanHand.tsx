// SPDX-License-Identifier: Apache-2.0
import type { RunProjection } from "@swarmtales/viewer-core";
import { callLine, pauseLine, resumeLine } from "../timeline.ts";
import { Step } from "./Step.tsx";

interface BadgeProps {
	readonly projection: RunProjection;
	/** Called with the seq of the first call of the human. */
	readonly onJump: (seq: number) => void;
}

/**
 * The badge of a run a person stepped into; a click moves the replay to the first call of the human.
 *
 * @param props - The projection of the run and what a click does with the seq of the first call.
 * @returns The badge, or nothing for a log without a call of the actor `human`.
 */
export function HumanBadge(props: BadgeProps) {
	const first = props.projection.humanCalls[0];
	if (first === undefined) return null;
	const calls = props.projection.humanCalls.length;
	return <button type="button" className="stv-badge wait stv-human-badge" title={`${String(calls)} ${calls === 1 ? "call" : "calls"} of the human; the first is #${String(first.seq)}`} onClick={() => { props.onJump(first.seq); }}>human-influenced</button>;
}

interface Props {
	readonly projection: RunProjection;
	/** The current seq: the line of the card that shows it is marked. */
	readonly seq: number;
	readonly onSeq: (seq: number) => void;
}

/**
 * What a person did to the run and where the run was taken up again, over the whole log: each call of the human
 * with its answer, each pause, each resume marker.
 *
 * @param props - The projection, the current seq and how to change it.
 * @returns The card, or nothing for a run without any of the three.
 */
export function HumanCard(props: Props) {
	const { projection, seq, onSeq } = props;
	const steps = [
		...projection.humanCalls.map((call) => ({ seq: call.seq, label: "human", name: call.as, line: callLine(call) })),
		...projection.pauses.map((pause) => ({ seq: pause.seq, label: "pause", name: pause.by, line: pauseLine(pause) })),
		...projection.resumes.map((marker) => ({ seq: marker.seq, label: "run resumed", name: "", line: resumeLine(marker) })),
	].sort((a, b) => a.seq - b.seq);
	if (steps.length === 0) return null;
	return (
		<div className="stv-card stv-human">
			<h3>Human Hand and resume</h3>
			<ul className="stv-steps">
				{steps.map((step) => <Step key={step.seq} at={step.seq} seq={seq} onSeq={onSeq}><span className="stv-record">{step.label}</span> <strong>{step.name}</strong> {step.line}</Step>)}
			</ul>
		</div>
	);
}
