// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal (old `HoldoutTribunal`, carried from the old `mechanics/standoff-tribunal/src/court.ts` over
 * the state the mechanic owns), part 1: the blockers, the call, the grace and its end. Every tick the city reports
 * who blocks a door: a resident who has stood at an open door for `stallMinutes` and has not sent its fragment of it
 * to another who has stood before it for `stallMinutes` too. The Director decides whether to put a blocker on trial
 * (`call`); with several blockers the city draws the accused. The accused has `graceMinutes` to fix it; otherwise
 * the first secret vote opens. The Director announces each outcome; the city does so itself after
 * `fallbackMinutes`. The count of a vote, the lot and the strike follow with issue M5-30.
 */
import { err, ok, type Result } from "./result.ts";
import { renderTemplate } from "./template.ts";
import type { BlockerFact, HoldoutData, HoldoutOutcome, HoldoutPorts, HoldoutRule, HoldoutTexts, Session } from "./types.ts";

/**
 * Why a call of a tribunal is refused.
 *
 * @public
 */
export type CallError = "NOT_NOW" | "INVALID_ACCUSED" | "NOT_A_BLOCKER";

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
 * "A04", "A04 and A05", "A02, A04 and A05".
 *
 * @param names - The names.
 * @returns The list.
 */
export function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * The key of a resident at a door.
 *
 * @param door - The door.
 * @param agent - The resident.
 * @returns `door:agent`.
 */
export const reachedKey = (door: number, agent: string): string => `${String(door)}:${agent}`;
const byDoor = (a: BlockerFact, b: BlockerFact): number => a.door - b.door || a.blocker.localeCompare(b.blocker);

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
		if (minute < session.until || session.stage !== "grace") return;
		this.#openVote(session, minute);
		this.#await(session, "graceFailed", `the grace is over and ${this.#label(session.accused)} has not fixed it; vote 1 of ${String(this.#rule.maxVotes)} is open until minute ${String(session.until)}`, {
			accused: this.#label(session.accused),
			until: String(session.until),
		});
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

	// The blockers now: holder and lacking residents both at the door for the stall.
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
