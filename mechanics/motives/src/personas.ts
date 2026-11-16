// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The seeded persona of a resident, carried from the old `assignPersonas` (`packages/roles/src/agents/personas.ts`,
 * kind `seeded`): the catalogue is shuffled once with the stream `personas` of the run seed, and the residents take
 * the shuffled personas by seat, round again when there are more residents than personas. The run's streams are the
 * old ones bit for bit (`rngFor` of the kernel), so the same seed deals the same personas.
 */
import type { Streams } from "./deal.ts";
import type { Persona } from "./spec.ts";

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
