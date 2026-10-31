/**
 * The black seal (v09, spec section 5): once per act the city auctions a seal
 * that exiles one resident at once. `ceil(n / perResidents)` seals per act,
 * each with its own sealed-bid auction: announced `announceAfter` minutes
 * into the act (each further one `spacing` minutes later), bids for
 * `bidMinutes` minutes. The last bid of a resident counts, and every bidder
 * pays its bid at the close, won or lost (at most what it holds then). The
 * highest bid wins, ties go to fewer points, then to a seeded draw; a bid of
 * 0 never wins, and without a positive bid there is no seal.
 *
 * The holder is a secret: the board says only that someone bears the seal,
 * the winner hears it privately and gains `permaDeath(resident)`. Used once
 * before the act ends, the target is struck at once (no gate, no will, no
 * ransom; its points burn, its pieces go to the city, P43) and counts toward the tribunal's
 * target. Refused, and gone, once the target is reached; gone unused at the
 * act's end or when its holder leaves the city. Never on oneself, never
 * passed on. The gamemaker learns that a seal exists, never who holds it.
 */
import { type CompetitorId, err, ok, renderTemplate, type Result, rngFor } from "@swarmtales/kernel";
import type { SealSpec, SealTexts } from "@swarmtales/contracts";
import type { ArenaEvent } from "./events.ts";
import type { Standing } from "./tribunal.ts";

export type SealEvent = Extract<ArenaEvent, { readonly type: "seal_auction_opened" | "seal_bid" | "seal_won" | "seal_used" | "seal_expired" }>;

export interface SealPorts {
	readonly spec: SealSpec;
	readonly seed: number;
	readonly ids: readonly CompetitorId[];
	readonly points: (agent: CompetitorId) => number;
	readonly standing: (agent: CompetitorId) => Standing;
	/** Residents the tribunal still has to exile; a seal is refused at 0. */
	readonly missing: () => number;
	readonly burn: (agent: CompetitorId, points: number, reason: string) => void;
	readonly post: (text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly emit: (event: SealEvent) => void;
	/** Strikes `target` from the city for good (the tribunal's exile without gate). */
	readonly strike: (target: CompetitorId) => void;
}

export type BidError = "NO_AUCTION" | "NOT_A_BIDDER" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS";
export type SealError = "NO_SEAL" | "SELF" | "UNKNOWN_RESIDENT" | "ALREADY_EXILED" | "TARGET_REACHED";

type SealState = "pending" | "open" | "held" | "used" | "gone";

interface Seal {
	readonly seal: number;
	readonly opens: number;
	readonly until: number;
	readonly bids: Map<CompetitorId, number>;
	state: SealState;
	holder?: CompetitorId;
}

export interface SealSnapshot {
	readonly actStart: number;
	readonly seals: readonly {
		readonly seal: number;
		readonly opens: number;
		readonly until: number;
		readonly bids: readonly { readonly agent: CompetitorId; readonly points: number }[];
		readonly state: SealState;
		readonly holder?: CompetitorId;
	}[];
}

/** Seals of an act with `residents` at its start. */
export function sealCount(spec: SealSpec, residents: number): number {
	return residents < 2 ? 0 : Math.max(1, Math.ceil(residents / spec.perResidents));
}

export class SealHouse {
	readonly #ports: SealPorts;
	#actStart: number | undefined;
	readonly #seals: Seal[] = [];

	constructor(ports: SealPorts) {
		this.#ports = ports;
	}

	get spec(): SealSpec {
		return this.#ports.spec;
	}

