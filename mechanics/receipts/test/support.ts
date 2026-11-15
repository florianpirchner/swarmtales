// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the receipts tests: a game with the real `ledger`, `channels` and `exile`, a stand-in for `progression`
 * that names the coming receipt of a solved level and then writes `submission` (as the real one does), a court that
 * banishes, and stand-ins for the providers of `identity` and `allowance`.
 */
import { Type } from "typebox";
import type { Envelope } from "@swarmtales/contracts";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineGame, defineHead, defineMechanic, reply, type Game, type MechanicUse } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";
import { receipts } from "../src/index.ts";

/** Stands in for `progression`: `solve` names the coming receipt of each level, then writes `submission` for each. */
const levels = defineMechanic(
	defineHead({
		id: "progression",
		package: "@test/progression",
		summary: "Test: stands in for the progression.",
		events: ProgressionEvents.events,
		uses: [ReceiptSourceService],
		tools: {
			solve: { description: "Solve levels.", params: Type.Object({ levels: Type.Array(Type.Integer()) }), for: ["resident"] },
			ask: { description: "Ask receipt-source.", params: Type.Object({ number: Type.Optional(Type.Integer()) }), for: ["resident"] },
		},
	}),
	{
		tools: {
			solve: {
				run: ({ levels: solved }, ctx) => {
					const agent = ctx.resident ?? "";
					const ids = solved.map((level) => ctx.tryCall(ReceiptSourceService, "ofLevel", { resident: agent, level }) ?? "none");
					for (const level of solved) ctx.emit("submission", { agent, level, outcome: "correct", deltaPoints: 5 });
					return reply(ids.join(" "));
				},
			},
			// The receipt of a delivered message (asked only after the delivery, as its caller does), and the caller's texts.
			ask: {
				run: ({ number }, ctx) => {
					const message = number === undefined ? null : ctx.tryCall(ReceiptSourceService, "ofMessage", { number });
					return reply(JSON.stringify([message, ctx.tryCall(ReceiptSourceService, "textsOf", { resident: ctx.resident ?? "" })]));
				},
			},
		},
	},
);

/** Banishes a resident through the service of `exile`. */
const court = defineMechanic(
	defineHead({ id: "court", package: "@test/court", summary: "Test: banishes.", requires: [ExileService], tools: { banish: { description: "Banish.", params: Type.Object({ resident: Type.String() }), for: ["resident"] } } }),
	{ tools: { banish: { run: ({ resident }, ctx) => reply(JSON.stringify(ctx.call(ExileService, "banish", { resident }))) } } },
);

const NAMES: Readonly<Record<string, string>> = { A01: "Mira", A02: "Rook", A03: "Wren", A04: "Ash" };

/** Stands in for `names` and `marks`: every resident has a name, and 7 of 8 marks, of which a show costs 1. */
export const namesAndMarks = defineMechanic(defineHead({ id: "names", package: "@test/names", summary: "Test: names and marks.", provides: [IdentityService, AllowanceService] }), {
	services: {
		identity: {
			nameOf: ({ resident }) => NAMES[resident] ?? null,
			display: ({ text }) => text.replace(/\bA0\d\b/g, (id) => NAMES[id] ?? id),
			resolve: ({ text }) => Object.keys(NAMES).find((id) => NAMES[id] === text) ?? text,
		},
		allowance: { left: () => ({ remaining: 7, budget: 8 }), priceOf: () => 1 },
	},
});

/**
 * Four residents with 10 points each, the receipts with `options`, and `more`.
 *
 * @param options - The options of the receipts.
 * @param more - Further mechanics.
 * @param ticks - The ticks.
 * @returns The game.
 */
export function game(options: Parameters<typeof receipts>[0] = {}, more: readonly MechanicUse[] = [], ticks = 4): Game {
	return defineGame({
		id: "receipts-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), receipts(options), levels(), court(), ...more],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks },
	});
}

/**
 * Calls a tool and gives what the caller reads: the reply, or `CODE: detail`.
 *
 * @param test - The kernel.
 * @param resident - The caller.
 * @param tool - The tool.
 * @param params - The params.
 * @returns The answer.
 */
export async function say(test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> {
	const outcome = await test.call(resident, tool, params);
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/**
 * The events of some types, as `type payload`.
 *
 * @param events - The log.
 * @param types - The types kept.
 * @returns One line each.
 */
export function lines(events: readonly Envelope[], types: readonly string[]): readonly string[] {
	return events.filter((event) => types.includes(event.type)).map((event) => `${event.type} ${JSON.stringify(event.payload)}`);
}
