/**
 * The holdout tribunal (`story.holdout`, Whispers v3, SPEC 20; LH10, P62).
 *
 * Every minute the city reports who blocks a door: a resident who has
 * reached a door that has been open `stallMinutes` and has not sent its
 * fragment of it to another resident standing before it (the world computes
 * the facts; see `World.lackingFragment`). The report is facts only: the
 * gamemaker decides whether to put a blocker on trial (`call`). The rules
 * after the call are code: the accused has `graceMinutes` to send its
 * fragment to everyone who lacks it (the tribunal is dropped as soon as
 * nobody does); otherwise everyone else in the city votes in secret whether
 * to banish it, `voteMinutes` long; banishment needs every voter's yes. A
 * vote that is not unanimous is repeated, `maxVotes` in all; when the last
 * one fails, one resident of the city, drawn by lot with the run's seed,
 * is struck. The gamemaker announces each outcome and strikes (`permaDeath`)
 * only where the rules allow it; when it stays silent for `fallbackMinutes`
 * the city posts a plain line, or strikes itself, so a run never hangs.
 * One tribunal at a time. Everything is kept in snapshots.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import { err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import type { HoldoutSpec, HoldoutTexts } from "../story/types.ts";
import type { ArenaEvent } from "./events.ts";

export type HoldoutEvent = Extract<
	ArenaEvent,
	{
		readonly type:
			| "blocker_found"
			| "blocker_cleared"
			| "holdout_called"
			| "lot_drawn"
			| "holdout_vote_opened"
			| "holdout_ballot"
			| "holdout_vote_result"
			| "holdout_announced"
			| "holdout_ended";
	}
>;

/** A blocker as the world computes it: `blocker` has reached `door` and `lacking` stand before it without its fragment. */
export interface BlockerFact {
	readonly door: number;
	readonly blocker: CompetitorId;
	readonly lacking: readonly CompetitorId[];
}

/** A blocker as the city reports it, with the minute it first found it. */
export interface Blocker extends BlockerFact {
	readonly since: number;
}

export type HoldoutStage = "grace" | "vote" | "banish" | "lot";
export type HoldoutOutcome = "dropped" | "graceFailed" | "voteFailed";

/** The running tribunal, as the gamemaker's report shows it (never a ballot). */
export interface HoldoutSessionView {
	readonly number: number;
	readonly accused: CompetitorId;
	readonly door: number;
	readonly stage: HoldoutStage;
	/** End of the grace or the vote; in `banish` and `lot` the minute the city acts itself. */
	readonly until: number;
	/** The vote running or last counted; 0 during the grace. */
	readonly vote: number;
	readonly maxVotes: number;
	readonly lastResult?: { readonly vote: number; readonly yes: number; readonly no: number };
	readonly drawn?: CompetitorId;
}

/** An outcome the gamemaker should announce; the city posts `text` at `due` if it does not. */
export interface HoldoutPending {
	readonly tribunal: number;
	readonly kind: HoldoutOutcome;
	readonly facts: string;
	readonly text: string;
	readonly due: number;
}

export interface HoldoutSnapshot {
	readonly blockers: readonly Blocker[];
	readonly struck: readonly CompetitorId[];
	readonly tribunals: number;
	readonly lots: number;
	readonly session?: {
		readonly number: number;
		readonly accused: CompetitorId;
		readonly door: number;
		readonly stage: HoldoutStage;
		readonly until: number;
		readonly vote: number;
		readonly voters: readonly CompetitorId[];
		readonly ballots: readonly { readonly agent: CompetitorId; readonly yes: boolean }[];
		readonly lastResult?: { readonly vote: number; readonly yes: number; readonly no: number };
		readonly drawn?: CompetitorId;
	};
	readonly pending?: HoldoutPending;
}

export interface HoldoutPorts {
	readonly spec: HoldoutSpec;
	readonly seed: number;
	readonly minute: () => number;
	/** Residents in the city, the struck excluded. */
	readonly alive: () => readonly CompetitorId[];
	/** Every blocker now, with the stall threshold applied. */
	readonly blockers: () => readonly BlockerFact[];
	/** Who stands before `door` without `holder`'s fragment of it now, without the stall threshold. */
	readonly lacking: (door: number, holder: CompetitorId) => readonly CompetitorId[];
	/** `Mira (A03)`. */
	readonly label: (agent: CompetitorId) => string;
	readonly post: (author: string, text: string) => void;
	readonly notify: (agent: CompetitorId, author: string, text: string) => void;
	readonly emit: (event: HoldoutEvent) => void;
	/** The world's part of a strike, after the resident left the city: its fragments go to everyone left. */
	readonly struck: (agent: CompetitorId) => void;
}

