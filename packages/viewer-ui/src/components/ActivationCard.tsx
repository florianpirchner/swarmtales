// SPDX-License-Identifier: Apache-2.0
import type { Activation, Call, RunEvent } from "@swarmtales/viewer-core";
import { actsOf, brief } from "../timeline.ts";
import { Step } from "./Step.tsx";

interface Props {
	readonly activation: Activation;
	/** The current seq: the line of the card that shows it is marked. */
	readonly seq: number;
	readonly onSeq: (seq: number) => void;
	/** The activations open beside this one (`Activation.overlaps`); their calls inside its span are listed with its own, in commit order. */
	readonly beside?: readonly Activation[];
}

// A call with its arguments, its answer (the reply, or the code and the detail of a refusal) and the last line its caller had seen.
function CallLine({ call }: { readonly call: Call }) {
	const { answer } = call;
	return (
		<>
			<strong>{call.as}</strong> <code>{brief(call.params)}</code>
			{answer !== undefined && <span className={answer.ok ? "stv-answer" : "stv-answer refused"}> → {answer.ok ? brief(answer.text) : `${answer.code ?? "refused"}: ${answer.text}`}</span>}
			{call.basis !== undefined && <span className="muted"> · saw #{call.basis}</span>}
		</>
	);
}

// The calls of this activation and of the ones open beside it, from its opening to its closing, in commit order, each with who made it.
function Interleaved({ activation, beside, seq, onSeq }: { readonly activation: Activation; readonly beside: readonly Activation[]; readonly seq: number; readonly onSeq: (seq: number) => void }) {
	const end = activation.closedSeq ?? Infinity;
	const calls = [activation, ...beside].flatMap((entry) => actsOf(entry).map((call) => ({ name: entry.name, call }))).filter(({ call }) => call.seq > activation.seq && call.seq < end).sort((a, b) => a.call.seq - b.call.seq);
	return (
		<>
			<h4>Open beside it</h4>
			<p className="muted small">{beside.map((entry) => `${entry.name} #${String(entry.seq)}`).join(", ")}. The calls in the order of commit:</p>
			<ul className="stv-steps">
				{calls.map(({ name, call }) => <Step key={call.seq} at={call.seq} seq={seq} onSeq={onSeq}>{name} <CallLine call={call} /></Step>)}
			</ul>
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
 * actor's driver and its calls in the order of the log; when others were open beside it, the calls of all of them
 * in commit order, each with its `basis`.
 *
 * @param props - The activation, the current seq, how to change it, and the activations open beside it.
 * @returns The card; a Director's card has the class `director`.
 */
export function ActivationCard(props: Props) {
	const { activation, seq, onSeq, beside = [] } = props;
	const director = activation.kind === "director";
	const steps = [...actsOf(activation).map((call) => ({ seq: call.seq, call, record: undefined })), ...activation.records.map((record) => ({ seq: record.seq, call: undefined, record }))].sort((a, b) => a.seq - b.seq);
	return (
		<div className={`stv-card stv-activation ${activation.kind}`}>
			<h3>{director ? "Director" : "Activation of"} {activation.name}</h3>
			<p className="muted small">tick {activation.tick} · #{activation.seq}{activation.closedSeq === undefined ? ", still open" : ` to #${String(activation.closedSeq)}`}{activation.outcome === undefined ? "" : ` · ${activation.outcome}`}{activation.basis === undefined ? "" : ` · saw #${String(activation.basis)}`}</p>
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
			{beside.length > 0 && <Interleaved activation={activation} beside={beside} seq={seq} onSeq={onSeq} />}
		</div>
	);
}
