/**
 * Model sources: which model and stream function each competitor talks to.
 */
import type { StreamFn } from "@earendil-works/pi-agent-core";
import { createModels, fauxProvider, type Api, type Model, type Models, type FauxResponseStep } from "@earendil-works/pi-ai";
import type { CompetitorId } from "../core/ids.ts";
import { ModelConfigError, type ModelSettings } from "./settings.ts";
import {
	openRouterProviderPreferences,
	SCRIPTED_PROVIDER_ID,
	type ProviderRegistry,
	type ProviderSpec,
} from "./providers.ts";
import type { OpenRouterRouting } from "../story/types.ts";

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

function limitedStream(models: Models, limits: RequestLimits): StreamFn {
	return (model, context, options) =>
		models.streamSimple(model, context, { ...options, maxTokens: limits.maxOutputTokens, timeoutMs: limits.timeoutMs });
}

/** A real provider, chosen through the registry. */
export class PiModelSource implements ModelSource {
	readonly #models = createModels();
	readonly #spec: ProviderSpec;
	readonly #modelId: string;
	readonly #routing: OpenRouterRouting | undefined;

	constructor(spec: ProviderSpec, modelId: string, routing?: OpenRouterRouting) {
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
		const requestDefaults =
			this.#spec.id === "openrouter" && this.#routing !== undefined ? openRouterProviderPreferences(this.#routing) : undefined;
		return {
			model,
			streamFn: limitedStream(this.#models, limits),
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
}

export function createModelSource(settings: ModelSettings, options: CreateModelSourceOptions): ModelSource {
	if (settings.provider === SCRIPTED_PROVIDER_ID) {
		if (options.script === undefined) throw new ModelConfigError('Provider "scripted" needs a script');
		return new ScriptedModelSource(options.script);
	}
	const spec = options.registry.require(settings.provider);
	const modelId = settings.modelId ?? spec.defaultModelId;
	if (modelId.length === 0) throw new ModelConfigError(`Provider "${spec.id}" has no default model ID`);
	return new PiModelSource(spec, modelId, settings.routing);
}
