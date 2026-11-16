// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The provider adapters and their registry. Every adapter is built with `createProvider` of the provider library
 * and the auth object of the key broker, so no adapter reads the environment and none holds a login.
 */
import { createProvider, type Api, type Model, type Provider } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { ANTHROPIC_MODELS } from "@earendil-works/pi-ai/providers/anthropic.models";
import { OPENROUTER_MODELS } from "@earendil-works/pi-ai/providers/openrouter.models";
import { redactSecrets, type Redact } from "@swarmtales/contracts";
import { thrown, unknownModel, unknownProvider } from "./errors.ts";
import type { KeyAuth } from "./keys.ts";

// The alias table: the one place that holds a provider's model id. A game names `<provider>/<alias>`.
const ANTHROPIC_HAIKU = "claude-haiku-5-5";
const ANTHROPIC_SONNET = "claude-sonnet-5-5";
const OPENROUTER_DEEPSEEK_FLASH = "deepseek/deepseek-v4.1-flash-1017";
const OPENROUTER_GLM_FLASH = "z-ai/glm-5.3-flash";

/**
 * A fixed routing of OpenRouter requests to inference providers.
 *
 * @public
 */
export interface OpenRouterRouting {
	/** The inference providers, in the order they are tried. */
	readonly order?: readonly string[];
	/** Whether OpenRouter may use a provider that is not in `order`. */
	readonly allowFallbacks?: boolean;
}

/**
 * The `provider` object of an OpenRouter request.
 *
 * @param routing - The fixed routing.
 * @returns The request fields to merge over the payload.
 *
 * @internal
 */
export function openRouterProviderPreferences(routing: OpenRouterRouting): Readonly<Record<string, unknown>> {
	const provider: Record<string, unknown> = {};
	if (routing.order !== undefined && routing.order.length > 0) provider.order = [...routing.order];
	if (routing.allowFallbacks !== undefined) provider.allow_fallbacks = routing.allowFallbacks;
	return { provider };
}

/**
 * One provider adapter: its names, its default model, its aliases and how it is built.
 *
 * @public
 */
export interface ProviderSpec {
	/** The provider id, for example `anthropic`. */
	readonly id: string;
	/** The name shown to a person. */
	readonly label: string;
	/** The model id used when neither the command line, the environment nor the game names a model. */
	readonly defaultModelId: string;
	/** Short names to model ids, for example `haiku`. */
	readonly modelAliases?: Readonly<Record<string, string>>;
	/**
	 * Builds the provider with the broker's auth object; called once, when a run starts.
	 *
	 * @param auth - `auth(id)` of the key broker.
	 * @returns The provider of the library; it holds the auth object, never a key.
	 */
	create(auth: KeyAuth): Provider;
}

function anthropicDirect(auth: KeyAuth): Provider {
	return createProvider({
		id: "anthropic",
		name: "Anthropic",
		baseUrl: "https://api.anthropic.com",
		auth: { apiKey: auth },
		models: Object.values(ANTHROPIC_MODELS),
		api: anthropicMessagesApi(),
	});
}

// The library's own `openrouterProvider()` fixes an environment read and a login inside; this one has the chat models only.
function openRouter(auth: KeyAuth): Provider {
	return createProvider({
		id: "openrouter",
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		auth: { apiKey: auth },
		models: Object.values(OPENROUTER_MODELS),
		api: { "anthropic-messages": anthropicMessagesApi(), "openai-completions": openAICompletionsApi() },
	});
}

/**
 * The adapters of the platform: OpenRouter and Anthropic (direct).
 *
 * @internal
 */
export const BUILTIN_PROVIDERS: readonly ProviderSpec[] = Object.freeze([
	Object.freeze({
		id: "openrouter",
		label: "OpenRouter",
		defaultModelId: OPENROUTER_GLM_FLASH,
		modelAliases: Object.freeze({ "deepseek-flash": OPENROUTER_DEEPSEEK_FLASH, "glm-flash": OPENROUTER_GLM_FLASH }),
		create: openRouter,
	}),
	Object.freeze({
		id: "anthropic",
		label: "Anthropic (direct)",
		defaultModelId: ANTHROPIC_HAIKU,
		modelAliases: Object.freeze({ haiku: ANTHROPIC_HAIKU, sonnet: ANTHROPIC_SONNET }),
		create: anthropicDirect,
	}),
]);

/**
 * The provider adapters by id.
 *
 * @public
 */
export interface ProviderRegistry {
	/**
	 * Tells whether a provider exists.
	 *
	 * @param id - The provider id.
	 * @returns True when it exists.
	 */
	has(id: string): boolean;
	/**
	 * One provider, when it exists.
	 *
	 * @param id - The provider id.
	 * @returns The adapter, or `undefined`.
	 */
	get(id: string): ProviderSpec | undefined;
	/**
	 * One provider that must exist.
	 *
	 * @param id - The provider id.
	 * @returns The adapter.
	 * @throws SwtError `SWT-X002` when no provider has the id; it lists the ids that exist.
	 */
	require(id: string): ProviderSpec;
	/**
	 * The ids of every provider.
	 *
	 * @returns The ids, in the order the providers were given.
	 */
	ids(): readonly string[];
}

/**
 * The registry of the built-in adapters and the given ones. A given adapter replaces a built-in one of its id.
 *
 * @param extra - More adapters.
 * @returns The frozen registry.
 * @throws SwtError `SWT-X002` when an adapter has an empty id.
 *
 * @public
 */
export function createProviderRegistry(extra: readonly ProviderSpec[] = []): ProviderRegistry {
	const specs = new Map<string, ProviderSpec>();
	const ids = (): readonly string[] => [...specs.keys()];
	for (const spec of [...BUILTIN_PROVIDERS, ...extra]) {
		if (spec.id === "") throw thrown(unknownProvider(spec.id, ids()), redactSecrets);
		specs.set(spec.id, spec);
	}
	return Object.freeze({
		has: (id: string): boolean => specs.has(id),
		get: (id: string): ProviderSpec | undefined => specs.get(id),
		require: (id: string): ProviderSpec => {
			const spec = specs.get(id);
			if (spec === undefined) throw thrown(unknownProvider(id, ids()), redactSecrets);
			return spec;
		},
		ids,
	});
}

/**
 * The model of a provider's table that a request is sent to.
 *
 * @param provider - The provider, as an adapter built it.
 * @param modelId - The model id, after the alias.
 * @param redact - The function the error text goes through; left out: `redactSecrets`.
 * @returns The model of the table, with its limits and prices.
 * @throws SwtError `SWT-X003` when the table has no such model; it lists at most 12 ids.
 *
 * @internal
 */
export function modelOf(provider: Provider, modelId: string, redact: Redact = redactSecrets): Model<Api> {
	const models = provider.getModels();
	const model = models.find((entry) => entry.id === modelId);
	if (model === undefined) {
		throw thrown(
			unknownModel(
				provider.id,
				modelId,
				models.map((entry) => entry.id),
			),
			redact,
		);
	}
	return model;
}
