/**
 * `pnpm report:run runs/run-NNN [--provider <id>] [--model <id>]`: (re)writes
 * the run report `REPORT.md` of an existing run. The computed sections are
 * always written; the model-written ones need a model and its API key and
 * are skipped gracefully without them.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { createProviderRegistry } from "../model/providers.ts";
import { resolveReporterModel } from "../report/model.ts";
import { reportSummary, writeRunReport } from "../report/reporter.ts";
import { UsageError } from "./args.ts";
import { parseRunReportArgs, RUN_REPORT_USAGE } from "./run-report-args.ts";

const envFile = join(process.cwd(), ".env");
// Existing environment variables win; the file only fills gaps.
if (existsSync(envFile)) loadEnvFile(envFile);

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

let args;
try {
	args = parseRunReportArgs(process.argv.slice(2));
} catch (error) {
	if (error instanceof UsageError) fail(`${error.message}\n\n${RUN_REPORT_USAGE}`);
	throw error;
}

const directory = resolve(args.runDirectory);
if (!existsSync(join(directory, "events.jsonl"))) fail(`No events.jsonl in ${directory}`);
const choice = resolveReporterModel(
	{ ...(args.provider === undefined ? {} : { provider: args.provider }), ...(args.model === undefined ? {} : { model: args.model }) },
	process.env,
	createProviderRegistry(),
);
process.stdout.write(choice.ok ? `report: asking ${choice.model.label} ...\n` : `report: model sections skipped: ${choice.reason}\n`);
const report = await writeRunReport(directory, choice);
for (const warning of report.warnings) process.stderr.write(`warning: report ${warning}\n`);
process.stdout.write(`${reportSummary(report)}\n`);
