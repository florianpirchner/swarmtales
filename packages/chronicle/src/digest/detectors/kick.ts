/**
 * `kick`: a founder removed a member from their group. Leaving voluntarily is
 * not a kick.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import type { RunFacts } from "../facts.ts";

export function detectKicks(facts: RunFacts): readonly BeatDraft[] {
	const memberships = eventsOfType(facts.events, "group_membership");
	return memberships
		.filter((event) => event.change === "removed" && event.by !== event.agent)
		.map((removal) => {
			const group = facts.groups.get(removal.group);
			const added = memberships.filter(
				(event) => event.seq < removal.seq && event.group === removal.group && event.agent === removal.agent && event.change === "added",
			);
			const lastPost = facts.messages
				.filter((message) => message.seq < removal.seq && message.group === removal.group && message.from === removal.agent)
				.at(-1);
			const name = group === undefined ? removal.group : `${removal.group} (${group.name})`;
			return draft({
				kind: "kick",
				seq: removal.seq,
				minute: removal.minute,
				actors: [removal.by],
				targets: [removal.agent],
				summary: `${removal.by} removed ${removal.agent} from group ${name}.`,
				evidence: [
					...(group === undefined ? [] : [group.seq]),
					...added.map((event) => event.seq),
					...(lastPost === undefined ? [] : [lastPost.seq]),
					removal.seq,
				],
			});
		});
}
