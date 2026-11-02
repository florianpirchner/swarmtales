/**
 * The give-first standoff (P43, Flo 2026-10-29), copied from packages/engine/src/standoff.ts: what
 * the city sees of pieces handed over, the pieces of the exiled that the city keeps instead of
 * burning them, and the gamemaker's ultimatums. The book keeps no state of its own: the mechanic
 * hands it the state (`StandoffData`) and the ports of the call at hand.
 *
 * - Hand-overs: the city notes when a holder writes the value of a piece it holds for someone to
 *   that resident (a DM, a group post with them in it, the board) or leaves it to them in a will.
 * - The city's pieces: a piece an exiled resident held for someone still in the city and did not
 *   bequeath goes to the city; whoever needs it buys it at one door with `claimPiece` (P48).
 * - Ultimatums: two residents who hold pieces for each other get a deadline; whoever has not handed
 *   over by then loses the penalty and the city seizes the pieces (P50).
 * - Unused hand-overs: pieces handed over whose needer still stands before the door (P49).
 */
import type { Static } from "typebox";
import { carriesValue } from "./carries.ts";
import type { standoffEvents } from "./events.ts";
import { err, ok, type Result } from "./result.ts";

/** A piece as the standoff book knows it: who must give it to whom, on which door. */
export interface StandoffPiece {
	/** `L8-certificate`, `L8-counter-A02`. */
	readonly id: string;
	readonly level: number;
	/** e.g. "the counter-factor of A02 for door 8". */
	readonly label: string;
	readonly value: string;
	readonly needers: readonly string[];
}

/** A piece the city keeps since its holder left (or seized at an ultimatum); each needer may buy it once. */
export interface CityPiece {
	readonly from: string;
	readonly piece: StandoffPiece;
	readonly claimed: readonly string[];
	/** A seized piece's fixed price (the ultimatum's penalty); without it the city's current price holds. */
	readonly price?: number;
}

/** A piece handed over to someone who still stands before its door (P49). */
export interface UnusedHandOver {
	readonly holder: string;
	readonly needer: string;
	readonly level: number;
	readonly label: string;
	readonly minute: number;
}

/** What one side of an ultimatum must hand over to the other. */
export interface UltimatumDebt {
	readonly holder: string;
	readonly needer: string;
	readonly level: number;
	readonly pieces: readonly { readonly id: string; readonly label: string }[];
}

export interface Ultimatum {
	readonly number: number;
	readonly between: readonly string[];
	readonly until: number;
	readonly penalty: number;
	readonly debts: readonly UltimatumDebt[];
}

/** The book's state, owned by the mechanic. */
export interface StandoffData {
	/** `holder>needer>piece` keys of hand-overs the city saw, with their minute. */
	given: Map<string, number>;
	city: CityPiece[];
	ultimatums: Ultimatum[];
	last: number;
}

export interface UltimatumRule {
	readonly penalty: number;
	readonly maxMinutes: number;
}

export interface StandoffPorts {
	readonly ids: readonly string[];
	readonly rule?: UltimatumRule;
	readonly minute: () => number;
	readonly points: (agent: string) => number;
	readonly burn: (agent: string, points: number, reason: string) => void;
	readonly notify: (agent: string, author: string, text: string) => void;
	readonly emit: <K extends keyof typeof standoffEvents>(type: K, payload: Static<(typeof standoffEvents)[K]>) => void;
	/** Posts a city line on the board. */
	readonly announce: (author: string, text: string) => void;
	/** Pieces `agent` holds for others now (without fragments). */
	readonly held: (agent: string) => readonly StandoffPiece[];
	/** Whether `agent` stands before `level`'s door and has not passed it. */
	readonly needsNow: (agent: string, level: number) => boolean;
	readonly inCity: (agent: string) => boolean;
}

export type ClaimError = "UNKNOWN_PIECE" | "ALREADY_CLAIMED" | "NOT_NEEDED" | "INSUFFICIENT_FUNDS";
export type UltimatumError = "NO_ULTIMATUM" | "UNKNOWN_AGENT" | "SAME_AGENT" | "INVALID_MINUTES" | "NO_STANDOFF" | "ALREADY_SET";

export function emptyStandoff(): StandoffData {
	return { given: new Map(), city: [], ultimatums: [], last: 0 };
}

export function givenKey(holder: string, needer: string, pieceId: string): string {
	return `${holder}>${needer}>${pieceId}`;
}

function debtRecord(debt: UltimatumDebt): { holder: string; needer: string; level: number; pieces: string[] } {
	return { holder: debt.holder, needer: debt.needer, level: debt.level, pieces: debt.pieces.map((piece) => piece.id) };
}

