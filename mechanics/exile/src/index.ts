/**
 * The `exile` mechanic (carve step 12, team T4a, docs/design/carve-round2-T4.md): the gate, the
 * ransom, the last will and leaving the city. It owns what the old `Tribunal` kept of the gate
 * (gates, exiled, ransomed), the old world's `isExiled`, `standingOf`, `payRansom`, `lastWill`,
 * `#onExiled` and `#onStruck`, and the `standing` part of the status line. The tribunal opens the
 * gates (`ExileApi.toGate`), the seal and the holdout tribunal strike (`ExileApi.strike`).
 */
import { Type, type Static } from "typebox";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ExileApi, HOOK_ORDER, STATUS_ORDER, TribunalApi } from "@swarmtales/mechanic-shared";
import { exileHead, type ExileCtx } from "./head.ts";
import { closeGates, fillLegacyPrices, strike, toGate } from "./gone.ts";
import { payRansom } from "./ransom.ts";
import { exileSnapshot } from "./slice.ts";
import { coveredPercent, gateOf, isGone, pricesOf, standingOf, tribunalExiled, type ExileState } from "./state.ts";
import { bequestsOf, lastWill } from "./will.ts";

export { exileHead } from "./head.ts";

const GateView = ExileApi.methods.gates.output;

/** Old `Tribunal.gates()`; a gate of an old snapshot shows no price until the next minute sets it. */
function gateViews(state: ExileState): Static<typeof GateView> {
	return state.gates.map((gate) => {
		const priced = gate.price !== undefined && gate.selfPrice !== undefined;
		return {
			agent: gate.resident,
			since: gate.since,
			until: gate.until,
			ransomable: gate.ransomable,
			...(priced ? pricesOf(gate) : { price: 0, selfPrice: 0 }),
			paid: gate.payments.reduce((sum, payment) => sum + payment.amount, 0),
			covered: priced ? coveredPercent(gate) : 0,
			willDone: gate.will !== undefined,
		};
	});
}

/** The old `enabledTools` for the exile's tools: the ransom while some gate takes one, the will at the gate until it is written. */
function isOpen(ctx: ExileCtx, tool: string, resident: string): boolean {
	if (!ctx.has(TribunalApi) || standingOf(ctx.state, resident).kind === "exiled") return false;
	if (tool === "payRansom") return ctx.state.gates.some((gate) => gate.ransomable);
	return tool === "lastWill" && gateOf(ctx.state, resident)?.will === undefined && standingOf(ctx.state, resident).kind === "gate";
}

/** `exiled` or `at the gate until minute N` (the first of the old `tribunalParts`). */
function standingPart(ctx: ExileCtx, resident: string): string | undefined {
	const standing = standingOf(ctx.state, resident);
	if (standing.kind === "exiled") return ctx.prompt("exile/status-exiled", {});
	return standing.kind === "gate" ? ctx.prompt("competitor/status/gate", { until: standing.until }) : undefined;
}

const PayRansomParams = Type.Object({
	target: Type.String({ description: "The resident at the gate, by name or ID, e.g. A03" }),
	amount: Type.Integer({ description: "Positive integer; more than the rest of the price is not taken", minimum: 1 }),
});

const LastWillParams = Type.Object({
	text: Type.String({ description: "The public text of your will", maxLength: 600 }),
	bequests: Type.Array(
		Type.Object({
			to: Type.String({ description: "Heir, by name or ID, e.g. A02" }),
			points: Type.Optional(Type.Integer({ description: "Points to leave (0 or omitted: none)", minimum: 0 })),
			factor: Type.Optional(Type.String({ description: "A piece you hold, e.g. L8-counter-A02" })),
		}),
	),
});

export const exile = defineMechanic(exileHead,(kit) => ({
	tools: [
		kit.tool({
			name: "payRansom",
			description: "tools/payRansom",
			parameters: PayRansomParams,
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ target, amount }, ctx) => {
				const payer = ctx.resident;
				if (payer === undefined) return refuse("NO_RESIDENT");
				const result = payRansom(ctx, payer, target, amount);
				if (!result.ok) return result;
				const { paid, price, selfPrice, covered, freed } = result.value;
				return reply(freed ? ctx.prompt("replies/ransom-covered", { paid, target }) : ctx.prompt("replies/ransom-paid", { covered, target, price, selfPrice }));
			},
		}),
		kit.tool({
			name: "lastWill",
			description: "tools/lastWill",
			parameters: LastWillParams,
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ text, bequests }, ctx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("NO_RESIDENT");
				const parsed = bequestsOf(bequests);
				if (parsed === undefined) return refuse("INVALID_BEQUEST", ctx.prompt("replies/will-invalid", {}));
				const result = lastWill(ctx, agent, text, parsed);
				if (!result.ok) return result;
				return reply(`${ctx.prompt("replies/will-written", {})}${result.lines.length === 0 ? "" : ` · ${result.lines.join(" · ")}`}`);
			},
		}),
	],
	services: [
		kit.provide(ExileApi, {
			isExiled: ({ resident }, ctx) => isGone(ctx.state, resident),
			standing: ({ resident }, ctx) => standingOf(ctx.state, resident),
			alive: (_input, ctx) => ctx.residents.ids.filter((id) => !isGone(ctx.state, id)),
			exiledBy: ({ resident }, ctx) => ctx.state.gone.find((entry) => entry.resident === resident)?.by ?? null,
			toGate: (input, ctx) => {
				toGate(ctx, input);
				return null;
			},
			strike: ({ resident, by }, ctx) => strike(ctx, resident, by),
			gates: (_input, ctx) => gateViews(ctx.state),
			exiled: (_input, ctx) => [...tribunalExiled(ctx.state)],
			ransomed: ({ resident }, ctx) => ctx.state.ransomed.includes(resident),
		}),
	],
	pipeline: {
		lock: (call, ctx) => {
			if (call.owner !== "exile" || call.resident === undefined) return undefined;
			return isOpen(ctx, call.tool, call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
		},
	},
	hooks: {
		/** The tribunal's tick (the same order, before it: exile loads first): the gates whose time is up close. */
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.tribunal,
			run: (ctx) => {
				fillLegacyPrices(ctx);
				closeGates(ctx);
			},
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				const text = standingPart(ctx, resident);
				return text === undefined ? [] : [{ kind: "status", text, order: STATUS_ORDER.standing }];
			},
		},
	},
	facts: {
		gates: kit.fact(GateView, (view) => gateViews(view.state)),
		exiled: kit.fact(Type.Array(Type.Object({ resident: Type.String(), by: Type.String() })), (view) => view.state.gone.map((entry) => ({ resident: entry.resident, by: entry.by }))),
	},
	snapshot: kit.snapshot(exileSnapshot),
}));
