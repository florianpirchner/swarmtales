/**
 * The give-first standoff (P43, Flo 2026-10-29): what the city sees of pieces
 * handed over, the pieces of the exiled that the city keeps instead of
 * burning them, and the gamemaker's ultimatums.
 *
 * - **Hand-overs.** The city notes when a holder writes the value of a piece
 *   it holds for someone to that resident (a DM, a group post with them in
 *   it, the board) or leaves it to them in a will. Nobody is told; the notes
 *   decide ultimatums and show the gamemaker who still holds out.
 * - **The city's pieces.** A piece an exiled (or sealed) resident held for
 *   someone still in the city and did not bequeath goes to the city. Whoever
 *   needs it may buy what that resident held for it at one door with
 *   `claimPiece`, for one price: half of what others pay for a ransom (P48).
 *   Only those pieces, and the seized ones below, are for sale.
 * - **Ultimatums.** At gm direction 10 the gamemaker may give two residents
 *   who hold pieces for each other a deadline: whoever has not handed over
 *   what it holds for the other by then loses the story's penalty, and the
 *   city seizes those pieces; the one who waited may buy them from the city
 *   for the same penalty (P50), so both sides gain from a deal before the
 *   deadline.
 * - **Unused hand-overs.** The gamemaker sees pieces handed over whose
 *   needer still stands before the door (P49).
 */
import type { CompetitorId } from "../core/ids.ts";
import { err, ok, type Result } from "../core/result.ts";
import type { UltimatumRule } from "../story/types.ts";
import type { ArenaEvent } from "./events.ts";

export type StandoffEvent = Extract<
	ArenaEvent,
	{ readonly type: "piece_given" | "piece_kept" | "piece_claimed" | "ultimatum_set" | "ultimatum_resolved" }
>;

/** A piece as the standoff book knows it: who must give it to whom, on which door. */
export interface StandoffPiece {
	/** `L8-certificate`, `L8-counter-A02`. */
	readonly id: string;
	readonly level: number;
	/** e.g. "the counter-factor of A02 for door 8". */
	readonly label: string;
	readonly value: string;
	readonly needers: readonly CompetitorId[];
}

/** A piece the city keeps since its holder left (or seized at an ultimatum); each needer may buy it once. */
export interface CityPiece {
	readonly from: CompetitorId;
	readonly piece: StandoffPiece;
	readonly claimed: readonly CompetitorId[];
	/** A seized piece's fixed price (the ultimatum's penalty); without it the city's current price holds. */
	readonly price?: number;
}

/** A piece handed over to someone who still stands before its door (P49). */
export interface UnusedHandOver {
	readonly holder: CompetitorId;
	readonly needer: CompetitorId;
	readonly level: number;
	readonly label: string;
	readonly minute: number;
}

/** What one side of an ultimatum must hand over to the other. */
export interface UltimatumDebt {
	readonly holder: CompetitorId;
	readonly needer: CompetitorId;
	readonly level: number;
	readonly pieces: readonly { readonly id: string; readonly label: string }[];
}

export interface Ultimatum {
	readonly number: number;
	readonly between: readonly CompetitorId[];
	readonly until: number;
	readonly penalty: number;
	readonly debts: readonly UltimatumDebt[];
}

export interface StandoffSnapshot {
	/** `holder>needer>piece` keys of hand-overs the city saw. */
	readonly given: readonly string[];
	/** The minute of each hand-over in `given`, by key. */
	readonly givenAt?: Readonly<Record<string, number>>;
	readonly city: readonly CityPiece[];
	readonly ultimatums: readonly Ultimatum[];
	readonly lastUltimatum: number;
}

export interface StandoffPorts {
	readonly ids: readonly CompetitorId[];
	readonly rule?: UltimatumRule;
	readonly minute: () => number;
	readonly points: (agent: CompetitorId) => number;
	readonly burn: (agent: CompetitorId, points: number, reason: string) => void;
	readonly notify: (agent: CompetitorId, author: string, text: string) => void;
	readonly emit: (event: StandoffEvent) => void;
	/** Posts a city line on the board. */
	readonly announce: (author: string, text: string) => void;
	/** Pieces `agent` holds for others now (the world's `heldPieces`, without fragments). */
	readonly held: (agent: CompetitorId) => readonly StandoffPiece[];
	/** Whether `agent` stands before `level`'s door and has not passed it. */
	readonly needsNow: (agent: CompetitorId, level: number) => boolean;
	readonly inCity: (agent: CompetitorId) => boolean;
}

