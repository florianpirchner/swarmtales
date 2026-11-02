/**
 * The holdout tribunal (`story.holdout`, Whispers v3, SPEC 20; LH10, P62), the old
 * `HoldoutTribunal` (packages/engine/src/holdout.ts) line for line over the state the mechanic
 * owns. Every minute the city reports who blocks a door: a resident who has stood at an open door
 * for `stallMinutes` and has not sent its fragment of it to another who has stood before it for
 * `stallMinutes` too. The gamemaker decides whether to put a blocker on trial (`call`); with
 * several blockers the city draws the accused. The accused has `graceMinutes` to fix it; otherwise
 * everyone else votes in secret, `voteMinutes` long, banishment needs every voter's yes, `maxVotes`
 * in all; after the last one fails one resident drawn by lot is struck, once per door. The
 * gamemaker announces each outcome and strikes; the city does so itself after `fallbackMinutes`.
 */
import { err, ok, type Result } from "./result.ts";
import { renderTemplate } from "./template.ts";
import type { BlockerFact, HoldoutData, HoldoutOutcome, HoldoutPorts, HoldoutRule, HoldoutTexts, Session } from "./types.ts";

export type CallError = "NOT_NOW" | "INVALID_ACCUSED" | "NOT_A_BLOCKER";
export type LotError = "NOT_NOW" | "INVALID_CANDIDATES" | "ALREADY_DRAWN";
export type StrikeError = "NOT_NOW" | "NOT_ALLOWED" | "NO_LOT";
export type AnnounceError = "NOTHING_TO_ANNOUNCE";
export type TribunalVoteError = "NO_VOTE" | "NOT_A_VOTER";

/** "A04", "A04 and A05", "A02, A04 and A05". */
function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

export const reachedKey = (door: number, agent: string): string => `${String(door)}:${agent}`;
const byDoor = (a: BlockerFact, b: BlockerFact): number => a.door - b.door || a.blocker.localeCompare(b.blocker);

export class HoldoutCourt {
	readonly #ports: HoldoutPorts;
	readonly #rule: HoldoutRule;
	readonly #data: HoldoutData;

	constructor(rule: HoldoutRule, ports: HoldoutPorts, data: HoldoutData) {
		this.#rule = rule;
		this.#ports = ports;
		this.#data = data;
	}

	/** Whether `agent` may cast a ballot now. */
	canVote(agent: string): boolean {
		const session = this.#data.session;
		return session?.stage === "vote" && session.voters.includes(agent) && this.#ports.alive().includes(agent);
	}

	/** The ballot `agent` cast in the running vote. */
	ballotOf(agent: string): boolean | undefined {
		return this.#data.session?.stage === "vote" ? this.#data.session.ballots.get(agent) : undefined;
	}

	/** Who lacks the accused's fragment now; empty without a tribunal. */
	lackingNow(): readonly string[] {
		const session = this.#data.session;
		return session === undefined ? [] : this.#ports.lacking(session.door, session.accused);
	}

	/** The accused's DMs to those who still lack its fragment pass the DM cap, during its grace and votes. */
	exemptFromCap(from: string, to: string): boolean {
		const session = this.#data.session;
		if (session?.accused !== from || (session.stage !== "grace" && session.stage !== "vote")) return false;
		return this.lackingNow().includes(to);
	}

	/** At the start of a minute: the blockers, an overdue announcement, then the running tribunal. */
	tick(minute: number): void {
		this.#notePresent(minute);
		this.#updateBlockers(minute);
		const data = this.#data;
		if (data.pending !== undefined && minute >= data.pending.due) this.#flush();
		const session = data.session;
		if (session === undefined) return;
		if ((session.stage === "grace" || session.stage === "vote") && this.#ports.lacking(session.door, session.accused).length === 0) {
			this.#drop(session, minute);
			return;
		}
		if (minute < session.until) return;
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

	#notePresent(minute: number): void {
		for (const { door, agent } of this.#ports.present()) {
			const id = reachedKey(door, agent);
			if (!this.#data.reached.has(id)) this.#data.reached.set(id, minute);
		}
	}

	#stalled(door: number, agent: string, minute: number): boolean {
		const since = this.#data.reached.get(reachedKey(door, agent));
		return since !== undefined && minute - since >= this.#rule.stallMinutes;
	}

