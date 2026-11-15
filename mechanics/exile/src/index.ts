// SPDX-License-Identifier: Apache-2.0
/**
 * The `exile` mechanic: banishing a resident. A caller banishes at once (`banish`) or sends a resident to the gate
 * with the prices and the texts it sets (`toGate`); at the gate the resident may be bought back once (`payRansom`) and
 * may leave one last will (`lastWill`); when the gate closes the resident is banished. Every banishment writes one
 * event (`exiled`) and holds one suspension. It names no game mechanic: whoever owns something of a banished resident
 * (points, pieces, a goal) listens to `exiled` and clears it away itself, the pieces of a will are checked and
 * delivered by their owner, and the points come from a provider of `exile-purse`.
 *
 * @packageDocumentation
 */
import { Type, type Static } from "typebox";
import { defineMechanic, refuse } from "@swarmtales/sdk";
import { ExileService, type Standing } from "./contract.ts";
import { banish, closeGates, gateOf, gateViews, isGone, registered, resolved, toGate } from "./gate.ts";
import { exileHead, type ExileState } from "./head.ts";
import { payRansom } from "./ransom.ts";
import { lastWill } from "./will.ts";

export { exileHead, type ExileCtx, type ExileState, type ExileToolCtx, type GateState } from "./head.ts";
export type { BequestEntry } from "./will.ts";

// Old `standingOf`.
function standingOf(state: ExileState, resident: string): Static<typeof Standing> {
	if (isGone(state, resident)) return { kind: "exiled" };
	const gate = gateOf(state, resident);
	return gate === undefined ? { kind: "alive" } : { kind: "gate", until: gate.until };
}

// The old `enabledTools` of the exile's tools: the ransom while some gate takes one, the will at the gate until it is written.
function isOpen(state: ExileState, tool: string, resident: string): boolean {
	if (isGone(state, resident)) return false;
	if (tool === "payRansom") return state.gates.some((gate) => gate.ransomable);
	const gate = gateOf(state, resident);
	return gate !== undefined && gate.will === undefined;
}

/**
 * The exile: a service that banishes a resident for good, the gate with its ransom, and the last will.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [exile(), court({ opensAt: 3, closesAt: 5, window: 2 })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const exile = defineMechanic(exileHead, {
	tools: {
		payRansom: {
			run: ({ target, amount }, ctx) => (ctx.resident === undefined ? refuse("NO_RESIDENT") : payRansom(ctx, ctx.resident, resolved(ctx, target), amount)),
		},
		lastWill: {
			run: ({ text, bequests }, ctx) => (ctx.resident === undefined ? refuse("NO_RESIDENT") : lastWill(ctx, ctx.resident, text, bequests)),
		},
	},
	services: {
		exile: {
			banish: ({ resident, by }, ctx, caller) => banish(ctx, resident, by ?? caller),
			toGate: (input, ctx, caller) => {
				toGate(ctx, input, caller);
				return null;
			},
			isExiled: ({ resident }, ctx) => isGone(ctx.state, resident),
			exiled: (_input, ctx) => registered(ctx.state),
			standing: ({ resident }, ctx) => standingOf(ctx.state, resident),
			alive: (_input, ctx) => ctx.residents.ids.filter((id) => !isGone(ctx.state, id)),
			exiledBy: ({ resident }, ctx) => ctx.state.gone.find((entry) => entry.resident === resident)?.by ?? null,
			gates: (_input, ctx) => gateViews(ctx.state),
			ransomed: ({ resident }, ctx) => ctx.state.ransomed.includes(resident),
			bequeathed: ({ resident }, ctx) => [...(ctx.state.gone.find((entry) => entry.resident === resident)?.bequeathed ?? [])],
		},
	},
	pipeline: {
		lock: (call, ctx) => {
			if (call.owner !== exileHead.id || call.resident === undefined) return undefined;
			return isOpen(ctx.state, call.tool, call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("exile/replies/locked", {}));
		},
	},
	hooks: {
		// The gates whose time is up close at the start of the tick (old `minuteStarted`, before the caller's own tick).
		tickStarted: (ctx) => {
			closeGates(ctx);
		},
		// `exiled` or `at the gate until minute N`: the first of the old `tribunalParts` of the status line.
		turnInputs: (resident, ctx) => {
			const standing = standingOf(ctx.state, resident);
			if (standing.kind === "alive") return [];
			const text = standing.kind === "exiled" ? ctx.prompt("exile/status-exiled", {}) : ctx.prompt("exile/status/gate", { until: standing.until });
			return [{ kind: "status", order: 900, text }];
		},
	},
	facts: {
		gates: { output: ExileService.methods.gates.output, compute: (view) => gateViews(view.state) },
		exiled: {
			output: Type.Array(Type.Object({ resident: Type.String({ description: "The resident" }), by: Type.String({ description: "Who banished it" }) }, { description: "One banished resident" }), { description: "Every banished resident, in order" }),
			compute: (view) => view.state.gone.map((entry) => ({ resident: entry.resident, by: entry.by })),
		},
	},
});