	/** The act's seals are laid out once the act begins, with the residents present then. */
	begin(actStart: number, residents: number): void {
		if (this.#actStart !== undefined) return;
		this.#actStart = actStart;
		const { spec } = this.#ports;
		for (let seal = 1; seal <= sealCount(spec, residents); seal++) {
			const opens = actStart + spec.announceAfter + (seal - 1) * spec.spacing;
			this.#seals.push({ seal, opens, until: opens + spec.bidMinutes, bids: new Map(), state: "pending" });
		}
	}

	/** The city's work at the start of a minute: open and close auctions. */
	tick(minute: number): void {
		for (const seal of this.#seals) {
			if (seal.state === "pending" && minute >= seal.opens) this.#open(seal);
			if (seal.state === "open" && minute >= seal.until) this.#close(seal);
		}
	}

	/** The auction open now, if any (the latest opened). */
	get auction(): { readonly seal: number; readonly until: number } | undefined {
		const open = this.#seals.filter((seal) => seal.state === "open").at(-1);
		return open === undefined ? undefined : { seal: open.seal, until: open.until };
	}

	/** `agent`'s standing bid in the open auction, if any. */
	bidOf(agent: CompetitorId): number | undefined {
		const open = this.#seals.filter((seal) => seal.state === "open").at(-1);
		return open?.bids.get(agent);
	}

	/** Whether `agent` bears an unused seal. */
	holds(agent: CompetitorId): boolean {
		return this.#seals.some((seal) => seal.state === "held" && seal.holder === agent);
	}

	/** How many seals someone bears right now: what the gamemaker may know. */
	get borne(): number {
		return this.#seals.filter((seal) => seal.state === "held").length;
	}

	/** Seals still to auction in this act. */
	get pending(): number {
		return this.#seals.filter((seal) => seal.state === "pending" || seal.state === "open").length;
	}

	/** A secret bid; the last one counts and is paid at the close, won or lost. */
	bid(agent: CompetitorId, points: number): Result<{ readonly seal: number; readonly points: number; readonly until: number }, BidError> {
		const open = this.#seals.filter((seal) => seal.state === "open").at(-1);
		if (open === undefined) return err("NO_AUCTION", "no seal is being auctioned now");
		if (this.#ports.standing(agent).kind !== "alive") return err("NOT_A_BIDDER", "only residents in the city bid");
		if (!Number.isInteger(points) || points < 0) return err("INVALID_AMOUNT", "a bid is a whole number of points, 0 or more");
		if (points > this.#ports.points(agent)) return err("INSUFFICIENT_FUNDS", `you hold ${this.#ports.points(agent)} points`);
		open.bids.set(agent, points);
		this.#ports.emit({ type: "seal_bid", seal: open.seal, agent, points });
		return ok({ seal: open.seal, points, until: open.until });
	}

	/** Breaks `holder`'s seal on `target`: struck from the city at once. */
	use(holder: CompetitorId, target: string): Result<CompetitorId, SealError> {
		const seal = this.#seals.find((entry) => entry.state === "held" && entry.holder === holder);
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
		this.#ports.emit({ type: "seal_used", seal: seal.seal, holder, target: resident });
		this.#ports.strike(resident);
		return ok(resident);
	}

	/** A resident left the city: a seal it bore is gone with it, a bid of it no longer counts. */
	onExiled(agent: CompetitorId): void {
		for (const seal of this.#seals) {
			if (seal.state === "held" && seal.holder === agent) this.#expire(seal, "its holder left the city");
			if (seal.state === "open") seal.bids.delete(agent);
		}
	}

	/** The act is over: open auctions end unpaid, unused seals are gone. */
	end(): void {
		for (const seal of this.#seals) {
			if (seal.state === "pending" || seal.state === "open") {
				seal.state = "gone";
				this.#ports.emit({ type: "seal_expired", seal: seal.seal, reason: "the act ended before the bidding closed" });
			}
			if (seal.state === "held") this.#expire(seal, "the act ended");
		}
	}

	snapshot(): SealSnapshot | undefined {
		if (this.#actStart === undefined) return undefined;
		return {
			actStart: this.#actStart,
			seals: this.#seals.map((seal) => ({
				seal: seal.seal,
				opens: seal.opens,
				until: seal.until,
				bids: [...seal.bids].map(([agent, points]) => ({ agent, points })),
				state: seal.state,
				...(seal.holder === undefined ? {} : { holder: seal.holder }),
			})),
		};
	}

	restore(state: SealSnapshot): void {
		this.#actStart = state.actStart;
		for (const seal of state.seals) {
			this.#seals.push({
				seal: seal.seal,
				opens: seal.opens,
				until: seal.until,
				bids: new Map(seal.bids.map((entry) => [entry.agent, entry.points])),
				state: seal.state,
				...(seal.holder === undefined ? {} : { holder: seal.holder }),
			});
		}
	}

	#name(seal: Seal): string {
		return this.#seals.length === 1 ? "the black seal" : `black seal ${seal.seal} of ${this.#seals.length}`;
	}

	#text(key: keyof SealTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#ports.spec.texts[key], values);
	}

	#open(seal: Seal): void {
		seal.state = "open";
		this.#ports.post(this.#text("announcement", { seal: this.#name(seal), until: String(seal.until), seals: String(this.#seals.length) }));
		this.#ports.emit({ type: "seal_auction_opened", seal: seal.seal, until: seal.until });
	}

	#close(seal: Seal): void {
		const bids = [...seal.bids].filter(([agent]) => this.#ports.standing(agent).kind !== "exiled");
		const draw = rngFor(this.#ports.seed, "seal", seal.seal).shuffle(bids.map(([agent]) => agent).sort());
		const ranked = bids
			.filter(([, points]) => points > 0)
			.sort(([a, x], [b, y]) => y - x || this.#ports.points(a) - this.#ports.points(b) || draw.indexOf(a) - draw.indexOf(b));
		const paid = bids.map(([agent, points]) => ({ agent, points: Math.min(points, Math.max(0, this.#ports.points(agent))) }));
		for (const entry of paid) if (entry.points > 0) this.#ports.burn(entry.agent, entry.points, `bid for ${this.#name(seal)}`);
		const winner = ranked[0];
		if (winner === undefined) {
			seal.state = "gone";
			this.#ports.post(this.#text("noBids", { seal: this.#name(seal) }));
			this.#ports.emit({ type: "seal_expired", seal: seal.seal, reason: "nobody bid" });
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
		this.#ports.emit({ type: "seal_won", seal: seal.seal, agent: holder, bid: paid.find((entry) => entry.agent === holder)?.points ?? 0, bids: paid });
	}

	#expire(seal: Seal, reason: string): void {
		seal.state = "gone";
		const holder = seal.holder;
		if (holder !== undefined && this.#ports.standing(holder).kind !== "exiled") this.#ports.notify(holder, this.#text("expired", { seal: this.#name(seal) }));
		this.#ports.emit({ type: "seal_expired", seal: seal.seal, ...(holder === undefined ? {} : { holder }), reason });
	}
}
