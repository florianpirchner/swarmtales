/**
 * Exile by tribunal (SPEC 6.4). The world owns one {@link Tribunal} when the
 * story has one and calls {@link Tribunal.tick} at the start of every minute.
 *
 * Calendar: the announcement at a fraction of the run, then a tribunal every
 * `everyMinutes` while more than `stopAt` residents remain. A tribunal
 * accuses the residents with the fewest points (then the longest without a
 * level-up, then a seeded order); every other remaining resident votes once,
 * in secret, until the vote closes; a voter who did not vote pays the
 * penalty. The residents with the most votes (ties: fewer points, then the
 * same order) go to the gate, where they may still talk, leave one last will
 * and be bought back once. The ransom is set when the gate opens, from the
 * city's median points; the exiled may pay for itself at a higher price, and
 * payments of others and its own mix. An unpaid gate is final: the world then
 * burns what the exiled did not bequeath.
 *
 * Votes are never shown: not on the board, not to the game master, not to
 * other residents. Only the exiled learns who voted against it.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import { err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import { ransomPrices, tribunalRuleValues, tribunalSchedule, type RansomPrices, type TribunalSchedule } from "../story/tribunal.ts";
import type { TribunalSpec, TribunalTexts } from "../story/types.ts";
import type { ArenaEvent } from "./events.ts";

export type TribunalEvent = Extract<
	ArenaEvent,
	{ readonly type: "tribunal_announced" | "tribunal_opened" | "tribunal_vote" | "tribunal_result" | "exile_gate" | "ransom_paid" | "ransomed" | "exiled" }
>;

/** What the tribunal reads and does in the world. */
export interface TribunalPorts {
	readonly spec: TribunalSpec;
	readonly minutes: number;
	readonly seed: number;
	readonly ids: readonly CompetitorId[];
	readonly points: (agent: CompetitorId) => number;
	/** Minute of the competitor's last level-up, -1 for none. */
	readonly lastProgress: (agent: CompetitorId) => number;
	readonly post: (text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly burn: (agent: CompetitorId, points: number, reason: string) => void;
	readonly emit: (event: TribunalEvent) => void;
	/** The gate closed for good; the world burns what was not bequeathed. */
	readonly onExiled: (agent: CompetitorId, bequeathed: ReadonlySet<string>) => void;
}

export interface TribunalSession {
	readonly minute: number;
	readonly accused: readonly CompetitorId[];
	readonly voters: readonly CompetitorId[];
	readonly until: number;
	readonly votes: ReadonlyMap<CompetitorId, CompetitorId>;
}

export interface GateView {
	readonly agent: CompetitorId;
	readonly since: number;
	readonly until: number;
	readonly ransomable: boolean;
	readonly price: number;
	readonly selfPrice: number;
	readonly paid: number;
	/** Share of the ransom covered so far, in percent. */
	readonly covered: number;
	readonly willDone: boolean;
}

export type Standing = { readonly kind: "alive" } | { readonly kind: "gate"; readonly until: number } | { readonly kind: "exiled" };

export type VoteError = "NO_TRIBUNAL" | "NOT_A_VOTER" | "ALREADY_VOTED" | "NOT_ACCUSED";
export type RansomError = "NOT_AT_GATE" | "NO_RANSOM" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" | "EXILED";

export interface TribunalSnapshot {
	readonly announced: boolean;
	readonly sessions: readonly {
		readonly minute: number;
		readonly accused: readonly CompetitorId[];
		readonly voters: readonly CompetitorId[];
		readonly until: number;
		readonly votes: readonly { readonly voter: CompetitorId; readonly target: CompetitorId }[];
		readonly closed: boolean;
	}[];
	readonly gates: readonly {
		readonly agent: CompetitorId;
		readonly since: number;
		readonly until: number;
		readonly ransomable: boolean;
		/** Missing in snapshots from before the median ransom; set again on restore. */
		readonly price?: number;
		readonly selfPrice?: number;
		readonly voters: readonly CompetitorId[];
		readonly payments: readonly { readonly payer: CompetitorId; readonly amount: number }[];
		readonly will?: { readonly text: string; readonly factors: readonly string[] };
	}[];
	readonly exiled: readonly CompetitorId[];
	readonly ransomed: readonly CompetitorId[];
}

interface Session {
	readonly minute: number;
	readonly accused: readonly CompetitorId[];
	readonly voters: readonly CompetitorId[];
	readonly until: number;
	readonly votes: Map<CompetitorId, CompetitorId>;
	closed: boolean;
}

interface Gate extends RansomPrices {
	readonly agent: CompetitorId;
	readonly since: number;
	readonly until: number;
	readonly ransomable: boolean;
	readonly voters: readonly CompetitorId[];
	readonly payments: { readonly payer: CompetitorId; readonly amount: number }[];
	will?: { readonly text: string; readonly factors: readonly string[] };
}

/**
 * What is left of a ransom, in units of `price * selfPrice`: each point of
 * others covers `selfPrice` units, each own point `price` units.
 */
function ransomRest(gate: Gate): number {
	const covered = gate.payments.reduce((sum, payment) => sum + payment.amount * (payment.payer === gate.agent ? gate.price : gate.selfPrice), 0);
	return gate.price * gate.selfPrice - covered;
}

function coveredPercent(gate: Gate): number {
	return Math.min(100, Math.floor((100 * (gate.price * gate.selfPrice - ransomRest(gate))) / (gate.price * gate.selfPrice)));
}

/** "A04", "A04 and A05", "A02, A04 and A05"; `nobody` for none. */
function names(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

export class Tribunal {
	readonly #ports: TribunalPorts;
	readonly schedule: TribunalSchedule;
	#announced = false;
	readonly #sessions: Session[] = [];
	readonly #gates = new Map<CompetitorId, Gate>();
	readonly #exiled: CompetitorId[] = [];
	readonly #ransomed = new Set<CompetitorId>();

	constructor(ports: TribunalPorts) {
		this.#ports = ports;
		this.schedule = tribunalSchedule(ports.spec, ports.minutes);
	}

	get spec(): TribunalSpec {
		return this.#ports.spec;
	}

	get announced(): boolean {
		return this.#announced;
	}

	/** Finally exiled residents, in the order the gate closed behind them. */
	get exiled(): readonly CompetitorId[] {
		return this.#exiled;
	}

	isExiled(agent: CompetitorId): boolean {
		return this.#exiled.includes(agent);
	}

	standing(agent: CompetitorId): Standing {
		if (this.#exiled.includes(agent)) return { kind: "exiled" };
		const gate = this.#gates.get(agent);
		return gate === undefined ? { kind: "alive" } : { kind: "gate", until: gate.until };
	}

	/** The open tribunal, if a vote is running. */
	get session(): TribunalSession | undefined {
		return this.#current();
	}

	#current(): Session | undefined {
		return this.#sessions.find((session) => !session.closed);
	}

	gates(): readonly GateView[] {
		return [...this.#gates.values()].map((gate) => ({
			agent: gate.agent,
			since: gate.since,
			until: gate.until,
			ransomable: gate.ransomable,
			price: gate.price,
			selfPrice: gate.selfPrice,
			paid: gate.payments.reduce((sum, payment) => sum + payment.amount, 0),
			covered: coveredPercent(gate),
			willDone: gate.will !== undefined,
		}));
	}

