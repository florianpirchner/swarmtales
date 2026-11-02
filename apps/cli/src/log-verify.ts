/**
 * `swt log verify runs/run-NNN [--key <file>] [--previous runs/run-MMM]`: checks a run's signed
 * event log (docs/design/event-log-signing.md) and prints the first broken line. Exits 1 when the
 * chain does not hold.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyChain, verifyContinuity } from "@swarmtales/chronicle";
import { UsageError } from "./args.ts";
import { describeVerdict, LOG_VERIFY_USAGE, parseLogVerifyArgs } from "./log-verify-args.ts";

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
if (args.key !== undefined && !existsSync(args.key)) fail(`No key file ${args.key}`);
const key = args.key === undefined ? undefined : readFileSync(args.key, "utf8");
let verdict = verifyChain(directory, key);
if (verdict.ok && args.previous !== undefined) verdict = verifyContinuity(resolve(args.previous), directory);
const text = describeVerdict(directory, verdict, key === undefined);
if (verdict.ok) process.stdout.write(`${text}\n`);
else fail(text);
