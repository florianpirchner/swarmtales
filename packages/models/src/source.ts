// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The model source: which model and stream function an actor talks to. Every `Models` object of the provider
 * library is made by {@link closedModels}, so the library never reads the environment or a file for a key: a key
 * comes from the key broker's auth object or not at all.
 */
import type { StreamFn } from "@earendil-works/pi-agent-core";
import { createAssistantMessageEventStream, createModels, type Api, type AssistantMessage, type AuthContext, type Model, type Models, type MutableModels } from "@earendil-works/pi-ai";
import type { ActorId, Redact } from "@swarmtales/contracts";
import { noPrice, thrown } from "./errors.ts";
import type { KeyBroker } from "./keys.ts";
import { modelOf, openRouterProviderPreferences, type ProviderRegistry } from "./providers.ts";
import { limitsFor, PROVIDER_RETRIES, type RequestLimits } from "./request.ts";
import type { ModelSettings } from "./settings.ts";

/**
 * A model and its stream function, opaque to everything outside this package.
 *
 * @public
 */
export interface ModelBinding {
	/** The model of the provider's table. */
	readonly model: Model<Api>;
	/** The stream function the agent loop of the provider library calls. */
	readonly streamFn: StreamFn;
	/** Fixed request fields (for example the OpenRouter routing) that are merged over the provider payload. */
	readonly requestDefaults?: Readonly<Record<string, unknown>>;
}

/**
 * Gives every actor its model.
 *
 * @public
 */
export interface ModelSource {
	/**
	 * The model and the stream function of one actor.
	 *
	 * @param actor - The actor that will ask.
	 * @param limits - The limits of each of its requests.
	 * @returns The binding.
	 * @throws SwtError `SWT-X007` when the price table has no price above zero for the model (a live source only).
	 */
	bind(actor: ActorId, limits: RequestLimits): ModelBinding;
}

// The closed auth context: no variable of the environment is set, and no file exists.
const CLOSED: AuthContext = Object.freeze({ env: () => Promise.resolve(undefined), fileExists: () => Promise.resolve(false) });

/**
 * A `Models` object of the provider library that cannot read the environment: its auth context answers
 * `undefined` for every variable and `false` for every file. Every `Models` object of this package is made here.
 *
 * @returns The empty collection; a provider is added with `setProvider`.
 *
 * @public
 */
export function closedModels(): MutableModels {
	return createModels({ authContext: CLOSED });
}

/**
 * The stream function of a collection, with the request limits and the client retries of the old runner.
 *
 * @param models - The collection that holds the model's provider.
 * @param limits - The limits of each request.
 * @returns The stream function.
 *
 * @public
 */
export function limitedStream(models: Models, limits: RequestLimits): StreamFn {
	return (model, context, options) => models.streamSimple(model, context, { ...options, maxTokens: limits.maxOutputTokens, timeoutMs: limits.timeoutMs, maxRetries: PROVIDER_RETRIES });
}

function redacted(message: AssistantMessage, redact: Redact): AssistantMessage {
	return message.errorMessage === undefined ? message : { ...message, errorMessage: redact(message.errorMessage) };
}

// A provider's stream with secrets taken out of its error text: a failed request's `errorMessage` goes into the log, where an echoed key could not be removed again.
function redactingStream(inner: StreamFn, redact: Redact): StreamFn {
	return async (model, context, options) => {
		const source = await inner(model, context, options);
		const out = createAssistantMessageEventStream();
		void (async () => {
			for await (const event of source) out.push(event.type === "error" ? { ...event, error: redacted(event.error, redact) } : event);
			out.end();
		})();
		return out;
	};
}

/**
 * The source of a live provider. The provider is built once, with the auth object of the key broker; nothing
 * else of the broker but `redact` is kept.
 *
 * @param settings - The provider, the model id (after the alias) and the routing.
 * @param registry - The provider adapters.
 * @param broker - The key broker; this function is the only one it is handed to.
 * @returns The source; its `bind` raises `SWT-X007` for a model without a price.
 * @throws SwtError `SWT-X001` when no key is held, `SWT-X002` for an unknown provider, `SWT-X003` for an unknown model.
 * @example
 * ```ts
 * const source = createModelSource(settings, createProviderRegistry(), broker);
 * const { model, streamFn } = source.bind("resident:r1", { maxOutputTokens: settings.maxOutputTokens, timeoutMs: REQUEST_TIMEOUT_MS });
 * ```
 *
 * @public
 */
export function createModelSource(settings: ModelSettings, registry: ProviderRegistry, broker: KeyBroker): ModelSource {
	const spec = registry.require(settings.provider);
	const provider = spec.create(broker.auth(spec.id));
	const { redact } = broker;
	const model = modelOf(provider, settings.modelId, redact);
	const models = closedModels();
	models.setProvider(provider);
	const requestDefaults = spec.id === "openrouter" && settings.routing !== undefined ? openRouterProviderPreferences(settings.routing) : undefined;
	return Object.freeze({
		bind: (_actor: ActorId, limits: RequestLimits): ModelBinding => {
			// The cost cap counts what the price table says: with a price of zero no cap is ever reached.
			if (!(model.cost.input > 0 && model.cost.output > 0)) throw thrown(noPrice(spec.id, model.id), redact);
			return {
				model,
				streamFn: redactingStream(limitedStream(models, limitsFor(model.maxTokens, limits)), redact),
				...(requestDefaults === undefined ? {} : { requestDefaults }),
			};
		},
	});
}
