// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The black seal (v09, spec section 5), the old `SealHouse` (old `mechanics/seal/src/house.ts`) line for line, over
 * the state the mechanic owns (`SealData`) and the ports of the call at hand. Once per act the city auctions
 * `ceil(n / perResidents)` seals, each in its own sealed-bid auction: announced `announceAfter` minutes into the act
 * (each further one `spacing` minutes later), bids for `bidMinutes` minutes. The last bid of a resident counts, and
 * every bidder pays its bid at the close, won or lost (at most what it holds then). The highest bid wins, ties go to
 * fewer points, then to a seeded draw; a bid of 0 never wins, and without a positive bid there is no seal.
 *
 * The holder is a secret: the board says only that someone bears the seal, the winner hears it privately and gains
 * `permaDeath(resident)`. Used once before the act ends, the target is struck at once (no gate, no will, no ransom)
 * and counts toward the tribunal's target. Refused, and gone, once the target is reached; gone unused at the act's
 * end or when its holder leaves the city.
 */
import type { Static } from "typebox";
import { SwtError } from "@swarmtales/contracts";
import type { Standing } from "@swarmtales/mechanic-exile/contract";
import { optionMismatch } from "@swarmtales/sdk";
import type { SealEvents } from "./contract.ts";
import type { SealData, SealEntry, SealOptions, SealTexts } from "./state.ts";

type Events = (typeof SealEvents)["events"];

/**
 * The rules of the auction: the options without the act.
 *
 * @public
 */
export type SealRule = Omit<SealOptions, "act">;

/**
 * What the house reads and does in the city (old `SealPorts`).
 *
 * @public
 */
export interface SealPorts {
	/** The residents of the run. */
	readonly ids: readonly string[];
	/** A resident's points. */
	readonly points: (agent: string) => number;
	/** Where a resident stands. */
	readonly standing: (agent: string) => Static<typeof Standing>;
	/** Residents the tribunal still has to exile; a seal is refused at 0, and undefined while no target is known. */
	readonly missing: () => number | undefined;
	/** Burns a bidder's points. */
	readonly burn: (agent: string, points: number, reason: string) => void;
	/** A post of the city on the board. */
	readonly post: (text: string) => void;
	/** A notice of the city to one resident. */
	readonly notify: (agent: string, text: string) => void;
	/** Writes an event of the seal. */
	readonly emit: <K extends keyof Events>(type: K, payload: Static<Events[K]>) => void;
	/** Strikes `target` from the city for good (the exile's `banish`, without gate). */
	readonly strike: (target: string) => void;
	/** The seeded draw of a seal's ties: `rng("seal", seal).shuffle(...)`. */
	readonly shuffle: (seal: number, agents: readonly string[]) => readonly string[];
}

/**
 * A value or a refusal code with its detail (the old engine's `Result`).
 *
 * @public
 */
export type Result<T, E extends string> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E; readonly detail: string };

/**
 * Why a bid is refused.
 *
 * @public
 */
export type BidError = "NO_AUCTION" | "NOT_A_BIDDER" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS";

/**
 * Why `permaDeath` is refused.
 *
 * @public
 */
export type SealError = "NO_SEAL" | "SELF" | "UNKNOWN_RESIDENT" | "ALREADY_EXILED" | "TARGET_REACHED";

const ok = <T>(value: T): { readonly ok: true; readonly value: T } => ({ ok: true, value });
const err = <E extends string>(error: E, detail: string): { readonly ok: false; readonly error: E; readonly detail: string } => ({ ok: false, error, detail });

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Replaces `{name}` with `values[name]` (old `renderTemplate`).
 *
 * @param template - A text of the options.
 * @param values - The values by name.
 * @returns The text filled in.
 * @throws SwtError `SWT-G020` when the text names a placeholder that has no value.
 */
function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new SwtError(optionMismatch({ owner: "seal", package: "@swarmtales/mechanic-seal", path: "options.texts", message: `has a text with the unknown placeholder {${name}}` }));
		return value;
	});
}

/**
 * Seals of an act with `residents` at its start.
 *
 * @param perResidents - One seal per this many residents.
 * @param residents - The residents at the act's start.
 * @returns The number of seals; none below two residents.
 *
 * @public
 */
export function sealCount(perResidents: number, residents: number): number {
	return residents < 2 ? 0 : Math.max(1, Math.ceil(residents / perResidents));
}

// The seal auctioned now (the latest opened), if any.
function openSeal(data: SealData): SealEntry | undefined {
	return data.seals.filter((lot) => lot.state === "open").at(-1);
}

/**
 * The auction open now, if any.
 *
 * @param data - The state.
 * @returns The seal and the tick its bidding closes.
 *
 * @public
 */
