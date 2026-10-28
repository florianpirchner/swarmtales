/** Command-line parsing for `pnpm digest`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { UsageError } from "./args.ts";

export interface DigestArgs {
	readonly runDirectory: string;
	readonly chronicle: boolean;
	readonly provider?: string;
	readonly model?: string;
}

export const DIGEST_USAGE = [
	"Usage: pnpm digest runs/run-NNN [--chronicle] [--provider <id>] [--model <id>]",
	"",
	"  --chronicle          also write digest/chronicle.md with a model (skipped without a model or API key)",
	"  --provider <id>      provider of the chronicle model (default: ARENA_DIGEST_PROVIDER, then the run's story model)",
	"  --model <id>         model of the chronicle (default: ARENA_DIGEST_MODEL, then the run's story model)",
].join("\n");

export function parseDigestArgs(argv: readonly string[]): DigestArgs {
	let parsed;
	try {
		parsed = parseArgs({
			args: [...argv],
			options: {
				chronicle: { type: "boolean" },
				provider: { type: "string" },
				model: { type: "string" },
			},
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
		chronicle: values.chronicle === true,
		...(values.provider === undefined ? {} : { provider: values.provider }),
		...(values.model === undefined ? {} : { model: values.model }),
	};
}
