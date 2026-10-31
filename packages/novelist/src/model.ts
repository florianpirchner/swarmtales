/**
 * The novelist's three models: the outliner (default DeepSeek V4.1 Flash via
 * OpenRouter, thinking high, like the chronicle), the writer of the draft
 * (default DeepSeek V4.1 Flash, thinking low) and the editor who line-edits
 * and translates it (default Claude Sonnet via Anthropic, thinking low): a
 * cheap draft, a strong final hand (Flo, after comparing both as writers).
 * Without a usable model or API key the novel is skipped with a reason, never
 * failed.
 *
 * Precedence: CLI > environment (`ARENA_NOVEL_OUTLINE_PROVIDER`/`_MODEL`,
 * `ARENA_NOVEL_PROVIDER`/`_MODEL`, `ARENA_NOVEL_EDITOR_PROVIDER`/`_MODEL`) > default.
 */
import type { Api, Model, Models, ThinkingLevel } from "@earendil-works/pi-ai";
import { bindPiModel, type ReporterSpend } from "@swarmtales/chronicle";
import {
	ANTHROPIC_SONNET,
	ModelConfigError,
	type ModelSettings,
	OPENROUTER_DEEPSEEK_FLASH,
	type ProviderRegistry,
	resolveModelSettings,
} from "@swarmtales/models";

/** Tokens and USD of one or more requests. */
export type NovelSpend = ReporterSpend;

export const NO_SPEND: NovelSpend = { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 };

export function addSpend(a: NovelSpend, b: NovelSpend): NovelSpend {
	return {
		requests: a.requests + b.requests,
		input: a.input + b.input,
		output: a.output + b.output,
		cacheRead: a.cacheRead + b.cacheRead,
		cacheWrite: a.cacheWrite + b.cacheWrite,
		costUsd: a.costUsd + b.costUsd,
	};
}

export interface NovelAnswer {
	readonly text: string;
	readonly spend: NovelSpend;
}

/** A model that answers one prompt with text and says what it cost. */
export interface NovelModel {
	readonly label: string;
	/** The provider's ID, e.g. "anthropic" (P55: Anthropic will not retell another model's reasoning). */
	readonly provider?: string;
	complete(systemPrompt: string, prompt: string, maxTokens: number): Promise<NovelAnswer>;
}

/** The model request failed; what it cost so far is kept. */
export class NovelRequestError extends Error {
	override readonly name = "NovelRequestError";

	constructor(
		message: string,
		readonly spend: NovelSpend,
	) {
		super(message);
	}
}

export interface NovelRequestOptions {
	readonly timeoutMs: number;
	/** Absent: no level is sent, which is not "off" on every model (see WRITER_REQUEST). Thinking counts against `maxTokens` (P52). */
	readonly reasoning?: ThinkingLevel;
}

export const OUTLINE_REQUEST: NovelRequestOptions = { timeoutMs: 900_000, reasoning: "high" };
/**
 * Thinking low: Claude Sonnet 5.5 cannot turn thinking off (its "off" level
 * is not offered), and without a level pi-ai sends adaptive thinking at
 * effort high, which would eat the output caps below (P52).
 */
export const WRITER_REQUEST: NovelRequestOptions = { timeoutMs: 900_000, reasoning: "low" };

/**
 * Output caps per call, with room for the writer's (low) thinking. The
 * outline leaves room for high thinking; a chapter of ~1,000-2,000 words is
 * ~3k tokens, the edit pass returns the whole story.
 */
export const MAX_TOKENS = { outline: 64_000, chapter: 24_000, edit: 64_000 } as const;

/** Any pi-ai model, e.g. a real provider or the faux provider in tests. */
export class PiNovelModel implements NovelModel {
	readonly label: string;
	readonly provider: string;
	readonly #models: Models;
	readonly #model: Model<Api>;
	readonly #options: NovelRequestOptions;

	constructor(models: Models, model: Model<Api>, label: string, options: NovelRequestOptions) {
		this.#models = models;
		this.#model = model;
		this.label = label;
		this.provider = model.provider;
		this.#options = options;
	}

