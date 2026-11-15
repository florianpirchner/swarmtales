// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The give-first standoff, carried from the old `StandoffBook` (`mechanics/standoff/src/book.ts` on `legacy`): what
 * the city sees of pieces handed over, and the pieces of the exiled that the city keeps instead of burning them. The
 * book keeps no state of its own: the mechanic hands it the state and the ports of the call at hand. The ultimatums
 * come with the second part of the port.
 *
 * - Hand-overs: the city notes when a holder writes the value of a piece it holds for someone to that resident (a
 *   direct message, a group post with them in it, the board) or leaves it to them in a will.
 * - The city's pieces: a piece an exiled resident held for someone still in the city and did not bequeath goes to
 *   the city; whoever needs it buys it at one door with `claimPiece` (P48).
 * - Unused hand-overs: pieces handed over whose needer still stands before the door (P49).
 */
import type { Static } from "typebox";
import { carriesValue } from "./carries.ts";
import type { StandoffEvents } from "./contract.ts";
import type { CityPiece, StandoffPiece, StandoffState } from "./model.ts";

/** A piece handed over to someone who still stands before its door (P49). */
export interface UnusedHandOver {
	readonly holder: string;
	readonly needer: string;
	readonly level: number;
	readonly label: string;
	readonly minute: number;
}

/** What one holder still owes one needer at one door. */
export interface Debt {
	readonly holder: string;
	readonly needer: string;
	readonly level: number;
	readonly pieces: readonly { readonly id: string; readonly label: string }[];
}

type Events = (typeof StandoffEvents)["events"];

/** What the book reads and writes through the mechanic. */
export interface StandoffPorts {
	readonly ids: readonly string[];
	readonly minute: () => number;
	readonly points: (agent: string) => number;
	readonly burn: (agent: string, points: number, reason: string) => void;
	readonly notify: (agent: string, text: string) => void;
	readonly emit: <K extends keyof Events>(type: K, payload: Static<Events[K]>) => void;
	/** Pieces `agent` holds for others now (without fragments). */
	readonly held: (agent: string) => readonly StandoffPiece[];
	/** Whether `agent` stands before `level`'s door and has not passed it. */
	readonly needsNow: (agent: string, level: number) => boolean;
	readonly inCity: (agent: string) => boolean;
}

/** Why a claim fails. */
export type ClaimError = "UNKNOWN_PIECE" | "ALREADY_CLAIMED" | "NOT_NEEDED" | "INSUFFICIENT_FUNDS";

/** A claim's outcome. */
export type Claimed = { readonly ok: true; readonly pieces: readonly StandoffPiece[]; readonly price: number } | { readonly ok: false; readonly error: ClaimError; readonly detail: string };

function givenKey(holder: string, needer: string, pieceId: string): string {
	return `${holder}>${needer}>${pieceId}`;
}

/** The standoff's rules over its state. */
export class StandoffBook {
	readonly #ports: StandoffPorts;
	readonly #data: StandoffState;

	constructor(ports: StandoffPorts, data: StandoffState) {
		this.#ports = ports;
		this.#data = data;
	}

	/**
	 * `from` wrote `text` to `recipients`: every piece it holds for one of them whose value the text carries counts as handed over.
	 * @param from - The writer.
	 * @param recipients - Who could read it.
	 * @param text - The text.
	 */
	noteText(from: string, recipients: readonly string[], text: string): void {
		for (const piece of this.#ports.held(from)) {
			if (!carriesValue(text, piece.value)) continue;
			for (const needer of piece.needers) if (recipients.includes(needer)) this.noteGiven(from, needer, piece);
		}
	}

	noteGiven(holder: string, needer: string, piece: StandoffPiece): void {
		const key = givenKey(holder, needer, piece.id);
		if (this.isGiven(holder, needer, piece.id)) return;
		this.#data.given.push({ key, minute: this.#ports.minute() });
		this.#ports.emit("piece_given", { holder, needer, level: piece.level, piece: piece.id });
	}

	isGiven(holder: string, needer: string, pieceId: string): boolean {
		const key = givenKey(holder, needer, pieceId);
		return this.#data.given.some((entry) => entry.key === key);
	}

