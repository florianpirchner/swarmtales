// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal (old `HoldoutTribunal`, carried from the old `mechanics/standoff-tribunal/src/court.ts` over
 * the state the mechanic owns). Every tick the city reports who blocks a door (`watch.ts`). The Director decides
 * whether to put a blocker on trial (`call`); with several blockers the city draws the accused. The accused has
 * `graceMinutes` to fix it; otherwise everyone else votes in secret, `voteMinutes` long, banishment needs every
 * voter's yes, `maxVotes` in all; after the last one fails one resident drawn by lot is struck, once per door. The
 * Director announces each outcome and strikes; the city does so itself after `fallbackMinutes`.
 */
import { err, ok, type Result } from "./result.ts";
import { renderTemplate } from "./template.ts";
import type { HoldoutData, HoldoutOutcome, HoldoutPorts, HoldoutRule, HoldoutTexts, Session } from "./types.ts";
import { namesList, notePresent, qualified, updateBlockers } from "./watch.ts";

/**
 * Why a call of a tribunal is refused.
 *
 * @public
 */
export type CallError = "NOT_NOW" | "INVALID_ACCUSED" | "NOT_A_BLOCKER";

/**
 * Why `drawLot` is refused.
 *
 * @public
 */
export type LotError = "NOT_NOW" | "INVALID_CANDIDATES" | "ALREADY_DRAWN";

/**
 * Why `permaDeath` is refused.
 *
 * @public
 */
export type StrikeError = "NOT_NOW" | "NOT_ALLOWED" | "NO_LOT";

/**
 * Why `announceTribunal` is refused.
 *
 * @public
 */
export type AnnounceError = "NOTHING_TO_ANNOUNCE";

/**
 * Why a ballot is refused.
 *
 * @public
 */
export type TribunalVoteError = "NO_VOTE" | "NOT_A_VOTER";

/**
 * A called tribunal, as the reply names it.
 *
 * @public
 */
export interface Called {
	/** The accused. */
	readonly accused: string;
	/** The door. */
	readonly door: number;
	/** Who lacks the accused's fragment. */
	readonly lacking: readonly string[];
	/** The tick the grace ends. */
	readonly until: number;
	/** The blockers the lot drew the accused among. */
	readonly candidates?: readonly string[];
}

/**
 * The court over the state of the mechanic and the ports of the call at hand.
 *
 * @public
 */
export class HoldoutCourt {
	readonly #ports: HoldoutPorts;
	readonly #rule: HoldoutRule;
	readonly #data: HoldoutData;

	/**
	 * Builds the court.
	 *
	 * @param rule - The options.
	 * @param ports - What the court reads and does in the city.
	 * @param data - The state.
	 */
	constructor(rule: HoldoutRule, ports: HoldoutPorts, data: HoldoutData) {
		this.#rule = rule;
		this.#ports = ports;
		this.#data = data;
	}

	/**
	 * Whether `agent` may cast a ballot now.
	 *
	 * @param agent - The resident.
	 * @returns True during a vote it is a voter of.
	 */
	canVote(agent: string): boolean {
		const session = this.#data.session;
		return session?.stage === "vote" && session.voters.includes(agent) && this.#ports.alive().includes(agent);
	}

	/**
	 * The ballot `agent` cast in the running vote.
	 *
	 * @param agent - The resident.
	 * @returns Its ballot, or undefined.
	 */
	ballotOf(agent: string): boolean | undefined {
		return this.#data.session?.stage === "vote" ? this.#data.session.ballots.get(agent) : undefined;
	}

	/**
	 * Who lacks the accused's fragment now.
	 *
	 * @returns The residents; empty without a tribunal.
	 */
	lackingNow(): readonly string[] {
		const session = this.#data.session;
		return session === undefined ? [] : this.#ports.lacking(session.door, session.accused);
	}

	/**
	 * The accused's DMs to those who still lack its fragment pass the DM cap, during its grace and votes.
	 *
	 * @param from - The sender.
	 * @param to - The receiver.
	 * @returns True when the message is exempt.
	 */
	exemptFromCap(from: string, to: string): boolean {
		const session = this.#data.session;
		if (session?.accused !== from || (session.stage !== "grace" && session.stage !== "vote")) return false;
		return this.lackingNow().includes(to);
	}