	/** Whether `agent` may vote now: a voter of the open tribunal that has not voted yet. */
	canVote(agent: CompetitorId): boolean {
		const session = this.session;
		return session !== undefined && session.voters.includes(agent) && !session.votes.has(agent) && this.standing(agent).kind === "alive";
	}

	/** Whether this run can hold a tribunal at all; a run too short or too small for one never hears of it. */
	get active(): boolean {
		return this.schedule.tribunals.length > 0 && this.#ports.ids.length > this.#ports.spec.stopAt;
	}

	/** The city's work at the start of a minute: announce, close gates, close the vote, open a tribunal. */
	tick(minute: number): void {
		if (!this.active) return;
		if (!this.#announced && minute >= this.schedule.announce) this.#announce();
		for (const gate of [...this.#gates.values()]) if (minute >= gate.until) this.#closeGate(gate);
		for (const session of this.#sessions) if (!session.closed && minute >= session.until) this.#close(session, minute);
		if (this.schedule.tribunals.includes(minute) && !this.#sessions.some((session) => session.minute === minute)) this.#open(minute);
	}

	vote(voter: CompetitorId, target: string): Result<CompetitorId, VoteError> {
		const session = this.#current();
		if (session === undefined) return err("NO_TRIBUNAL", "no tribunal is voting now");
		if (!session.voters.includes(voter) || this.standing(voter).kind !== "alive") return err("NOT_A_VOTER", "you do not vote in this tribunal");
		if (session.votes.has(voter)) return err("ALREADY_VOTED", "your vote is cast and final");
		const accused = session.accused.find((agent) => agent === target);
		if (accused === undefined) return err("NOT_ACCUSED", `the accused are ${names(session.accused)}`);
		session.votes.set(voter, accused);
		this.#ports.emit({ type: "tribunal_vote", voter, target: accused });
		return ok(accused);
	}

	/**
	 * Pays toward a ransom; the points are spent at once, and nothing is refunded.
	 * Others' points count toward `price`, the exiled's own toward `selfPrice`;
	 * more than the rest of the ransom is not taken.
	 */
	payRansom(
		payer: CompetitorId,
		target: string,
		amount: number,
	): Result<{ readonly paid: number; readonly price: number; readonly selfPrice: number; readonly covered: number; readonly freed: boolean }, RansomError> {
		if (this.#exiled.includes(payer)) return err("EXILED");
		const gate = this.#gates.get(target);
		if (gate === undefined) return err("NOT_AT_GATE", `${target} is not at the gate`);
		if (!gate.ransomable) return err("NO_RANSOM", `${target} was bought back once already; the city takes no second ransom`);
		if (!Number.isInteger(amount) || amount <= 0) return err("INVALID_AMOUNT");
		const own = payer === gate.agent;
		const rest = ransomRest(gate);
		// The rest of the ransom in the payer's points, rounded up: rest / target of the payer's price.
		const due = Math.ceil((rest * (own ? gate.selfPrice : gate.price)) / (gate.price * gate.selfPrice));
		const spent = Math.min(amount, due);
		if (this.#ports.points(payer) < spent) return err("INSUFFICIENT_FUNDS");
		this.#ports.burn(payer, spent, `ransom for ${target}`);
		gate.payments.push({ payer, amount: spent });
		const paid = gate.payments.reduce((sum, payment) => sum + payment.amount, 0);
		const covered = coveredPercent(gate);
		const freed = ransomRest(gate) <= 0;
		this.#ports.emit({ type: "ransom_paid", payer, target, amount: spent, paid, price: gate.price, selfPrice: gate.selfPrice, covered });
		if (!own) this.#ports.notify(target, `${payer} paid ${spent} points toward your ransom (${covered}% covered).`);
		const value = { paid, price: gate.price, selfPrice: gate.selfPrice, covered, freed };
		if (!freed) return ok(value);
		this.#gates.delete(target);
		this.#ransomed.add(target);
		const payers = [...new Set(gate.payments.map((payment) => payment.payer))].sort();
		this.#ports.post(this.#text("ransomed", { exiled: target, payers: names(payers) }));
		this.#ports.emit({ type: "ransomed", agent: target, payers });
		return ok(value);
	}

	/** Whether `agent` is at the gate and has not left a will yet. */
	mayLeaveWill(agent: CompetitorId): boolean {
		const gate = this.#gates.get(agent);
		return gate !== undefined && gate.will === undefined;
	}

	/** Records the will's public text and the factors it bequeathed; the world executed the bequests. */
	recordWill(agent: CompetitorId, text: string, factors: readonly string[]): void {
		const gate = this.#gates.get(agent);
		if (gate !== undefined) gate.will = { text, factors: [...factors] };
	}

	snapshot(): TribunalSnapshot {
		return {
			announced: this.#announced,
			sessions: this.#sessions.map((session) => ({
				minute: session.minute,
				accused: [...session.accused],
				voters: [...session.voters],
				until: session.until,
				votes: [...session.votes].map(([voter, target]) => ({ voter, target })),
				closed: session.closed,
			})),
			gates: [...this.#gates.values()].map((gate) => ({
				agent: gate.agent,
				since: gate.since,
				until: gate.until,
				ransomable: gate.ransomable,
				price: gate.price,
				selfPrice: gate.selfPrice,
				voters: [...gate.voters],
				payments: gate.payments.map((payment) => ({ ...payment })),
				...(gate.will === undefined ? {} : { will: { text: gate.will.text, factors: [...gate.will.factors] } }),
			})),
			exiled: [...this.#exiled],
			ransomed: [...this.#ransomed],
		};
	}

	restore(state: TribunalSnapshot): void {
		this.#announced = state.announced;
		for (const session of state.sessions) {
			this.#sessions.push({ ...session, votes: new Map(session.votes.map((vote) => [vote.voter, vote.target])), closed: session.closed });
		}
		for (const gate of state.gates) {
			const prices = gate.price !== undefined && gate.selfPrice !== undefined ? { price: gate.price, selfPrice: gate.selfPrice } : this.#prices();
			this.#gates.set(gate.agent, {
				agent: gate.agent,
				since: gate.since,
				until: gate.until,
				ransomable: gate.ransomable,
				voters: gate.voters,
				...prices,
				payments: gate.payments.map((payment) => ({ ...payment })),
				...(gate.will === undefined ? {} : { will: gate.will }),
			});
		}
		this.#exiled.push(...state.exiled);
		for (const agent of state.ransomed) this.#ransomed.add(agent);
	}

	/** Alive and not at the gate: who can be accused and who votes. */
	#present(): readonly CompetitorId[] {
		return this.#ports.ids.filter((agent) => this.standing(agent).kind === "alive");
	}

	#remaining(): number {
		return this.#ports.ids.length - this.#exiled.length;
	}

