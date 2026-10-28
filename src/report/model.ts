/**
 * Binds the run reporter to a pi-ai model. Without a usable model or API key
 * the reporter is skipped with a reason, never failed.
 *
 * Precedence: CLI (`--reporter-provider`, `--reporter-model` for `pnpm start`;
 * `--provider`, `--model` for `pnpm report:run`) > environment
 * (`ARENA_REPORTER_PROVIDER`, `ARENA_REPORTER_MODEL`) > DeepSeek V4.1 Flash
 * via OpenRouter.
 */
import type { Api, Model, Models } from "@earendil-works/pi-ai";
import { bindPiModel } from "../digest/narrative-model.ts";
import { OPENROUTER_DEEPSEEK_FLASH, type ProviderRegistry } from "../model/providers.ts";
import { ModelConfigError, resolveModelSettings, type ModelSettings } from "../model/settings.ts";
import type { ReporterSpend } from "./render.ts";

export const DEFAULT_REPORTER_MODEL: ModelSettings = { provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH };

export interface ReporterAnswer {
	readonly text: string;
	readonly spend: ReporterSpend;
}

/** A model that answers one prompt with text and says what it cost. */
export interface ReporterModel {
	readonly label: string;
	complete(systemPrompt: string, prompt: string): Promise<ReporterAnswer>;
}

export interface ReporterRequestOptions {
	readonly maxTokens: number;
	readonly timeoutMs: number;
}

export const DEFAULT_REPORTER_REQUEST: ReporterRequestOptions = { maxTokens: 8_000, timeoutMs: 300_000 };

/** The model request failed; what it cost so far is kept. */
export class ReporterRequestError extends Error {
	override readonly name = "ReporterRequestError";

	constructor(
		message: string,
		readonly spend: ReporterSpend,
	) {
		super(message);
	}
}

/** Any pi-ai model, e.g. a real provider or the faux provider in tests. */
export class PiReporterModel implements ReporterModel {
	readonly label: string;
	readonly #models: Models;
	readonly #model: Model<Api>;
	readonly #options: ReporterRequestOptions;

	constructor(models: Models, model: Model<Api>, label: string, options: ReporterRequestOptions = DEFAULT_REPORTER_REQUEST) {
		this.#models = models;
		this.#model = model;
		this.label = label;
		this.#options = options;
	}

	async complete(systemPrompt: string, prompt: string): Promise<ReporterAnswer> {
		const message = await this.#models.completeSimple(
			this.#model,
			{ systemPrompt, messages: [{ role: "user", content: prompt, timestamp: 0 }] },
			{ maxTokens: this.#options.maxTokens, timeoutMs: this.#options.timeoutMs },
		);
		const spend: ReporterSpend = {
			requests: 1,
			input: message.usage.input,
			output: message.usage.output,
			cacheRead: message.usage.cacheRead,
			cacheWrite: message.usage.cacheWrite,
			costUsd: message.usage.cost.total,
		};
		if (message.stopReason === "error" || message.stopReason === "aborted") {
			throw new ReporterRequestError(`the model request failed: ${message.errorMessage ?? message.stopReason}`, spend);
		}
		return { text: message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""), spend };
	}
}

export interface ReporterSelection {
	readonly provider?: string;
	readonly model?: string;
}

export interface ReporterEnv {
	readonly ARENA_REPORTER_PROVIDER?: string;
	readonly ARENA_REPORTER_MODEL?: string;
	readonly [key: string]: string | undefined;
}

export type ReporterChoice = { readonly ok: true; readonly model: ReporterModel } | { readonly ok: false; readonly reason: string };

/** The configured reporter model, or why the model-written sections have to be skipped. */
export function resolveReporterModel(
	selection: ReporterSelection,
	env: ReporterEnv,
	registry: ProviderRegistry,
	request: ReporterRequestOptions = DEFAULT_REPORTER_REQUEST,
): ReporterChoice {
	const envProvider = nonEmpty(env.ARENA_REPORTER_PROVIDER);
	const envModel = nonEmpty(env.ARENA_REPORTER_MODEL);
	let settings;
	try {
		settings = resolveModelSettings(
			{
				...(selection.provider === undefined ? {} : { provider: selection.provider }),
				...(selection.model === undefined ? {} : { modelId: selection.model }),
			},
			{ ...(envProvider === undefined ? {} : { ARENA_PROVIDER: envProvider }), ...(envModel === undefined ? {} : { ARENA_MODEL: envModel }) },
			DEFAULT_REPORTER_MODEL,
			registry,
		);
	} catch (error) {
		if (error instanceof ModelConfigError) return { ok: false, reason: error.message };
		throw error;
	}
	const bound = bindPiModel(settings, registry, env);
	return bound.ok ? { ok: true, model: new PiReporterModel(bound.models, bound.model, bound.label, request) } : bound;
}

function nonEmpty(value: string | undefined): string | undefined {
	return value === undefined || value.length === 0 ? undefined : value;
}