	async complete(systemPrompt: string, prompt: string, maxTokens: number): Promise<NovelAnswer> {
		const message = await this.#models.completeSimple(
			this.#model,
			{ systemPrompt, messages: [{ role: "user", content: prompt, timestamp: 0 }] },
			{
				maxTokens,
				timeoutMs: this.#options.timeoutMs,
				...(this.#options.reasoning === undefined ? {} : { reasoning: this.#options.reasoning }),
			},
		);
		const spend: NovelSpend = {
			requests: 1,
			input: message.usage.input,
			output: message.usage.output,
			cacheRead: message.usage.cacheRead,
			cacheWrite: message.usage.cacheWrite,
			costUsd: message.usage.cost.total,
		};
		if (message.stopReason === "error" || message.stopReason === "aborted") {
			throw new NovelRequestError(`the model request failed: ${message.errorMessage ?? message.stopReason}`, spend);
		}
		if (message.stopReason === "length") {
			throw new NovelRequestError(`the answer hit the output cap of ${String(maxTokens)} tokens`, spend);
		}
		return { text: message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""), spend };
	}
}

export const DEFAULT_OUTLINE_MODEL: ModelSettings = { provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH };
export const DEFAULT_WRITER_MODEL: ModelSettings = { provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH };
export const DEFAULT_EDITOR_MODEL: ModelSettings = { provider: "anthropic", modelId: ANTHROPIC_SONNET };

export interface NovelModelSelection {
	readonly provider?: string;
	readonly model?: string;
}

export type NovelModelChoice = { readonly ok: true; readonly model: NovelModel } | { readonly ok: false; readonly reason: string };

export type NovelEnv = Readonly<Partial<Record<string, string>>>;

export function resolveOutlineModel(selection: NovelModelSelection, env: NovelEnv, registry: ProviderRegistry): NovelModelChoice {
	return resolve(selection, env.ARENA_NOVEL_OUTLINE_PROVIDER, env.ARENA_NOVEL_OUTLINE_MODEL, DEFAULT_OUTLINE_MODEL, OUTLINE_REQUEST, env, registry);
}

export function resolveWriterModel(selection: NovelModelSelection, env: NovelEnv, registry: ProviderRegistry): NovelModelChoice {
	return resolve(selection, env.ARENA_NOVEL_PROVIDER, env.ARENA_NOVEL_MODEL, DEFAULT_WRITER_MODEL, WRITER_REQUEST, env, registry);
}

export function resolveEditorModel(selection: NovelModelSelection, env: NovelEnv, registry: ProviderRegistry): NovelModelChoice {
	return resolve(selection, env.ARENA_NOVEL_EDITOR_PROVIDER, env.ARENA_NOVEL_EDITOR_MODEL, DEFAULT_EDITOR_MODEL, WRITER_REQUEST, env, registry);
}

function resolve(
	selection: NovelModelSelection,
	envProvider: string | undefined,
	envModel: string | undefined,
	defaults: ModelSettings,
	request: NovelRequestOptions,
	env: NovelEnv,
	registry: ProviderRegistry,
): NovelModelChoice {
	const provider = nonEmpty(envProvider);
	const model = nonEmpty(envModel);
	let settings;
	try {
		settings = resolveModelSettings(
			{
				...(selection.provider === undefined ? {} : { provider: selection.provider }),
				...(selection.model === undefined ? {} : { modelId: selection.model }),
			},
			{ ...(provider === undefined ? {} : { ARENA_PROVIDER: provider }), ...(model === undefined ? {} : { ARENA_MODEL: model }) },
			defaults,
			registry,
		);
	} catch (error) {
		if (error instanceof ModelConfigError) return { ok: false, reason: error.message };
		throw error;
	}
	const bound = bindPiModel(settings, registry, env);
	return bound.ok ? { ok: true, model: new PiNovelModel(bound.models, bound.model, bound.label, request) } : bound;
}

function nonEmpty(value: string | undefined): string | undefined {
	return value === undefined || value.length === 0 ? undefined : value;
}
