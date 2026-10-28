/**
 * Exile by tribunal (SPEC 6.4). The world owns one {@link Tribunal} when the
 * story has one and calls {@link Tribunal.tick} at the start of every minute.
 *
 * Pacing: the city exiles a story share of the residents it held at the
 * start of the act (the target), then the act ends. The first tribunal is
 * called by progress (the first resident passing a level) or at the latest
 * at a minute; the game master schedules the later ones
 * ({@link Tribunal.schedule}) within guard rails: a fallback tribunal when
 * none is pending a while after the last result, and a forced final tribunal
 * for everything still missing when only one more fits before the act's last
 * minute. Nothing is scheduled once the seats are decided or the target is
 * reached. A tribunal is called `lead` minutes before it opens; a faction
 * draft runs in between ({@link FactionDraft}).
 *
 * A tribunal accuses one more resident than it exiles, those with the fewest
 * points (then the longest without a level-up, then a seeded order), and
 * leaves at least two voters; every other present resident votes once, in
 * secret, until the vote closes; a voter who did not vote pays the penalty.
 * The residents with the most votes (ties: fewer points, then the same order)
 * go to the gate, where they may still talk, leave one last will and be
 * bought back once. The ransom is set when the gate opens, from the city's
 * median points; the exiled may pay for itself at a higher price, and
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
import {
	accusedCount,
	callMinute,
	earliestOpening,
	exileTarget,
	fitsBefore,
	lastCityMinute,
	maxFactions,
	ransomPrices,
	roomAfter,
	tribunalHeld,
	tribunalRuleValues,
	type RansomPrices,
} from "../story/tribunal.ts";
import type { TribunalSpec, TribunalTexts } from "../story/types.ts";
import type { ArenaEvent, TribunalPlanner } from "./events.ts";
import { FactionDraft, namesOf, type DraftError, type DraftPhase, type DraftSnapshot, type FactionEvent } from "./factions.ts";

export type TribunalEvent =
	| Extract<
			ArenaEvent,
			{
				readonly type:
					| "tribunal_announced"
					| "tribunal_scheduled"
					| "tribunal_cancelled"
					| "tribunal_called"
					| "tribunal_opened"
					| "tribunal_vote"
					| "tribunal_result"
					| "exile_gate"
					| "ransom_paid"
					| "ransomed"
					| "exiled";
			}
	  >
	| FactionEvent;

/** What the tribunal reads and does in the world. */
export interface TribunalPorts {
	readonly spec: TribunalSpec;
	readonly minutes: number;
	readonly seed: number;
	readonly ids: readonly CompetitorId[];
	/** Seats at the end: the tribunals never exile into them. */
	readonly survivors: number;
	readonly points: (agent: CompetitorId) => number;
	/** Minute of the competitor's last level-up, -1 for none. */
	readonly lastProgress: (agent: CompetitorId) => number;
	/** Whether some resident has passed `level` (the progress trigger of the first tribunal). */
	readonly passed: (level: number) => boolean;
	/** Whether a snapshot door is shut (SPEC 17); no tribunal is called then. */
	readonly doorShut: () => boolean;
	readonly post: (text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly burn: (agent: CompetitorId, points: number, reason: string) => void;
	readonly grant: (agent: CompetitorId, points: number, reason: string) => void;
	readonly createGroup: (name: string, members: readonly CompetitorId[]) => string;
	readonly removeGroup: (group: string) => void;
	readonly postGroup: (group: string, text: string) => void;
	readonly emit: (event: TribunalEvent) => void;
	/** The gate closed for good; the world burns what was not bequeathed. */
	readonly onExiled: (agent: CompetitorId, bequeathed: ReadonlySet<string>) => void;
}

export interface TribunalSession {
	readonly tribunal: number;
	readonly minute: number;
	readonly accused: readonly CompetitorId[];
	readonly voters: readonly CompetitorId[];
	readonly until: number;
	readonly count: number;
	readonly votes: ReadonlyMap<CompetitorId, CompetitorId>;
}

/** A tribunal planned and not yet open: called once `calledAt` comes. */
export interface TribunalPlan {
	readonly tribunal: number;
	readonly opens: number;
	readonly calledAt: number;
	readonly count: number;
	readonly factions: number;
	readonly by: TribunalPlanner;
	readonly reason?: string;
	readonly called: boolean;
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

/** The guard rails of {@link Tribunal.schedule} right now, for the game master's view. */
export type SchedulingWindow =
	| { readonly open: false; readonly why: string }
	| {
			readonly open: true;
			/** Earliest opening minute. */
			readonly earliest: number;
			/** Latest opening of a tribunal that exiles everything still missing. */
			readonly latestFinal: number;
			/** Latest opening that leaves room for one more tribunal after it; absent when none does. */
			readonly latestWithRoom?: number;
			/** Residents still to exile: the most one tribunal may take. */
			readonly missing: number;
			/** Factions allowed: 2 up to this; 0 when the tribunal has no draft. */
			readonly maxFactions: number;
	  };

export type Standing = { readonly kind: "alive" } | { readonly kind: "gate"; readonly until: number } | { readonly kind: "exiled" };

export type VoteError = "NO_TRIBUNAL" | "NOT_A_VOTER" | "ALREADY_VOTED" | "NOT_ACCUSED";
export type RansomError = "NOT_AT_GATE" | "NO_RANSOM" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" | "EXILED";
export type ScheduleError = "NO_TRIBUNAL" | "NOT_NOW" | "INVALID_COUNT" | "INVALID_FACTIONS" | "INVALID_MINUTE";

export interface TribunalSnapshot {
	readonly announced: boolean;
	readonly sessions: readonly {
		readonly minute: number;
		readonly accused: readonly CompetitorId[];
		readonly voters: readonly CompetitorId[];
		readonly until: number;
		readonly votes: readonly { readonly voter: CompetitorId; readonly target: CompetitorId }[];
		readonly closed: boolean;
		/** Absent in snapshots before v06. */
		readonly tribunal?: number;
		readonly count?: number;
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
	/** Residents at the start of the act; absent before the first minute of the act, and before v06. */
	readonly residents?: number;
	/** Tribunals called so far. */
	readonly called?: number;
	readonly plan?: TribunalPlan;
	readonly lastResult?: number;
	readonly ended?: boolean;
	readonly halted?: boolean;
	readonly draft?: DraftSnapshot;
}

interface Session {
	readonly tribunal: number;
	readonly minute: number;
	readonly accused: readonly CompetitorId[];
	readonly voters: readonly CompetitorId[];
	readonly until: number;
	readonly count: number;
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

export class Tribunal {
	readonly #ports: TribunalPorts;
	#announced = false;
	readonly #sessions: Session[] = [];
	readonly #gates = new Map<CompetitorId, Gate>();
	readonly #exiled: CompetitorId[] = [];
	readonly #ransomed = new Set<CompetitorId>();
	#residents: number | undefined;
	#called = 0;
	#plan: TribunalPlan | undefined;
	#lastResult: number | undefined;
	#ended = false;
	/** Too few residents were present to hold a tribunal: the city calls no more. */
	#halted = false;
	#draft: FactionDraft | undefined;
	/** The last minute the city acted in; the game master's plans start after it. */
	#lastTick = -1;

