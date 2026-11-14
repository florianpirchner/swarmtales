// SPDX-License-Identifier: Apache-2.0
/**
 * The model selection: provider, model id and settings. Free of the provider library, so it is pure. Precedence:
 * command line, then environment, then the game.
 */
import { redactSecrets, type GameData, type ModelChoice } from "@swarmtales/contracts";
import { emptyModel, thrown, unknownProvider } from "./errors.ts";
import type { OpenRouterRouting, ProviderRegistry } from "./providers.ts";

/**
 * How much a model thinks before it answers.
 *
 * @public
 */
export type ThinkingLevel = NonNullable<ModelChoice["thinking"]>;

/**
 * The model of a run, resolved.
 *
 * @public
 */
export interface ModelSettings {
	/** The provider id. */
	readonly provider: string;
	/** The provider's model id, after the alias. */
	readonly modelId: string;
	/** What the game or the command said, before the alias. */
	readonly requestedId: string;
	/** How much the model thinks; `medium` when nothing says. */
	readonly thinking: ThinkingLevel;
	/** The limit of output tokens of one request; 4000 when the game does not say. */
	readonly maxOutputTokens: number;
	/** OpenRouter only: a fixed routing. Nothing sets it at M2. */
	readonly routing?: OpenRouterRouting;
}

/**
 * What the command line says about the model.
 *
 * @public
 */
export interface ModelOverrides {
	/** The provider id. */
	readonly provider?: string;
	/** A model id or an alias of the provider. */
	readonly modelId?: string;
	/** How much the model thinks. */
	readonly thinking?: ThinkingLevel;
}

/**
 * What the environment says about the model.
 *
 * @public
 */
export interface ModelEnv {
	/** The provider id. */
	readonly SWT_PROVIDER?: string;
	/** A model id or an alias of the provider. */
	readonly SWT_MODEL?: string;
}

/**
 * The thinking level and the output limit of a game without them.
 *
 * @public
 */
export const MODEL_DEFAULTS = Object.freeze({ thinking: "medium", maxOutputTokens: 4000 } as const);

interface Named {
	readonly provider?: string;
	readonly model: string;
	readonly thinking?: ThinkingLevel;
	readonly maxOutputTokens?: number;
}

// The game's `<provider>/<model id or alias>`, cut at the first slash: a model id may hold more of them.
function gameModel(game: GameData["model"]): Named {
	if (game === undefined) return { model: "" };
	const { id, ...settings }: ModelChoice = typeof game === "string" ? { id: game } : game;
	const cut = id.indexOf("/");
	return cut < 0 ? { ...settings, provider: id, model: "" } : { ...settings, provider: id.slice(0, cut), model: id.slice(cut + 1) };
}

const first = (...values: readonly (string | undefined)[]): string | undefined => values.find((value) => value !== undefined);

function settingsOf(overrides: ModelOverrides, named: Named): Pick<ModelSettings, "thinking" | "maxOutputTokens"> {
	return { thinking: overrides.thinking ?? named.thinking ?? MODEL_DEFAULTS.thinking, maxOutputTokens: named.maxOutputTokens ?? MODEL_DEFAULTS.maxOutputTokens };
}

/**
 * Resolves the model of a run. The game's model applies only to the game's provider; another provider that the
 * command line or the environment names gets its own default model, so no model id reaches a foreign endpoint.
 *
 * @param overrides - What the command line says.
 * @param env - `SWT_PROVIDER` and `SWT_MODEL`, as a plain record.
 * @param game - The `model` of the game: `<provider>/<model id or alias>`, alone or with settings.
 * @param registry - The provider adapters.
 * @returns The settings, with the alias resolved and the defaults filled.
 * @throws SwtError `SWT-X002` when the provider is not known or nothing names one; `SWT-X004` when the model id is empty.
 * @example
 * ```ts
 * resolveModelSettings({}, {}, "anthropic/haiku", createProviderRegistry()).modelId; // the id behind the alias
 * ```
 *
 * @public
 */
export function resolveModelSettings(overrides: ModelOverrides, env: ModelEnv, game: GameData["model"], registry: ProviderRegistry): ModelSettings {
	const named = gameModel(game);
	const provider = first(overrides.provider, env.SWT_PROVIDER, named.provider) ?? "";
	const spec = registry.get(provider);
	if (spec === undefined) throw thrown(unknownProvider(provider, registry.ids()), redactSecrets);
	// The game's model applies to the game's provider only.
	const requestedId = first(overrides.modelId, env.SWT_MODEL) ?? (named.provider === provider ? named.model : spec.defaultModelId);
	if (requestedId === "") throw thrown(emptyModel(provider), redactSecrets);
	return { provider, modelId: spec.modelAliases?.[requestedId] ?? requestedId, requestedId, ...settingsOf(overrides, named) };
}