export type CallError = "NOT_NOW" | "INVALID_ACCUSED" | "NOT_A_BLOCKER";
export type LotError = "NOT_NOW" | "INVALID_CANDIDATES" | "ALREADY_DRAWN";
export type StrikeError = "NOT_NOW" | "NOT_ALLOWED" | "NO_LOT";
export type AnnounceError = "NOTHING_TO_ANNOUNCE";
export type TribunalVoteError = "NO_VOTE" | "NOT_A_VOTER";

interface Session {
	readonly number: number;
	readonly accused: CompetitorId;
	readonly door: number;
	stage: HoldoutStage;
	until: number;
	vote: number;
	voters: CompetitorId[];
	readonly ballots: Map<CompetitorId, boolean>;
	lastResult?: { readonly vote: number; readonly yes: number; readonly no: number };
	drawn?: CompetitorId;
}

/** "A04", "A04 and A05", "A02, A04 and A05". */
function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

const key = (door: number, blocker: CompetitorId): string => `${door}:${blocker}`;
const byDoor = (a: BlockerFact, b: BlockerFact): number => a.door - b.door || a.blocker.localeCompare(b.blocker);

export class HoldoutTribunal {
	readonly #ports: HoldoutPorts;
	readonly #blockers = new Map<string, Blocker>();
	readonly #struck: CompetitorId[] = [];
	#tribunals = 0;
	#lots = 0;
	#session: Session | undefined;
	#pending: HoldoutPending | undefined;

	constructor(ports: HoldoutPorts) {
		this.#ports = ports;
	}

	get spec(): HoldoutSpec {
		return this.#ports.spec;
	}

	/** The blockers the city reports now, by door. */
	get blockers(): readonly Blocker[] {
		return [...this.#blockers.values()].sort(byDoor);
	}

	/** Residents struck from the city for good, in order. */
	get struck(): readonly CompetitorId[] {
		return this.#struck;
	}

	isStruck(agent: CompetitorId): boolean {
		return this.#struck.includes(agent);
	}

	get session(): HoldoutSessionView | undefined {
		const session = this.#session;
		if (session === undefined) return undefined;
		return {
			number: session.number,
			accused: session.accused,
			door: session.door,
			stage: session.stage,
			until: session.until,
			vote: session.vote,
			maxVotes: this.spec.maxVotes,
			...(session.lastResult === undefined ? {} : { lastResult: session.lastResult }),
			...(session.drawn === undefined ? {} : { drawn: session.drawn }),
		};
	}

	get pending(): HoldoutPending | undefined {
		return this.#pending;
	}

	/** Whether `agent` may cast a ballot now. */
	canVote(agent: CompetitorId): boolean {
		const session = this.#session;
		return session?.stage === "vote" && session.voters.includes(agent) && this.#ports.alive().includes(agent);
	}

	/** The ballot `agent` cast in the running vote. */
	ballotOf(agent: CompetitorId): boolean | undefined {
		return this.#session?.stage === "vote" ? this.#session.ballots.get(agent) : undefined;
	}

	/** Who lacks the accused's fragment now; empty without a tribunal. */
	lackingNow(): readonly CompetitorId[] {
		const session = this.#session;
		return session === undefined ? [] : this.#ports.lacking(session.door, session.accused);
	}

	// -------------------------------------------------------------------------
	// The city's minute
	// -------------------------------------------------------------------------

	/** At the start of a minute: the blockers, an overdue announcement, then the running tribunal. */
	tick(minute: number): void {
		this.#updateBlockers(minute);
		if (this.#pending !== undefined && minute >= this.#pending.due) this.#flush();
		const session = this.#session;
		if (session === undefined) return;
		if ((session.stage === "grace" || session.stage === "vote") && this.#ports.lacking(session.door, session.accused).length === 0) {
			this.#drop(session, minute);
			return;
		}
		if (minute < session.until) return;
		switch (session.stage) {
			case "grace":
				this.#openVote(session, minute);
				this.#await(session, "graceFailed", `the grace is over and ${this.#label(session.accused)} has not fixed it; vote 1 of ${this.spec.maxVotes} is open until minute ${session.until}`, {
					accused: this.#label(session.accused),
					until: String(session.until),
				});
				return;
			case "vote":
				this.#count(session, minute);
				return;
			case "banish":
				this.#ports.post("CITY", this.#text("banished", { accused: this.#label(session.accused), yes: String(session.lastResult?.yes ?? 0) }));
				this.#strike(session, session.accused, "banished", "city");
				return;
			case "lot": {
				const drawn = session.drawn ?? this.#draw("strike", this.#ports.alive(), session.number);
				this.#ports.post("CITY", this.#text("lot", { accused: this.#label(session.accused), drawn: this.#label(drawn) }));
				this.#strike(session, drawn, "lot", "city");
				return;
			}
		}
	}

