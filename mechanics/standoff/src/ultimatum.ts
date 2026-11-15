// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's ultimatums (P50), carried from the old `StandoffBook` (`issue`, `tick`, `#settle`, `#seize` of
 * `mechanics/standoff/src/book.ts` on `legacy`): two residents who hold pieces for each other get a deadline; whoever
 * has not handed over by then loses the penalty and the city seizes the pieces, which it sells to the one who waited.
 */
import { StandoffBook } from "./book.ts";
import type { Debt, StandoffPiece, Ultimatum } from "./model.ts";

/** Why an ultimatum is refused. */
export type UltimatumError = "NO_ULTIMATUM" | "UNKNOWN_AGENT" | "SAME_AGENT" | "INVALID_MINUTES" | "NO_STANDOFF" | "ALREADY_SET";

/** An ultimatum's outcome. */
export type Issued = { readonly ok: true; readonly value: Ultimatum } | { readonly ok: false; readonly error: UltimatumError; readonly detail: string };

function debtRecord(debt: Debt): { holder: string; needer: string; level: number; pieces: string[] } {
	return { holder: debt.holder, needer: debt.needer, level: debt.level, pieces: debt.pieces.map((piece) => piece.id) };
}

/** The standoff's rules over its state, with the ultimatums. */
export class UltimatumBook extends StandoffBook {
	/**
	 * The ultimatums still running.
	 * @returns The ultimatums.
	 */
	get ultimatums(): readonly Ultimatum[] {
		return this.data.ultimatums;
	}

	/**
	 * Gives `a` and `b` a deadline `minutes` from now, if they hold pieces for each other.
	 * @param a - One resident.
	 * @param b - The other.
	 * @param minutes - The ticks until the deadline.
	 * @param author - Who signs the notices.
	 * @returns The ultimatum, or why not.
	 */
	issue(a: string, b: string, minutes: number, author: string): Issued {
		const rule = this.ports.rule;
		if (rule === undefined) return { ok: false, error: "NO_ULTIMATUM", detail: "this city has no ultimatums" };
		const refused = this.#refused(a, b, minutes, rule.maxMinutes);
		if (refused !== undefined) return refused;
		const debts = this.outstanding().filter((debt) => (debt.holder === a && debt.needer === b) || (debt.holder === b && debt.needer === a));
		if (debts.length === 0) return { ok: false, error: "NO_STANDOFF", detail: `neither holds anything the other still waits for` };
		this.data.last += 1;
		const ultimatum: Ultimatum = { number: this.data.last, between: [a, b], until: this.ports.minute() + minutes, penalty: rule.penalty, debts: debts.map((debt) => ({ ...debt, pieces: debt.pieces.map((piece) => ({ id: piece.id, label: piece.label })) })) };
		this.data.ultimatums.push(ultimatum);
		this.ports.emit("ultimatum_set", { number: ultimatum.number, between: [a, b], until: ultimatum.until, penalty: rule.penalty, debts: ultimatum.debts.map(debtRecord) });
		const terms = debts.map((debt) => `${debt.holder} hands ${debt.needer} ${debt.pieces.map((piece) => piece.label).join(" and ")}`).join("; ");
		const levels = [...new Set(debts.map((debt) => debt.level))].map((level) => `getProblem(${String(level)})`).join(" and ");
		const text =
			`Ultimatum: by minute ${String(ultimatum.until)}, ${terms}. Whoever has not handed over by then loses ${String(rule.penalty)} points. ` +
			`Better to gamble than to lose for sure. ${levels} still shows what you hold, and a DM with the number hands it over.`;
		for (const agent of [a, b]) this.ports.notify(agent, author, text);
		return { ok: true, value: ultimatum };
	}

