// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `tribunal` mechanic: exile by tribunal (SPEC 6.4), the first part of the port of the old `mechanics/tribunal`
 * (12-m5-spec.md, section 10, row 41). The city plans its tribunals (the first one, a fallback, the forced final one),
 * calls them ahead, names the accused at the opening, takes the residents' secret votes (`vote`), burns the
 * non-voters' points, and sends the residents with the most votes to the gate of `exile` with the ransom prices and
 * the texts of the tribunal. It provides the two services the standoff asks (`ransom-price`, `trial-risk`). The
 * faction draft (M5-42), the gamemaker's `scheduleTribunal`, the act's end and the views as facts (M5-43) follow.
 *
 * @packageDocumentation
 */
import { Check } from "typebox/value";
import type { RandomSource } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { DecisionsEvents } from "@swarmtales/mechanic-decisions/contract";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { tick } from "./court.ts";
import { tribunalHead, type TribunalToolCtx } from "./head.ts";
import { statusLines } from "./status.ts";
import { commitVerdict, prices, VERDICT, Verdict } from "./verdict.ts";
import { atRisk, canVote, vote } from "./vote.ts";

export { TribunalEvents } from "./contract.ts";
export { tribunalHead, type TribunalCtx, type TribunalToolCtx } from "./head.ts";
export { accusedCount, earliestOpening, exileTarget, factionCap, leadFor, noDraftReason, ransomPrices, tribunalHeld, type RansomPrices } from "./pacing.ts";
export { TribunalOptions, type TribunalSpec, type TribunalTextKey } from "./spec.ts";
export { TribunalSlice, type Plan, type Planner, type Session, type TribunalState } from "./state.ts";
export { VERDICT, Verdict } from "./verdict.ts";
export type { Risk, VoteError } from "./vote.ts";

// A text as the resident reads it: every id shown by its name (old `display` of `names`).
const shown = (ctx: TribunalToolCtx, text: string): string => ctx.tryCall(IdentityService, "display", { text }) ?? text;

// Old `vote`: the target as the id a name stands for (old `resolve` of `names`), then the old checks.
function runVote(ctx: TribunalToolCtx, target: string) {
	if (ctx.resident === undefined) return refuse("NO_RESIDENT");
	const result = vote(ctx, ctx.resident, ctx.tryCall(IdentityService, "resolve", { text: target }) ?? target);
	return result.ok ? reply(shown(ctx, ctx.prompt("tribunal/replies/vote-recorded", { target: result.value }))) : refuse(result.error, shown(ctx, result.detail));
}

// A vote the fake driver may cast: against one of the accused but itself, while the voter may vote.
function sampleVote(ctx: TribunalToolCtx, random: RandomSource): { target: string } | undefined {
	const voter = ctx.resident;
	const session = ctx.state.sessions.find((entry) => !entry.closed);
	if (voter === undefined || session === undefined || !canVote(ctx, voter)) return undefined;
	const others = session.accused.filter((agent) => agent !== voter);
	return others.length === 0 ? undefined : { target: random.pick(others) };
}

/**
 * The tribunal.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), exile(), progression(levels), tribunal(spec)], end: { ticks: 80 } });
 * ```
 *
 * @public
 */
export const tribunal = defineMechanic(tribunalHead, {
	tools: { vote: { run: ({ target }, ctx) => runVote(ctx, target), sample: sampleVote } },
	services: {
		// What others pay for a ransom of a gate that opened now (old `ransomPrices().price`); the standoff halves it (J121).
		"ransom-price": { price: (_input, ctx) => prices(ctx).price },
		// Who stands trial next (old `TribunalViewApi.atRisk`, J142).
		"trial-risk": { atRisk: (_input, ctx) => atRisk(ctx) ?? null },
	},
	pipeline: {
		// The old `enabledTools` for the vote: open while one is due.
		lock: (call, ctx) => {
			if (call.owner !== ctx.mechanic || call.resident === undefined) return undefined;
			return canVote(ctx, call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("tribunal/replies/locked", {}));
		},
	},
	hooks: {
		// Old `HOOK_ORDER.minuteStarted.tribunal` (300): after the door (it requires `progression`, so loads after it), the
		// motives and the names; before the seal and the standoff, which name it in their `after`.
		tickStarted: { after: ["motives", "names"], run: tick },
		turnInputs: (resident, ctx) => statusLines(ctx, resident),
	},
	listeners: (kit) => [
		// A verdict that waited at the decision gate is committed as it stands.
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind === VERDICT && settled.owner === ctx.mechanic && Check(Verdict, settled.proposal)) commitVerdict(ctx, settled.proposal);
		}),
	],
});
