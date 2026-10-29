/**
 * Binds the narrative layer to a pi-ai model. The chronicle needs a model
 * and its API key; without either it is skipped with a reason, never failed.
 *
 * Precedence: CLI (`--provider`, `--model`) > environment
 * (`ARENA_DIGEST_PROVIDER`, `ARENA_DIGEST_MODEL`) > DeepSeek V4.1 Flash via
 * OpenRouter, thinking high.
 */
import { createModels, type Api, type Model, type Models, type ThinkingLevel } from "@earendil-works/pi-ai";
import { OPENROUTER_DEEPSEEK_FLASH, SCRIPTED_PROVIDER_ID, type ProviderRegistry } from "../model/providers.ts";
import { describeModel, missingApiKeys, ModelConfigError, resolveModelSettings, type ModelSettings } from "../model/settings.ts";
import type { NarrativeModel } from "./chronicle.ts";

export interface NarrativeRequestOptions {
	/** Thinking counts against it, so it must leave room for the answer (P52). */
	readonly maxTokens: number;
	readonly timeoutMs: number;
	readonly reasoning: ThinkingLevel;
}

export const DEFAULT_NARRATIVE_REQUEST: NarrativeRequestOptions = { maxTokens: 64_000, timeoutMs: 900_000, reasoning: "high" };

export const DEFAULT_NARRATIVE_MODEL: ModelSettings = { provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH };

/** Any pi-ai model, e.g. a real provider or the faux provider in tests. */
export class PiNarrativeModel implements NarrativeModel {
	readonly label: string;
	readonly #models: Models;
	readonly #model: Model<Api>;
	readonly #options: NarrativeRequestOptions;

	constructor(models: Models, model: Model<Api>, label: string, options: NarrativeRequestOptions = DEFAULT_NARRATIVE_REQUEST) {
		this.#models = models;
		this.#model = model;
		this.label = label;
		this.#options = options;
	}

	async complete(systemPrompt: string, prompt: string): Promise<string> {
		const message = await this.#models.completeSimple(
			this.#model,
			{ systemPrompt, messages: [{ role: "user", content: prompt, timestamp: 0 }] },
			{ maxTokens: this.#options.maxTokens, timeoutMs: this.#options.timeoutMs, reasoning: this.#options.reasoning },
		);
		if (message.stopReason === "error" || message.stopReason === "aborted") {
			throw new Error(`The model request failed: ${message.errorMessage ?? message.stopReason}`);
		}
		return message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
	}
}

export interface NarrativeSelection {
	readonly provider?: string;
	readonly model?: string;
}

export interface NarrativeEnv {
	readonly ARENA_DIGEST_PROVIDER?: string;
	readonly ARENA_DIGEST_MODEL?: string;
	readonly [key: string]: string | undefined;
}

export type NarrativeModelChoice = { readonly ok: true; readonly model: NarrativeModel } | { readonly ok: false; readonly reason: string };

/** The configured narrative model, or why the chronicle has to be skipped. */
export function resolveNarrativeModel(selection: NarrativeSelection, env: NarrativeEnv, registry: ProviderRegistry): NarrativeModelChoice {
	const envProvider = nonEmpty(env.ARENA_DIGEST_PROVIDER);
	const envModel = nonEmpty(env.ARENA_DIGEST_MODEL);
	let settings;
	try {
		settings = resolveModelSettings(
			{
				...(selection.provider === undefined ? {} : { provider: selection.provider }),
				...(selection.model === undefined ? {} : { modelId: selection.model }),
			},
			{ ...(envProvider === undefined ? {} : { ARENA_PROVIDER: envProvider }), ...(envModel === undefined ? {} : { ARENA_MODEL: envModel }) },
			DEFAULT_NARRATIVE_MODEL,
			registry,
		);
	} catch (error) {
		if (error instanceof ModelConfigError) return { ok: false, reason: error.message };
		throw error;
	}
	const bound = bindPiModel(settings, registry, env);
	return bound.ok ? { ok: true, model: new PiNarrativeModel(bound.models, bound.model, bound.label) } : bound;
}

/** A pi-ai model ready to call, or why it cannot be used. */
export type BoundPiModel =
	| { readonly ok: true; readonly models: Models; readonly model: Model<Api>; readonly label: string }
	| { readonly ok: false; readonly reason: string };

/**
 * Binds resolved settings to pi-ai: refuses the offline `scripted` provider,
 * a missing API key and an unknown model with a reason instead of an error.
 * Shared by the chronicle and the run reporter.
 */
export function bindPiModel(settings: ModelSettings, registry: ProviderRegistry, env: Readonly<Partial<Record<string, string>>>): BoundPiModel {
	if (settings.provider === SCRIPTED_PROVIDER_ID) {
		return { ok: false, reason: 'the configured provider is "scripted" (offline); pass --provider to choose a model' };
	}
	const missing = missingApiKeys(settings, registry, env);
	if (missing.length > 0) return { ok: false, reason: `missing API key ${missing.join(", ")} for provider "${settings.provider}"` };

	const spec = registry.require(settings.provider);
	const models = createModels();
	models.setProvider(spec.create());
	const modelId = settings.modelId ?? spec.defaultModelId;
	const model = models.getModel(spec.id, modelId);
	if (model === undefined) return { ok: false, reason: `model "${modelId}" does not exist at provider "${spec.id}"` };
	return { ok: true, models, model, label: describeModel(settings, registry) };
}

function nonEmpty(value: string | undefined): string | undefined {
	return value === undefined || value.length === 0 ? undefined : value;
}
