// SPDX-License-Identifier: Apache-2.0
/**
 * Shared by the tests of Salt Market until the mechanic's index lands (issue M4-48): a test mechanic on the real
 * head that wires the tools of offers, trades and messages, starts the games as the mechanic does, and ends a
 * round at the end of each tick with only the offers that expire (no shipments, deliveries or spoils yet). The
 * tools of M4-48 (`viewMarket`, `give`) answer "not built", and the brain source holds nothing. The game is the
 * table of the old game file (`stories/salt-market/story.ts`): four solo seats, three passes a tick, 12 calls a tick.
 */
import type { Envelope } from "@swarmtales/contracts";
import { defineGame, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import { startNext, startRound } from "../src/flow.ts";
import { saltMarketHead } from "../src/head.ts";
import { MarketSlice } from "../src/model.ts";
import { acceptNow, acceptProblem, closeOffer, expireOffers, offerNow, offerProblem } from "../src/offers.ts";
import { sampleAccept, sampleDecline, sampleOffer, sampleSay, sampleWithdraw } from "../src/samples.ts";
import { sayNow } from "../src/say.ts";

export const SEATS = ["A01", "A02", "A03", "A04"];

const later = () => reply("not built before M4-48");

/** The test mechanic: the real head, the handlers of M4-47. */
export const market = defineMechanic(saltMarketHead, {
	tools: {
		viewMarket: { run: later },
		offer: { check: (params, ctx) => offerProblem(ctx, ctx.resident, params), run: (params, ctx) => offerNow(ctx, ctx.resident, params), sample: (ctx, random) => sampleOffer(ctx, ctx.resident, random) },
		accept: { check: (params, ctx) => acceptProblem(ctx, ctx.resident, params.offer), run: (params, ctx) => acceptNow(ctx, ctx.resident, params.offer), sample: (ctx, random) => sampleAccept(ctx, ctx.resident, random) },
		decline: { run: (params, ctx) => closeOffer(ctx, ctx.resident, params.offer, "declined", params.note ?? ""), sample: (ctx, random) => sampleDecline(ctx, ctx.resident, random) },
		withdraw: { run: (params, ctx) => closeOffer(ctx, ctx.resident, params.offer, "withdrawn", ""), sample: (ctx, random) => sampleWithdraw(ctx, ctx.resident, random) },
		give: { run: later },
		say: { run: (params, ctx) => sayNow(ctx, ctx.resident, params.text, params.to), sample: (ctx, random) => sampleSay(ctx, ctx.resident, random) },
	},
	services: { "brain-source": { game: (_input, ctx) => ctx.state.game, hold: () => false, release: () => null } },
	hooks: {
		news: (_resident, ctx) => ctx.state.running,
		runStarted: (ctx) => {
			startNext(ctx);
		},
		// One round a tick; at the last round's end the game stops (scoring comes with M4-48).
		tickEnded: (ctx) => {
			const state = ctx.state;
			if (!state.running) return;
			const last = state.round >= ctx.options.rounds;
			expireOffers(ctx, state.round, last);
			if (last) state.running = false;
			else startRound(ctx, state.round + 1, ctx.tick + 1);
		},
	},
	facts: { state: { output: MarketSlice, compute: (view) => structuredClone(view.state) } },
});

/** The table of the old game file around the test mechanic. */
export function marketGame(options: Parameters<typeof market>[0] = {}, seed = 41): Game {
	return defineGame({
		id: "salt-market-test",
		seed,
		residents: [...SEATS],
		mechanics: [market({ games: 1, rounds: 6, spoil: true, roundMinutes: 1, ...options })],
		grants: { resident: ["viewMarket", "offer", "accept", "decline", "withdraw", "give", "say"] },
		scheduler: { id: "turns", options: { passes: 3, activation: "onNews", order: "roster", inputs: [{ kind: "context-reset" }] } },
		limits: { maxCallsPerTick: 12 },
		end: { ticks: 12 },
	});
}

/** The payloads of one event type that the mechanic wrote. */
export function payloads(events: readonly Envelope[], type: string): readonly unknown[] {
	return events.filter((event) => event.source.endsWith("/salt-market") && event.type === type).map((event) => event.payload);
}