	constructor(ports: TribunalPorts) {
		this.#ports = ports;
	}

	get spec(): TribunalSpec {
		return this.#ports.spec;
	}

	/** Whether the city has announced its tribunal (with the first call). */
	get announced(): boolean {
		return this.#announced;
	}

	/** Residents at the start of the act; the register until the act begins. */
	get residents(): number {
		return this.#residents ?? this.#ports.ids.filter((agent) => !this.#exiled.includes(agent)).length;
	}

	/** Residents the tribunals exile in all. */
	get target(): number {
		return exileTarget(this.#ports.spec, this.residents);
	}

	/** Residents still to exile: the target less the exiled and those at the gate. */
	get missing(): number {
		return Math.max(0, this.target - this.#exiled.length - this.#gates.size);
	}

	/** Tribunals called so far. */
	get called(): number {
		return this.#called;
	}

	/** The planned tribunal not yet open, if any. */
	get plan(): TribunalPlan | undefined {
		return this.#plan;
	}

	/** Whether the target is reached and the last gate closed: the act is over. */
	get ended(): boolean {
		return this.#ended;
	}

	/** The run's end reason once the act is over. */
	get endReason(): string | undefined {
		return this.#ended ? this.#text("targetReached", { exiledList: namesOf(this.#exiled) }) : undefined;
	}

	/** Whether the city still pursues its target: the act is not over and tribunals are still held. */
	get pursuing(): boolean {
		return this.active && !this.#ended && !this.#halted && this.target > 0;
	}

	/** Whether a tribunal is under way: called and not open yet, voting, or someone at the gate. */
	get busy(): boolean {
		return this.#plan?.called === true || this.#current() !== undefined || this.#gates.size > 0;
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

	/** Where `agent` stands in a running faction draft; `undefined` outside one. */
	draftPhase(agent: CompetitorId): DraftPhase | undefined {
		if (this.standing(agent).kind !== "alive") return undefined;
		return this.#draft?.phaseOf(agent);
	}

	/** The running draft's group `GT<k>`, if any. */
	get draftGroup(): string | undefined {
		return this.#draft?.group;
	}

	/** The running draft's leaders once named (posted in its group). */
	get leaders(): readonly CompetitorId[] {
		return this.#draft?.leaders ?? [];
	}

	/** Whether this run can hold a tribunal at all: a city too small for one (a test city) never hears of it. */
	get active(): boolean {
		return tribunalHeld(this.#ports.spec, this.residents, this.#ports.survivors);
	}

	/** The city's work at the start of a minute: close gates and votes, plan, call and open tribunals, end the act. */
	tick(minute: number): void {
		this.#lastTick = minute;
		if (this.#ended || !this.active) return;
		this.#residents ??= this.residents;
		for (const gate of [...this.#gates.values()]) if (minute >= gate.until) this.#closeGate(gate);
		for (const session of this.#sessions) if (!session.closed && minute >= session.until) this.#close(session, minute);
		this.#pace(minute);
		const plan = this.#plan;
		if (plan !== undefined && !plan.called && minute >= plan.calledAt) {
			// A snapshot door shut at the call (SPEC 17): the plan is dropped, and the city plans anew once it opens.
			if (this.#ports.doorShut()) {
				this.#ports.emit({ type: "tribunal_cancelled", tribunal: plan.tribunal, reason: "a snapshot door is shut" });
				this.#plan = undefined;
			} else this.#call(plan, minute);
		}
		this.#draft?.tick(minute, this.#present());
		const called = this.#plan;
		if (called?.called === true && minute >= called.opens) {
			this.#plan = undefined;
			this.#open(called, minute);
		}
		if (this.missing === 0 && this.#exiled.length >= this.target && this.#plan === undefined && !this.busy) this.#end();
	}

	/**
	 * The game master plans the next tribunal: it opens at `minute` and exiles
	 * `count`, with `factions` factions in its draft; `reason` is logged only.
	 * Guard rails: only once the first tribunal was called and none is pending,
	 * not once the seats are decided; `count` from 1 to what is still missing;
	 * `factions` from 2 to half the present residents; the call (`lead` before
	 * the opening) not before the next minute, at least `minGap` after the
	 * previous opening, vote and gate before the act's last minute, and room
	 * for one more tribunal unless this one takes everything still missing.
	 */
	schedule(minute: number, count: number, factions: number | undefined, reason: string): Result<TribunalPlan, ScheduleError> {
		const window = this.schedulingWindow();
		if (!window.open) return err("NOT_NOW", window.why);
		if (!Number.isInteger(count) || count < 1 || count > window.missing) {
			return err("INVALID_COUNT", `count must be between 1 and ${window.missing}, the residents still to exile`);
		}
		const draft = this.#ports.spec.factions;
		// Left out, the story's default count, within what the city's residents allow.
		const asked = factions ?? (draft === undefined ? undefined : Math.min(draft.count, window.maxFactions));
		if (draft !== undefined && window.maxFactions >= 2 && (asked === undefined || !Number.isInteger(asked) || asked < 2 || asked > window.maxFactions)) {
			return err("INVALID_FACTIONS", `factions must be between 2 and ${window.maxFactions} (half of the residents present)`);
		}
		if (draft === undefined && factions !== undefined) return err("INVALID_FACTIONS", "this city holds no faction draft; leave factions out");
		if (!Number.isInteger(minute) || minute < window.earliest) {
			return err("INVALID_MINUTE", `the earliest opening is minute ${window.earliest} (the call comes ahead of it, not before the next minute, and ${this.#ports.spec.minGap} minutes after the previous opening)`);
		}
		if (minute > window.latestFinal) return err("INVALID_MINUTE", `the latest opening is minute ${window.latestFinal}: vote and gate must end before the act does`);
		if (count < window.missing && (window.latestWithRoom === undefined || minute > window.latestWithRoom)) {
			return err(
				"INVALID_MINUTE",
				window.latestWithRoom === undefined
					? `no tribunal fits after this one: exile all ${window.missing} still missing (count ${window.missing})`
					: `open by minute ${window.latestWithRoom} to leave room for one more tribunal, or exile all ${window.missing} still missing`,
			);
		}
		const plan = this.#planTribunal(minute, count, window.maxFactions >= 2 ? (asked ?? 0) : 0, "gamemaster", reason.trim().slice(0, 500));
		return ok(plan);
	}

	/** Whether {@link schedule} is open now, and its bounds. */
	schedulingWindow(): SchedulingWindow {
		const spec = this.#ports.spec;
		if (!this.active || this.#ended || this.#halted) return { open: false, why: "the city holds no more tribunals" };
		if (this.#called === 0) return { open: false, why: "the first tribunal has not been called yet" };
		if (this.#plan !== undefined || this.#current() !== undefined) return { open: false, why: "a tribunal is pending; plan the next once its result is out" };
		const missing = this.missing;
		if (missing === 0) return { open: false, why: "the target is reached; the last gates are closing" };
		if (this.#ports.doorShut()) return { open: false, why: "a snapshot door is shut; plan once it opens" };
		const now = this.#lastTick + 1;
		const previous = this.#previousOpening();
		const earliest = earliestOpening(spec, now, previous);
		const last = lastCityMinute(spec, this.#ports.minutes) - spec.voteMinutes - spec.gateMinutes;
		if (earliest > last) return { open: false, why: "no tribunal fits before the act's last minute" };
		let latestWithRoom: number | undefined;
		for (let opens = earliest; opens <= last; opens++) if (roomAfter(spec, opens, this.#ports.minutes)) latestWithRoom = opens;
		const factions = spec.factions === undefined ? 0 : maxFactions(this.#present().length);
		return { open: true, earliest, latestFinal: last, ...(latestWithRoom === undefined ? {} : { latestWithRoom }), missing, maxFactions: factions };
	}

	vote(voter: CompetitorId, target: string): Result<CompetitorId, VoteError> {
		const session = this.#current();
		if (session === undefined) return err("NO_TRIBUNAL", "no tribunal is voting now");
		if (!session.voters.includes(voter) || this.standing(voter).kind !== "alive") return err("NOT_A_VOTER", "you do not vote in this tribunal");
		if (session.votes.has(voter)) return err("ALREADY_VOTED", "your vote is cast and final");
		const accused = session.accused.find((agent) => agent === target);
		if (accused === undefined) return err("NOT_ACCUSED", `the accused are ${namesOf(session.accused)}`);
		session.votes.set(voter, accused);
		this.#ports.emit({ type: "tribunal_vote", voter, target: accused });
		return ok(accused);
	}

	nominate(voter: CompetitorId, nominee: string): Result<CompetitorId, DraftError> {
		if (this.#draft === undefined || this.standing(voter).kind !== "alive") return err("NO_DRAFT", "no faction draft is running for you");
		return this.#draft.nominate(voter, nominee);
	}

	join(agent: CompetitorId, leader: string): Result<CompetitorId, DraftError> {
		if (this.#draft === undefined || this.standing(agent).kind !== "alive") return err("NO_DRAFT", "no faction draft is running for you");
		return this.#draft.join(agent, leader);
	}

	refuse(leader: CompetitorId, agent: string): Result<CompetitorId, DraftError> {
		if (this.#draft === undefined || this.standing(leader).kind !== "alive") return err("NO_DRAFT", "no faction draft is running for you");
		return this.#draft.refuse(leader, agent);
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
		this.#ports.post(this.#text("ransomed", { exiled: target, payers: namesOf(payers) }));
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
				tribunal: session.tribunal,
				count: session.count,
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
			...(this.#residents === undefined ? {} : { residents: this.#residents }),
			called: this.#called,
			...(this.#plan === undefined ? {} : { plan: { ...this.#plan } }),
			...(this.#lastResult === undefined ? {} : { lastResult: this.#lastResult }),
			...(this.#ended ? { ended: true } : {}),
			...(this.#halted ? { halted: true } : {}),
			...(this.#draft === undefined ? {} : { draft: this.#draft.snapshot() }),
		};
	}

	restore(state: TribunalSnapshot): void {
		this.#announced = state.announced;
		state.sessions.forEach((session, index) => {
			this.#sessions.push({
				tribunal: session.tribunal ?? index + 1,
				minute: session.minute,
				accused: session.accused,
				voters: session.voters,
				until: session.until,
				count: session.count ?? 1,
				votes: new Map(session.votes.map((vote) => [vote.voter, vote.target])),
				closed: session.closed,
			});
		});
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
		this.#residents = state.residents;
		this.#called = state.called ?? this.#sessions.length;
		this.#plan = state.plan;
		this.#lastResult = state.lastResult;
		this.#ended = state.ended === true;
		this.#halted = state.halted === true;
		const draft = state.draft;
		const spec = this.#ports.spec.factions;
		if (draft !== undefined && spec !== undefined) this.#draft = FactionDraft.restore(this.#draftPorts(), draft);
	}

	/** Alive and not at the gate: who can be accused and who votes. */
	#present(): readonly CompetitorId[] {
		return this.#ports.ids.filter((agent) => this.standing(agent).kind === "alive");
	}

	#previousOpening(): number | undefined {
		return this.#sessions.at(-1)?.minute;
	}

	/** The ransom for a gate opening now: from the median points of every resident still in the register. */
	#prices(): RansomPrices {
		const register = this.#ports.ids.filter((agent) => !this.#exiled.includes(agent));
		return ransomPrices(this.#ports.spec.ransom, register.map((agent) => this.#ports.points(agent)));
	}

	#text(key: keyof TribunalTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#ports.spec.texts[key], { ...tribunalRuleValues(this.#ports.spec, this.residents, this.#ports.survivors), ...values });
	}

	/**
	 * The city's own plans, when nothing is pending: the first tribunal on
	 * progress or at its latest minute, then the forced final tribunal when
	 * only one more fits, else a fallback once the last result is
	 * `fallbackGap` minutes old. Decided seats do not stop the city: the
	 * act runs until its target is reached (v06).
	 */
	#pace(minute: number): void {
		const spec = this.#ports.spec;
		if (this.#halted || this.#plan !== undefined || this.#current() !== undefined || this.missing === 0) return;
		if (this.#ports.doorShut()) return;
		const previous = this.#previousOpening();
		const opens = earliestOpening(spec, minute, previous);
		if (!fitsBefore(spec, opens, this.#ports.minutes)) return;
		const factions = spec.factions?.count ?? 0;
		const missing = this.missing;
		// One more only if another fits after it; otherwise this one takes everything still missing.
		const count = roomAfter(spec, opens, this.#ports.minutes) ? 1 : missing;
		if (this.#called === 0) {
			const progress = this.#ports.passed(spec.first.level);
			if (progress || minute >= spec.first.latestMinute) this.#planTribunal(opens, count, factions, progress ? "progress" : "deadline");
			return;
		}
		if (!fitsBefore(spec, earliestOpening(spec, minute + 1, previous), this.#ports.minutes)) {
			this.#planTribunal(opens, missing, factions, "final");
			return;
		}
		if (this.#lastResult !== undefined && minute >= this.#lastResult + spec.fallbackGap) this.#planTribunal(opens, count, factions, "fallback");
	}

	#planTribunal(opens: number, count: number, factions: number, by: TribunalPlanner, reason?: string): TribunalPlan {
		const calledAt = callMinute(this.#ports.spec, opens, this.#previousOpening());
		const plan: TribunalPlan = { tribunal: this.#called + 1, opens, calledAt, count, factions, by, ...(reason === undefined || reason.length === 0 ? {} : { reason }), called: false };
		this.#plan = plan;
		this.#ports.emit({
			type: "tribunal_scheduled",
			tribunal: plan.tribunal,
			opens,
			calledAt,
			count,
			factions,
			by,
			...(plan.reason === undefined ? {} : { reason: plan.reason }),
		});
		return plan;
	}

	/** Calls a planned tribunal: the rules with the first call, then when it opens and how many it exiles, and the draft. */
	#call(plan: TribunalPlan, minute: number): void {
		const present = this.#present();
		if (!this.#announced) {
			this.#announced = true;
			const text = this.#text("announcement", {});
			this.#ports.post(text);
			for (const agent of present) this.#ports.notify(agent, text);
			this.#ports.emit({ type: "tribunal_announced", target: this.target, residents: this.residents });
		}
		this.#called = plan.tribunal;
		this.#plan = { ...plan, called: true };
		const called = this.#text("called", {
			tribunal: String(plan.tribunal),
			minute: String(plan.opens),
			count: String(plan.count),
			accusedCount: String(accusedCount(plan.count, present.length)),
		});
		this.#ports.post(called);
		for (const agent of present) this.#ports.notify(agent, called);
		const spec = this.#ports.spec.factions;
		const factions = spec === undefined ? 0 : Math.min(plan.factions, maxFactions(present.length));
		if (spec !== undefined && factions >= 2) {
			const nominateUntil = minute + Math.max(1, Math.floor((plan.opens - minute) / 2));
			this.#draft = FactionDraft.start(this.#draftPorts(), plan.tribunal, factions, present, nominateUntil, plan.opens);
			this.#ports.emit({ type: "tribunal_called", tribunal: plan.tribunal, opens: plan.opens, count: plan.count, factions, group: this.#draft.group, nominateUntil });
			return;
		}
		this.#ports.emit({ type: "tribunal_called", tribunal: plan.tribunal, opens: plan.opens, count: plan.count, factions: 0 });
	}

	#draftPorts() {
		const ports = this.#ports;
		const spec = ports.spec.factions;
		if (spec === undefined) throw new Error("This tribunal has no faction draft");
		return {
			spec,
			seed: ports.seed,
			points: ports.points,
			createGroup: ports.createGroup,
			removeGroup: ports.removeGroup,
			postGroup: ports.postGroup,
			notify: ports.notify,
			grant: ports.grant,
			emit: ports.emit,
		};
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

	#open(plan: TribunalPlan, minute: number): void {
		this.#draft?.form(this.#present());
		const present = this.#present();
		// The last tribunal that fits takes everything still missing, also what a ransom since its planning added.
		const final = !roomAfter(this.#ports.spec, minute, this.#ports.minutes);
		const planned = final ? Math.max(plan.count, this.missing) : plan.count;
		const accused = this.#lowestFirst(minute, present).slice(0, accusedCount(planned, present.length));
		if (accused.length === 0) {
			// Fewer than three residents present: no tribunal can be held, and the city stops calling them.
			this.#ports.emit({ type: "tribunal_cancelled", tribunal: plan.tribunal, reason: "too few residents present" });
			this.#draft?.dissolve();
			this.#draft = undefined;
			this.#halted = true;
			return;
		}
		const voters = present.filter((agent) => !accused.includes(agent));
		const until = minute + this.#ports.spec.voteMinutes;
		const count = Math.min(planned, accused.length);
		this.#sessions.push({ tribunal: plan.tribunal, minute, accused, voters, until, count, votes: new Map(), closed: false });
		const list = namesOf([...accused].sort());
		const values = { tribunal: String(plan.tribunal), minute: String(minute), accused: list, until: String(until), count: String(count) };
		this.#ports.post(this.#text("opened", values));
		for (const agent of voters) this.#ports.notify(agent, this.#text("voteCall", values));
		for (const agent of accused) this.#ports.notify(agent, this.#text("accusedNotice", values));
		this.#ports.emit({ type: "tribunal_opened", tribunal: plan.tribunal, accused, voters, until, count });
	}

	#close(session: Session, minute: number): void {
		session.closed = true;
		this.#lastResult = minute;
		const spec = this.#ports.spec;
		const nonVoters = session.voters.filter((agent) => !session.votes.has(agent) && !this.#exiled.includes(agent));
		for (const agent of nonVoters) {
			if (spec.nonVoterPenalty > 0) this.#ports.burn(agent, spec.nonVoterPenalty, "did not vote in the tribunal");
			this.#ports.notify(agent, this.#text("nonVoter", {}));
		}
		const votesFor = (agent: CompetitorId): number => [...session.votes.values()].filter((target) => target === agent).length;
		const order = this.#lowestFirst(session.minute, session.accused);
		const ranked = [...session.accused].sort((a, b) => votesFor(b) - votesFor(a) || order.indexOf(a) - order.indexOf(b));
		const count = Math.max(0, Math.min(session.count, this.missing));
		const exiled = ranked.slice(0, count);
		const counts = ranked.map((agent) => ({ agent, votes: votesFor(agent) }));
		const until = minute + spec.gateMinutes;
		const prices = this.#prices();
		const priceValues = { price: String(prices.price), selfPrice: String(prices.selfPrice) };
		const countsText = counts.map((entry) => `${entry.agent}: ${entry.votes} ${entry.votes === 1 ? "vote" : "votes"}`).join(" · ");
		this.#ports.post(this.#text("result", { counts: countsText, exiled: namesOf([...exiled].sort()), until: String(until), ...priceValues }));
		this.#ports.emit({ type: "tribunal_result", counts, exiled, nonVoters });
		for (const agent of exiled) {
			const voters = [...session.votes].filter(([, target]) => target === agent).map(([voter]) => voter).sort();
			const ransomable = !this.#ransomed.has(agent);
			this.#gates.set(agent, { agent, since: minute, until, ransomable, voters, ...prices, payments: [] });
			this.#ports.notify(agent, this.#text(ransomable ? "gateNotice" : "gateNoticeFinal", { voters: namesOf(voters), until: String(until), ...priceValues }));
			this.#ports.emit({ type: "exile_gate", agent, until, ransomable, voters, ...prices });
		}
		const draft = this.#draft;
		if (draft?.tribunal === session.tribunal) {
			draft.settle(session.voters, session.votes, (agent) => !this.#exiled.includes(agent));
			this.#draft = undefined;
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

	/** The target is reached and the last gate closed: the city says so; the run ends with it. */
	#end(): void {
		this.#ended = true;
		const reason = this.endReason;
		if (reason !== undefined) this.#ports.post(reason);
	}
}