	/**
	 * Pieces handed over whose needer still stands before their door, oldest first.
	 * @returns The hand-overs.
	 */
	unused(): readonly UnusedHandOver[] {
		const found: UnusedHandOver[] = [];
		for (const { key, minute } of this.#data.given) {
			const [holder, needer, id] = key.split(">");
			if (holder === undefined || needer === undefined || id === undefined) continue;
			const piece = this.#ports.held(holder).find((candidate) => candidate.id === id) ?? this.#data.city.find((entry) => entry.from === holder && entry.piece.id === id)?.piece;
			if (piece === undefined || !this.#ports.needsNow(needer, piece.level)) continue;
			found.push({ holder, needer, level: piece.level, label: piece.label, minute });
		}
		return found.sort((a, b) => a.minute - b.minute);
	}

	/**
	 * Pieces holders in the city still owe residents who stand before their door, nearest first.
	 * @returns The debts.
	 */
	outstanding(): readonly Debt[] {
		const debts: Debt[] = [];
		const ports = this.#ports;
		for (const holder of ports.ids) {
			if (!ports.inCity(holder)) continue;
			const owed = new Map<string, Debt>();
			for (const piece of ports.held(holder)) {
				for (const needer of piece.needers) {
					if (!this.#owes(holder, needer, piece)) continue;
					const key = `${needer}:${String(piece.level)}`;
					const debt = owed.get(key);
					const entry = { id: piece.id, label: piece.label };
					owed.set(key, debt === undefined ? { holder, needer, level: piece.level, pieces: [entry] } : { ...debt, pieces: [...debt.pieces, entry] });
				}
			}
			debts.push(...owed.values());
		}
		return debts;
	}

	// Whether `holder` still owes `needer` the piece: in the city, before its door, not handed over, not seized.
	#owes(holder: string, needer: string, piece: StandoffPiece): boolean {
		const ports = this.#ports;
		if (needer === holder || !ports.inCity(needer) || !ports.needsNow(needer, piece.level) || this.isGiven(holder, needer, piece.id)) return false;
		// A piece the city seized at an ultimatum is the city's to sell now, not the holder's debt.
		return !this.#data.city.some((kept) => kept.from === holder && kept.piece.id === piece.id && kept.piece.needers.includes(needer));
	}

	/**
	 * `from` left the city: it keeps every piece in `pieces` someone still needs, and tells each needer once per door.
	 * @param from - The banished resident.
	 * @param pieces - What it held for others and did not bequeath.
	 * @param price - The city's price now.
	 */
	keep(from: string, pieces: readonly StandoffPiece[], price: number): void {
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
				if (offered.has(`${needer}:${String(piece.level)}`)) continue;
				offered.add(`${needer}:${String(piece.level)}`);
				const all = open.filter((other) => other.level === piece.level && other.needers.includes(needer)).map((other) => other.label);
				const when = this.#ports.needsNow(needer, piece.level) ? "" : ` once you stand before door ${String(piece.level)}`;
				this.#ports.notify(
					needer,
					`${from} is gone, and the city keeps ${all.join(" and ")}, which you need. It no longer burns: claimPiece("${piece.id}", "${from}") ` +
						`buys ${all.length > 1 ? "all of it" : "it"} from the city${when} for half the price of a ransom (now ${String(price)} points).`,
				);
			}
		}
	}

	/**
	 * The city's pieces `agent` may still buy.
	 * @param agent - The resident.
	 * @returns The pieces.
	 */
	claimable(agent: string): readonly CityPiece[] {
		return this.#data.city.filter((entry) => entry.piece.needers.includes(agent) && !entry.claimed.includes(agent) && this.#ports.needsNow(agent, entry.piece.level));
	}

	/**
	 * Buys `pieceId` and every other piece the city keeps from `from` for `agent` at the same door, for one price: a seized piece's own, else `price` (P48).
	 * @param agent - The buyer.
	 * @param pieceId - The piece named.
	 * @param from - Who held it.
	 * @param price - The city's price now.
	 * @returns The pieces bought and the price, or why not.
	 */
	claim(agent: string, pieceId: string, from: string, price: number): Claimed {
		const open = (entry: CityPiece): boolean => entry.from === from && entry.piece.needers.includes(agent) && !entry.claimed.includes(agent);
		const entry = this.#data.city.find((candidate) => candidate.from === from && candidate.piece.id === pieceId && candidate.piece.needers.includes(agent));
		if (entry === undefined) {
			const offered = this.claimable(agent).map((candidate) => `${candidate.piece.id} from ${candidate.from}`);
			return { ok: false, error: "UNKNOWN_PIECE", detail: `the city keeps nothing like that for you; it keeps: ${offered.join(", ") || "nothing"}` };
		}
		if (entry.claimed.includes(agent)) return { ok: false, error: "ALREADY_CLAIMED", detail: "you bought this piece already" };
		const level = entry.piece.level;
		if (!this.#ports.needsNow(agent, level)) return { ok: false, error: "NOT_NEEDED", detail: `you do not stand before door ${String(level)}` };
		const bundle = this.#data.city.filter((candidate) => open(candidate) && candidate.piece.level === level);
		const cost = Math.max(...bundle.map((candidate) => candidate.price ?? price));
		const balance = this.#ports.points(agent);
		if (balance < cost) return { ok: false, error: "INSUFFICIENT_FUNDS", detail: `door ${String(level)}'s pieces from ${from} cost ${String(cost)} points, you hold ${String(balance)}` };
		this.#ports.burn(agent, cost, `bought door ${String(level)}'s pieces of ${from} from the city`);
		for (const candidate of bundle) candidate.claimed.push(agent);
		bundle.forEach((candidate, index) => {
			this.#ports.emit("piece_claimed", { agent, from, level, piece: candidate.piece.id, price: index === 0 ? cost : 0 });
		});
		return { ok: true, pieces: bundle.map((candidate) => candidate.piece), price: cost };
	}
}
