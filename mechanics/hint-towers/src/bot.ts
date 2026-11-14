// SPDX-License-Identifier: Apache-2.0
/**
 * The reference bot of the hint towers: the action the move timer plays for an idle seat, and the crew of bots that
 * plays every deal for the baseline. It reads the game as a seat does: the others' cards, never its own.
 */
import { rankOf, suitOf, type SuitSpec } from "@swarmtales/mechanic-card-table/contract";
import { apply, candidates, isPlayable, newGame, scoreOf, surePlayable, touchedBy, type About, type Action, type TowerGame, type Draw, type Rules } from "./model.ts";

// The seats in turn order from the one after `seat`, `seat` itself last.
const seatsAfter = (core: Readonly<TowerGame>, seat: string): string[] => core.seats.map((_, offset) => core.seats[(core.seats.indexOf(seat) + 1 + offset) % core.seats.length] ?? seat);

// Step 2 of the bot: a signal that points at a teammate's playable card no one has pointed at, as the newest card touched.
function pointer(core: Readonly<TowerGame>, seat: string): Action | undefined {
	for (const other of seatsAfter(core, seat).filter((name) => name !== seat)) {
		const theirs = core.hands[other] ?? [];
		for (const [index, slot] of theirs.entries()) {
			if (!isPlayable(core, slot.card) || slot.focus > 0 || surePlayable(core, other, index)) continue;
			const options: About[] = [{ rank: rankOf(slot.card) }, { suit: suitOf(slot.card) }];
			const fit = options.find((about) => touchedBy(theirs, about).at(-1) === index);
			if (fit !== undefined) return { kind: "signal", to: other, about: fit };
		}
	}
	return undefined;
}

// Step 4 of the bot: at the signal cap, the next seat with cards is told the rank of its oldest card.
function capSignal(core: Readonly<TowerGame>, seat: string): Action {
	const next = seatsAfter(core, seat).find((other) => other !== seat && (core.hands[other] ?? []).length > 0);
	const oldest = next === undefined ? undefined : core.hands[next]?.[0];
	if (next === undefined || oldest === undefined) return { kind: "play", slot: 0 };
	return { kind: "signal", to: next, about: { rank: rankOf(oldest.card) } };
}

/**
 * The reference bot's action for the actor, from the actor's knowledge only (it sees the others'
 * cards, never its own). Its one convention: the newest card a signal touches is meant to be played.
 * 1. play a slot it knows is playable, else the focus of a signal that may be playable;
 * 2. with a signal left, point at a teammate's playable card no one has pointed at, as the newest card touched;
 * 3. below the signal cap, discard the oldest untouched slot (else slot 1);
 * 4. at the cap, signal the next seat the rank of its oldest card.
 *
 * @param core - The game.
 * @param rules - The rules.
 * @returns The action.
 *
 * @public
 */
export function botAction(core: Readonly<TowerGame>, rules: Rules): Action {
	const seat = core.actor;
	const hand = core.hands[seat] ?? [];
	const sure = hand.findIndex((_, index) => surePlayable(core, seat, index));
	if (sure >= 0) return { kind: "play", slot: sure };
	const focused = hand
		.map((slot, index) => ({ slot, index }))
		.filter(({ slot, index }) => slot.focus > 0 && candidates(core, seat, index).some((card) => isPlayable(core, card)))
		.sort((a, b) => b.slot.focus - a.slot.focus)[0];
	if (focused !== undefined) return { kind: "play", slot: focused.index };
	const pointed = core.signals > 0 ? pointer(core, seat) : undefined;
	if (pointed !== undefined) return pointed;
	if (core.signals < rules.maxSignals) {
		const chop = hand.findIndex((slot) => slot.touched === 0);
		return { kind: "discard", slot: Math.max(0, chop) };
	}
	return capSignal(core, seat);
}

/**
 * The bot crew's score on a deal: bots play the whole game from the same shuffled deck.
 *
 * @param seats - The seats in turn order.
 * @param suits - The deck's suits.
 * @param rules - The rules.
 * @param first - The seat that acts first.
 * @param deck - The shuffled deck, top card first.
 * @returns The score.
 *
 * @public
 */
export function botScore(seats: readonly string[], suits: readonly SuitSpec[], rules: Rules, first: string, deck: readonly string[]): number {
	const pile = [...deck];
	const draw: Draw = () => pile.shift();
	const core = newGame(seats, suits, rules, first, pile.length, draw);
	for (let step = 0; core.over === null && step < 1000; step++) apply(core, botAction(core, rules), rules, draw);
	return scoreOf(core, rules);
}
