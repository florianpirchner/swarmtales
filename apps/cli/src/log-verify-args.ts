/** Command-line parsing and output of `swt log verify`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { type ChainVerdict, keyFingerprint } from "@swarmtales/chronicle";
import { UsageError } from "./args.ts";

/** What the call checked beyond the chain itself. */
export interface VerifyChecks {
	/** `--previous`: the continuation of the previous run. */
	readonly previous?: boolean;
	/** `--previous-key`: the previous run against a key given. */
	readonly previousKey?: boolean;
	/** `--snapshot`: the snapshot file is the state the checkpoint signed. */
	readonly snapshot?: boolean;
}

function resumedLine(verdict: Extract<ChainVerdict, { ok: true }>, checks: VerifyChecks): string | undefined {
	const resumed = verdict.genesis.resumedFrom;
	if (resumed === undefined) return undefined;
	const from = `     resumed from ${resumed.file}${resumed.run === undefined ? "" : ` of ${resumed.run}`}`;
	const anchor = resumed.checkpoint;
	if (anchor === undefined) return `${from} (no checkpoint: not anchored)`;
	// Without --previous the checkpoint was checked only against the key it names itself (step 18 challenge, chain-security M2).
	const continuation = checks.previous === true ? (checks.previousKey === true ? " (continuation checked, previous run against the key given)" : " (continuation checked)") : " (continuation not checked: pass --previous <run>)";
	const state = anchor.state === undefined ? "" : `, snapshot state ${anchor.state.slice(0, 16)}${checks.snapshot === true ? " (the file given)" : ""}`;
	return `${from} after line ${String(anchor.lines)}${state}${continuation}`;
}

/** The lines `swt log verify` prints for a verdict; `ownKey` when it was checked against the run's own `run.pub`. */
export function describeVerdict(directory: string, verdict: ChainVerdict, ownKey: boolean, checks: VerifyChecks = {}): string {
	if (!verdict.ok) return `broken ${directory}: ${verdict.line === undefined ? "" : `events.jsonl line ${String(verdict.line)}: `}${verdict.reason}`;
	const resumed = resumedLine(verdict, checks);
	const genesis = verdict.genesis;
	return [
		`ok   ${directory}: ${String(verdict.lines)} lines, head ${verdict.head}`,
		`     key ${keyFingerprint(genesis.publicKey)}${ownKey ? " (the run's own run.pub: integrity, not authenticity)" : " (the key given)"}`,
		`     ${genesis.run === undefined ? "" : `run ${genesis.run}, `}story ${genesis.story} (${genesis.storyHash.slice(0, 16)}), seed ${String(genesis.seed)}, commit ${genesis.commit ?? "unknown"}`,
		// Plain verify cannot see a checkpoint head deleted from the chain; a later --previous does (chain-security m1).
		`     ${String(verdict.heads.length)} signed head(s) over line(s) ${verdict.heads.map((head) => String(head.lines)).join(", ")}`,
		...(genesis.preregistration === undefined ? [] : [`     pre-registration ${genesis.preregistration.slice(0, 16)}`]),
		...(resumed === undefined ? [] : [resumed]),
	].join("\n");
}

export interface LogVerifyArgs {
	readonly runDirectory: string;
	/** A public key (PEM file) to check against instead of the run's own `run.pub`. */
	readonly key?: string;
	/** The run a resumed run continues: its chain must hold and the resumed one must chain from its checkpoint. */
	readonly previous?: string;
	/** The previous run's public key (PEM file), instead of its own `run.pub`. */
	readonly previousKey?: string;
	/** The snapshot file the run resumed from: it must be the state the checkpoint signed. */
	readonly snapshot?: string;
}

export const LOG_VERIFY_USAGE = [
	"Usage: swt log verify runs/run-NNN [--key <run.pub>] [--previous runs/run-MMM [--previous-key <run.pub>]] [--snapshot <file>]",
	"",
	"  Checks the signed event log of a run: every line of events.jsonl against events.chain.jsonl,",
	"  and the signed heads against the run's public key. Prints the first broken line.",
	"",
	"  --key <file>           the public key (PEM) to check against, e.g. a copy published before the run;",
	"                         default: the run's own run.pub (integrity only, see docs/design/event-log-signing.md)",
	"  --previous <dir>       for a resumed run: the run that took the snapshot; checks that the chain continues it",
	"  --previous-key <file>  the previous run's public key (PEM), e.g. its published copy; default: its run.pub",
	"  --snapshot <file>      for a resumed run: the snapshot file; checks it is the state its checkpoint signed",
].join("\n");

export function parseLogVerifyArgs(argv: readonly string[]): LogVerifyArgs {
	let parsed;
	try {
		parsed = parseArgs({
			args: [...argv],
			options: { key: { type: "string" }, previous: { type: "string" }, "previous-key": { type: "string" }, snapshot: { type: "string" } },
			allowPositionals: true,
			strict: true,
		});
	} catch (error) {
		throw new UsageError(error instanceof Error ? error.message : String(error));
	}
	const [runDirectory, ...rest] = parsed.positionals;
	if (runDirectory === undefined) throw new UsageError("Missing run directory");
	if (rest.length > 0) throw new UsageError(`Unexpected arguments: ${rest.join(" ")}`);
	const { values } = parsed;
	if (values["previous-key"] !== undefined && values.previous === undefined) throw new UsageError("--previous-key needs --previous <run>");
	return {
		runDirectory,
		...(values.key === undefined ? {} : { key: values.key }),
		...(values.previous === undefined ? {} : { previous: values.previous }),
		...(values["previous-key"] === undefined ? {} : { previousKey: values["previous-key"] }),
		...(values.snapshot === undefined ? {} : { snapshot: values.snapshot }),
	};
}

/** Why a snapshot file (its `snapshotStateHash`) is not the state a resumed run's checkpoint signed; `undefined` when it is. */
export function snapshotIssue(verdict: Extract<ChainVerdict, { ok: true }>, stateOfFile: string): string | undefined {
	const anchor = verdict.genesis.resumedFrom?.checkpoint;
	if (anchor === undefined) return "the run does not chain from a snapshot checkpoint";
	if (anchor.state === undefined) return "the checkpoint the run resumed from names no snapshot state (written before checkpoints signed it)";
	return anchor.state === stateOfFile ? undefined : "the snapshot file is not the state the checkpoint signed (it was edited, or it is another snapshot)";
}
