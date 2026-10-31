/**
 * The popularity vote's pure parts (copied from packages/engine/src/popularity.ts): the count of a
 * round, the restore of a saved vote and the words around it. The state machine (pending, open,
 * closed) lives in index.ts.
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

export type Phase = "pending" | "open" | "closed";

/** A vote as an old snapshot kept it: the round the city was at, its state and the ballots (the single surprise vote has no round). */
export interface SavedVote {
	readonly round?: number | undefined;
	readonly state: Phase;
	readonly ballots: readonly { readonly agent: string; readonly choice: string }[];
}

/** Where a vote stands: the round index (`rounds.length` once all are counted), its phase and the ballots cast in it. */
export interface VoteStanding {
	readonly round: number;
	readonly phase: Phase;
	readonly ballots: ReadonlyMap<string, string>;
}

/**
 * Loads a vote saved at `minute` (the minute the saved run last played), as the old
 * `PopularityVote#restore`. A round whose count minute is already past is skipped silently, ballots
 * and all, up to the first round counted after `minute`: a resumed run announces no burst of rounds
 * it never played. A snapshot of the old single surprise vote (no round) was a vote for the grand
 * prize: counted, it closes every round; open, it stays open as the round of `minute`, and its
 * ballots count only if that round is the final vote.
 */
export function restoreVote(saved: SavedVote, rounds: readonly Round[], minute: number, isResident: (id: string) => boolean): VoteStanding {
	const last = rounds.length;
	const round = saved.round ?? (saved.state === "closed" ? last : 0);
	if (!Number.isInteger(round) || round < 0 || round > last) throw new Error(`The snapshot's popularity round ${String(round)} is not one of this story's ${String(last)} rounds`);
	for (const { agent, choice } of saved.ballots) {
		if (!isResident(agent) || !isResident(choice)) throw new Error(`The snapshot's popularity ballot ${agent} -> ${choice} names an unknown resident`);
	}
	const next = rounds.findIndex((candidate, index) => index >= round && candidate.countsAt > minute);
	const at = next === -1 ? last : next;
	const ballots = new Map<string, string>();
	if (at >= last) return { round: at, phase: "closed", ballots };
	if (saved.round === undefined) {
		const open = saved.state === "open" && (rounds[at]?.opensAt ?? minute + 1) <= minute;
		if (open && at === last - 1) for (const { agent, choice } of saved.ballots) ballots.set(agent, choice);
		return { round: at, phase: open ? "open" : "pending", ballots };
	}
	if (at > round) return { round: at, phase: "pending", ballots };
	for (const { agent, choice } of saved.ballots) ballots.set(agent, choice);
	return { round: at, phase: saved.state === "closed" ? "pending" : saved.state, ballots };
}
