/** Command-line parsing for `pnpm novel`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { DEFAULT_WORDS } from "../novel/novel.ts";
import { UsageError } from "./args.ts";

export interface NovelArgs {
	readonly runDirectory: string;
	readonly provider?: string;
	readonly model?: string;
	readonly outlineProvider?: string;
	readonly outlineModel?: string;
	readonly words: number;
	readonly dryRun: boolean;
}

export const NOVEL_USAGE = [
	"Usage: pnpm novel <run-dir> [--provider <id>] [--model <id>] [--outline-provider <id>] [--outline-model <id>] [--words <n>] [--dry-run]",
	"",
	"  --provider <id>          writer of chapters, interludes and the edit pass (default: ARENA_NOVEL_PROVIDER, then anthropic)",
	"  --model <id>             writer model (default: ARENA_NOVEL_MODEL, then claude-sonnet-5-5, thinking low)",
	"  --outline-provider <id>  outline model's provider (default: ARENA_NOVEL_OUTLINE_PROVIDER, then openrouter)",
	"  --outline-model <id>     outline model (default: ARENA_NOVEL_OUTLINE_MODEL, then deepseek/deepseek-v4.1-flash-1017, thinking high)",
	`  --words <n>              length of the story (default ${String(DEFAULT_WORDS)})`,
	"  --dry-run                cast the book and print the outline prompt's size; no model is called and nothing is written",
].join("\n");

export function parseNovelArgs(argv: readonly string[]): NovelArgs {
	let parsed;
	try {
		parsed = parseArgs({
			args: [...argv],
			options: {
				provider: { type: "string" },
				model: { type: "string" },
				"outline-provider": { type: "string" },
				"outline-model": { type: "string" },
				words: { type: "string" },
				"dry-run": { type: "boolean" },
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
	let words = DEFAULT_WORDS;
	if (values.words !== undefined) {
		words = Number(values.words);
		if (!Number.isInteger(words) || words < 500 || words > 50_000) throw new UsageError(`--words must be a whole number from 500 to 50000, got "${values.words}"`);
	}
	return {
		runDirectory,
		...(values.provider === undefined ? {} : { provider: values.provider }),
		...(values.model === undefined ? {} : { model: values.model }),
		...(values["outline-provider"] === undefined ? {} : { outlineProvider: values["outline-provider"] }),
		...(values["outline-model"] === undefined ? {} : { outlineModel: values["outline-model"] }),
		words,
		dryRun: values["dry-run"] === true,
	};
}