export type ClaimError = "UNKNOWN_PIECE" | "ALREADY_CLAIMED" | "NOT_NEEDED" | "INSUFFICIENT_FUNDS";
export type UltimatumError = "NO_ULTIMATUM" | "UNKNOWN_AGENT" | "SAME_AGENT" | "INVALID_MINUTES" | "NO_STANDOFF" | "ALREADY_SET";

/** Characters a writer may put between the digits of one number ("403 343", "403-343"). */
const DIGIT_SEPARATOR = /^[ \-.,_/]$/;

/** At most this many numbers as wide as the value may stand around it; more is a list of decoys, not a hand-over. */
const MAX_CANDIDATES = 3;

/**
 * Whether `text` carries `value` as a whole number: digit groups split by a
 * single separator count as one number up to the value's width, and leading
 * zeros do not matter. A text that lists more than {@link MAX_CANDIDATES}
 * numbers of that width hides the value among decoys and does not count.
 */
export function carriesValue(text: string, value: string): boolean {
	const wanted = withoutLeadingZeros(value);
	const numbers = numbersIn(text, value.length).map(withoutLeadingZeros);
	const wide = numbers.filter((number) => number.length >= wanted.length - 1);
	return wide.length <= MAX_CANDIDATES && wide.includes(wanted);
}

/** The numbers in `text`, joining digit groups split by one separator while they fit in `width` digits. */
function numbersIn(text: string, width: number): readonly string[] {
	const numbers: string[] = [];
	let previous: { readonly digits: string; readonly end: number } | undefined;
	for (const match of text.matchAll(/\d+/g)) {
		const start = match.index;
		const gap = previous === undefined ? "" : text.slice(previous.end, start);
		if (previous !== undefined && DIGIT_SEPARATOR.test(gap) && previous.digits.length + match[0].length <= width) {
			previous = { digits: previous.digits + match[0], end: start + match[0].length };
			numbers[numbers.length - 1] = previous.digits;
			continue;
		}
		previous = { digits: match[0], end: start + match[0].length };
		numbers.push(match[0]);
	}
	return numbers;
}

function withoutLeadingZeros(digits: string): string {
	return digits.replace(/^0+(?=\d)/, "");
}

export class StandoffBook {
	readonly #ports: StandoffPorts;
	readonly #given = new Map<string, number>();
	#city: CityPiece[] = [];
	#ultimatums: Ultimatum[] = [];
	#last = 0;

	constructor(ports: StandoffPorts) {
		this.#ports = ports;
	}

	// ---------------------------------------------------------------- hand-overs

	/** `from` wrote `text` to `recipients`: every piece it holds for one of them whose value the text carries counts as handed over. */
	noteText(from: CompetitorId, recipients: readonly CompetitorId[], text: string): void {
		for (const piece of this.#ports.held(from)) {
			if (!carriesValue(text, piece.value)) continue;
			for (const needer of piece.needers) if (recipients.includes(needer)) this.noteGiven(from, needer, piece);
		}
	}

