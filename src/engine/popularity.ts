/**
 * The popularity votes (`story.popularity`, Whispers): rounds at fixed
 * minutes. Each round opens at its `opensAt`: the city announces it on the
 * board and to every resident. Each resident in the city may name the
 * resident it likes most with `nameFavourite` (never itself; its last ballot
 * counts) until the round is counted at the start of its `countsAt`. The
 * resident with the most votes gets the round's `points`; a tie pays
 * everyone tied; without a vote nobody wins. The board shows the full
 * ranking (every resident in the city, 0 votes too), never who voted for
 * whom; the log keeps every ballot. Rounds run one after another, each with
 * fresh ballots.
 */
import type { CompetitorId } from "../core/ids.ts";
import { err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import type { PopularityRound, PopularitySpec } from "../story/types.ts";
import type { ArenaEvent } from "./events.ts";

export type PopularityEvent = Extract<ArenaEvent, { readonly type: "popularity_opened" | "popularity_ballot" | "popularity_result" }>;

/** One resident's votes in a counted round. */
export interface VoteCount {
	readonly agent: CompetitorId;
	readonly votes: number;
}

/** A counted round, for whoever acts on it (the whisperer's duty). */
export interface CountedRound {
	/** The round's number, from 1. */
	readonly round: number;
	readonly counts: readonly VoteCount[];
	readonly winners: readonly CompetitorId[];
	/** `A02 3, A01 1, A03 0`. */
	readonly ranking: string;
}

export interface PopularityPorts {
	readonly spec: PopularitySpec;
	readonly isCompetitor: (id: string) => boolean;
	/** Whether a resident may vote and be voted for: in the city, not exiled. */
	readonly inCity: (agent: CompetitorId) => boolean;
	readonly alive: () => readonly CompetitorId[];
	readonly post: (text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly grant: (agent: CompetitorId, points: number, reason: string) => void;
	readonly emit: (event: PopularityEvent) => void;
	/** After a round is counted and announced. */
	readonly counted?: (result: CountedRound) => void;
}

export type FavouriteError = "NO_VOTE" | "UNKNOWN_AGENT" | "SELF_VOTE" | "EXILED";

export type VoteState = "pending" | "open" | "closed";

/**
 * The votes in a snapshot: the round the city is at (its index; past the
 * last when all are counted), its state and the ballots cast in it, so a
 * resumed run neither announces a round twice nor loses a ballot.
 */
export interface PopularitySnapshot {
	/** Absent in snapshots of the single surprise vote (one round). */
	readonly round?: number;
	readonly state: VoteState;
	readonly ballots: readonly { readonly agent: CompetitorId; readonly choice: CompetitorId }[];
}

/** "A04", "A04 and A05", "A02, A04 and A05". */
function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

export class PopularityVote {
	readonly #ports: PopularityPorts;
	readonly #ballots = new Map<CompetitorId, CompetitorId>();
	/** Index of the round that is pending or open; `rounds.length` once every round is counted. */
	#round = 0;
	#state: VoteState = "pending";

	constructor(ports: PopularityPorts) {
		this.#ports = ports;
	}

	get spec(): PopularitySpec {
		return this.#ports.spec;
	}

	/** The round that is open or comes next; undefined once all are counted. */
	get current(): PopularityRound | undefined {
		return this.#ports.spec.rounds[this.#round];
	}

	/** The minute the open (or next) round is counted. */
	get until(): number | undefined {
		return this.current?.countsAt;
	}

	get isOpen(): boolean {
		return this.#state === "open";
	}

	/** The ballot `agent` cast in the open round. */
	ballotOf(agent: CompetitorId): CompetitorId | undefined {
		return this.#state === "open" ? this.#ballots.get(agent) : undefined;
	}

	snapshot(): PopularitySnapshot {
		return { round: this.#round, state: this.#state, ballots: [...this.#ballots].map(([agent, choice]) => ({ agent, choice })) };
	}

	/**
	 * Loads a snapshot taken at `minute` (the minute the snapshot's run last
	 * played). A round whose count minute is already past (a story whose
	 * rounds moved since the snapshot) is skipped silently, ballots and all,
	 * up to the first round counted after `minute`: a resumed run announces no
	 * burst of rounds it never played. A snapshot of the old single surprise
	 * vote (no round) was a vote for the grand prize: counted, it closes every
	 * round; open, it stays open as the round of `minute`, and its ballots
	 * count only if that round is the final vote, never as an earlier round.
	 */
	restore(saved: PopularitySnapshot, minute: number): void {
		const rounds = this.#ports.spec.rounds;
		const last = rounds.length;
		const round = saved.round ?? (saved.state === "closed" ? last : 0);
		if (!Number.isInteger(round) || round < 0 || round > last) throw new Error(`The snapshot's popularity round ${round} is not one of this story's ${last} rounds`);
		for (const { agent, choice } of saved.ballots) {
			if (!this.#ports.isCompetitor(agent) || !this.#ports.isCompetitor(choice)) throw new Error(`The snapshot's popularity ballot ${agent} -> ${choice} names an unknown resident`);
		}
		const next = rounds.findIndex((candidate, index) => index >= round && candidate.countsAt > minute);
		const at = next === -1 ? last : next;
		this.#round = at;
		this.#ballots.clear();
		if (at >= last) this.#state = "closed";
		else if (saved.round === undefined) {
			const open = saved.state === "open" && (rounds[at]?.opensAt ?? minute + 1) <= minute;
			this.#state = open ? "open" : "pending";
			if (open && at === last - 1) for (const { agent, choice } of saved.ballots) this.#ballots.set(agent, choice);
		} else if (at > round) this.#state = "pending";
		else {
			this.#state = saved.state === "closed" ? "pending" : saved.state;
			for (const { agent, choice } of saved.ballots) this.#ballots.set(agent, choice);
		}
	}

	/** The city's work at the start of a minute: count the open round when its minute has come, then open the next. */
	tick(minute: number): void {
		for (;;) {
			const round = this.current;
			if (round === undefined) return;
			if (this.#state === "pending" && minute >= round.opensAt) this.#open(round);
			else if (this.#state === "open" && minute >= round.countsAt) this.#close(round);
			else return;
		}
	}

	/** A secret ballot for the resident `agent` likes most; the last one in a round counts. */
	vote(agent: CompetitorId, choice: string): Result<{ readonly choice: CompetitorId; readonly until: number }, FavouriteError> {
		const round = this.current;
		if (this.#state !== "open" || round === undefined) return err("NO_VOTE", "no vote is open");
		if (!this.#ports.isCompetitor(choice)) return err("UNKNOWN_AGENT", choice);
		if (choice === agent) return err("SELF_VOTE", "you cannot name yourself");
		if (!this.#ports.inCity(choice)) return err("EXILED", `${choice} is no longer in the city`);
		this.#ballots.set(agent, choice);
		this.#ports.emit({ type: "popularity_ballot", round: this.#round + 1, agent, choice });
		return ok({ choice, until: round.countsAt });
	}

	#open(round: PopularityRound): void {
		this.#state = "open";
		this.#ballots.clear();
		const { spec } = this.#ports;
		const text = renderTemplate(spec.texts.announcement, { label: round.label, until: String(round.countsAt), points: String(round.points) });
		this.#ports.post(text);
		for (const agent of this.#ports.alive()) this.#ports.notify(agent, text);
		this.#ports.emit({ type: "popularity_opened", round: this.#round + 1, until: round.countsAt, points: round.points });
	}

	#close(round: PopularityRound): void {
		const number = this.#round + 1;
		const { spec } = this.#ports;
		// A ballot of or for a resident who left the city since does not count.
		const ballots = [...this.#ballots].filter(([voter, choice]) => this.#ports.inCity(voter) && this.#ports.inCity(choice));
		const tally = new Map<CompetitorId, number>(this.#ports.alive().map((agent) => [agent, 0]));
		for (const [, choice] of ballots) tally.set(choice, (tally.get(choice) ?? 0) + 1);
		const counts = [...tally].map(([agent, votes]) => ({ agent, votes })).sort((a, b) => b.votes - a.votes || a.agent.localeCompare(b.agent));
		const top = counts[0]?.votes ?? 0;
		const winners = counts.filter((entry) => entry.votes === top && top > 0).map((entry) => entry.agent);
		const ranking = counts.map((entry) => `${entry.agent} ${entry.votes}`).join(", ");
		this.#ballots.clear();
		this.#round += 1;
		this.#state = this.#round >= spec.rounds.length ? "closed" : "pending";
		this.#ports.emit({
			type: "popularity_result",
			round: number,
			counts,
			winners,
			points: winners.length === 0 ? 0 : round.points,
			voters: ballots.map(([voter]) => voter).sort((a, b) => a.localeCompare(b)),
		});
		if (winners.length === 0) {
			this.#ports.post(renderTemplate(spec.texts.noVotes, { label: round.label, counts: ranking }));
		} else {
			for (const winner of winners) if (round.points > 0) this.#ports.grant(winner, round.points, "popularity vote");
			this.#ports.post(renderTemplate(spec.texts.result, { label: round.label, counts: ranking, winners: namesList(winners), points: String(round.points) }));
		}
		this.#ports.counted?.({ round: number, counts, winners, ranking });
	}
}
