// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm api` and `pnpm api:update` of one package (run in its folder, decision A87, issue M5-74).
 *
 * api-extractor builds the report as before, but into the package's `temp/report/` folder, so it never touches the
 * committed report itself. The report is then brought into normal form (`lib/api-report.ts`: the members of every
 * union of string literals sorted). Without an argument the step fails when the normal form differs from the
 * committed `*.api.md`; with `--update` it writes the normal form there. Errors and warnings of api-extractor fail
 * both steps, except the notices that the temporary report was created or updated.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ConsoleMessageId, Extractor, ExtractorConfig, ExtractorLogLevel, type ExtractorMessage } from "@microsoft/api-extractor";
import { normalizeReport, reportDifference } from "./lib/api-report.ts";

/** The notices about the temporary report, which are expected on every run. */
const REPORT_NOTICES: ReadonlySet<string> = new Set([ConsoleMessageId.ApiReportCopied, ConsoleMessageId.ApiReportCreated]);

/** What one run of the step found. */
export interface ApiReportOutcome {
	/** The exit code: 0 when the step passed. */
	readonly code: number;
	/** What the step says about it. */
	readonly messages: readonly string[];
}

function readOptional(path: string): string | undefined {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return undefined;
	}
}

/** Runs api-extractor into `temp/report/` and returns the built report and the unexpected messages. */
function build(configPath: string): { readonly report: string; readonly committedPath: string; readonly problems: readonly string[] } {
	const loaded = ExtractorConfig.loadFile(configPath);
	const committedFolder = ExtractorConfig.prepare({ configObject: loaded, configObjectFullPath: configPath, packageJsonFullPath: join(configPath, "..", "package.json") }).reportFolder;
	const configObject = { ...loaded, apiReport: { ...loaded.apiReport, enabled: true, reportFolder: "<projectFolder>/temp/report/" } };
	const config = ExtractorConfig.prepare({ configObject, configObjectFullPath: configPath, packageJsonFullPath: join(configPath, "..", "package.json") });
	mkdirSync(config.reportFolder, { recursive: true });
	const problems: string[] = [];
	const result = Extractor.invoke(config, {
		localBuild: true,
		messageCallback: (message: ExtractorMessage) => {
			if (REPORT_NOTICES.has(message.messageId)) {
				message.handled = true;
			} else if (message.logLevel === ExtractorLogLevel.Warning) {
				problems.push(`warning ${message.messageId}: ${message.text}`);
			}
		},
	});
	if (result.errorCount > 0) {
		problems.push(`api-extractor reported ${String(result.errorCount)} error(s)`);
	}
	const fileName = config.reportConfigs[0]?.fileName ?? `${config.packageJson?.name ?? "report"}.api.md`;
	const report = readOptional(join(config.reportFolder, fileName)) ?? "";
	return { report, committedPath: join(committedFolder, fileName), problems };
}

/**
 * Builds the API report of the package whose `api-extractor.json` is given, in normal form, and checks it against
 * the committed report or writes it there.
 *
 * @param configPath - The absolute path of the package's `api-extractor.json`.
 * @param update - `true` writes the report (`api:update`), `false` compares it (`api`).
 * @returns The exit code and the messages of the step.
 */
export function runApiReport(configPath: string, update: boolean): ApiReportOutcome {
	const { report, committedPath, problems } = build(configPath);
	if (problems.length > 0 || report === "") {
		return { code: 1, messages: [...problems, ...(report === "" ? ["no report was built"] : [])] };
	}
	const fresh = normalizeReport(report);
	const committed = readOptional(committedPath);
	if (update) {
		if (committed !== fresh) {
			writeFileSync(committedPath, fresh);
		}
		return { code: 0, messages: [committed === fresh ? `up to date: ${committedPath}` : `written: ${committedPath}`] };
	}
	const difference = reportDifference(fresh, committed);
	if (difference === undefined) {
		return { code: 0, messages: [`up to date: ${committedPath}`] };
	}
	return { code: 1, messages: [`the API changed (${difference}): ${committedPath}. Run \`pnpm api:update\` after \`pnpm build\` and commit the report.`] };
}

if (import.meta.main) {
	const outcome = runApiReport(join(process.cwd(), "api-extractor.json"), process.argv.includes("--update"));
	for (const message of outcome.messages) {
		(outcome.code === 0 ? console.log : console.error)(`api: ${message}`);
	}
	process.exitCode = outcome.code;
}
