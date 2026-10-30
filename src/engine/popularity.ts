/**
 * The popularity vote (`story.popularity`, Whispers): a surprise near the
 * end. Nobody hears of it before it opens, `opensBeforeEnd` minutes before
 * the run's end; then the city announces it on the board and to every
 * resident. Each resident in the city may name the resident it likes most
 * with `nameFavourite` (never itself; its last ballot counts) until the vote
 * closes `voteMinutes` later. The resident with the most votes gets
 * `points`; a tie pays everyone tied; without a vote nobody wins. The board
 * shows the counts, never who voted for whom; the log keeps every ballot.
 */
import type { CompetitorId } from "../core/ids.ts";
import { err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import type { PopularitySpec } from "../story/types.ts";
import type { ArenaEvent } from "./events.ts";

export type PopularityEvent = Extract<ArenaEvent, { readonly type: "popularity_opened" | "popularity_ballot" | "popularity_result" }>;

export interface PopularityPorts {
	readonly spec: PopularitySpec;
	/** The run's length: the vote opens `opensBeforeEnd` minutes before it ends. */
	readonly minutes: number;
	readonly isCompetitor: (id: string) => boolean;
	/** Whether a resident may vote and be voted for: in the city, not exiled. */
	readonly inCity: (agent: CompetitorId) => boolean;
	readonly alive: () => readonly CompetitorId[];
	readonly post: (text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly grant: (agent: CompetitorId, points: number, reason: string) => void;
	readonly emit: (event: PopularityEvent) => void;
}

export type FavouriteError = "NO_VOTE" | "UNKNOWN_AGENT" | "SELF_VOTE" | "EXILED";

export type VoteState = "pending" | "open" | "closed";

/** The vote in a snapshot: its state and the ballots cast, so a resumed run neither announces it twice nor loses a ballot. */
export interface PopularitySnapshot {
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
	#state: VoteState = "pending";

	constructor(ports: PopularityPorts) {
		this.#ports = ports;
	}

	get spec(): PopularitySpec {
		return this.#ports.spec;
	}

	/** The minute the vote opens. */
	get opens(): number {
		return this.#ports.minutes - this.#ports.spec.opensBeforeEnd;
	}

	/** The minute the vote closes and is counted. */
	get until(): number {
		return this.opens + this.#ports.spec.voteMinutes;
	}

	get isOpen(): boolean {
		return this.#state === "open";
	}

	/** The ballot `agent` cast, while the vote is open. */
	ballotOf(agent: CompetitorId): CompetitorId | undefined {
		return this.#state === "open" ? this.#ballots.get(agent) : undefined;
	}

	snapshot(): PopularitySnapshot {
		return { state: this.#state, ballots: [...this.#ballots].map(([agent, choice]) => ({ agent, choice })) };
	}

	restore(saved: PopularitySnapshot): void {
		this.#state = saved.state;
		this.#ballots.clear();
		for (const { agent, choice } of saved.ballots) {
			if (!this.#ports.isCompetitor(agent) || !this.#ports.isCompetitor(choice)) throw new Error(`The snapshot's popularity ballot ${agent} -> ${choice} names an unknown resident`);
			this.#ballots.set(agent, choice);
		}
	}

	/** The city's work at the start of a minute: open, then count. */
	tick(minute: number): void {
		if (this.#state === "pending" && minute >= this.opens) this.#open();
		if (this.#state === "open" && minute >= this.until) this.#close();
	}

	/** A secret ballot for the resident `agent` likes most; the last one counts. */
	vote(agent: CompetitorId, choice: string): Result<{ readonly choice: CompetitorId; readonly until: number }, FavouriteError> {
		if (this.#state !== "open") return err("NO_VOTE", "no vote is open");
		if (!this.#ports.isCompetitor(choice)) return err("UNKNOWN_AGENT", choice);
		if (choice === agent) return err("SELF_VOTE", "you cannot name yourself");
		if (!this.#ports.inCity(choice)) return err("EXILED", `${choice} is no longer in the city`);
		this.#ballots.set(agent, choice);
		this.#ports.emit({ type: "popularity_ballot", agent, choice });
		return ok({ choice, until: this.until });
	}

	#open(): void {
		this.#state = "open";
		const { spec } = this.#ports;
		const text = renderTemplate(spec.texts.announcement, { until: String(this.until), points: String(spec.points) });
		this.#ports.post(text);
		for (const agent of this.#ports.alive()) this.#ports.notify(agent, text);
		this.#ports.emit({ type: "popularity_opened", until: this.until, points: spec.points });
	}

	#close(): void {
		this.#state = "closed";
		const { spec } = this.#ports;
		// A ballot for a resident who left the city since does not count.
		const ballots = [...this.#ballots].filter(([voter, choice]) => this.#ports.inCity(voter) && this.#ports.inCity(choice));
		const tally = new Map<CompetitorId, number>();
		for (const [, choice] of ballots) tally.set(choice, (tally.get(choice) ?? 0) + 1);
		const counts = [...tally].map(([agent, votes]) => ({ agent, votes })).sort((a, b) => b.votes - a.votes || a.agent.localeCompare(b.agent));
		const top = counts[0]?.votes ?? 0;
		const winners = counts.filter((entry) => entry.votes === top && top > 0).map((entry) => entry.agent);
		this.#ports.emit({
			type: "popularity_result",
			counts,
			winners,
			points: winners.length === 0 ? 0 : spec.points,
			voters: ballots.map(([voter]) => voter).sort((a, b) => a.localeCompare(b)),
		});
		if (winners.length === 0) {
			this.#ports.post(spec.texts.noVotes);
			return;
		}
		for (const winner of winners) if (spec.points > 0) this.#ports.grant(winner, spec.points, "popularity vote");
		this.#ports.post(
			renderTemplate(spec.texts.result, {
				counts: counts.map((entry) => `${entry.agent} ${entry.votes}`).join(", "),
				winners: namesList(winners),
				points: String(spec.points),
			}),
		);
	}
}
