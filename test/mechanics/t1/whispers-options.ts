/** The whispers and marks options the Whispers story configures (shared by the whispers tests). */
import type whispersStory from "../../../stories/whispers/story.ts";

export function options(story: typeof whispersStory) {
	const rules = story.rules.marks;
	if (rules === undefined) throw new Error("the story has marks");
	const { ranges, ...base } = rules;
	const spec = story.whisperer;
	if (spec === undefined || story.popularity === undefined) throw new Error("the story has a whisperer and a vote");
	return {
		marks: { rules: ranges === undefined ? base : { ...base, ranges: ranges.map((range) => ({ ...range })) } },
		whispers: {
			whisperer: {
				...(spec.agent === undefined ? {} : { agent: spec.agent }),
				forgery: spec.forgery,
				duty: { ...spec.duty },
				...(spec.direction?.quota === undefined ? {} : { quota: { ...spec.direction.quota, report: { ...spec.direction.quota.report } } }),
			},
			popularity: { rounds: story.popularity.rounds.map((round) => ({ ...round })), texts: { ...story.popularity.texts } },
		},
	};
}
