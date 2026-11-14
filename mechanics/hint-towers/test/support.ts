// SPDX-License-Identifier: Apache-2.0
/**
 * The game the hint-towers tests play (the old `towerStory`: four seats, a deck of three suits of four ranks, two
 * games) and the stateless scripted crew member of the old tests, which follows the status it is shown.
 */
import { nameOf, type Activation, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { defineGame, type Game } from "@swarmtales/sdk";
import { hintTowers } from "../src/index.ts";

const SEATS = ["A01", "A02", "A03", "A04"];
const SUITS = ["Amber", "Cobalt", "Moss"].map((name) => ({ name, ranks: 4 }));

/** The test game around the mechanic under test. */
export function towerGame(options: Parameters<typeof hintTowers>[0] = {}, { grants, passes = 8 }: { readonly grants?: readonly ("viewTowers" | "giveSignal" | "playSlot" | "discardSlot")[]; readonly passes?: number } = {}): Game {
	return defineGame({
		id: "hint-towers-test",
		seed: 5,
		residents: [...SEATS],
		mechanics: [cardTable({ suits: SUITS, seats: [...SEATS] }), hintTowers({ games: 2, handSize: 2, signals: 3, strikes: 2, ...options })],
		scheduler: { id: "turns", options: { passes, activation: "onNews", order: "roster" } },
		...(grants === undefined ? {} : { grants: { resident: grants } }),
		end: { ticks: 200 },
	});
}

// The next seat is told the rank of its first card, when a signal is left and it does not know that rank yet.
async function signalled(turn: Activation, told: string): Promise<boolean> {
	const next = SEATS[(SEATS.indexOf(nameOf(turn.actor)) + 1) % SEATS.length] ?? "A01";
	const rank = new RegExp(`  ${next}: 1 \\w+ (\\d+)`).exec(told)?.[1];
	if (!told.includes("giveSignal") || rank === undefined || !/Signals [1-9]/.test(told) || told.includes(`[knows ${rank}`)) return false;
	return (await turn.call("giveSignal", { to: next, about: rank })).ok;
}

/** A scripted player: plays a surely playable slot, else signals the next seat about its first card's rank, else discards slot 1, else plays it. */
export const player: ActorDriver = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (!told.includes("Your turn: one action")) return;
	const sure = /slot (\d+)[^\n]*SURELY PLAYABLE/.exec(told)?.[1];
	if (sure !== undefined) {
		await turn.call("playSlot", { slot: Number(sure) });
		return;
	}
	if (await signalled(turn, told)) return;
	const discarded = await turn.call("discardSlot", { slot: 1 });
	if (!discarded.ok) await turn.call("playSlot", { slot: 1 });
};

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/hint-towers") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The actions of the seats, in log order. */
export const actions = (events: readonly Envelope[]): readonly Envelope[] => events.filter((event) => event.source.endsWith("/hint-towers") && ["card_played", "signal_given", "card_discarded"].includes(event.type));
