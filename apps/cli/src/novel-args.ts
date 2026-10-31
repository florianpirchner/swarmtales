/** Command-line parsing for `pnpm novel`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { DEFAULT_WORDS, NOVEL_DIRECTORY } from "../novel/novel.ts";
import { LANGUAGES } from "../novel/prompts.ts";
import { UsageError } from "./args.ts";

export interface NovelArgs {
	readonly runDirectory: string;
	readonly provider?: string;
	readonly model?: string;
	readonly outlineProvider?: string;
	readonly outlineModel?: string;
	readonly editorProvider?: string;
	readonly editorModel?: string;
	readonly words: number;
	/** A language code from LANGUAGES. */
	readonly translate?: string;
	/** The folder under the run directory the novel is written to. */
	readonly out: string;
	/** Translate the story already in `out` instead of writing a new one. */
	readonly translateOnly: boolean;
	readonly dryRun: boolean;
}

export const NOVEL_USAGE = [
	"Usage: pnpm novel <run-dir> [--provider <id>] [--model <id>] [--outline-provider <id>] [--outline-model <id>] [--editor-provider <id>] [--editor-model <id>] [--words <n>] [--translate <lang> [--translate-only]] [--out <dir>] [--dry-run]",
	"",
	"  --provider <id>          writer of the prologue and the chapters (default: ARENA_NOVEL_PROVIDER, then openrouter)",
	"  --model <id>             writer model (default: ARENA_NOVEL_MODEL, then deepseek/deepseek-v4.1-flash-1017, thinking low)",
	"  --editor-provider <id>   editor: line edit and translation (default: ARENA_NOVEL_EDITOR_PROVIDER, then anthropic)",
	"  --editor-model <id>      editor model (default: ARENA_NOVEL_EDITOR_MODEL, then claude-sonnet-5-5, thinking low)",
	"  --outline-provider <id>  outline model's provider (default: ARENA_NOVEL_OUTLINE_PROVIDER, then openrouter)",
	"  --outline-model <id>     outline model (default: ARENA_NOVEL_OUTLINE_MODEL, then deepseek/deepseek-v4.1-flash-1017, thinking high)",
	`  --words <n>              length of the story (default ${String(DEFAULT_WORDS)})`,
	`  --translate <lang>       also translate the story with the writer model (${Object.keys(LANGUAGES).join(", ")}), written to story.<lang>.md`,
	"  --translate-only         translate the story.md already in the output folder; nothing else is written",
	`  --out <dir>              folder under the run directory (default ${NOVEL_DIRECTORY}); a rerun overwrites it`,
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
				"editor-provider": { type: "string" },
				"editor-model": { type: "string" },
				words: { type: "string" },
				translate: { type: "string" },
				out: { type: "string" },
				"translate-only": { type: "boolean" },
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
	if (values.translate !== undefined && LANGUAGES[values.translate] === undefined) throw new UsageError(`--translate must be one of ${Object.keys(LANGUAGES).join(", ")}, got "${values.translate}"`);
	const translateOnly = values["translate-only"] === true;
	if (translateOnly && values.translate === undefined) throw new UsageError("--translate-only needs --translate <lang>");
	const out = values.out ?? NOVEL_DIRECTORY;
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(out)) throw new UsageError(`--out must be a plain folder name, got "${out}"`);
	return {
		runDirectory,
		...(values.provider === undefined ? {} : { provider: values.provider }),
		...(values.model === undefined ? {} : { model: values.model }),
		...(values["outline-provider"] === undefined ? {} : { outlineProvider: values["outline-provider"] }),
		...(values["outline-model"] === undefined ? {} : { outlineModel: values["outline-model"] }),
		...(values["editor-provider"] === undefined ? {} : { editorProvider: values["editor-provider"] }),
		...(values["editor-model"] === undefined ? {} : { editorModel: values["editor-model"] }),
		words,
		...(values.translate === undefined ? {} : { translate: values.translate }),
		out,
		translateOnly,
		dryRun: values["dry-run"] === true,
	};
}
