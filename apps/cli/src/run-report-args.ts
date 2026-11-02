/** Command-line parsing for `pnpm report:run`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { UsageError } from "./args.ts";

export interface RunReportArgs {
	readonly runDirectory: string;
	readonly provider?: string;
	readonly model?: string;
}

export const RUN_REPORT_USAGE = [
	"Usage: pnpm report:run runs/run-NNN [--provider <id>] [--model <id>]",
	"",
	"  (Re)writes runs/run-NNN/REPORT.md: computed facts plus model-written highlights, problems,",
	"  optimizations and loophole candidates (skipped without a model or API key).",
	"",
	"  --provider <id>      reporter provider (default: ARENA_REPORTER_PROVIDER, then openrouter)",
	"  --model <id>         reporter model (default: ARENA_REPORTER_MODEL, then deepseek/deepseek-v4.1-flash-1017)",
].join("\n");

export function parseRunReportArgs(argv: readonly string[]): RunReportArgs {
	let parsed;
	try {
		parsed = parseArgs({
			args: [...argv],
			options: { provider: { type: "string" }, model: { type: "string" } },
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
		...(values.provider === undefined ? {} : { provider: values.provider }),
		...(values.model === undefined ? {} : { model: values.model }),
	};
}
