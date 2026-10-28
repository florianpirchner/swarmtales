/**
 * `accusation`: shortly after a receipt was shown on the board, a competitor
 * posts on the board and names a party of that receipt (other than
 * themselves). The receipt is the evidence, the post the accusation.
 *
 * Where a classifier labelled the minute of the post, naming is not enough: the post must
 * carry the `accusation` label (aimed at that party, if it names targets).
 * Logs (or minutes) without labels keep the naming rule.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import { hasLabel, namedAgents, type RunFacts } from "../facts.ts";

export interface AccusationOptions {
	/** Minutes after the shown receipt in which a post still counts as its accusation. */
	readonly windowMinutes: number;
}

export const DEFAULT_ACCUSATION_WINDOW = 2;

export function detectAccusations(facts: RunFacts, options: AccusationOptions = { windowMinutes: DEFAULT_ACCUSATION_WINDOW }): readonly BeatDraft[] {
	// Only receipts shown on the board are public evidence; a private show (v05) is not.
	const shown = eventsOfType(facts.events, "receipt_shown").filter((show) => show.to === undefined);
	const posts = facts.messages.filter((message) => message.channel === "board");
	const beats: BeatDraft[] = [];
	for (const post of posts) {
		const accused = new Set<string>();
		for (const show of shown) {
			if (show.seq >= post.seq || post.minute - show.minute > options.windowMinutes) continue;
			const receipt = facts.receipts.get(show.receipt);
			if (receipt === undefined) continue;
			for (const agent of namedAgents(post.text, facts.agents)) {
				if (agent === post.from || accused.has(agent) || !receipt.parties.includes(agent)) continue;
				if (facts.classifiedMinutes.has(post.minute) && !hasLabel(facts, post.seq, "accusation", agent)) continue;
				accused.add(agent);
				beats.push(
					draft({
						kind: "accusation",
						seq: post.seq,
						minute: post.minute,
						actors: [post.from],
						targets: [agent],
						summary: `${post.from} named ${agent} on the board right after ${show.by} showed ${receipt.receipt} (${receipt.text}).`,
						evidence: [receipt.seq, show.seq, post.seq, ...labelSeqs(facts, post.seq)],
					}),
				);
			}
		}
	}
	return beats;
}

function labelSeqs(facts: RunFacts, seq: number): readonly number[] {
	return (facts.interpretations.get(seq) ?? []).filter((entry) => entry.labels.includes("accusation")).map((entry) => entry.seq);
}
