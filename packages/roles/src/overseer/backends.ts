/**
 * The overseers' models, resolved from the run's settings but not yet bound to a host (step 18,
 * C2-11): the app builds each runtime once the host exists and routes every overseer call to the
 * runtime of its definition id (`overseerRouter`). They replace the old role factories of
 * `../interpret/sources.ts` (`createStatementClassifier`, `createDeliveryJudge`, `createWeaverModel`)
 * with the same model checks and the same `usage` agent ids.
 */
import { createModels } from "@earendil-works/pi-ai";
import { createModelSource, describeModel, ModelConfigError, type ModelBinding, type ModelSettings, type ProviderRegistry, type RequestLimits } from "@swarmtales/models";
import type { ClassifierSpec, Host, OverseerCall, OverseerReply, OverseerRuntime, ThinkingLevel } from "@swarmtales/contracts";
import { CLASSIFIER_AGENT, classifierRuntime, deciderRuntime } from "./classifier-runtime.ts";
import { JUDGE_AGENT, judgeRuntime } from "./judge-runtime.ts";
import { WEAVER_AGENT, weaverRuntime } from "./weaver-runtime.ts";

/** The host as an overseer runtime writes to and reads from (the decider reads its batch back from the log). */
export type BackendHost = Pick<Host, "record" | "minute" | "log" | "residents">;

export interface OverseerBackend {
	/** `<provider>/<model>`, as the run's meta and the classifier's `interpretation` lines name it. */
	readonly label: string;
	runtime(host: BackendHost): OverseerRuntime;
}

/**
 * The classifier's model (old `createStatementClassifier`): a structured classifier model of the
 * provider when one has the ID (the decider), a chat model otherwise.
 */
export function classifierBackend(settings: ModelSettings, spec: ClassifierSpec, registry: ProviderRegistry, limits: RequestLimits): OverseerBackend & { readonly maxChars: number } {
	const provider = registry.require(settings.provider);
	const modelId = settings.modelId ?? provider.defaultModelId;
	const label = `${provider.id}/${modelId}`;
	const models = createModels();
	models.setProvider(provider.create());
	const decider = models.getModelOfType("classifier", provider.id, modelId);
	if (decider !== undefined) {
		return { label, maxChars: spec.maxChars, runtime: (host) => deciderRuntime({ host, models, model: decider, maxChars: spec.maxChars, timeoutMs: limits.timeoutMs }) };
	}
	if (models.getModel(provider.id, modelId) === undefined) {
		throw new ModelConfigError(`Classifier model "${modelId}" does not exist at provider "${provider.id}" (${describeModel(settings, registry)})`);
	}
	const binding = createModelSource(settings, { registry }).bind(CLASSIFIER_AGENT, limits);
	return { label, maxChars: spec.maxChars, runtime: (host) => classifierRuntime({ host, binding, thinking: spec.model.thinking ?? "off" }) };
}

type ChatRuntime = (options: { readonly host: BackendHost; readonly binding: ModelBinding; readonly thinking: ThinkingLevel }) => OverseerRuntime;

/** A chat model's backend for an overseer that answers through one tool (judge, weaver). */
function chatBackend(what: string, id: string, settings: ModelSettings, spec: ClassifierSpec, registry: ProviderRegistry, limits: RequestLimits, build: ChatRuntime): OverseerBackend {
	const provider = registry.require(settings.provider);
	const modelId = settings.modelId ?? provider.defaultModelId;
	const models = createModels();
	models.setProvider(provider.create());
	if (models.getModel(provider.id, modelId) === undefined) {
		throw new ModelConfigError(`${what} model "${modelId}" is no chat model at provider "${provider.id}" (${describeModel(settings, registry)})`);
	}
	const binding = createModelSource(settings, { registry }).bind(id, limits);
	return { label: `${provider.id}/${modelId}`, runtime: (host) => build({ host, binding, thinking: spec.model.thinking ?? "off" }) };
}

/** The city's judge for `blame` (old `createDeliveryJudge`): the classifier's chat model. */
export function judgeBackend(settings: ModelSettings, spec: ClassifierSpec, registry: ProviderRegistry, limits: RequestLimits): OverseerBackend {
	return chatBackend("Judge", JUDGE_AGENT, settings, spec, registry, limits, judgeRuntime);
}

/** The weaver's model (`--weaver`, old `createWeaverModel`): the classifier's chat model unless its own flags choose another. */
export function weaverBackend(settings: ModelSettings, spec: ClassifierSpec, registry: ProviderRegistry, limits: RequestLimits): OverseerBackend {
	return chatBackend("Weaver", WEAVER_AGENT, settings, spec, registry, limits, weaverRuntime);
}

/** A backend from a fixed binding (tests, the scripted provider): the runtime of `build` on `binding`. */
export function boundBackend(label: string, binding: ModelBinding, thinking: ThinkingLevel, build: ChatRuntime): OverseerBackend {
	return { label, runtime: (host) => build({ host, binding, thinking }) };
}

/**
 * One runtime for the host that answers every overseer by its definition id (C2-11). Every runtime
 * of the roles refuses a foreign definition, so the router is a plain lookup; an overseer without
 * a runtime is refused and the host answers through its body's fallback.
 */
export function overseerRouter(routes: Readonly<Record<string, OverseerRuntime>>): OverseerRuntime {
	return {
		ask(call: OverseerCall): Promise<OverseerReply> {
			const runtime = Object.hasOwn(routes, call.definition) ? routes[call.definition] : undefined;
			if (runtime === undefined) return Promise.resolve({ ok: false, error: `no runtime for overseer ${call.definition}`, costUsd: 0 });
			return runtime.ask(call);
		},
	};
}