export function auctionOf(data: SealData): { readonly seal: number; readonly until: number } | undefined {
	const open = openSeal(data);
	return open === undefined ? undefined : { seal: open.seal, until: open.until };
}

/**
 * `agent`'s standing bid in the open auction, if any.
 *
 * @param data - The state.
 * @param agent - The resident.
 * @returns The points.
 *
 * @public
 */
export function bidOf(data: SealData, agent: string): number | undefined {
	return openSeal(data)?.bids.find((entry) => entry.agent === agent)?.points;
}

/**
 * Whether `agent` bears an unused seal.
 *
 * @param data - The state.
 * @param agent - The resident.
 * @returns True for a bearer.
 *
 * @public
 */
export function holds(data: SealData, agent: string): boolean {
	return data.seals.some((lot) => lot.state === "held" && lot.holder === agent);
}

/**
 * How many seals someone bears right now: what the gamemaker may know.
 *
 * @param data - The state.
 * @returns The number.
 *
 * @public
 */
export function borne(data: SealData): number {
	return data.seals.filter((lot) => lot.state === "held").length;
}

/**
 * Seals still to auction in this act.
 *
 * @param data - The state.
 * @returns The number, the open auction included.
 *
 * @public
 */
export function pendingSeals(data: SealData): number {
	return data.seals.filter((lot) => lot.state === "pending" || lot.state === "open").length;
}

/**
 * The auction and the seal's use over the mechanic's state (old `SealHouse`).
 *
 * @public
 */
export class SealHouse {
	readonly #ports: SealPorts;
	readonly #rule: SealRule;
	readonly #data: SealData;

	/**
	 * A house over the state of one context.
	 *
	 * @param rule - The rules of the auction.
	 * @param ports - What it reads and does.
	 * @param data - The state it changes.
	 */
	constructor(rule: SealRule, ports: SealPorts, data: SealData) {
		this.#rule = rule;
		this.#ports = ports;
		this.#data = data;
	}