	/** The blockers now: holder and lacking residents both at the door for the stall. */
	#qualified(minute: number): readonly BlockerFact[] {
		return this.#ports
			.blockers()
			.flatMap((fact) => {
				if (!this.#stalled(fact.door, fact.blocker, minute)) return [];
				const lacking = fact.lacking.filter((agent) => this.#stalled(fact.door, agent, minute));
				return lacking.length === 0 ? [] : [{ ...fact, lacking }];
			})
			.sort(byDoor);
	}

	#updateBlockers(minute: number): void {
		const blockers = this.#data.blockers;
		const now = new Map(this.#qualified(minute).map((fact) => [reachedKey(fact.door, fact.blocker), fact]));
		for (const [id, blocker] of [...blockers]) {
			if (now.has(id)) continue;
			blockers.delete(id);
			this.#ports.emit("blocker_cleared", { door: blocker.door, blocker: blocker.blocker });
		}
		for (const fact of [...now.values()].sort(byDoor)) {
			const id = reachedKey(fact.door, fact.blocker);
			const known = blockers.get(id);
			if (known === undefined) this.#ports.emit("blocker_found", { door: fact.door, blocker: fact.blocker, lacking: [...fact.lacking] });
			blockers.set(id, { ...fact, since: known?.since ?? minute });
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

	#count(session: Session, minute: number): void {
		const rule = this.#rule;
		const alive = this.#ports.alive();
		const voters = session.voters.filter((voter) => alive.includes(voter));
		const yes = voters.filter((voter) => session.ballots.get(voter) === true).length;
		const no = voters.length - yes;
		const unanimous = voters.length > 0 && yes === voters.length;
		session.lastResult = { vote: session.vote, yes, no };
		this.#ports.emit("holdout_vote_result", { tribunal: session.number, vote: session.vote, yes, no, voters: [...voters], unanimous });
		if (unanimous) {
			session.stage = "banish";
			session.until = minute + rule.fallbackMinutes;
			return;
		}
		if (session.vote < rule.maxVotes) {
			const number = session.vote;
			const left = rule.maxVotes - number;
			this.#openVote(session, minute);
			this.#await(
				session,
				"voteFailed",
				`vote ${String(number)} of ${String(rule.maxVotes)} on ${this.#label(session.accused)} was not unanimous: ${String(yes)} yes, ${String(no)} no (who voted what stays secret); ` +
					`${String(left)} ${left === 1 ? "vote" : "votes"} left, vote ${String(session.vote)} is open until minute ${String(session.until)}`,
				{ accused: this.#label(session.accused), number: String(number), yes: String(yes), no: String(no), left: String(left), until: String(session.until) },
			);
			return;
		}
		if (this.#data.lotDoors.includes(session.door)) {
			this.#end(minute);
			this.#ports.emit("holdout_ended", { tribunal: session.number, outcome: "spared" });
			this.#await(
				session,
				"spared",
				`every vote on ${this.#label(session.accused)} failed, and the lot has struck at door ${String(session.door)} before (once per door): nobody is struck, the tribunal ends`,
				{ accused: this.#label(session.accused), door: String(session.door) },
				minute,
			);
			return;
		}
		session.stage = "lot";
		session.until = minute + rule.fallbackMinutes;
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

	/** A tribunal on a blocker the city reports now; with several, the city draws the accused among all of them. */
	call(
		accused: readonly string[],
		announcement: string,
		author: string,
	): Result<{ readonly accused: string; readonly door: number; readonly lacking: readonly string[]; readonly until: number; readonly candidates?: readonly string[] }, CallError> {
		const data = this.#data;
		if (data.session !== undefined) return err("NOT_NOW", `tribunal ${String(data.session.number)} on ${this.#label(data.session.accused)} is still running; one at a time`);
		const minute = this.#ports.minute();
		if (minute < data.cooldownUntil) return err("NOT_NOW", `a tribunal ended a short while ago; the next may be called from minute ${String(data.cooldownUntil)}`);
		const unique = [...new Set(accused)].sort((a, b) => a.localeCompare(b));
		if (unique.length === 0 || unique.length !== accused.length) return err("INVALID_ACCUSED", "name each accused once");
		// The facts as they stand now, not as the minute began: a fragment sent since clears a blocker.
		const blockers = this.#qualified(minute);
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
		const lacking = this.#ports.lacking(door, chosen);
		const rule = this.#rule;
		// Called after the residents' turns of this minute: the accused gets `graceMinutes` whole minutes of turns from the next one.
		const session: Session = { number, accused: chosen, door, stage: "grace", until: minute + rule.graceMinutes + 1, vote: 0, voters: [], ballots: new Map() };
		data.session = session;
		const lot = several ? `${this.#text("drawnAccused", { candidates: namesList(listed.map((agent) => this.#label(agent))), drawn: this.#label(chosen) })}\n` : "";
		const procedure = this.#text("called", {
			accused: this.#label(chosen),
			door: String(door),
			lacking: namesList(lacking.map((agent) => this.#label(agent))),
			grace: String(rule.graceMinutes),
			graceUntil: String(session.until),
			vote: String(rule.voteMinutes),
			maxVotes: String(rule.maxVotes),
		});
		const text = `${announcement}\n${lot}${procedure}`;
		this.#ports.post(author, text);
		for (const agent of this.#ports.alive()) this.#ports.notify(agent, author, text);
		this.#ports.emit("holdout_called", { tribunal: number, accused: chosen, door, lacking: [...lacking], until: session.until, text, ...(several ? { candidates: listed } : {}) });
		return ok({ accused: chosen, door, lacking, until: session.until, ...(several ? { candidates: listed } : {}) });
	}

	/** The final lot among every resident in the city after the last vote failed; binding and drawn once. */
	drawLot(candidates: readonly string[]): Result<{ readonly drawn: string }, LotError> {
		const unique = [...new Set(candidates)].sort((a, b) => a.localeCompare(b));
		const session = this.#data.session;
		if (session?.stage !== "lot") {
			return err("NOT_NOW", "a lot is drawn only after the last vote of a tribunal failed; with several blockers callTribunal draws the accused itself");
		}
		if (session.drawn !== undefined) return err("ALREADY_DRAWN", `the lot fell on ${this.#label(session.drawn)}`);
		const alive = [...this.#ports.alive()].sort((a, b) => a.localeCompare(b));
		if (unique.length !== candidates.length || unique.join(",") !== alive.join(",")) {
			return err("INVALID_CANDIDATES", `after the last vote the lot is drawn among every resident in the city: ${namesList(alive.map((agent) => this.#label(agent)))}`);
		}
		const drawn = this.#draw("strike", alive, session.number);
		session.drawn = drawn;
		return ok({ drawn });
	}

	/** Strikes the accused after a unanimous vote, or the one the lot drew; the gamemaker's `reason` goes on the board. */
	permaDeath(agent: string, reason: string, author: string): Result<{ readonly agent: string; readonly by: "banished" | "lot" }, StrikeError> {
		const session = this.#data.session;
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
		const pending = this.#data.pending;
		if (pending === undefined) return err("NOTHING_TO_ANNOUNCE", "no tribunal outcome waits to be announced");
		this.#data.pending = undefined;
		this.#ports.post(author, text);
		this.#ports.emit("holdout_announced", { tribunal: pending.tribunal, kind: pending.kind, by: "gamemaker", text });
		return ok(pending.kind);
	}

	/** A secret ballot: banish the accused (`yes`) or not; the last one counts. */
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
		this.#updateBlockers(minute);
	}

	/** Draws one of `candidates` with the run's seed; the n-th lot of a run always falls the same way. */
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
