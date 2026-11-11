import type { RunModel, RunVerification } from "@swarmtales/viewer-core";

interface Props {
	readonly verification: RunVerification | undefined;
	readonly model: RunModel;
	readonly onJump: (seq: number) => void;
}

/** The chain verdict: green valid (N lines), red with the first broken line (and a jump to its seq), grey unsigned. */
export function ChainBadge({ verification, model, onJump }: Props) {
	if (verification === undefined) return <span className="stv-badge wait">checking the chain…</span>;
	if (!verification.signed) return <span className="stv-badge none" title="No events.chain.jsonl in this run folder">unsigned</span>;
	const { verdict } = verification;
	if (verdict.ok) {
		return <span className="stv-badge ok" title={`checked with ${verification.checkedWith}; head ${verdict.head}`}>{"✓"} chain valid, {verdict.lines.toLocaleString("en-US")} lines</span>;
	}
	const line = verdict.line;
	const seq = line === undefined ? undefined : model.events.find((event) => event.line === line)?.seq;
	return (
		<span className="stv-badge bad">
			{"✗"} chain broken{line === undefined ? "" : ` at line ${String(line)}`}: {verdict.reason}
			{seq !== undefined && (
				<button type="button" onClick={() => { onJump(seq); }}>jump to #{seq}</button>
			)}
		</span>
	);
}