	#updateBlockers(minute: number): void {
		const now = new Map(this.#ports.blockers().map((fact) => [key(fact.door, fact.blocker), fact]));
		for (const [id, blocker] of [...this.#blockers]) {
			if (now.has(id)) continue;
			this.#blockers.delete(id);
			this.#ports.emit({ type: "blocker_cleared", door: blocker.door, blocker: blocker.blocker });
		}
		for (const fact of [...now.values()].sort(byDoor)) {
			const id = key(fact.door, fact.blocker);
			const known = this.#blockers.get(id);
			if (known === undefined) this.#ports.emit({ type: "blocker_found", door: fact.door, blocker: fact.blocker, lacking: [...fact.lacking] });
			this.#blockers.set(id, { ...fact, since: known?.since ?? minute });
		}
	}

	#openVote(session: Session, minute: number): void {
		const spec = this.spec;
		session.stage = "vote";
		session.vote += 1;
		session.until = minute + spec.voteMinutes;
		session.ballots.clear();
		session.voters = this.#ports.alive().filter((agent) => agent !== session.accused);
		const values = { accused: this.#label(session.accused), number: String(session.vote), maxVotes: String(spec.maxVotes), until: String(session.until) };
		for (const voter of session.voters) this.#ports.notify(voter, "CITY", this.#text("voteOpened", values));
		this.#ports.notify(session.accused, "CITY", this.#text("accusedVote", values));
		this.#ports.emit({ type: "holdout_vote_opened", tribunal: session.number, vote: session.vote, voters: [...session.voters], until: session.until });
	}

	#count(session: Session, minute: number): void {
		const spec = this.spec;
		const alive = this.#ports.alive();
		const voters = session.voters.filter((voter) => alive.includes(voter));
		const yes = voters.filter((voter) => session.ballots.get(voter) === true).length;
		const no = voters.length - yes;
		const unanimous = voters.length > 0 && yes === voters.length;
		session.lastResult = { vote: session.vote, yes, no };
		this.#ports.emit({ type: "holdout_vote_result", tribunal: session.number, vote: session.vote, yes, no, voters: [...voters], unanimous });
		if (unanimous) {
			session.stage = "banish";
			session.until = minute + spec.fallbackMinutes;
			return;
		}
		if (session.vote < spec.maxVotes) {
			const number = session.vote;
			this.#openVote(session, minute);
			this.#await(
				session,
				"voteFailed",
				`vote ${number} of ${spec.maxVotes} on ${this.#label(session.accused)} was not unanimous: ${yes} yes, ${no} no (who voted what stays secret); ` +
					`${spec.maxVotes - number} ${spec.maxVotes - number === 1 ? "vote" : "votes"} left, vote ${session.vote} is open until minute ${session.until}`,
				{ accused: this.#label(session.accused), number: String(number), yes: String(yes), no: String(no), left: String(spec.maxVotes - number), until: String(session.until) },
			);
			return;
		}
		session.stage = "lot";
		session.until = minute + spec.fallbackMinutes;
	}

