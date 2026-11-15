// SPDX-License-Identifier: Apache-2.0
/** Helpers of the hold'em tests: a game of the mechanic alone, a stateless scripted player, and event readers. */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { defineGame, type Game } from "@swarmtales/sdk";
import { holdem } from "../src/index.ts";

/**
 * A part of the head that the head declares; the head's type leaves every part optional.
 *
 * @param value - The part.
 * @param what - Its name, for the message.
 * @returns The part.
 * @throws TypeError when the head lacks it.
 */
export function defined<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new TypeError(`holdem: the head has no ${what}`);
	return value;
}

/** The table of the old game file without its brain: `act` locked, six passes a tick, 14 calls a tick, in roster order. */
export function holdemGame(options: Parameters<typeof holdem>[0] = {}, seats = 4): Game {
	const { games = 4, hands = 8 } = options;
	return defineGame({
		id: "holdem-test",
		seed: 7,
		residents: Array.from({ length: seats }, (_, index) => `A${String(index + 1).padStart(2, "0")}`),
		mechanics: [holdem({ equitySamples: 20, deadline: 2, ...options })],
		locked: ["act"],
		scheduler: { id: "turns", options: { passes: 6, activation: "onNews", order: "roster" } },
		limits: { maxCallsPerTick: 14 },
		end: { ticks: games * hands * 6 + 4 },
	});
}

/**
 * A01 bets and raises whenever it may, A02 calls everything, A03 never puts a chip in voluntarily (checks or
 * folds), A04 plays a pair or an ace and folds the rest. Stateless: it reads the table on every turn (the `player`
 * of the old hold'em test, without its brain part).
 */
export const player: ActorDriver = async (turn) => {
	if (!turn.inputs.map((note) => note.text).join("\n").includes("Your turn (")) return;
	const view = await turn.call("viewTable", {});
	if (!view.ok) return;
	const resident = nameOf(turn.actor);
	await turn.call("act", { action: actionOf(resident, view.reply), reason: `script ${resident}` });
};

// The scripted rule of each seat, read from its view of the table.
function actionOf(resident: string, table: string): string {
	const facing = !/\b0 to call/.test(table);
	if (resident === "A01") return /You may [^.]*(bet|raise)/.test(table) ? "raise" : "call";
	if (resident === "A02") return "call";
	if (resident !== "A03" && strongHand(table)) return "call";
	return facing ? "fold" : "check";
}

// A pair or an ace in the hole.
function strongHand(table: string): boolean {
	const ranks = (/Your cards: (\S)\S (\S)\S/.exec(table) ?? []).slice(1);
	return ranks.length === 2 && (ranks[0] === ranks[1] || ranks.includes("A"));
}

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/holdem") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
