import type { RunModel } from "@swarmtales/viewer-core";
import type { VerificationState } from "../use-run.ts";

interface Props {
	readonly verification: VerificationState;
	readonly model: RunModel;
	readonly onJump: (seq: number) => void;
}

/**
 * The chain verdict: green valid (N lines, the key it was checked with and its fingerprint), red with
 * the first broken line (and a jump to its seq), grey unsigned, unreadable or not checkable.
 */
export function ChainBadge({ verification, model, onJump }: Props) {
	if (verification.status === "checking") return <span className="stv-badge wait">checking the chain…</span>;
	if (verification.status === "failed") return <span className="stv-badge none" title={verification.message}>could not check the chain: {verification.message}</span>;
	const result = verification.verification;
	if (!result.signed) {
		if (result.unreadable !== undefined) return <span className="stv-badge none" title={result.unreadable}>chain not checked: {result.unreadable}</span>;
		return <span className="stv-badge none" title="No events.chain.jsonl in this run folder">unsigned</span>;
	}
	const { verdict } = result;
	if (verdict.ok) {
		const signer = result.checkedWith === "run.pub" ? "run.pub" : "the given key";
		const key = result.key === undefined ? "" : ` (key fingerprint ${result.key})`;
		return <span className="stv-badge ok" title={`head ${verdict.head}`}>{"✓"} chain valid, {verdict.lines.toLocaleString("en-US")} lines, signed by {signer}{key}</span>;
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