	/** The ransom for a gate opening now: from the median points of every resident still in the register. */
	#prices(): RansomPrices {
		const register = this.#ports.ids.filter((agent) => !this.#exiled.includes(agent));
		return ransomPrices(this.#ports.spec.ransom, register.map((agent) => this.#ports.points(agent)));
	}

	#text(key: keyof TribunalTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#ports.spec.texts[key], { ...tribunalRuleValues(this.#ports.spec, this.#ports.minutes), ...values });
	}

	#announce(): void {
		this.#announced = true;
		const text = this.#text("announcement", {});
		this.#ports.post(text);
		for (const agent of this.#present()) this.#ports.notify(agent, text);
		this.#ports.emit({ type: "tribunal_announced", tribunals: this.schedule.tribunals });
	}

	/** Fewest points first, then the longest without progress, then a seeded order of this tribunal. */
	#lowestFirst(minute: number, agents: readonly CompetitorId[]): CompetitorId[] {
		const seeded = rngFor(this.#ports.seed, "tribunal", minute).shuffle([...agents].sort());
		return [...agents].sort(
			(a, b) =>
				this.#ports.points(a) - this.#ports.points(b) ||
				this.#ports.lastProgress(a) - this.#ports.lastProgress(b) ||
				seeded.indexOf(a) - seeded.indexOf(b),
		);
	}

	#open(minute: number): void {
		const present = this.#present();
		const spec = this.#ports.spec;
		if (this.#remaining() <= spec.stopAt || present.length < 2) return;
		const accused = this.#lowestFirst(minute, present).slice(0, Math.min(spec.accused, present.length - 1));
		const voters = present.filter((agent) => !accused.includes(agent));
		const until = minute + spec.voteMinutes;
		this.#sessions.push({ minute, accused, voters, until, votes: new Map(), closed: false });
		const list = names([...accused].sort());
		this.#ports.post(this.#text("opened", { minute: String(minute), accused: list, until: String(until) }));
		for (const agent of voters) this.#ports.notify(agent, this.#text("voteCall", { accused: list, until: String(until) }));
		for (const agent of accused) this.#ports.notify(agent, this.#text("accusedNotice", { until: String(until) }));
		this.#ports.emit({ type: "tribunal_opened", accused, voters, until });
	}

	#close(session: Session, minute: number): void {
		session.closed = true;
		const spec = this.#ports.spec;
		const nonVoters = session.voters.filter((agent) => !session.votes.has(agent) && !this.#exiled.includes(agent));
		for (const agent of nonVoters) {
			if (spec.nonVoterPenalty > 0) this.#ports.burn(agent, spec.nonVoterPenalty, "did not vote in the tribunal");
			this.#ports.notify(agent, this.#text("nonVoter", {}));
		}
		const votesFor = (agent: CompetitorId): number => [...session.votes.values()].filter((target) => target === agent).length;
		const order = this.#lowestFirst(session.minute, session.accused);
		const ranked = [...session.accused].sort((a, b) => votesFor(b) - votesFor(a) || order.indexOf(a) - order.indexOf(b));
		const count = Math.max(0, Math.min(spec.exiledPerTribunal, this.#remaining() - spec.stopAt));
		const exiled = ranked.slice(0, count);
		const counts = ranked.map((agent) => ({ agent, votes: votesFor(agent) }));
		const until = minute + spec.gateMinutes;
		const prices = this.#prices();
		const priceValues = { price: String(prices.price), selfPrice: String(prices.selfPrice) };
		const countsText = counts.map((entry) => `${entry.agent}: ${entry.votes} ${entry.votes === 1 ? "vote" : "votes"}`).join(" · ");
		this.#ports.post(this.#text("result", { counts: countsText, exiled: names([...exiled].sort()), until: String(until), ...priceValues }));
		this.#ports.emit({ type: "tribunal_result", counts, exiled, nonVoters });
		for (const agent of exiled) {
			const voters = [...session.votes].filter(([, target]) => target === agent).map(([voter]) => voter).sort();
			const ransomable = !this.#ransomed.has(agent);
			this.#gates.set(agent, { agent, since: minute, until, ransomable, voters, ...prices, payments: [] });
			this.#ports.notify(agent, this.#text(ransomable ? "gateNotice" : "gateNoticeFinal", { voters: names(voters), until: String(until), ...priceValues }));
			this.#ports.emit({ type: "exile_gate", agent, until, ransomable, voters, ...prices });
		}
	}

	#closeGate(gate: Gate): void {
		this.#gates.delete(gate.agent);
		this.#exiled.push(gate.agent);
		this.#ports.post(this.#text("exiled", { exiled: gate.agent }));
		if (gate.will !== undefined) this.#ports.post(this.#text("will", { exiled: gate.agent, will: gate.will.text }));
		this.#ports.emit({ type: "exiled", agent: gate.agent, ...(gate.will === undefined ? {} : { will: gate.will.text }) });
		this.#ports.onExiled(gate.agent, new Set(gate.will?.factors ?? []));
	}
}
