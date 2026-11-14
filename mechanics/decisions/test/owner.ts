// SPDX-License-Identifier: Apache-2.0
/** A test mechanic that owns decisions: its tool `decide` proposes one, and it writes `committed` when it commits. */
import { Type } from "typebox";
import type { Envelope } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { play, type Played, type PlayOptions } from "@swarmtales/testkit";
import { DecisionsEvents, DecisionsService } from "../src/contract.ts";
import { decisions } from "../src/index.ts";

const head = defineHead({
	id: "owner",
	package: "@test/owner",
	summary: "Proposes decisions and commits them.",
	requires: [DecisionsService],
	events: { committed: Type.Object({ proposal: Type.Unknown(), decision: Type.Optional(Type.String()) }), listed: Type.Object({ open: Type.Unknown() }) },
	tools: { decide: { description: "Propose.", params: Type.Object({ window: Type.Integer(), bench: Type.Optional(Type.String()) }), for: ["resident"] } },
});

const owner = defineMechanic(head, {
	tools: {
		decide: {
			run: ({ window, bench }, ctx) => {
				if (bench !== undefined) ctx.residents.suspend(bench, "benched");
				const proposal = { exiled: "A03" };
				const answer = ctx.call(DecisionsService, "propose", { kind: "owner.verdict", proposal, window, schema: Type.Object({ exiled: Type.String() }) });
				if (answer.committed) ctx.emit("committed", { proposal });
				else ctx.emit("listed", { open: ctx.call(DecisionsService, "open", {}) });
				return reply(JSON.stringify(answer));
			},
		},
	},
	listeners: (kit) => [
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.owner === "owner") ctx.emit("committed", { proposal: settled.proposal, decision: settled.decision });
		}),
	],
});

/** A game of three residents and five ticks in which `A02` (or the given actors) holds the decisions; every resident is granted `amendDecision`. */
export const game = (holders: string[] = ["resident:A02"], ticks = 5) =>
	defineGame({ id: "decide", seed: 3, residents: 3, mechanics: [decisions({ holders }), owner()], grants: { resident: { add: ["amendDecision"] } }, scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks } });

/** Plays the game; `A01` calls `decide` with `params` at its first activation (tick 0). */
export const decide = (params: { window: number; bench?: string }, holders?: string[], options: PlayOptions = {}, ticks?: number): Promise<Played> =>
	play(game(holders, ticks), { script: { A01: [["decide", params]] }, ...options });

/** The events of `decisions` and of the owner, and the kernel's `service_called`, as `[tick, type, payload]`. */
export const told = (events: readonly Envelope[]): (readonly [number, string, unknown])[] =>
	events.filter((event) => ["decision_proposed", "decision_amended", "decision_settled", "committed", "listed", "service_called"].includes(event.type)).map((event) => [event.tick, event.type, event.payload] as const);

/** The slice of `decisions` in the snapshot of a played run. */
export const slice = (run: Played): unknown => run.kernel.snapshot().plugins.decisions?.data;