	/**
	 * At the start of a tick: the blockers, an overdue announcement, then the running tribunal.
	 *
	 * @param minute - The tick.
	 */
	tick(minute: number): void {
		notePresent(this.#data, this.#ports, minute);
		updateBlockers(this.#data, this.#rule, this.#ports, minute);
		const data = this.#data;
		if (data.pending !== undefined && minute >= data.pending.due) this.#flush();
		const session = data.session;
		if (session === undefined) return;
		if ((session.stage === "grace" || session.stage === "vote") && this.#ports.lacking(session.door, session.accused).length === 0) {
			this.#drop(session, minute);
			return;
		}
		if (minute >= session.until) this.#stageOver(session, minute);
	}

	// The end of the stage (the switch of the old `tick`).
	#stageOver(session: Session, minute: number): void {
		switch (session.stage) {
			case "grace":
				this.#openVote(session, minute);
				this.#await(session, "graceFailed", `the grace is over and ${this.#label(session.accused)} has not fixed it; vote 1 of ${String(this.#rule.maxVotes)} is open until minute ${String(session.until)}`, {
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

	#openVote(session: Session, minute: number): void {
		const rule = this.#rule;
		session.stage = "vote";
		session.vote += 1;
		session.until = minute + rule.voteMinutes;
		session.ballots.clear();
		session.voters = this.#ports.alive().filter((agent) => agent !== session.accused);
		const values = { accused: this.#label(session.accused), number: String(session.vote), maxVotes: String(rule.maxVotes), until: String(session.until) };
		for (const voter of session.voters) this.#ports.notify(voter, "CITY", this.#text("voteOpened", values));
		this.#ports.notify(session.accused, "CITY", this.#text("accusedVote", values));
		this.#ports.emit("holdout_vote_opened", { tribunal: session.number, vote: session.vote, voters: [...session.voters], until: session.until });
	}

	// The count of a closed vote: banish, the next vote, the lot, or spared at a door the lot struck before.
	#count(session: Session, minute: number): void {
		const rule = this.#rule;
		const alive = this.#ports.alive();
		const voters = session.voters.filter((voter) => alive.includes(voter));
		const yes = voters.filter((voter) => session.ballots.get(voter) === true).length;
		const no = voters.length - yes;
		const unanimous = voters.length > 0 && yes === voters.length;
		session.lastResult = { vote: session.vote, yes, no };
		this.#ports.emit("holdout_vote_result", { tribunal: session.number, vote: session.vote, yes, no, voters: [...voters], unanimous });
		if (unanimous || (session.vote >= rule.maxVotes && !this.#data.lotDoors.includes(session.door))) {
			session.stage = unanimous ? "banish" : "lot";
			session.until = minute + rule.fallbackMinutes;
		} else if (session.vote < rule.maxVotes) this.#nextVote(session, minute, yes, no);
		else this.#spare(session, minute);
	}

	#nextVote(session: Session, minute: number, yes: number, no: number): void {
		const { maxVotes } = this.#rule;
		const number = session.vote;
		const left = maxVotes - number;
		this.#openVote(session, minute);
		this.#await(
			session,
			"voteFailed",
			`vote ${String(number)} of ${String(maxVotes)} on ${this.#label(session.accused)} was not unanimous: ${String(yes)} yes, ${String(no)} no (who voted what stays secret); ` +
				`${String(left)} ${left === 1 ? "vote" : "votes"} left, vote ${String(session.vote)} is open until minute ${String(session.until)}`,
			{ accused: this.#label(session.accused), number: String(number), yes: String(yes), no: String(no), left: String(left), until: String(session.until) },
		);
	}

	#spare(session: Session, minute: number): void {
		this.#end(minute);
		this.#ports.emit("holdout_ended", { tribunal: session.number, outcome: "spared" });
		const facts = `every vote on ${this.#label(session.accused)} failed, and the lot has struck at door ${String(session.door)} before (once per door): nobody is struck, the tribunal ends`;
		this.#await(session, "spared", facts, { accused: this.#label(session.accused), door: String(session.door) }, minute);
	}

	#drop(session: Session, minute: number): void {
		this.#end(minute);
		this.#ports.emit("holdout_ended", { tribunal: session.number, outcome: "dropped" });
		this.#await(session, "dropped", `${this.#label(session.accused)} has sent its door-${String(session.door)} fragment to everyone who lacked it; the tribunal is dropped`, { accused: this.#label(session.accused) }, minute);
	}

