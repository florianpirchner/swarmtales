/**
 * Model selection: provider plus model ID.
 *
 * Free of pi imports so resolution is pure and testable offline. Precedence:
 * CLI overrides > environment (ARENA_*) > story default.
 */
import type { ModelChoice, OpenRouterRouting } from "@swarmtales/contracts";
import type { ProviderRegistry } from "./providers.ts";

export interface ModelSettings {
	readonly provider: string;
	/** Provider model ID; omitted means the provider default. */
	readonly modelId?: string;
	/** OpenRouter only: fixed routing to inference providers. */
	readonly routing?: OpenRouterRouting;
}

export class ModelConfigError extends Error {
	override readonly name = "ModelConfigError";
}

export interface ModelOverrides {
	readonly provider?: string;
	readonly modelId?: string;
}

export interface ModelEnv {
	readonly ARENA_PROVIDER?: string;
	readonly ARENA_MODEL?: string;
}

export function settingsFromStory(model: ModelChoice): ModelSettings {
	return {
		provider: model.provider,
		...(model.id === undefined ? {} : { modelId: model.id }),
		...(model.routing === undefined ? {} : { routing: model.routing }),
	};
}

export function resolveModelSettings(
	overrides: ModelOverrides,
	env: ModelEnv,
	defaults: ModelSettings,
	registry: ProviderRegistry,
): ModelSettings {
	const provider = overrides.provider ?? env.ARENA_PROVIDER ?? defaults.provider;
	if (!registry.has(provider)) {
		throw new ModelConfigError(`Unknown provider "${provider}". Known: ${registry.ids().join(", ")}.`);
	}
	const explicit = overrides.modelId ?? env.ARENA_MODEL;
	if (explicit?.length === 0) throw new ModelConfigError("Empty model ID (ARENA_MODEL / --model).");

	const spec = registry.require(provider);
	// Providers without a model catalog (scripted) ignore model IDs.
	if (spec.defaultModelId.length === 0) return { provider };

	// The default model only applies to the default provider; otherwise an
	// OpenRouter model ID would be sent to a different endpoint.
	const fallback = defaults.provider === provider ? (defaults.modelId ?? spec.defaultModelId) : spec.defaultModelId;
	const requested = explicit ?? fallback;
	const modelId = spec.modelAliases?.[requested] ?? requested;
	const routing = provider === "openrouter" ? defaults.routing : undefined;
	return routing === undefined ? { provider, modelId } : { provider, modelId, routing };
}

export function describeModel(settings: ModelSettings, registry: ProviderRegistry): string {
	const spec = registry.get(settings.provider);
	const label = spec?.label ?? settings.provider;
	const modelId = settings.modelId ?? spec?.defaultModelId ?? "";
	return modelId.length === 0 ? label : `${label} (${modelId})`;
}

/** Missing API key variables for the chosen provider (empty when all are set). */
export function missingApiKeys(
	settings: ModelSettings,
	registry: ProviderRegistry,
	env: Readonly<Partial<Record<string, string>>>,
): readonly string[] {
	const spec = registry.get(settings.provider);
	if (spec === undefined) return [];
	return spec.apiKeyEnv.filter((name) => (env[name] ?? "").length === 0);
}
