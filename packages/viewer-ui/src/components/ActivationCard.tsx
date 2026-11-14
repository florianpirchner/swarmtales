// SPDX-License-Identifier: Apache-2.0
import type { Activation, Call, RunEvent } from "@swarmtales/viewer-core";
import { actsOf, brief } from "../timeline.ts";
import { Step } from "./Step.tsx";

interface Props {
	readonly activation: Activation;
	/** The current seq: the line of the card that shows it is marked. */
	readonly seq: number;
	readonly onSeq: (seq: number) => void;
}

// A call with its arguments and its answer: the reply, or the code and the detail of a refusal.
function CallLine({ call }: { readonly call: Call }) {
	const { answer } = call;
	return (
		<>
			<strong>{call.as}</strong> <code>{brief(call.params)}</code>
			{answer !== undefined && <span className={answer.ok ? "stv-answer" : "stv-answer refused"}> → {answer.ok ? brief(answer.text) : `${answer.code ?? "refused"}: ${answer.text}`}</span>}
		</>
	);
}

// A record of the actor's driver: a model's request and answer, a Director's `asked` and `answered`.
function RecordLine({ record }: { readonly record: RunEvent }) {
	return (
		<>
			<span className="stv-record">{record.type}</span>
			{record.data.fallback === true && <span className="stv-tag warn">fallback</span>} <code>{brief(record.payload)}</code>
		</>
	);
}

/**
 * One activation with what belongs to it: for a Director the events it was woken for, then the records of the
 * actor's driver and its calls in the order of the log.
 *
 * @param props - The activation, the current seq and how to change it.
 * @returns The card; a Director's card has the class `director`.
 */
export function ActivationCard(props: Props) {
	const { activation, seq, onSeq } = props;
	const director = activation.kind === "director";
	const steps = [...actsOf(activation).map((call) => ({ seq: call.seq, call, record: undefined })), ...activation.records.map((record) => ({ seq: record.seq, call: undefined, record }))].sort((a, b) => a.seq - b.seq);
	return (
		<div className={`stv-card stv-activation ${activation.kind}`}>
			<h3>{director ? "Director" : "Activation of"} {activation.name}</h3>
			<p className="muted small">tick {activation.tick} · #{activation.seq}{activation.closedSeq === undefined ? ", still open" : ` to #${String(activation.closedSeq)}`}{activation.outcome === undefined ? "" : ` · ${activation.outcome}`}</p>
			{director && (
				<>
					<h4>Woken by</h4>
					{activation.firings.length === 0 && <p className="muted small">No firing.</p>}
					<ul className="stv-steps">
						{activation.firings.map((firing) => <Step key={firing.seq} at={firing.seq} seq={seq} onSeq={onSeq}><strong>{firing.event}</strong> at tick {firing.tick} <code>{brief(firing.payload)}</code></Step>)}
					</ul>
					<h4>What it did</h4>
				</>
			)}
			{steps.length === 0 && <p className="muted small">No call and no record.</p>}
			<ul className="stv-steps">
				{steps.map((step) => <Step key={step.seq} at={step.seq} seq={seq} onSeq={onSeq}>{step.call === undefined ? <RecordLine record={step.record} /> : <CallLine call={step.call} />}</Step>)}
			</ul>
		</div>
	);
}