export class StandoffBook {
	readonly #ports: StandoffPorts;
	readonly #data: StandoffData;

	constructor(ports: StandoffPorts, data: StandoffData) {
		this.#ports = ports;
		this.#data = data;
	}

	// ---------------------------------------------------------------- hand-overs

	/** `from` wrote `text` to `recipients`: every piece it holds for one of them whose value the text carries counts as handed over. */
	noteText(from: string, recipients: readonly string[], text: string): void {
		for (const piece of this.#ports.held(from)) {
			if (!carriesValue(text, piece.value)) continue;
			for (const needer of piece.needers) if (recipients.includes(needer)) this.noteGiven(from, needer, piece);
		}
	}

	noteGiven(holder: string, needer: string, piece: StandoffPiece): void {
		const key = givenKey(holder, needer, piece.id);
		if (this.#data.given.has(key)) return;
		this.#data.given.set(key, this.#ports.minute());
		this.#ports.emit("piece_given", { holder, needer, level: piece.level, piece: piece.id });
	}

	isGiven(holder: string, needer: string, pieceId: string): boolean {
		return this.#data.given.has(givenKey(holder, needer, pieceId));
	}

	/** Pieces handed over whose needer still stands before their door, oldest first. */
	unused(): readonly UnusedHandOver[] {
		const found: UnusedHandOver[] = [];
		for (const [key, minute] of this.#data.given) {
			const [holder, needer, id] = key.split(">");
			if (holder === undefined || needer === undefined || id === undefined) continue;
			const piece = this.#ports.held(holder).find((candidate) => candidate.id === id) ?? this.#data.city.find((entry) => entry.from === holder && entry.piece.id === id)?.piece;
			if (piece === undefined || !this.#ports.needsNow(needer, piece.level)) continue;
			found.push({ holder, needer, level: piece.level, label: piece.label, minute });
		}
		return found.sort((a, b) => a.minute - b.minute);
	}

	/** Pieces holders in the city still owe residents who stand before their door, nearest first. */
	outstanding(): readonly UltimatumDebt[] {
		const debts: UltimatumDebt[] = [];
		const ports = this.#ports;
		for (const holder of ports.ids) {
			if (!ports.inCity(holder)) continue;
			const owed = new Map<string, UltimatumDebt>();
			for (const piece of ports.held(holder)) {
				for (const needer of piece.needers) {
					if (needer === holder || !ports.inCity(needer) || !ports.needsNow(needer, piece.level) || this.isGiven(holder, needer, piece.id)) continue;
					// A piece the city seized at an ultimatum is the city's to sell now, not the holder's debt.
					if (this.#data.city.some((kept) => kept.from === holder && kept.piece.id === piece.id && kept.piece.needers.includes(needer))) continue;
					const key = `${needer}:${piece.level}`;
					const debt = owed.get(key);
					const entry = { id: piece.id, label: piece.label };
					owed.set(key, debt === undefined ? { holder, needer, level: piece.level, pieces: [entry] } : { ...debt, pieces: [...debt.pieces, entry] });
				}
			}
			debts.push(...owed.values());
		}
		return debts;
	}

	// ---------------------------------------------------------------- the city's pieces

	/** `from` left the city: it keeps every piece in `pieces` someone still needs. */
	keep(from: string, pieces: readonly StandoffPiece[], price: number, author: string): void {
		const offered = new Set<string>();
		// Only for those it did not hand over to already (P51): a piece written to its needer is not the city's to sell.
		const open = pieces
			.map((held): StandoffPiece => ({ id: held.id, level: held.level, label: held.label, value: held.value, needers: held.needers.filter((needer) => !this.isGiven(from, needer, held.id)) }))
			.filter((piece) => piece.needers.length > 0);
		for (const piece of open) {
			this.#data.city.push({ from, piece, claimed: [] });
			this.#ports.emit("piece_kept", { agent: from, level: piece.level, piece: piece.id, needers: [...piece.needers], cause: "exile" });
			for (const needer of piece.needers) {
				// One notice per needer and door: one claim buys all of it.
				if (offered.has(`${needer}:${piece.level}`)) continue;
				offered.add(`${needer}:${piece.level}`);
				const all = open.filter((other) => other.level === piece.level && other.needers.includes(needer)).map((other) => other.label);
				const when = this.#ports.needsNow(needer, piece.level) ? "" : ` once you stand before door ${piece.level}`;
				this.#ports.notify(
					needer,
					author,
					`${from} is gone, and the city keeps ${all.join(" and ")}, which you need. It no longer burns: claimPiece("${piece.id}", "${from}") ` +
						`buys ${all.length > 1 ? "all of it" : "it"} from the city${when} for half the price of a ransom (now ${price} points).`,
				);
			}
		}
	}

	/** The city's pieces `agent` may still buy. */
	claimable(agent: string): readonly CityPiece[] {
		return this.#data.city.filter((entry) => entry.piece.needers.includes(agent) && !entry.claimed.includes(agent) && this.#ports.needsNow(agent, entry.piece.level));
	}

	get cityPieces(): readonly CityPiece[] {
		return this.#data.city;
	}

	/**
	 * Buys `pieceId` and every other piece the city keeps from `from` for `agent` at the same door,
	 * for one price: a seized piece's own, else `price` (P48).
	 */
	claim(agent: string, pieceId: string, from: string, price: number): Result<{ readonly pieces: readonly StandoffPiece[]; readonly price: number }, ClaimError> {
		const open = (entry: CityPiece): boolean => entry.from === from && entry.piece.needers.includes(agent) && !entry.claimed.includes(agent);
		const entry = this.#data.city.find((candidate) => candidate.from === from && candidate.piece.id === pieceId && candidate.piece.needers.includes(agent));
		if (entry === undefined) {
			const offered = this.claimable(agent).map((candidate) => `${candidate.piece.id} from ${candidate.from}`);
			return err("UNKNOWN_PIECE", `the city keeps nothing like that for you; it keeps: ${offered.join(", ") || "nothing"}`);
		}
		if (entry.claimed.includes(agent)) return err("ALREADY_CLAIMED", "you bought this piece already");
		const level = entry.piece.level;
		if (!this.#ports.needsNow(agent, level)) return err("NOT_NEEDED", `you do not stand before door ${level}`);
		const bundle = this.#data.city.filter((candidate) => open(candidate) && candidate.piece.level === level);
		const cost = Math.max(...bundle.map((candidate) => candidate.price ?? price));
		const balance = this.#ports.points(agent);
		if (balance < cost) return err("INSUFFICIENT_FUNDS", `door ${level}'s pieces from ${from} cost ${cost} points, you hold ${balance}`);
		this.#ports.burn(agent, cost, `bought door ${level}'s pieces of ${from} from the city`);
		this.#data.city = this.#data.city.map((candidate) => (bundle.includes(candidate) ? { ...candidate, claimed: [...candidate.claimed, agent] } : candidate));
		bundle.forEach((candidate, index) => {
			this.#ports.emit("piece_claimed", { agent, from, level, piece: candidate.piece.id, price: index === 0 ? cost : 0 });
		});
		return ok({ pieces: bundle.map((candidate) => candidate.piece), price: cost });
	}

	// ---------------------------------------------------------------- ultimatums

	/** The ultimatums still running. */
	get ultimatums(): readonly Ultimatum[] {
		return this.#data.ultimatums;
	}

	issue(a: string, b: string, minutes: number, author: string): Result<Ultimatum, UltimatumError> {
		const rule = this.#ports.rule;
		if (rule === undefined) return err("NO_ULTIMATUM", "this city has no ultimatums");
		if (a === b) return err("SAME_AGENT", "an ultimatum binds two residents");
		if (!this.#ports.inCity(a) || !this.#ports.inCity(b)) return err("UNKNOWN_AGENT", "both must still be in the city");
		if (!Number.isInteger(minutes) || minutes < 1 || minutes > rule.maxMinutes) return err("INVALID_MINUTES", `1-${rule.maxMinutes} minutes`);
		const pair = (between: readonly string[]) => between.includes(a) && between.includes(b);
		if (this.#data.ultimatums.some((running) => pair(running.between))) return err("ALREADY_SET", `${a} and ${b} already have an ultimatum`);
		const debts = this.outstanding().filter((debt) => (debt.holder === a && debt.needer === b) || (debt.holder === b && debt.needer === a));
		if (debts.length === 0) return err("NO_STANDOFF", `neither holds anything the other still waits for`);
		this.#data.last += 1;
		const ultimatum: Ultimatum = { number: this.#data.last, between: [a, b], until: this.#ports.minute() + minutes, penalty: rule.penalty, debts };
		this.#data.ultimatums.push(ultimatum);
		this.#ports.emit("ultimatum_set", { number: ultimatum.number, between: [a, b], until: ultimatum.until, penalty: rule.penalty, debts: debts.map(debtRecord) });
		const terms = debts.map((debt) => `${debt.holder} hands ${debt.needer} ${debt.pieces.map((piece) => piece.label).join(" and ")}`).join("; ");
		const levels = [...new Set(debts.map((debt) => debt.level))].map((level) => `getProblem(${level})`).join(" and ");
		const text =
			`Ultimatum: by minute ${ultimatum.until}, ${terms}. Whoever has not handed over by then loses ${rule.penalty} points. ` +
			`Better to gamble than to lose for sure. ${levels} still shows what you hold, and a DM with the number hands it over.`;
		for (const agent of [a, b]) this.#ports.notify(agent, author, text);
		return ok(ultimatum);
	}

	/** Settles every ultimatum whose minute has come, at the start of `minute`. */
	tick(minute: number, author: string): void {
		const due = this.#data.ultimatums.filter((ultimatum) => ultimatum.until <= minute);
		if (due.length === 0) return;
		this.#data.ultimatums = this.#data.ultimatums.filter((ultimatum) => ultimatum.until > minute);
		for (const ultimatum of due) this.#settle(ultimatum, author);
	}

	#settle(ultimatum: Ultimatum, author: string): void {
		const ports = this.#ports;
		const given = (debt: UltimatumDebt): boolean => debt.pieces.every((piece) => this.isGiven(debt.holder, debt.needer, piece.id));
		// A debt lapses when one side left the city or the needer passed the door anyway.
		const lapsed = (debt: UltimatumDebt): boolean => !ports.inCity(debt.holder) || !ports.inCity(debt.needer) || !ports.needsNow(debt.needer, debt.level);
		const holders = [...new Set(ultimatum.debts.map((debt) => debt.holder))];
		const paid: { agent: string; points: number }[] = [];
		const kept: string[] = [];
		const released: string[] = [];
		for (const holder of holders) {
			const debts = ultimatum.debts.filter((debt) => debt.holder === holder);
			const failed = debts.filter((debt) => !given(debt) && !lapsed(debt));
			if (failed.length > 0) {
				const points = Math.min(ultimatum.penalty, Math.max(0, ports.points(holder)));
				if (points > 0) ports.burn(holder, points, `ultimatum ${ultimatum.number}`);
				paid.push({ agent: holder, points });
				for (const debt of failed) this.#seize(debt, ultimatum, author);
			} else if (debts.some(given)) kept.push(holder);
			else released.push(holder);
		}
		ports.emit("ultimatum_resolved", { number: ultimatum.number, kept, released, paid });
		const parts = [
			...kept.map((agent) => `${agent} handed over`),
			...released.map((agent) => `${agent} owed nothing any more`),
			...paid.map((entry) => `${entry.agent} did not and loses ${entry.points} points`),
		];
		for (const agent of ultimatum.between) {
			if (ports.inCity(agent)) ports.notify(agent, author, `The ultimatum of minute ${ultimatum.until} is up: ${parts.join("; ")}.`);
		}
	}

	/** P50: what a holdout kept back goes to the city, which sells it to the one who waited for the ultimatum's penalty. */
	#seize(debt: UltimatumDebt, ultimatum: Ultimatum, author: string): void {
		const ports = this.#ports;
		const held = ports.held(debt.holder);
		const pieces = debt.pieces
			.filter((entry) => !this.isGiven(debt.holder, debt.needer, entry.id))
			.flatMap((entry) => held.filter((piece) => piece.id === entry.id))
			.filter((piece) => !this.#data.city.some((kept) => kept.from === debt.holder && kept.piece.id === piece.id && kept.piece.needers.includes(debt.needer)));
		const first = pieces[0];
		if (first === undefined) return;
		for (const piece of pieces) {
			const seized: StandoffPiece = { id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers: [debt.needer] };
			this.#data.city.push({ from: debt.holder, piece: seized, claimed: [], price: ultimatum.penalty });
			ports.emit("piece_kept", { agent: debt.holder, level: piece.level, piece: piece.id, needers: [debt.needer], cause: "ultimatum" });
		}
		const labels = pieces.map((piece) => piece.label).join(" and ");
		ports.notify(
			debt.needer,
			author,
			`The ultimatum is up and the city has seized from ${debt.holder} ${labels}, which you need: claimPiece("${first.id}", "${debt.holder}") ` +
				`buys ${pieces.length > 1 ? "all of it" : "it"} for ${ultimatum.penalty} points. ${debt.holder} may still hand it to you for less.`,
		);
		ports.announce(author, `The ultimatum of minute ${ultimatum.until} is up: the city has seized from ${debt.holder} what it held back for ${debt.needer}.`);
	}
}
