/**
 * `swt log verify runs/run-NNN [--key <file>] [--previous runs/run-MMM [--previous-key <file>]] [--snapshot <file>]`:
 * checks a run's signed event log (docs/design/event-log-signing.md) and prints the first broken
 * line. Exits 1 when the chain does not hold.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { snapshotStateHash, verifyChain, verifyContinuity } from "@swarmtales/chronicle";
import { UsageError } from "./args.ts";
import { describeVerdict, LOG_VERIFY_USAGE, parseLogVerifyArgs, snapshotIssue } from "./log-verify-args.ts";

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

let args;
try {
	args = parseLogVerifyArgs(process.argv.slice(2));
} catch (error) {
	if (error instanceof UsageError) fail(`${error.message}\n\n${LOG_VERIFY_USAGE}`);
	throw error;
}
const directory = resolve(args.runDirectory);
for (const file of [args.key, args.previousKey, args.snapshot]) if (file !== undefined && !existsSync(file)) fail(`No file ${file}`);
const key = args.key === undefined ? undefined : readFileSync(args.key, "utf8");
const previousKey = args.previousKey === undefined ? undefined : readFileSync(args.previousKey, "utf8");
let verdict = verifyChain(directory, key);
if (verdict.ok && args.previous !== undefined) verdict = verifyContinuity(resolve(args.previous), directory, previousKey === undefined ? {} : { previousKey });
if (verdict.ok && args.snapshot !== undefined) {
	let state: string;
	try {
		state = snapshotStateHash(JSON.parse(readFileSync(args.snapshot, "utf8")));
	} catch (error) {
		fail(`broken ${directory}: the snapshot ${args.snapshot} is not JSON (${error instanceof Error ? error.message : String(error)})`);
	}
	const issue = snapshotIssue(verdict, state);
	if (issue !== undefined) verdict = { ok: false, reason: issue };
}
const text = describeVerdict(directory, verdict, key === undefined, { previous: args.previous !== undefined, previousKey: previousKey !== undefined, snapshot: args.snapshot !== undefined });
if (verdict.ok) process.stdout.write(`${text}\n`);
else fail(text);
