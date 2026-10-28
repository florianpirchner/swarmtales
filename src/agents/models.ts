/**
 * Per-competitor model assignment (SPEC 5.3). An explicit map names a model
 * per competitor (the rest use the story model); a mix deals the listed
 * models round-robin over a seeded order, so every model gets an equal share.
 * An override (CLI `--model`) replaces every assignment.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import { assertNever } from "../core/result.ts";
import type { AnyStory, ModelChoice } from "../story/types.ts";

export function assignModels(
	story: AnyStory,
	competitors: readonly CompetitorId[],
	seed: number,
	override?: ModelChoice,
): ReadonlyMap<CompetitorId, ModelChoice> {
	const assigned = new Map<CompetitorId, ModelChoice>();
	const assignment = story.models;
	if (override !== undefined || assignment === undefined) {
		for (const agent of competitors) assigned.set(agent, override ?? story.model);
		return assigned;
	}
	switch (assignment.kind) {
		case "explicit":
			for (const agent of competitors) assigned.set(agent, assignment.map[agent] ?? story.model);
			return assigned;
		case "mix": {
			const order = rngFor(seed, "models").shuffle(competitors);
			order.forEach((agent, index) => {
				assigned.set(agent, assignment.choices[index % assignment.choices.length] ?? story.model);
			});
			// Keep the map in roster order for readable logs.
			return new Map(competitors.flatMap((agent) => {
				const choice = assigned.get(agent);
				return choice === undefined ? [] : [[agent, choice] as const];
			}));
		}
		default:
			return assertNever(assignment, "model assignment");
	}
}
