/**
 * The popularity vote's pure parts (copied from packages/engine/src/popularity.ts): the count of a
 * round and the words around it. The state machine (pending, open, closed) lives in index.ts.
 */
import { Type, type Static } from "typebox";

export const Round = Type.Object({
	opensAt: Type.Integer({ minimum: 0, description: "The minute the round opens." }),
	countsAt: Type.Integer({ minimum: 0, description: "The minute at whose start the ballots are counted." }),
	points: Type.Integer({ minimum: 0, description: "Points each winner gets." }),
	label: Type.String({ description: "The round's name in the texts, e.g. `before door 2`." }),
});
export type Round = Static<typeof Round>;

export const PopularitySpec = Type.Object(
	{
		rounds: Type.Array(Round, { description: "In order: each round opens no earlier than the one before is counted." }),
		texts: Type.Object(
			{
				announcement: Type.String({ description: "Board post and notice to every resident when a round opens (`{label}`, `{until}`, `{points}`)." }),
				result: Type.String({ description: "Board post with the ranking and the winners (`{label}`, `{counts}`, `{winners}`, `{points}`)." }),
				noVotes: Type.String({ description: "Board post when nobody voted (`{label}`, `{counts}`)." }),
			},
			{ description: "The board posts and notices of the vote." },
		),
	},
	{ description: "The popularity vote: rounds at fixed minutes." },
);

export interface VoteCount {
	readonly agent: string;
	readonly votes: number;
}

export interface Counted {
	readonly counts: readonly VoteCount[];
	readonly winners: readonly string[];
	readonly voters: readonly string[];
}

/** "A04", "A04 and A05", "A02, A04 and A05". */
export function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

/** The count of a round: a ballot of or for a resident who left the city does not count; every resident in the city is listed, 0 votes too. */
export function countBallots(ballots: ReadonlyMap<string, string>, alive: readonly string[], inCity: (agent: string) => boolean): Counted {
	const kept = [...ballots].filter(([voter, choice]) => inCity(voter) && inCity(choice));
	const tally = new Map<string, number>(alive.map((agent) => [agent, 0]));
	for (const [, choice] of kept) tally.set(choice, (tally.get(choice) ?? 0) + 1);
	const counts = [...tally].map(([agent, votes]) => ({ agent, votes })).sort((a, b) => b.votes - a.votes || a.agent.localeCompare(b.agent));
	const top = counts[0]?.votes ?? 0;
	return {
		counts,
		winners: counts.filter((entry) => entry.votes === top && top > 0).map((entry) => entry.agent),
		voters: kept.map(([voter]) => voter).sort((a, b) => a.localeCompare(b)),
	};
}

/** The resident to aim at after a vote: the most liked other than the whisperer (the first in the count on a tie), none without a vote. */
export function dutyTarget(counts: readonly VoteCount[], whisperer: string): string | undefined {
	let best: VoteCount | undefined;
	for (const count of counts) if (count.agent !== whisperer && count.votes > 0 && (best === undefined || count.votes > best.votes)) best = count;
	return best?.agent;
}