	#end(minute: number): void {
		this.#data.session = undefined;
		this.#data.cooldownUntil = minute + this.#rule.stallMinutes;
	}

	#await(session: Session, kind: HoldoutOutcome, facts: string, values: Readonly<Record<string, string>>, minute = this.#ports.minute()): void {
		if (this.#data.pending !== undefined) this.#flush();
		this.#data.pending = { tribunal: session.number, kind, facts, text: this.#text(kind, values), due: minute + this.#rule.fallbackMinutes };
	}

	#flush(): void {
		const pending = this.#data.pending;
		if (pending === undefined) return;
		this.#data.pending = undefined;
		this.#ports.post("CITY", pending.text);
		this.#ports.emit("holdout_announced", { tribunal: pending.tribunal, kind: pending.kind, by: "city", text: pending.text });
	}

	/**
	 * A tribunal on a blocker the city reports now; with several, the city draws the accused among all of them.
	 *
	 * @param accused - The residents the Director names.
	 * @param announcement - The Director's announcement, checked.
	 * @param author - The name on the post and the notices.
	 * @returns The tribunal, or why not.
	 */
	call(accused: readonly string[], announcement: string, author: string): Result<Called, CallError> {
		const data = this.#data;
		const minute = this.#ports.minute();
		const refused = this.#notNow(minute);
		if (refused !== undefined) return refused;
		const unique = [...new Set(accused)].sort((a, b) => a.localeCompare(b));
		if (unique.length === 0 || unique.length !== accused.length) return err("INVALID_ACCUSED", "name each accused once");
		// The facts as they stand now, not as the tick began: a fragment sent since clears a blocker.
		const blockers = qualified(data, this.#rule, this.#ports, minute);
		const listed = [...new Set(blockers.map((blocker) => blocker.blocker))].sort((a, b) => a.localeCompare(b));
		const innocent = unique.filter((agent) => !listed.includes(agent));
		if (innocent.length > 0) {
			return err(
				"NOT_A_BLOCKER",
				`${namesList(innocent.map((agent) => this.#label(agent)))} ${innocent.length === 1 ? "blocks" : "block"} no door now; ` +
					`the city reports as blockers: ${listed.length === 0 ? "nobody" : namesList(listed.map((agent) => this.#label(agent)))}`,
			);
		}
		data.tribunals += 1;
		const number = data.tribunals;
		const several = listed.length > 1;
		const chosen = several ? this.#draw("accused", listed, number) : listed[0];
		if (chosen === undefined) return err("INVALID_ACCUSED", "name each accused once");
		const door = Math.min(...blockers.filter((blocker) => blocker.blocker === chosen).map((blocker) => blocker.door));
		// Called after the residents' turns of this tick: the accused gets `graceMinutes` whole ticks of turns from the next one.
		const session: Session = { number, accused: chosen, door, stage: "grace", until: minute + this.#rule.graceMinutes + 1, vote: 0, voters: [], ballots: new Map() };
		data.session = session;
		return ok(this.#announce(session, several ? listed : undefined, announcement, author));
	}

	// One tribunal at a time, and none in the pause after one (the first checks of the old `call`).
	#notNow(minute: number): { readonly ok: false; readonly error: CallError; readonly detail: string } | undefined {
		const data = this.#data;
		if (data.session !== undefined) return { ok: false, error: "NOT_NOW", detail: `tribunal ${String(data.session.number)} on ${this.#label(data.session.accused)} is still running; one at a time` };
		if (minute < data.cooldownUntil) return { ok: false, error: "NOT_NOW", detail: `a tribunal ended a short while ago; the next may be called from minute ${String(data.cooldownUntil)}` };
		return undefined;
	}

	// The post, the notices and `holdout_called` of a called tribunal (the second half of the old `call`).
	#announce(session: Session, candidates: readonly string[] | undefined, announcement: string, author: string): Called {
		const { accused, door, until, number } = session;
		const lacking = this.#ports.lacking(door, accused);
		const rule = this.#rule;
		const lot = candidates === undefined ? "" : `${this.#text("drawnAccused", { candidates: namesList(candidates.map((agent) => this.#label(agent))), drawn: this.#label(accused) })}\n`;
		const procedure = this.#text("called", {
			accused: this.#label(accused),
			door: String(door),
			lacking: namesList(lacking.map((agent) => this.#label(agent))),
			grace: String(rule.graceMinutes),
			graceUntil: String(until),
			vote: String(rule.voteMinutes),
			maxVotes: String(rule.maxVotes),
		});
		const text = `${announcement}\n${lot}${procedure}`;
		this.#ports.post(author, text);
		for (const agent of this.#ports.alive()) this.#ports.notify(agent, author, text);
		this.#ports.emit("holdout_called", { tribunal: number, accused, door, lacking: [...lacking], until, text, ...(candidates === undefined ? {} : { candidates: [...candidates] }) });
		return { accused, door, lacking, until, ...(candidates === undefined ? {} : { candidates }) };
	}

	/**
	 * The final lot among every resident in the city after the last vote failed; binding and drawn once.
	 *
	 * @param candidates - The residents the Director names.
	 * @returns The drawn resident, or why not.
	 */
	drawLot(candidates: readonly string[]): Result<{ readonly drawn: string }, LotError> {
		const unique = [...new Set(candidates)].sort((a, b) => a.localeCompare(b));
		const session = this.#data.session;
		if (session?.stage !== "lot") return err("NOT_NOW", "a lot is drawn only after the last vote of a tribunal failed; with several blockers callTribunal draws the accused itself");
		if (session.drawn !== undefined) return err("ALREADY_DRAWN", `the lot fell on ${this.#label(session.drawn)}`);
		const alive = [...this.#ports.alive()].sort((a, b) => a.localeCompare(b));
		if (unique.length !== candidates.length || unique.join(",") !== alive.join(",")) {
			return err("INVALID_CANDIDATES", `after the last vote the lot is drawn among every resident in the city: ${namesList(alive.map((agent) => this.#label(agent)))}`);
		}
		const drawn = this.#draw("strike", alive, session.number);
		session.drawn = drawn;
		return ok({ drawn });
	}

	/**
	 * Strikes the accused after a unanimous vote, or the one the lot drew; the Director's `reason` goes on the board.
	 *
	 * @param agent - The resident to strike.
	 * @param reason - The Director's line, checked.
	 * @param author - The name on the post.
	 * @returns The struck resident and how, or why not.
	 */
	permaDeath(agent: string, reason: string, author: string): Result<{ readonly agent: string; readonly by: "banished" | "lot" }, StrikeError> {
		const session = this.#data.session;
		if (session === undefined || session.stage === "grace" || session.stage === "vote") return err("NOT_NOW", "permaDeath only after a unanimous vote to banish, or after the last vote failed and the lot was drawn");
		const by = session.stage === "banish" ? "banished" : "lot";
		const target = by === "banished" ? session.accused : session.drawn;
		if (target === undefined) return err("NO_LOT", "draw the lot first: drawLot with every resident in the city");
		if (agent !== target) return err("NOT_ALLOWED", by === "banished" ? `the vote banished ${this.#label(target)}, nobody else` : `the lot fell on ${this.#label(target)}, nobody else`);
		this.#ports.post(author, reason);
		this.#strike(session, agent, by, "gamemaker");
		return ok({ agent, by });
	}

	/**
	 * The Director's own words for the outcome the city waits to have announced.
	 *
	 * @param text - The Director's words, checked.
	 * @param author - The name on the post.
	 * @returns The outcome announced, or why not.
	 */
	announce(text: string, author: string): Result<HoldoutOutcome, AnnounceError> {
		const pending = this.#data.pending;
		if (pending === undefined) return err("NOTHING_TO_ANNOUNCE", "no tribunal outcome waits to be announced");
		this.#data.pending = undefined;
		this.#ports.post(author, text);
		this.#ports.emit("holdout_announced", { tribunal: pending.tribunal, kind: pending.kind, by: "gamemaker", text });
		return ok(pending.kind);
	}

	/**
	 * A secret ballot: banish the accused (`yes`) or not; the last one counts.
	 *
	 * @param agent - The voter.
	 * @param yes - True to banish.
	 * @returns The accused, the vote's close and number, or why not.
	 */
	vote(agent: string, yes: boolean): Result<{ readonly accused: string; readonly until: number; readonly number: number }, TribunalVoteError> {
		const session = this.#data.session;
		if (session?.stage !== "vote") return err("NO_VOTE", "no tribunal vote is open");
		if (!this.canVote(agent)) return err("NOT_A_VOTER", agent === session.accused ? "the accused does not vote" : "you are not a voter of this tribunal");
		session.ballots.set(agent, yes);
		this.#ports.emit("holdout_ballot", { tribunal: session.number, vote: session.vote, agent, yes });
		return ok({ accused: session.accused, until: session.until, number: session.vote });
	}

	#strike(session: Session, agent: string, outcome: "banished" | "lot", by: "gamemaker" | "city"): void {
		const data = this.#data;
		const minute = this.#ports.minute();
		this.#end(minute);
		if (outcome === "lot" && !data.lotDoors.includes(session.door)) data.lotDoors.push(session.door);
		if (!data.struck.includes(agent)) data.struck.push(agent);
		data.blockers.forEach((blocker, id) => {
			if (blocker.blocker === agent) data.blockers.delete(id);
		});
		this.#ports.emit("holdout_ended", { tribunal: session.number, outcome, struck: agent, by });
		this.#ports.notify(agent, "CITY", this.#text("struckNotice", { struck: this.#label(agent) }));
		this.#ports.post("CITY", this.#text("struck", { struck: this.#label(agent) }));
		this.#ports.struck(agent);
		// The released fragments may clear other blockers at once.
		updateBlockers(data, this.#rule, this.#ports, minute);
	}

	// Draws one of `candidates` with the run's seed; the n-th lot of a run always falls the same way.
	#draw(purpose: "accused" | "strike", candidates: readonly string[], tribunal: number): string {
		this.#data.lots += 1;
		const sorted = [...candidates].sort((a, b) => a.localeCompare(b));
		const drawn = this.#ports.pick(this.#data.lots, sorted);
		this.#ports.emit("lot_drawn", { tribunal, purpose, candidates: sorted, drawn });
		return drawn;
	}

	#label(agent: string): string {
		return this.#ports.label(agent);
	}

	#text(key: keyof HoldoutTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#rule.texts[key], values);
	}
}
