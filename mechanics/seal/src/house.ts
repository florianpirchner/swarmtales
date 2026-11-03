/**
 * The black seal (v09, spec section 5), the old `SealHouse` (packages/engine/src/seal.ts) line for
 * line, over state the mechanic owns (`SealData`) and the ports of the call at hand. Once per act
 * the city auctions `ceil(n / perResidents)` seals, each in its own sealed-bid auction: announced
 * `announceAfter` minutes into the act (each further one `spacing` minutes later), bids for
 * `bidMinutes` minutes. The last bid of a resident counts, and every bidder pays its bid at the
 * close, won or lost (at most what it holds then). The highest bid wins, ties go to fewer points,
 * then to a seeded draw; a bid of 0 never wins, and without a positive bid there is no seal.
 *
 * The holder is a secret: the board says only that someone bears the seal, the winner hears it
 * privately and gains `permaDeath(resident)`. Used once before the act ends, the target is struck
 * at once (no gate, no will, no ransom) and counts toward the tribunal's target. Refused, and gone,
 * once the target is reached; gone unused at the act's end or when its holder leaves the city.
 */
import type { Static } from "typebox";
import type { Standing } from "@swarmtales/mechanic-shared";
import type { sealEvents } from "./events.ts";
import { err, ok, type Result } from "./result.ts";
import { renderTemplate } from "./template.ts";

export type SealStage = "pending" | "open" | "held" | "used" | "gone";

export interface SealEntry {
	readonly seal: number;
	readonly opens: number;
	readonly until: number;
	readonly bids: Map<string, number>;
	state: SealStage;
	holder?: string;
}

/** The mechanic's state: the act's start once it began, and its seals. */
export interface SealData {
	actStart: number | undefined;
	readonly seals: SealEntry[];
}

export interface SealTexts {
	readonly announcement: string;
	readonly won: string;
	readonly winnerNotice: string;
	readonly paidNotice: string;
	readonly noBids: string;
	readonly used: string;
	readonly expired: string;
}

export interface SealRule {
	readonly announceAfter: number;
	readonly bidMinutes: number;
	readonly perResidents: number;
	readonly spacing: number;
	readonly texts: SealTexts;
}

export interface SealPorts {
	readonly ids: readonly string[];
	readonly points: (agent: string) => number;
	readonly standing: (agent: string) => Standing;
	/** Residents the tribunal still has to exile; a seal is refused at 0. */
	readonly missing: () => number;
	readonly burn: (agent: string, points: number, reason: string) => void;
	readonly post: (text: string) => void;
	readonly notify: (agent: string, text: string) => void;
	readonly emit: <K extends keyof typeof sealEvents>(type: K, payload: Static<(typeof sealEvents)[K]>) => void;
	/** Strikes `target` from the city for good (the tribunal's exile without gate). */
	readonly strike: (target: string) => void;
	/** The seeded draw of a seal's ties: `rngFor(seed, "seal", seal).shuffle(...)`. */
	readonly shuffle: (seal: number, agents: readonly string[]) => readonly string[];
}

export type BidError = "NO_AUCTION" | "NOT_A_BIDDER" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS";
export type SealError = "NO_SEAL" | "SELF" | "UNKNOWN_RESIDENT" | "ALREADY_EXILED" | "TARGET_REACHED";

export function emptySeal(): SealData {
	return { actStart: undefined, seals: [] };
}

/** Seals of an act with `residents` at its start. */
export function sealCount(perResidents: number, residents: number): number {
	return residents < 2 ? 0 : Math.max(1, Math.ceil(residents / perResidents));
}

/** The seal auctioned now (the latest opened), if any. */
function openSeal(data: SealData): SealEntry | undefined {
	return data.seals.filter((seal) => seal.state === "open").at(-1);
}

/** The auction open now, if any. */
export function auctionOf(data: SealData): { readonly seal: number; readonly until: number } | undefined {
	const open = openSeal(data);
	return open === undefined ? undefined : { seal: open.seal, until: open.until };
}

/** `agent`'s standing bid in the open auction, if any. */
export function bidOf(data: SealData, agent: string): number | undefined {
	return openSeal(data)?.bids.get(agent);
}

/** Whether `agent` bears an unused seal. */
export function holds(data: SealData, agent: string): boolean {
	return data.seals.some((seal) => seal.state === "held" && seal.holder === agent);
}

/** How many seals someone bears right now: what the gamemaker may know. */
export function borne(data: SealData): number {
	return data.seals.filter((seal) => seal.state === "held").length;
}

/** Seals still to auction in this act. */
export function pendingSeals(data: SealData): number {
	return data.seals.filter((seal) => seal.state === "pending" || seal.state === "open").length;
}

export class SealHouse {
	readonly #ports: SealPorts;
	readonly #rule: SealRule;
	readonly #data: SealData;

	constructor(rule: SealRule, ports: SealPorts, data: SealData) {
		this.#rule = rule;
		this.#ports = ports;
		this.#data = data;
	}