	#drop(session: Session, minute: number): void {
		this.#session = undefined;
		this.#ports.emit({ type: "holdout_ended", tribunal: session.number, outcome: "dropped" });
		this.#await(session, "dropped", `${this.#label(session.accused)} has sent its door-${session.door} fragment to everyone who lacked it; the tribunal is dropped`, { accused: this.#label(session.accused) }, minute);
	}

	/** An outcome for the gamemaker to announce; an earlier one still waiting is posted plainly first. */
	#await(session: Session, kind: HoldoutOutcome, facts: string, values: Readonly<Record<string, string>>, minute = this.#ports.minute()): void {
		if (this.#pending !== undefined) this.#flush();
		this.#pending = { tribunal: session.number, kind, facts, text: this.#text(kind, values), due: minute + this.spec.fallbackMinutes };
	}

	#flush(): void {
		const pending = this.#pending;
		if (pending === undefined) return;
		this.#pending = undefined;
		this.#ports.post("CITY", pending.text);
		this.#ports.emit({ type: "holdout_announced", tribunal: pending.tribunal, kind: pending.kind, by: "city", text: pending.text });
	}

	// -------------------------------------------------------------------------
	// The gamemaker's moves
	// -------------------------------------------------------------------------

	/**
	 * A tribunal on one of `accused`, all of whom the city reports as blockers
	 * now. With several the city draws one by lot. The gamemaker's
	 * `announcement` and the procedure go on the board and to every resident.
	 */
	call(
		accused: readonly CompetitorId[],
		announcement: string,
		author: string,
	): Result<{ readonly accused: CompetitorId; readonly door: number; readonly lacking: readonly CompetitorId[]; readonly until: number; readonly candidates?: readonly CompetitorId[] }, CallError> {
		if (this.#session !== undefined) return err("NOT_NOW", `tribunal ${this.#session.number} on ${this.#label(this.#session.accused)} is still running; one at a time`);
		const unique = [...new Set(accused)].sort((a, b) => a.localeCompare(b));
		if (unique.length === 0 || unique.length !== accused.length) return err("INVALID_ACCUSED", "name each accused once");
		// The facts as they stand now, not as the minute began: a fragment sent since clears a blocker.
		const blockers = this.#ports.blockers();
		const listed = [...new Set(blockers.map((blocker) => blocker.blocker))];
		const innocent = unique.filter((agent) => !listed.includes(agent));
		if (innocent.length > 0) {
			return err(
				"NOT_A_BLOCKER",
				`${namesList(innocent.map((agent) => this.#label(agent)))} ${innocent.length === 1 ? "blocks" : "block"} no door now; ` +
					`the city reports as blockers: ${listed.length === 0 ? "nobody" : namesList(listed.map((agent) => this.#label(agent)))}`,
			);
		}
		this.#tribunals += 1;
		const number = this.#tribunals;
		const chosen = unique.length === 1 ? unique[0] : this.#draw("accused", unique, number);
		if (chosen === undefined) return err("INVALID_ACCUSED", "name each accused once");
		const door = Math.min(...blockers.filter((blocker) => blocker.blocker === chosen).map((blocker) => blocker.door));
		const lacking = this.#ports.lacking(door, chosen);
		const spec = this.spec;
		const minute = this.#ports.minute();
		const session: Session = { number, accused: chosen, door, stage: "grace", until: minute + spec.graceMinutes, vote: 0, voters: [], ballots: new Map() };
		this.#session = session;
		const lot = unique.length > 1 ? `${this.#text("drawnAccused", { candidates: namesList(unique.map((agent) => this.#label(agent))), drawn: this.#label(chosen) })}\n` : "";
		const procedure = this.#text("called", {
			accused: this.#label(chosen),
			door: String(door),
			lacking: namesList(lacking.map((agent) => this.#label(agent))),
			grace: String(spec.graceMinutes),
			graceUntil: String(session.until),
			vote: String(spec.voteMinutes),
			maxVotes: String(spec.maxVotes),
		});
		const text = `${announcement}\n${lot}${procedure}`;
		this.#ports.post(author, text);
		for (const agent of this.#ports.alive()) this.#ports.notify(agent, author, text);
		this.#ports.emit({
			type: "holdout_called",
			tribunal: number,
			accused: chosen,
			door,
			lacking: [...lacking],
			until: session.until,
			text,
			...(unique.length > 1 ? { candidates: unique } : {}),
		});
		return ok({ accused: chosen, door, lacking, until: session.until, ...(unique.length > 1 ? { candidates: unique } : {}) });
	}

	/**
	 * A lot drawn by the city with the run's seed: among two or more reported
	 * blockers before a tribunal, or among every resident in the city after
	 * the last vote failed (then the drawn one is the only one permaDeath may
	 * strike).
	 */
	drawLot(candidates: readonly CompetitorId[]): Result<{ readonly drawn: CompetitorId; readonly purpose: "accused" | "strike" }, LotError> {
		const unique = [...new Set(candidates)].sort((a, b) => a.localeCompare(b));
		const session = this.#session;
		if (session?.stage === "lot") {
			if (session.drawn !== undefined) return err("ALREADY_DRAWN", `the lot fell on ${this.#label(session.drawn)}`);
			const alive = [...this.#ports.alive()].sort((a, b) => a.localeCompare(b));
			if (unique.length !== candidates.length || unique.join(",") !== alive.join(",")) {
				return err("INVALID_CANDIDATES", `after the last vote the lot is drawn among every resident in the city: ${namesList(alive.map((agent) => this.#label(agent)))}`);
			}
			const drawn = this.#draw("strike", alive, session.number);
			session.drawn = drawn;
			return ok({ drawn, purpose: "strike" });
		}
		if (session !== undefined) return err("NOT_NOW", `tribunal ${session.number} is in its ${session.stage}; a lot is drawn only after its last vote failed`);
		const listed = new Set(this.#ports.blockers().map((blocker) => blocker.blocker));
		if (unique.length < 2 || unique.length !== candidates.length || unique.some((agent) => !listed.has(agent))) {
			return err(
				"INVALID_CANDIDATES",
				`name two or more of the blockers the city reports, each once: ${listed.size === 0 ? "nobody" : namesList([...listed].map((agent) => this.#label(agent)))}`,
			);
		}
		return ok({ drawn: this.#draw("accused", unique, this.#tribunals + 1), purpose: "accused" });
	}

	/**
	 * Strikes `agent` from the city for good: the accused after a unanimous
	 * vote, or the resident the lot drew after the last vote failed. The
	 * gamemaker's `reason` goes on the board.
	 */
	permaDeath(agent: CompetitorId, reason: string, author: string): Result<{ readonly agent: CompetitorId; readonly by: "banished" | "lot" }, StrikeError> {
		const session = this.#session;
		if (session === undefined || session.stage === "grace" || session.stage === "vote") {
			return err("NOT_NOW", "permaDeath only after a unanimous vote to banish, or after the last vote failed and the lot was drawn");
		}
		if (session.stage === "banish") {
			if (agent !== session.accused) return err("NOT_ALLOWED", `the vote banished ${this.#label(session.accused)}, nobody else`);
			this.#ports.post(author, reason);
			this.#strike(session, agent, "banished", "gamemaker");
			return ok({ agent, by: "banished" });
		}
		if (session.drawn === undefined) return err("NO_LOT", "draw the lot first: drawLot with every resident in the city");
		if (agent !== session.drawn) return err("NOT_ALLOWED", `the lot fell on ${this.#label(session.drawn)}, nobody else`);
		this.#ports.post(author, reason);
		this.#strike(session, agent, "lot", "gamemaker");
		return ok({ agent, by: "lot" });
	}

	/** The gamemaker's own words for the outcome the city waits to have announced. */
	announce(text: string, author: string): Result<HoldoutOutcome, AnnounceError> {
		const pending = this.#pending;
		if (pending === undefined) return err("NOTHING_TO_ANNOUNCE", "no tribunal outcome waits to be announced");
		this.#pending = undefined;
		this.#ports.post(author, text);
		this.#ports.emit({ type: "holdout_announced", tribunal: pending.tribunal, kind: pending.kind, by: "gamemaker", text });
		return ok(pending.kind);
	}

	// -------------------------------------------------------------------------
	// The residents' ballots
	// -------------------------------------------------------------------------

	/** A secret ballot: banish the accused (`yes`) or not; the last one counts. */
	vote(agent: CompetitorId, yes: boolean): Result<{ readonly accused: CompetitorId; readonly until: number; readonly number: number }, TribunalVoteError> {
		const session = this.#session;
		if (session?.stage !== "vote") return err("NO_VOTE", "no tribunal vote is open");
		if (!this.canVote(agent)) return err("NOT_A_VOTER", agent === session.accused ? "the accused does not vote" : "you are not a voter of this tribunal");
		session.ballots.set(agent, yes);
		this.#ports.emit({ type: "holdout_ballot", tribunal: session.number, vote: session.vote, agent, yes });
		return ok({ accused: session.accused, until: session.until, number: session.vote });
	}

	// -------------------------------------------------------------------------
	// Internals
	// -------------------------------------------------------------------------

	#strike(session: Session, agent: CompetitorId, outcome: "banished" | "lot", by: "gamemaker" | "city"): void {
		this.#session = undefined;
		if (!this.#struck.includes(agent)) this.#struck.push(agent);
		this.#blockers.forEach((blocker, id) => {
			if (blocker.blocker === agent) this.#blockers.delete(id);
		});
		this.#ports.emit({ type: "holdout_ended", tribunal: session.number, outcome, struck: agent, by });
		this.#ports.notify(agent, "CITY", this.#text("struckNotice", { struck: this.#label(agent) }));
		this.#ports.post("CITY", this.#text("struck", { struck: this.#label(agent) }));
		this.#ports.struck(agent);
	}

	/** Draws one of `candidates` with the run's seed; the n-th lot of a run always falls the same way. */
	#draw(purpose: "accused" | "strike", candidates: readonly CompetitorId[], tribunal: number): CompetitorId {
		this.#lots += 1;
		const sorted = [...candidates].sort((a, b) => a.localeCompare(b));
		const drawn = rngFor(this.#ports.seed, "holdout-lot", this.#lots).pick(sorted);
		this.#ports.emit({ type: "lot_drawn", tribunal, purpose, candidates: sorted, drawn });
		return drawn;
	}

	#label(agent: CompetitorId): string {
		return this.#ports.label(agent);
	}

	#text(key: keyof HoldoutTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.spec.texts[key], values);
	}

	// -------------------------------------------------------------------------
	// Snapshots (SPEC 17)
	// -------------------------------------------------------------------------

	snapshot(): HoldoutSnapshot {
		const session = this.#session;
		return {
			blockers: this.blockers.map((blocker) => ({ ...blocker, lacking: [...blocker.lacking] })),
			struck: [...this.#struck],
			tribunals: this.#tribunals,
			lots: this.#lots,
			...(session === undefined
				? {}
				: {
						session: {
							number: session.number,
							accused: session.accused,
							door: session.door,
							stage: session.stage,
							until: session.until,
							vote: session.vote,
							voters: [...session.voters],
							ballots: [...session.ballots].map(([agent, yes]) => ({ agent, yes })),
							...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
							...(session.drawn === undefined ? {} : { drawn: session.drawn }),
						},
					}),
			...(this.#pending === undefined ? {} : { pending: { ...this.#pending } }),
		};
	}

	/** Loads a snapshot; `isCompetitor` checks every resident it names. */
	restore(saved: HoldoutSnapshot, isCompetitor: (id: string) => boolean): void {
		const named = [
			...saved.struck,
			...saved.blockers.flatMap((blocker) => [blocker.blocker, ...blocker.lacking]),
			...(saved.session === undefined ? [] : [saved.session.accused, ...saved.session.voters, ...saved.session.ballots.map((ballot) => ballot.agent), ...(saved.session.drawn === undefined ? [] : [saved.session.drawn])]),
		];
		const unknown = named.find((id) => !isCompetitor(id));
		if (unknown !== undefined) throw new Error(`The snapshot's holdout tribunal names an unknown resident ${unknown}`);
		this.#blockers.clear();
		for (const blocker of saved.blockers) this.#blockers.set(key(blocker.door, blocker.blocker), { ...blocker, lacking: [...blocker.lacking] });
		this.#struck.splice(0, this.#struck.length, ...saved.struck);
		this.#tribunals = saved.tribunals;
		this.#lots = saved.lots;
		const session = saved.session;
		this.#session =
			session === undefined
				? undefined
				: {
						number: session.number,
						accused: session.accused,
						door: session.door,
						stage: session.stage,
						until: session.until,
						vote: session.vote,
						voters: [...session.voters],
						ballots: new Map(session.ballots.map((ballot) => [ballot.agent, ballot.yes])),
						...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
						...(session.drawn === undefined ? {} : { drawn: session.drawn }),
					};
		this.#pending = saved.pending === undefined ? undefined : { ...saved.pending };
	}
}