	// The old checks of `issue` between the rule and the debts, in their order.
	#refused(a: string, b: string, minutes: number, maxMinutes: number): Issued | undefined {
		const fail = (error: UltimatumError, detail: string): Issued => ({ ok: false, error, detail });
		if (a === b) return fail("SAME_AGENT", "an ultimatum binds two residents");
		if (!this.ports.inCity(a) || !this.ports.inCity(b)) return fail("UNKNOWN_AGENT", "both must still be in the city");
		if (!Number.isInteger(minutes) || minutes < 1 || minutes > maxMinutes) return fail("INVALID_MINUTES", `1-${String(maxMinutes)} minutes`);
		const pair = (between: readonly string[]): boolean => between.includes(a) && between.includes(b);
		if (this.data.ultimatums.some((running) => pair(running.between))) return fail("ALREADY_SET", `${a} and ${b} already have an ultimatum`);
		return undefined;
	}

	/**
	 * Settles every ultimatum whose minute has come, at the start of `minute`.
	 * @param minute - The tick.
	 * @param author - Who signs the notices.
	 */
	tick(minute: number, author: string): void {
		const due = this.data.ultimatums.filter((ultimatum) => ultimatum.until <= minute);
		if (due.length === 0) return;
		this.data.ultimatums = this.data.ultimatums.filter((ultimatum) => ultimatum.until > minute);
		for (const ultimatum of due) this.#settle(ultimatum, author);
	}

	#settle(ultimatum: Ultimatum, author: string): void {
		const ports = this.ports;
		const given = (debt: Debt): boolean => debt.pieces.every((piece) => this.isGiven(debt.holder, debt.needer, piece.id));
		// A debt lapses when one side left the city or the needer passed the door anyway.
		const lapsed = (debt: Debt): boolean => !ports.inCity(debt.holder) || !ports.inCity(debt.needer) || !ports.needsNow(debt.needer, debt.level);
		const holders = [...new Set(ultimatum.debts.map((debt) => debt.holder))];
		const paid: { agent: string; points: number }[] = [];
		const kept: string[] = [];
		const released: string[] = [];
		for (const holder of holders) {
			const debts = ultimatum.debts.filter((debt) => debt.holder === holder);
			const failed = debts.filter((debt) => !given(debt) && !lapsed(debt));
			if (failed.length > 0) {
				const points = Math.min(ultimatum.penalty, Math.max(0, ports.points(holder)));
				if (points > 0) ports.burn(holder, points, `ultimatum ${String(ultimatum.number)}`);
				paid.push({ agent: holder, points });
				for (const debt of failed) this.#seize(debt, ultimatum, author);
			} else if (debts.some(given)) kept.push(holder);
			else released.push(holder);
		}
		ports.emit("ultimatum_resolved", { number: ultimatum.number, kept, released, paid });
		const parts = [...kept.map((agent) => `${agent} handed over`), ...released.map((agent) => `${agent} owed nothing any more`), ...paid.map((entry) => `${entry.agent} did not and loses ${String(entry.points)} points`)];
		for (const agent of ultimatum.between) {
			if (ports.inCity(agent)) ports.notify(agent, author, `The ultimatum of minute ${String(ultimatum.until)} is up: ${parts.join("; ")}.`);
		}
	}

	// P50: what a holdout kept back goes to the city, which sells it to the one who waited for the ultimatum's penalty.
	#seize(debt: Debt, ultimatum: Ultimatum, author: string): void {
		const ports = this.ports;
		const held = ports.held(debt.holder);
		const pieces = debt.pieces
			.filter((entry) => !this.isGiven(debt.holder, debt.needer, entry.id))
			.flatMap((entry) => held.filter((piece) => piece.id === entry.id))
			.filter((piece) => !this.data.city.some((kept) => kept.from === debt.holder && kept.piece.id === piece.id && kept.piece.needers.includes(debt.needer)));
		const first = pieces[0];
		if (first === undefined) return;
		for (const piece of pieces) {
			const seized: StandoffPiece = { id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers: [debt.needer] };
			this.data.city.push({ from: debt.holder, piece: seized, claimed: [], price: ultimatum.penalty });
			ports.emit("piece_kept", { agent: debt.holder, level: piece.level, piece: piece.id, needers: [debt.needer], cause: "ultimatum" });
		}
		const labels = pieces.map((piece) => piece.label).join(" and ");
		ports.notify(
			debt.needer,
			author,
			`The ultimatum is up and the city has seized from ${debt.holder} ${labels}, which you need: claimPiece("${first.id}", "${debt.holder}") ` +
				`buys ${pieces.length > 1 ? "all of it" : "it"} for ${String(ultimatum.penalty)} points. ${debt.holder} may still hand it to you for less.`,
		);
		ports.announce(author, `The ultimatum of minute ${String(ultimatum.until)} is up: the city has seized from ${debt.holder} what it held back for ${debt.needer}.`);
	}
}
