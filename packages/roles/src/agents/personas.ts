/**
 * Persona assignment (SPEC 5.2): one persona per competitor, from an explicit
 * map or a seeded draw from the story's pool. With at least as many personas
 * as competitors, the seeded draw gives everyone a distinct persona.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import { assertNever } from "../core/result.ts";
import type { AnyStory, Persona } from "../story/types.ts";

export function assignPersonas(story: AnyStory, competitors: readonly CompetitorId[], seed: number): ReadonlyMap<CompetitorId, Persona> {
	const assigned = new Map<CompetitorId, Persona>();
	if (story.personas.length === 0) return assigned;
	const assignment = story.personaAssignment ?? { kind: "seeded" };
	switch (assignment.kind) {
		case "seeded": {
			const pool = rngFor(seed, "personas").shuffle(story.personas);
			competitors.forEach((agent, index) => {
				const persona = pool[index % pool.length];
				if (persona !== undefined) assigned.set(agent, persona);
			});
			return assigned;
		}
		case "explicit":
			for (const agent of competitors) {
				const name = assignment.map[agent];
				const persona = story.personas.find((candidate) => candidate.name === name);
				if (persona !== undefined) assigned.set(agent, persona);
			}
			return assigned;
		default:
			return assertNever(assignment, "persona assignment");
	}
}
