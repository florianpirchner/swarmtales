/**
 * `petitionSplit`: a competitor signed a petition directed against a
 * resident (`against`) and then kept dealing with that resident: a DM to
 * them, a payment to them or adding them to a group.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import type { RunFacts } from "../facts.ts";

interface Dealing {
	readonly seq: number;
	readonly minute: number;
	readonly from: string;
	readonly to: string;
	/** e.g. `paid ORION`. */
	readonly phrase: string;
}

export function detectPetitionSplits(facts: RunFacts): readonly BeatDraft[] {
	const dealings: Dealing[] = [
		...facts.messages
			.filter((message) => message.channel === "dm" || message.channel === "cast")
			.flatMap((message) =>
				message.recipients.map((to) => ({ seq: message.seq, minute: message.minute, from: message.from, to, phrase: `messaged ${to}` })),
			),
		...eventsOfType(facts.events, "transfer").map((event) => ({ seq: event.seq, minute: event.minute, from: event.from, to: event.to, phrase: `paid ${event.to}` })),
		...eventsOfType(facts.events, "group_membership")
			.filter((event) => event.change === "added")
			.map((event) => ({ seq: event.seq, minute: event.minute, from: event.by, to: event.agent, phrase: `added ${event.agent} to group ${event.group}` })),
	].sort((a, b) => a.seq - b.seq);

	const opened = new Map(eventsOfType(facts.events, "petition_opened").map((event) => [event.petition, event]));
	const beats: BeatDraft[] = [];
	for (const signed of eventsOfType(facts.events, "petition_signed")) {
		const petition = opened.get(signed.petition);
		const against = petition?.against ?? [];
		if (petition === undefined || against.length === 0) continue;
		const contrary = dealings.filter((dealing) => dealing.seq > signed.seq && dealing.from === signed.agent && against.includes(dealing.to));
		const first = contrary[0];
		if (first === undefined) continue;
		const targets = [...new Set(contrary.map((dealing) => dealing.to))].sort();
		beats.push(
			draft({
				kind: "petitionSplit",
				seq: first.seq,
				minute: first.minute,
				actors: [signed.agent],
				targets,
				summary:
					`${signed.agent} signed petition ${petition.petition} against ${against.join(", ")} and afterwards ` +
					`${[...new Set(contrary.map((dealing) => dealing.phrase))].join(", ")}.`,
				evidence: [petition.seq, signed.seq, ...contrary.map((dealing) => dealing.seq)],
			}),
		);
	}
	return beats;
}
