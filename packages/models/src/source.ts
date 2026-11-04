/**
 * Model sources: which model and stream function each competitor talks to.
 */
import type { StreamFn } from "@earendil-works/pi-agent-core";
import { type AssistantMessage, createAssistantMessageEventStream, createModels, fauxProvider, type Api, type Model, type Models, type FauxResponseStep } from "@earendil-works/pi-ai";
import { type CompetitorId, redactSecrets } from "@swarmtales/kernel";
import { toolChoiceDefaults, type ToolChoice } from "./request-defaults.ts";
import { ModelConfigError, type ModelSettings } from "./settings.ts";
import {
	openRouterProviderPreferences,
	SCRIPTED_PROVIDER_ID,
	type ProviderRegistry,
	type ProviderSpec,
} from "./providers.ts";
import type { OpenRouterRouting } from "@swarmtales/contracts";

export interface RequestLimits {
	readonly maxOutputTokens: number;
	readonly timeoutMs: number;
}

export interface ModelBinding {
	readonly model: Model<Api>;
	readonly streamFn: StreamFn;
	/** Fixed request fields (e.g. OpenRouter routing) merged over the provider payload. */
	readonly requestDefaults?: Readonly<Record<string, unknown>>;
}

export interface ModelSource {
	bind(agent: CompetitorId, limits: RequestLimits): ModelBinding;
}

/**
 * The request limits a model can honour (P75): a story sets `maxOutputTokens` for its own model (393216 for
 * DeepSeek on OpenRouter); when the model is overridden (`--gamemaker-model haiku`) the provider would answer
 * 400 for a `max_tokens` above its own limit, so the setting is cut to the model's `maxTokens`.
 */
function limitsFor(model: Pick<Model<Api>, "maxTokens">, limits: RequestLimits): RequestLimits {
	return model.maxTokens > 0 && limits.maxOutputTokens > model.maxTokens ? { ...limits, maxOutputTokens: model.maxTokens } : limits;
}

function limitedStream(models: Models, limits: RequestLimits): StreamFn {
	return (model, context, options) =>
		models.streamSimple(model, context, { ...options, maxTokens: limits.maxOutputTokens, timeoutMs: limits.timeoutMs });
}

function redacted(message: AssistantMessage): AssistantMessage {
	return message.errorMessage === undefined ? message : { ...message, errorMessage: redactSecrets(message.errorMessage) };
}

/**
 * A real provider's stream with secrets taken out of its error text (step 18 challenge,
 * chain-security m7): every role records a failed call's `errorMessage` into the signed log, where a
 * URL with credentials or an echoed key could not be removed again. Scripted sources keep the plain
 * stream (their errors are the script's).
 */
function redactingStream(inner: StreamFn): StreamFn {
	return async (model, context, options) => {
		const source = await inner(model, context, options);
		const out = createAssistantMessageEventStream();
		void (async () => {
			for await (const event of source) out.push(event.type === "error" ? { ...event, error: redacted(event.error) } : event);
			out.end();
		})();
		return out;
	};
}

/** A real provider, chosen through the registry. */
export class PiModelSource implements ModelSource {
	readonly #models = createModels();
	readonly #spec: ProviderSpec;
	readonly #modelId: string;
	readonly #routing: OpenRouterRouting | undefined;
	readonly #toolChoice: ToolChoice | undefined;

	constructor(spec: ProviderSpec, modelId: string, routing?: OpenRouterRouting, toolChoice?: ToolChoice) {
		this.#toolChoice = toolChoice;
		this.#spec = spec;
		this.#modelId = modelId;
		this.#routing = routing;
		this.#models.setProvider(spec.create());
	}

	bind(_agent: CompetitorId, limits: RequestLimits): ModelBinding {
		const model = this.#models.getModel(this.#spec.id, this.#modelId);
		if (model === undefined) {
			const available = this.#models.getModels(this.#spec.id).map((entry) => entry.id);
			throw new ModelConfigError(
				`Model "${this.#modelId}" does not exist at provider "${this.#spec.id}". ` +
					`Available (${available.length}): ${available.slice(0, 12).join(", ")}${available.length > 12 ? ", ..." : ""}`,
			);
		}
		const routingDefaults =
			this.#spec.id === "openrouter" && this.#routing !== undefined ? openRouterProviderPreferences(this.#routing) : undefined;
		const requestDefaults =
			this.#toolChoice === undefined ? routingDefaults : { ...routingDefaults, ...toolChoiceDefaults(this.#toolChoice, model.api) };
		return {
			model,
			streamFn: redactingStream(limitedStream(this.#models, limitsFor(model, limits))),
			...(requestDefaults === undefined ? {} : { requestDefaults }),
		};
	}
}

/** Scripted responses per competitor: fixed messages or factories. No network, no key. */
export type Script = Readonly<Partial<Record<CompetitorId, readonly FauxResponseStep[]>>>;

export class ScriptedModelSource implements ModelSource {
	readonly #script: Script;

	constructor(script: Script) {
		this.#script = script;
	}

	bind(agent: CompetitorId, limits: RequestLimits): ModelBinding {
		const faux = fauxProvider();
		faux.setResponses([...(this.#script[agent] ?? [])]);
		const models = createModels();
		models.setProvider(faux.provider);
		return { model: faux.getModel(), streamFn: limitedStream(models, limits) };
	}
}

/** Routes every competitor to its own source (per-competitor models, SPEC 5.3). */
export class RoutedModelSource implements ModelSource {
	readonly #routes: ReadonlyMap<CompetitorId, ModelSource>;

	constructor(routes: ReadonlyMap<CompetitorId, ModelSource>) {
		this.#routes = routes;
	}

	bind(agent: CompetitorId, limits: RequestLimits): ModelBinding {
		const source = this.#routes.get(agent);
		if (source === undefined) throw new ModelConfigError(`No model source for competitor ${agent}`);
		return source.bind(agent, limits);
	}
}

export interface CreateModelSourceOptions {
	readonly registry: ProviderRegistry;
	/** Only needed for the `scripted` provider. */
	readonly script?: Script;
	/** Sent as `tool_choice` with every request of this source (Gemma on OpenRouter ignores tools without "required"). */
	readonly toolChoice?: ToolChoice;
}

export function createModelSource(settings: ModelSettings, options: CreateModelSourceOptions): ModelSource {
	if (settings.provider === SCRIPTED_PROVIDER_ID) {
		if (options.script === undefined) throw new ModelConfigError('Provider "scripted" needs a script');
		return new ScriptedModelSource(options.script);
	}
	const spec = options.registry.require(settings.provider);
	const modelId = settings.modelId ?? spec.defaultModelId;
	if (modelId.length === 0) throw new ModelConfigError(`Provider "${spec.id}" has no default model ID`);
	return new PiModelSource(spec, modelId, settings.routing, options.toolChoice);
}