	/** The act's seals are laid out once the act begins, with the residents present then. */
	begin(actStart: number, residents: number): void {
		if (this.#data.actStart !== undefined) return;
		this.#data.actStart = actStart;
		const rule = this.#rule;
		for (let seal = 1; seal <= sealCount(rule.perResidents, residents); seal++) {
			const opens = actStart + rule.announceAfter + (seal - 1) * rule.spacing;
			this.#data.seals.push({ seal, opens, until: opens + rule.bidMinutes, bids: new Map(), state: "pending" });
		}
	}

	/** The city's work at the start of a minute: open and close auctions. */
	tick(minute: number): void {
		for (const seal of this.#data.seals) {
			if (seal.state === "pending" && minute >= seal.opens) this.#open(seal);
			if (seal.state === "open" && minute >= seal.until) this.#close(seal);
		}
	}

	/** A secret bid; the last one counts and is paid at the close, won or lost. */
	bid(agent: string, points: number): Result<{ readonly seal: number; readonly points: number; readonly until: number }, BidError> {
		const open = openSeal(this.#data);
		if (open === undefined) return err("NO_AUCTION", "no seal is being auctioned now");
		if (this.#ports.standing(agent).kind !== "alive") return err("NOT_A_BIDDER", "only residents in the city bid");
		if (!Number.isInteger(points) || points < 0) return err("INVALID_AMOUNT", "a bid is a whole number of points, 0 or more");
		if (points > this.#ports.points(agent)) return err("INSUFFICIENT_FUNDS", `you hold ${this.#ports.points(agent)} points`);
		open.bids.set(agent, points);
		this.#ports.emit("seal_bid", { seal: open.seal, agent, points });
		return ok({ seal: open.seal, points, until: open.until });
	}

	/** Breaks `holder`'s seal on `target`: struck from the city at once. */
	use(holder: string, target: string): Result<string, SealError> {
		const seal = this.#data.seals.find((entry) => entry.state === "held" && entry.holder === holder);
		if (seal === undefined) return err("NO_SEAL", "you bear no black seal");
		const resident = this.#ports.ids.find((agent) => agent === target);
		if (resident === undefined) return err("UNKNOWN_RESIDENT", `${target} is not a resident`);
		if (resident === holder) return err("SELF", "the seal is never broken on its bearer");
		if (this.#ports.standing(resident).kind === "exiled") return err("ALREADY_EXILED", `${target} has left the city already`);
		// A resident at the gate already counts toward the target; anyone else needs room in it.
		if (this.#ports.standing(resident).kind === "alive" && this.#ports.missing() === 0) {
			this.#expire(seal, "the target was reached");
			return err("TARGET_REACHED", "the city has exiled all it will; the seal crumbles");
		}
		seal.state = "used";
		this.#ports.post(this.#text("used", { holder, target: resident }));
		this.#ports.emit("seal_used", { seal: seal.seal, holder, target: resident });
		this.#ports.strike(resident);
		return ok(resident);
	}

	/** A resident left the city: a seal it bore is gone with it, a bid of it no longer counts. */
	onExiled(agent: string): void {
		for (const seal of this.#data.seals) {
			if (seal.state === "held" && seal.holder === agent) this.#expire(seal, "its holder left the city");
			if (seal.state === "open") seal.bids.delete(agent);
		}
	}

	/** The act is over: open auctions end unpaid, unused seals are gone. */
	end(): void {
		for (const seal of this.#data.seals) {
			if (seal.state === "pending" || seal.state === "open") {
				seal.state = "gone";
				this.#ports.emit("seal_expired", { seal: seal.seal, reason: "the act ended before the bidding closed" });
			}
			if (seal.state === "held") this.#expire(seal, "the act ended");
		}
	}

	#name(seal: SealEntry): string {
		return this.#data.seals.length === 1 ? "the black seal" : `black seal ${seal.seal} of ${this.#data.seals.length}`;
	}

	#text(key: keyof SealTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#rule.texts[key], values);
	}

	#open(seal: SealEntry): void {
		seal.state = "open";
		this.#ports.post(this.#text("announcement", { seal: this.#name(seal), until: String(seal.until), seals: String(this.#data.seals.length) }));
		this.#ports.emit("seal_auction_opened", { seal: seal.seal, until: seal.until });
	}

	#close(seal: SealEntry): void {
		const bids = [...seal.bids].filter(([agent]) => this.#ports.standing(agent).kind !== "exiled");
		const draw = this.#ports.shuffle(seal.seal, bids.map(([agent]) => agent).sort());
		const ranked = bids
			.filter(([, points]) => points > 0)
			.sort(([a, x], [b, y]) => y - x || this.#ports.points(a) - this.#ports.points(b) || draw.indexOf(a) - draw.indexOf(b));
		const paid = bids.map(([agent, points]) => ({ agent, points: Math.min(points, Math.max(0, this.#ports.points(agent))) }));
		for (const entry of paid) if (entry.points > 0) this.#ports.burn(entry.agent, entry.points, `bid for ${this.#name(seal)}`);
		const winner = ranked[0];
		if (winner === undefined) {
			seal.state = "gone";
			this.#ports.post(this.#text("noBids", { seal: this.#name(seal) }));
			this.#ports.emit("seal_expired", { seal: seal.seal, reason: "nobody bid" });
			return;
		}
		const [holder] = winner;
		seal.state = "held";
		seal.holder = holder;
		const name = this.#name(seal);
		this.#ports.post(this.#text("won", { seal: name }));
		// A bid of 0 is no bid (the tool says so): its bidder hears nothing.
		for (const entry of paid.filter((bid) => bid.agent === holder || (seal.bids.get(bid.agent) ?? 0) > 0)) {
			const key = entry.agent === holder ? "winnerNotice" : "paidNotice";
			this.#ports.notify(entry.agent, this.#text(key, { seal: name, bid: String(entry.points) }));
		}
		this.#ports.emit("seal_won", { seal: seal.seal, agent: holder, bid: paid.find((entry) => entry.agent === holder)?.points ?? 0, bids: paid });
	}

	#expire(seal: SealEntry, reason: string): void {
		seal.state = "gone";
		const holder = seal.holder;
		if (holder !== undefined && this.#ports.standing(holder).kind !== "exiled") this.#ports.notify(holder, this.#text("expired", { seal: this.#name(seal) }));
		this.#ports.emit("seal_expired", { seal: seal.seal, ...(holder === undefined ? {} : { holder }), reason });
	}
}