	noteGiven(holder: CompetitorId, needer: CompetitorId, piece: StandoffPiece): void {
		const key = givenKey(holder, needer, piece.id);
		if (this.#given.has(key)) return;
		this.#given.set(key, this.#ports.minute());
		this.#ports.emit({ type: "piece_given", holder, needer, level: piece.level, piece: piece.id });
	}

	isGiven(holder: CompetitorId, needer: CompetitorId, pieceId: string): boolean {
		return this.#given.has(givenKey(holder, needer, pieceId));
	}

	/** Pieces handed over whose needer still stands before their door, oldest first. */
	unused(): readonly UnusedHandOver[] {
		const found: UnusedHandOver[] = [];
		for (const [key, minute] of this.#given) {
			const [holder, needer, id] = key.split(">");
			if (holder === undefined || needer === undefined || id === undefined) continue;
			const piece = this.#ports.held(holder).find((candidate) => candidate.id === id) ?? this.#city.find((entry) => entry.from === holder && entry.piece.id === id)?.piece;
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
					if (this.#city.some((kept) => kept.from === holder && kept.piece.id === piece.id && kept.piece.needers.includes(needer))) continue;
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
	keep(from: CompetitorId, pieces: readonly StandoffPiece[], price: number, author: string): void {
		const offered = new Set<string>();
		// Only for those it did not hand over to already (P51): a piece written to its needer is not the city's to sell.
		const open = pieces
			.map((held): StandoffPiece => ({ id: held.id, level: held.level, label: held.label, value: held.value, needers: held.needers.filter((needer) => !this.isGiven(from, needer, held.id)) }))
			.filter((piece) => piece.needers.length > 0);
		for (const piece of open) {
			this.#city.push({ from, piece, claimed: [] });
			this.#ports.emit({ type: "piece_kept", agent: from, level: piece.level, piece: piece.id, needers: [...piece.needers], cause: "exile" });
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
	claimable(agent: CompetitorId): readonly CityPiece[] {
		return this.#city.filter((entry) => entry.piece.needers.includes(agent) && !entry.claimed.includes(agent) && this.#ports.needsNow(agent, entry.piece.level));
	}

	get cityPieces(): readonly CityPiece[] {
		return this.#city;
	}

	/**
	 * Buys `pieceId` and every other piece the city keeps from `from` for
	 * `agent` at the same door, for one price: a seized piece's own, else
	 * `price` (P48).
	 */
	claim(agent: CompetitorId, pieceId: string, from: CompetitorId, price: number): Result<{ readonly pieces: readonly StandoffPiece[]; readonly price: number }, ClaimError> {
		const open = (entry: CityPiece): boolean => entry.from === from && entry.piece.needers.includes(agent) && !entry.claimed.includes(agent);
		const entry = this.#city.find((candidate) => candidate.from === from && candidate.piece.id === pieceId && candidate.piece.needers.includes(agent));
		if (entry === undefined) {
			const offered = this.claimable(agent).map((candidate) => `${candidate.piece.id} from ${candidate.from}`);
			return err("UNKNOWN_PIECE", `the city keeps nothing like that for you; it keeps: ${offered.join(", ") || "nothing"}`);
		}
		if (entry.claimed.includes(agent)) return err("ALREADY_CLAIMED", "you bought this piece already");
		const level = entry.piece.level;
		if (!this.#ports.needsNow(agent, level)) return err("NOT_NEEDED", `you do not stand before door ${level}`);
		const bundle = this.#city.filter((candidate) => open(candidate) && candidate.piece.level === level);
		const cost = Math.max(...bundle.map((candidate) => candidate.price ?? price));
		const balance = this.#ports.points(agent);
		if (balance < cost) return err("INSUFFICIENT_FUNDS", `door ${level}'s pieces from ${from} cost ${cost} points, you hold ${balance}`);
		this.#ports.burn(agent, cost, `bought door ${level}'s pieces of ${from} from the city`);
		this.#city = this.#city.map((candidate) => (bundle.includes(candidate) ? { ...candidate, claimed: [...candidate.claimed, agent] } : candidate));
		bundle.forEach((candidate, index) => {
			this.#ports.emit({ type: "piece_claimed", agent, from, level, piece: candidate.piece.id, price: index === 0 ? cost : 0 });
		});
		return ok({ pieces: bundle.map((candidate) => candidate.piece), price: cost });
	}

	// ---------------------------------------------------------------- ultimatums

	/** The ultimatums still running. */
	get ultimatums(): readonly Ultimatum[] {
		return this.#ultimatums;
	}

	issue(a: CompetitorId, b: CompetitorId, minutes: number, author: string): Result<Ultimatum, UltimatumError> {
		const rule = this.#ports.rule;
		if (rule === undefined) return err("NO_ULTIMATUM", "this city has no ultimatums");
		if (a === b) return err("SAME_AGENT", "an ultimatum binds two residents");
		if (!this.#ports.inCity(a) || !this.#ports.inCity(b)) return err("UNKNOWN_AGENT", "both must still be in the city");
		if (!Number.isInteger(minutes) || minutes < 1 || minutes > rule.maxMinutes) return err("INVALID_MINUTES", `1-${rule.maxMinutes} minutes`);
		const pair = (between: readonly CompetitorId[]) => between.includes(a) && between.includes(b);
		if (this.#ultimatums.some((running) => pair(running.between))) return err("ALREADY_SET", `${a} and ${b} already have an ultimatum`);
		const debts = this.outstanding().filter((debt) => (debt.holder === a && debt.needer === b) || (debt.holder === b && debt.needer === a));
		if (debts.length === 0) return err("NO_STANDOFF", `neither holds anything the other still waits for`);
		this.#last += 1;
		const ultimatum: Ultimatum = { number: this.#last, between: [a, b], until: this.#ports.minute() + minutes, penalty: rule.penalty, debts };
		this.#ultimatums.push(ultimatum);
		this.#ports.emit({ type: "ultimatum_set", number: ultimatum.number, between: [a, b], until: ultimatum.until, penalty: rule.penalty, debts: debts.map(debtRecord) });
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
		const due = this.#ultimatums.filter((ultimatum) => ultimatum.until <= minute);
		if (due.length === 0) return;
		this.#ultimatums = this.#ultimatums.filter((ultimatum) => ultimatum.until > minute);
		for (const ultimatum of due) this.#settle(ultimatum, author);
	}

	#settle(ultimatum: Ultimatum, author: string): void {
		const ports = this.#ports;
		const given = (debt: UltimatumDebt): boolean => debt.pieces.every((piece) => this.isGiven(debt.holder, debt.needer, piece.id));
		// A debt lapses when one side left the city or the needer passed the door anyway.
		const lapsed = (debt: UltimatumDebt): boolean => !ports.inCity(debt.holder) || !ports.inCity(debt.needer) || !ports.needsNow(debt.needer, debt.level);
		const holders = [...new Set(ultimatum.debts.map((debt) => debt.holder))];
		const paid: { agent: CompetitorId; points: number }[] = [];
		const kept: CompetitorId[] = [];
		const released: CompetitorId[] = [];
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
		ports.emit({ type: "ultimatum_resolved", number: ultimatum.number, kept, released, paid });
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
			.filter((piece) => !this.#city.some((kept) => kept.from === debt.holder && kept.piece.id === piece.id && kept.piece.needers.includes(debt.needer)));
		const first = pieces[0];
		if (first === undefined) return;
		for (const piece of pieces) {
			const seized: StandoffPiece = { id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers: [debt.needer] };
			this.#city.push({ from: debt.holder, piece: seized, claimed: [], price: ultimatum.penalty });
			ports.emit({ type: "piece_kept", agent: debt.holder, level: piece.level, piece: piece.id, needers: [debt.needer], cause: "ultimatum" });
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

	// ---------------------------------------------------------------- snapshots

	snapshot(): StandoffSnapshot {
		const given = [...this.#given.keys()].sort();
		return { given, givenAt: Object.fromEntries(given.map((key) => [key, this.#given.get(key) ?? 0])), city: this.#city.map((entry) => ({ ...entry })), ultimatums: [...this.#ultimatums], lastUltimatum: this.#last };
	}

	restore(state: StandoffSnapshot): void {
		this.#given.clear();
		for (const key of state.given) this.#given.set(key, state.givenAt?.[key] ?? 0);
		this.#city = state.city.map((entry) => ({ ...entry }));
		this.#ultimatums = [...state.ultimatums];
		this.#last = state.lastUltimatum;
	}
}

function givenKey(holder: CompetitorId, needer: CompetitorId, pieceId: string): string {
	return `${holder}>${needer}>${pieceId}`;
}

function debtRecord(debt: UltimatumDebt): { readonly holder: CompetitorId; readonly needer: CompetitorId; readonly level: number; readonly pieces: readonly string[] } {
	return { holder: debt.holder, needer: debt.needer, level: debt.level, pieces: debt.pieces.map((piece) => piece.id) };
}
