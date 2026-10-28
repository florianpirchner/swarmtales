/** `pnpm report:minutes runs/run-001`: rebuilds `minutes.md` from `events.jsonl`. */
import { resolve } from "node:path";
import { writeMinuteReport } from "../log/minute-report.ts";

const directory = process.argv[2];
if (directory === undefined) {
	process.stderr.write("Usage: pnpm report:minutes runs/run-001\n");
	process.exit(1);
}
process.stdout.write(`written: ${writeMinuteReport(resolve(directory))}\n`);
