// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Shared by the blind-bid tests: a game of the mechanic alone and the scripted bidders of the old Blind Bid test, without its brain part. */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { defineGame, type Game } from "@swarmtales/sdk";
import { sealedAuction } from "../src/index.ts";
import type { Rules } from "../src/rules.ts";

/** The rules of the default options. */
export const RULES: Rules = { purse: 100, valueMin: 10, valueMax: 60, worthMin: 20, worthMax: 80, noise: 15, reserve: 1 };
/** The four seats of Blind Bid. */
export const SEATS = ["A01", "A02", "A03", "A04"];

/** The table of the old game file without the brain: `bid` locked, four passes a tick, six calls a tick, in roster order. */
export function auctionGame(options: Parameters<typeof sealedAuction>[0] = {}): Game {
	const games = options.games ?? 3;
	const lots = options.lots?.length ?? 6;
	return defineGame({
		id: "sealed-auction-test",
		seed: 31,
		residents: [...SEATS],
		mechanics: [sealedAuction({ deadline: 2, ...options })],
		locked: ["bid"],
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", order: "roster" } },
		limits: { maxCallsPerTick: 6 },
		end: { ticks: games * lots * 2 + (games + 1) * 2 + 4 },
	});
}

/** A01 bids its value or estimate, A02 half of it, A03 its value plus 5, A04 always passes; each capped by the coins left. */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	const own = /your (?:private value is|estimate of the worth is) (-?\d+)/.exec(told)?.[1];
	const coins = /You have (\d+) coins/.exec(told)?.[1];
	if (own === undefined || coins === undefined) return;
	const value = Number(own);
	const wanted = resident === "A01" ? value : resident === "A02" ? Math.floor(value / 2) : resident === "A03" ? value + 5 : 0;
	await turn.call("bid", { amount: Math.max(0, Math.min(Number(coins), wanted)), reason: "script" });
};

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/blind-bid") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
