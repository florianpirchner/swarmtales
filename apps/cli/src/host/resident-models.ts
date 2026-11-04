/**
 * Per-resident models for a core story (`--resident-model <A01,A02,...>=<provider>/<model>`, repeatable):
 * residents without a flag use the run's `--provider` / `--model`. The plan is resolved and checked
 * before the run directory exists; the composite source routes each resident to the source of its
 * own provider and model (one source per distinct pair).
 */
import {
	missingApiKeys,
	ModelConfigError,
	resolveModelSettings,
	RoutedModelSource,
	type ModelSettings,
	type ModelSource,
	type ProviderRegistry,
} from "@swarmtales/models";
import type { ResidentId } from "@swarmtales/contracts";
import type { ResidentModelFlag } from "../args.ts";

export interface ResidentModelPlan {
	/** Settings of the residents that carry a flag, by id. */
	readonly overrides: ReadonlyMap<ResidentId, ModelSettings>;
}

/** `provider/model` as a label for logs, split nowhere. */
export const settingsLabel = (settings: ModelSettings): string => `${settings.provider}/${settings.modelId ?? "-"}`;

/** Resolves the flags against the roster and the registry; refuses an unknown resident or provider and a missing API key. */
export function planResidentModels(
	flags: readonly ResidentModelFlag[],
	roster: readonly ResidentId[],
	registry: ProviderRegistry,
	defaults: ModelSettings,
	env: Readonly<Partial<Record<string, string>>>,
): ResidentModelPlan {
	const overrides = new Map<ResidentId, ModelSettings>();
	const unchecked = new Set<string>();
	for (const flag of flags) {
		const unknown = flag.residents.filter((id) => !roster.includes(id));
		if (unknown.length > 0) throw new ModelConfigError(`--resident-model names unknown resident ${unknown.join(", ")}. Residents: ${roster.join(", ")}.`);
		const settings = resolveModelSettings({ provider: flag.provider, modelId: flag.model }, {}, defaults, registry);
		const missing = missingApiKeys(settings, registry, env);
		if (missing.length > 0) unchecked.add(`provider "${settings.provider}": ${missing.join(", ")}`);
		for (const id of flag.residents) overrides.set(id, settings);
	}
	if (unchecked.size > 0) throw new ModelConfigError(`Missing API keys for ${[...unchecked].join("; ")}`);
	return { overrides };
}

/** A source that routes every resident of `roster` to the source for its settings; `create` is called once per distinct provider and model. */
export function residentModelSource(roster: readonly ResidentId[], defaults: ModelSettings, plan: ResidentModelPlan, create: (settings: ModelSettings) => ModelSource): ModelSource {
	const sources = new Map<string, ModelSource>();
	const sourceFor = (settings: ModelSettings): ModelSource => {
		const key = settingsLabel(settings);
		const known = sources.get(key);
		if (known !== undefined) return known;
		const made = create(settings);
		sources.set(key, made);
		return made;
	};
	return new RoutedModelSource(new Map(roster.map((id) => [id, sourceFor(plan.overrides.get(id) ?? defaults)])));
}
