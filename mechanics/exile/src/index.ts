// SPDX-License-Identifier: Apache-2.0
/**
 * The `exile` mechanic: banishing a resident. It keeps the list of the banished, writes one event (`exiled`) and
 * holds one suspension. It has no tool and no option, and it names no other mechanic: whoever owns something of
 * a banished resident (points, pieces) listens to `exiled` and clears it away itself.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineHead, defineMechanic } from "@swarmtales/sdk";
import { EXILE_SUSPENSION, ExileEvents, ExileService } from "./contract.ts";

const ExileSlice = Type.Object({ exiled: Type.Array(Type.String({ description: "A resident id" }), { description: "The banished residents, in the order they were banished" }) }, { additionalProperties: false, description: "The state of `exile`" });

/**
 * The head of `exile`: everything that can be read without running a handler.
 *
 * @public
 */
export const exileHead = defineHead({
	id: "exile",
	package: "@swarmtales/mechanic-exile",
	summary: "Banishing a resident: one event, one suspension, and the list of the banished.",
	state: ExileSlice,
	start: () => ({ exiled: [] }),
	events: ExileEvents.events,
	provides: [ExileService],
});

/**
 * The exile: a service that banishes a resident for good.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [exile(), court({ opensAt: 3, closesAt: 5, window: 2 })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const exile = defineMechanic(exileHead, {
	services: {
		exile: {
			banish: ({ resident, by }, ctx, caller) => {
				if (!ctx.residents.has(resident)) return { ok: false, code: "UNKNOWN_RESIDENT" };
				if (ctx.state.exiled.includes(resident)) return { ok: false, code: "ALREADY_EXILED" };
				ctx.state.exiled.push(resident);
				ctx.emit("exiled", { agent: resident, by: by ?? caller });
				ctx.residents.suspend(resident, EXILE_SUSPENSION);
				return { ok: true };
			},
			isExiled: ({ resident }, ctx) => ctx.state.exiled.includes(resident),
			exiled: (_input, ctx) => [...ctx.state.exiled],
		},
	},
});
