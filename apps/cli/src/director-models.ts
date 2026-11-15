// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The models of a live run by actor: a resident plays the model of the run; a Director the model of
 * `--director-model` for its name, else the model of its use in the game, else the model of the run (decision A52:
 * the game's own model blocks stay as they are and a flag replaces one for a run). Every actor binds through one
 * source, which hands it to the source of its model with the output cap of its settings.
 */
import { SwtError, type ActorId, type ModelChoice } from "@swarmtales/contracts";
import { resolveModelSettings, type ModelSettings, type ModelSource, type ProviderRegistry } from "@swarmtales/models";
import type { ResolvedGame } from "@swarmtales/sdk";
import { noSuchDirector } from "./errors.ts";

/**
 * The model of every actor of a live run.
 *
 * @public
 */
export interface ActorModels {
	/** The settings of an actor's model: those of the run for an actor that is no Director with a model of its own. */
	readonly settings: (actor: ActorId) => ModelSettings;
	/** The source every actor binds through. */
	readonly source: ModelSource;
}

/**
 * The models of a live run by actor.
 *
 * @param game - The resolved game: its Directors with the models of their uses.
 * @param chosen - The models of `--director-model`, by the name of a Director.
 * @param run - The settings and the source of the run's model.
 * @param run.settings - The settings of the run's model.
 * @param run.source - The source of the run's model.
 * @param make - Makes the source of another model (`createModelSource`, with the key check of its provider).
 * @param registry - The provider adapters.
 * @returns The settings of each actor and the source they bind through.
 * @throws SwtError `SWT-C026` for a name of no Director of the game; what `resolveModelSettings` and `make` throw.
 *
 * @public
 */
export function actorModels(game: ResolvedGame, chosen: Readonly<Record<string, ModelChoice>>, run: { readonly settings: ModelSettings; readonly source: ModelSource }, make: (settings: ModelSettings) => ModelSource, registry: ProviderRegistry): ActorModels {
	const directors = game.directors ?? [];
	const known = directors.map((director) => director.name);
	const unknown = Object.keys(chosen).filter((name) => !known.includes(name));
	if (unknown.length > 0) throw new SwtError(unknown.map((name) => noSuchDirector({ name, known })));
	const own = new Map(
		directors.flatMap((director): [ActorId, { readonly settings: ModelSettings; readonly source: ModelSource }][] => {
			const choice = Object.hasOwn(chosen, director.name) ? chosen[director.name] : director.model;
			if (choice === undefined) return [];
			const settings = resolveModelSettings({}, {}, choice, registry);
			return [[director.actor, { settings, source: make(settings) }]];
		}),
	);
	const settings = (actor: ActorId): ModelSettings => own.get(actor)?.settings ?? run.settings;
	return { settings, source: { bind: (actor, limits) => (own.get(actor)?.source ?? run.source).bind(actor, { ...limits, maxOutputTokens: settings(actor).maxOutputTokens }) } };
}
