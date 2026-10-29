/**
 * Builds the statement classifier for a resolved model: a structured
 * classifier model of the provider (e.g. OpenRouter's pplx-decider) when one
 * has that ID, a chat model otherwise.
 */
import { createModels } from "@earendil-works/pi-ai";
import type { ProviderRegistry } from "../model/providers.ts";
import { describeModel, ModelConfigError, type ModelSettings } from "../model/settings.ts";
import { createModelSource, type RequestLimits } from "../model/source.ts";
import type { ClassifierSpec } from "../story/types.ts";
import { ChatStatementClassifier, CLASSIFIER_ID, DeciderStatementClassifier, type StatementClassifier } from "./classifier.ts";
import { ChatDeliveryJudge, JUDGE_ID, type DeliveryJudge, type JudgeTemper } from "./judge.ts";
import { ChatSouffleur, SOUFFLEUR_ID, type Souffleur } from "./souffleur.ts";

export function createStatementClassifier(
	settings: ModelSettings,
	spec: ClassifierSpec,
	registry: ProviderRegistry,
	limits: RequestLimits,
): StatementClassifier {
	const provider = registry.require(settings.provider);
	const modelId = settings.modelId ?? provider.defaultModelId;
	const label = `${provider.id}/${modelId}`;
	const models = createModels();
	models.setProvider(provider.create());
	const decider = models.getModelOfType("classifier", provider.id, modelId);
	if (decider !== undefined) {
		return new DeciderStatementClassifier({ models, model: decider, label, maxChars: spec.maxChars, timeoutMs: limits.timeoutMs });
	}
	if (models.getModel(provider.id, modelId) === undefined) {
		throw new ModelConfigError(`Classifier model "${modelId}" does not exist at provider "${provider.id}" (${describeModel(settings, registry)})`);
	}
	return new ChatStatementClassifier({
		binding: createModelSource(settings, { registry }).bind(CLASSIFIER_ID, limits),
		label,
		thinking: spec.model.thinking ?? "off",
		maxChars: spec.maxChars,
	});
}

/**
 * Builds the city's judge for `blame` from the classifier's model: always a
 * chat model, since it answers one free question rather than a label.
 */
export function createDeliveryJudge(
	settings: ModelSettings,
	spec: ClassifierSpec,
	registry: ProviderRegistry,
	limits: RequestLimits,
	temper: JudgeTemper = "fair",
): DeliveryJudge {
	const provider = registry.require(settings.provider);
	const modelId = settings.modelId ?? provider.defaultModelId;
	const models = createModels();
	models.setProvider(provider.create());
	if (models.getModel(provider.id, modelId) === undefined) {
		throw new ModelConfigError(`Judge model "${modelId}" is no chat model at provider "${provider.id}" (${describeModel(settings, registry)})`);
	}
	return new ChatDeliveryJudge({
		binding: createModelSource(settings, { registry }).bind(JUDGE_ID, limits),
		label: `${provider.id}/${modelId}`,
		thinking: spec.model.thinking ?? "off",
		temper,
	});
}

/** Builds the souffleur (P44) from the classifier's model: a chat model, like the judge. */
export function createSouffleur(settings: ModelSettings, spec: ClassifierSpec, registry: ProviderRegistry, limits: RequestLimits): Souffleur {
	const provider = registry.require(settings.provider);
	const modelId = settings.modelId ?? provider.defaultModelId;
	const models = createModels();
	models.setProvider(provider.create());
	if (models.getModel(provider.id, modelId) === undefined) {
		throw new ModelConfigError(`Souffleur model "${modelId}" is no chat model at provider "${provider.id}" (${describeModel(settings, registry)})`);
	}
	return new ChatSouffleur({
		binding: createModelSource(settings, { registry }).bind(SOUFFLEUR_ID, limits),
		label: `${provider.id}/${modelId}`,
		thinking: spec.model.thinking ?? "off",
	});
}
