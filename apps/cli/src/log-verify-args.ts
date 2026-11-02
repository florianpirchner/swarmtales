/** Command-line parsing and output of `swt log verify`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { type ChainVerdict, keyFingerprint } from "@swarmtales/chronicle";
import { UsageError } from "./args.ts";

/** The lines `swt log verify` prints for a verdict; `ownKey` when it was checked against the run's own `run.pub`. */
export function describeVerdict(directory: string, verdict: ChainVerdict, ownKey: boolean): string {
	if (!verdict.ok) return `broken ${directory}: ${verdict.line === undefined ? "" : `events.jsonl line ${String(verdict.line)}: `}${verdict.reason}`;
	const resumed = verdict.genesis.resumedFrom;
	return [
		`ok   ${directory}: ${String(verdict.lines)} lines, head ${verdict.head}`,
		`     key ${keyFingerprint(verdict.genesis.publicKey)}${ownKey ? " (the run's own run.pub: integrity, not authenticity)" : " (the key given)"}`,
		`     story ${verdict.genesis.story} (${verdict.genesis.storyHash.slice(0, 16)}), seed ${String(verdict.genesis.seed)}, commit ${verdict.genesis.commit ?? "unknown"}`,
		...(resumed === undefined
			? []
			: [`     resumed from ${resumed.file}${resumed.run === undefined ? "" : ` of ${resumed.run}`}${resumed.checkpoint === undefined ? " (no checkpoint: not anchored)" : ` after line ${String(resumed.checkpoint.lines)}`}`]),
	].join("\n");
}

export interface LogVerifyArgs {
	readonly runDirectory: string;
	/** A public key (PEM file) to check against instead of the run's own `run.pub`. */
	readonly key?: string;
	/** The run a resumed run continues: its chain must hold and the resumed one must chain from its checkpoint. */
	readonly previous?: string;
}

export const LOG_VERIFY_USAGE = [
	"Usage: swt log verify runs/run-NNN [--key <run.pub>] [--previous runs/run-MMM]",
	"",
	"  Checks the signed event log of a run: every line of events.jsonl against events.chain.jsonl,",
	"  and the signed heads against the run's public key. Prints the first broken line.",
	"",
	"  --key <file>         the public key (PEM) to check against, e.g. a copy published before the run;",
	"                       default: the run's own run.pub (integrity only, see docs/design/event-log-signing.md)",
	"  --previous <dir>     for a resumed run: the run that took the snapshot; checks that the chain continues it",
].join("\n");

export function parseLogVerifyArgs(argv: readonly string[]): LogVerifyArgs {
	let parsed;
	try {
		parsed = parseArgs({
			args: [...argv],
			options: { key: { type: "string" }, previous: { type: "string" } },
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
	return {
		runDirectory,
		...(values.key === undefined ? {} : { key: values.key }),
		...(values.previous === undefined ? {} : { previous: values.previous }),
	};
}
