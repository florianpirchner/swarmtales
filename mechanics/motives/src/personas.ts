// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The persona of a resident. A resident that plays a figure of the cast plays the persona of the figure's
 * `profession`, so that its voice and its figure agree (the old host, `apps/cli/src/host/residents.ts`, the City,
 * decision A98). Every other resident gets the seeded persona of the old `assignPersonas`
 * (`packages/roles/src/agents/personas.ts`, kind `seeded`): the catalogue is shuffled once with the stream `personas`
 * of the run seed, and the residents take the shuffled personas by seat, round again when there are more residents
 * than personas. With the option `figurePersonas: false` a figure speaks for itself, without a persona (the old `led`).
 * The run's streams are the old ones bit for bit (`rngFor` of the kernel), so the same seed deals the
 * same personas.
 */
import type { Motive, Streams } from "./deal.ts";
import type { MotivesOptions, Persona } from "./spec.ts";

/**
 * Deals a persona to every resident, by seat.
 *
 * @param catalogue - The game's personas; none deals none.
 * @param ids - The residents, in roster order.
 * @param rng - The seeded streams.
 * @returns The persona of each resident, in roster order.
 *
 * @public
 */
export function dealPersonas(catalogue: readonly Persona[], ids: readonly string[], rng: Streams): ReadonlyMap<string, Persona> {
	if (catalogue.length === 0) return new Map();
	const pool = rng("personas").shuffle(catalogue);
	return new Map(
		ids.flatMap((agent, index): [string, Persona][] => {
			const persona = pool[index % pool.length];
			return persona === undefined ? [] : [[agent, { ...persona }]];
		}),
	);
}

/**
 * The persona of the catalogue that a figure's profession names, compared without case as the old host did.
 *
 * @param options - The motives' options (the figures and the catalogue).
 * @param figure - The figure's id, when the resident plays one.
 * @returns The persona, or undefined when the resident plays no figure or the catalogue has no such persona.
 *
 * @public
 */
export function figurePersona(options: MotivesOptions, figure: string | undefined): Persona | undefined {
	const profession = figure === undefined ? undefined : options.figures?.find((entry) => entry.id === figure)?.profession.toLowerCase();
	const found = profession === undefined ? undefined : options.personas?.find((persona) => persona.name.toLowerCase() === profession);
	return found === undefined ? undefined : { ...found };
}

/**
 * The persona of every resident: its figure's profession persona when it plays a figure, else the seeded deal. With
 * `figurePersonas: false` a resident that plays a figure has none (the old host's `led`, from figure direction 6); the
 * seeded deal is drawn all the same, so a seat beyond the cast keeps its persona.
 *
 * @param options - The motives' options.
 * @param coreMotives - The core motives dealt, which name the figure a resident plays.
 * @param ids - The residents, in roster order.
 * @param rng - The seeded streams.
 * @returns The persona of each resident, in roster order.
 *
 * @public
 */
export function personasOf(options: MotivesOptions, coreMotives: ReadonlyMap<string, Motive>, ids: readonly string[], rng: Streams): ReadonlyMap<string, Persona> {
	const seeded = dealPersonas(options.personas ?? [], ids, rng);
	return new Map(
		ids.flatMap((agent): [string, Persona][] => {
			const figure = coreMotives.get(agent)?.figure;
			if (figure !== undefined && options.figurePersonas === false) return [];
			const persona = figurePersona(options, figure) ?? seeded.get(agent);
			return persona === undefined ? [] : [[agent, persona]];
		}),
	);
}