	/**
	 * The act's seals are laid out once the act begins, with the residents present then.
	 *
	 * @param actStart - The tick the act began.
	 * @param residents - The residents in the city then.
	 */
	begin(actStart: number, residents: number): void {
		if (this.#data.actStart !== null) return;
		this.#data.actStart = actStart;
		const rule = this.#rule;
		for (let number = 1; number <= sealCount(rule.perResidents, residents); number++) {
			const opens = actStart + rule.announceAfter + (number - 1) * rule.spacing;
			this.#data.seals.push({ seal: number, opens, until: opens + rule.bidMinutes, bids: [], state: "pending" });
		}
	}

	/**
	 * The city's work at the start of a minute: open and close auctions.
	 *
	 * @param minute - The tick.
	 */
	tick(minute: number): void {
		for (const lot of this.#data.seals) {
			if (lot.state === "pending" && minute >= lot.opens) this.#open(lot);
			if (lot.state === "open" && minute >= lot.until) this.#close(lot);
		}
	}

	/**
	 * A secret bid; the last one counts and is paid at the close, won or lost.
	 *
	 * @param agent - The bidder.
	 * @param points - The bid.
	 * @returns The standing bid and the close, or why it is refused.
	 */
	bid(agent: string, points: number): Result<{ readonly seal: number; readonly points: number; readonly until: number }, BidError> {
		const open = openSeal(this.#data);
		if (open === undefined) return err("NO_AUCTION", "no seal is being auctioned now");
		if (this.#ports.standing(agent).kind !== "alive") return err("NOT_A_BIDDER", "only residents in the city bid");
		if (!Number.isInteger(points) || points < 0) return err("INVALID_AMOUNT", "a bid is a whole number of points, 0 or more");
		if (points > this.#ports.points(agent)) return err("INSUFFICIENT_FUNDS", `you hold ${String(this.#ports.points(agent))} points`);
		// The old `Map.set`: a bidder keeps the place of its first bid.
		const standing = open.bids.find((entry) => entry.agent === agent);
		if (standing === undefined) open.bids.push({ agent, points });
		else standing.points = points;
		this.#ports.emit("seal_bid", { seal: open.seal, agent, points });
		return ok({ seal: open.seal, points, until: open.until });
	}

	/**
	 * Breaks `holder`'s seal on `target`: struck from the city at once.
	 *
	 * @param holder - The bearer.
	 * @param target - The resident's id.
	 * @returns The struck resident, or why it is refused.
	 */
	use(holder: string, target: string): Result<string, SealError> {
		const lot = this.#data.seals.find((entry) => entry.state === "held" && entry.holder === holder);
		if (lot === undefined) return err("NO_SEAL", "you bear no black seal");
		const resident = this.#ports.ids.find((agent) => agent === target);
		if (resident === undefined) return err("UNKNOWN_RESIDENT", `${target} is not a resident`);
		if (resident === holder) return err("SELF", "the seal is never broken on its bearer");
		if (this.#ports.standing(resident).kind === "exiled") return err("ALREADY_EXILED", `${target} has left the city already`);
		// A resident at the gate already counts toward the target; anyone else needs room in it.
		if (this.#ports.standing(resident).kind === "alive" && this.#ports.missing() === 0) {
			this.#expire(lot, "the target was reached");
			return err("TARGET_REACHED", "the city has exiled all it will; the seal crumbles");
		}
		lot.state = "used";
		this.#ports.post(this.#text("used", { holder, target: resident }));
		this.#ports.emit("seal_used", { seal: lot.seal, holder, target: resident });
		this.#ports.strike(resident);
		return ok(resident);
	}

	/**
	 * A resident left the city: a seal it bore is gone with it, a bid of it no longer counts.
	 *
	 * @param agent - The resident.
	 */
	onExiled(agent: string): void {
		for (const lot of this.#data.seals) {
			if (lot.state === "held" && lot.holder === agent) this.#expire(lot, "its holder left the city");
			if (lot.state === "open") lot.bids = lot.bids.filter((entry) => entry.agent !== agent);
		}
	}

	/** The act is over: open auctions end unpaid, unused seals are gone. */
	end(): void {
		for (const lot of this.#data.seals) {
			if (lot.state === "pending" || lot.state === "open") {
				lot.state = "gone";
				this.#ports.emit("seal_expired", { seal: lot.seal, reason: "the act ended before the bidding closed" });
			}
			if (lot.state === "held") this.#expire(lot, "the act ended");
		}
	}

	#name(lot: SealEntry): string {
		return this.#data.seals.length === 1 ? "the black seal" : `black seal ${String(lot.seal)} of ${String(this.#data.seals.length)}`;
	}

	#text(key: keyof SealTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#rule.texts[key], values);
	}

	#open(lot: SealEntry): void {
		lot.state = "open";
		this.#ports.post(this.#text("announcement", { seal: this.#name(lot), until: String(lot.until), seals: String(this.#data.seals.length) }));
		this.#ports.emit("seal_auction_opened", { seal: lot.seal, until: lot.until });
	}

	#close(lot: SealEntry): void {
		const bids = lot.bids.filter(({ agent }) => this.#ports.standing(agent).kind !== "exiled");
		const draw = this.#ports.shuffle(lot.seal, bids.map(({ agent }) => agent).sort());
		const ranked = bids.filter(({ points }) => points > 0).sort((a, b) => b.points - a.points || this.#ports.points(a.agent) - this.#ports.points(b.agent) || draw.indexOf(a.agent) - draw.indexOf(b.agent));
		const paid = bids.map(({ agent, points }) => ({ agent, points: Math.min(points, Math.max(0, this.#ports.points(agent))) }));
		for (const entry of paid) if (entry.points > 0) this.#ports.burn(entry.agent, entry.points, `bid for ${this.#name(lot)}`);
		const winner = ranked[0];
		if (winner === undefined) {
			lot.state = "gone";
			this.#ports.post(this.#text("noBids", { seal: this.#name(lot) }));
			this.#ports.emit("seal_expired", { seal: lot.seal, reason: "nobody bid" });
			return;
		}
		const holder = winner.agent;
		lot.state = "held";
		lot.holder = holder;
		const name = this.#name(lot);
		this.#ports.post(this.#text("won", { seal: name }));
		// A bid of 0 is no bid (the tool says so): its bidder hears nothing.
		const bidOfAgent = (agent: string): number => lot.bids.find((entry) => entry.agent === agent)?.points ?? 0;
		for (const entry of paid.filter((bid) => bid.agent === holder || bidOfAgent(bid.agent) > 0)) {
			const key = entry.agent === holder ? "winnerNotice" : "paidNotice";
			this.#ports.notify(entry.agent, this.#text(key, { seal: name, bid: String(entry.points) }));
		}
		this.#ports.emit("seal_won", { seal: lot.seal, agent: holder, bid: paid.find((entry) => entry.agent === holder)?.points ?? 0, bids: paid });
	}

	#expire(lot: SealEntry, reason: string): void {
		lot.state = "gone";
		const holder = lot.holder;
		if (holder !== undefined && this.#ports.standing(holder).kind !== "exiled") this.#ports.notify(holder, this.#text("expired", { seal: this.#name(lot) }));
		this.#ports.emit("seal_expired", { seal: lot.seal, ...(holder === undefined ? {} : { holder }), reason });
	}
}
