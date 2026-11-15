// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `tribunal` mechanic: exile by tribunal (SPEC 6.4), the first part of the port of the old `mechanics/tribunal`
 * (12-m5-spec.md, section 10, rows 41 and 42). The city plans its tribunals (the first one, a fallback, the forced final one),
 * calls them ahead, names the accused at the opening, takes the residents' secret votes (`vote`), burns the
 * non-voters' points, and sends the residents with the most votes to the gate of `exile` with the ransom prices and
 * the texts of the tribunal. Before a tribunal of a city with factions the residents draft factions (`nominate`,
 * `join`, `refuse`), and a faction that votes as one earns the bloc bonus. It provides the two services the standoff
 * asks (`ransom-price`, `trial-risk`), what the run's stop rule reads (`tribunal-view`) and what the seal asks
 * (`tribunal.missing`). The gamemaker plans a tribunal with `scheduleTribunal`; the act ends once the target is
 * reached; the gamemaker's report reads the facts `section` and `draft`.
 *
 * @packageDocumentation
 */
import { Check } from "typebox/value";
import type { RandomSource } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { DecisionsEvents } from "@swarmtales/mechanic-decisions/contract";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { missing } from "./city.ts";
import { tick } from "./court.ts";
import { runJoin, runNominate, runRefuse, sampleStep, stepOpen } from "./draft.ts";
import { tribunalHead, type TribunalToolCtx } from "./head.ts";
import { mayScheduleTribunal, runSchedule } from "./schedule.ts";
import { DraftFact, SectionFact } from "./section.ts";
import { statusLines } from "./status.ts";
import { commitVerdict, prices, VERDICT, Verdict } from "./verdict.ts";
import { atRisk, canVote, vote } from "./vote.ts";
import { draftOf, readsOf, sectionOf, stopOf } from "./view.ts";

export { TribunalEvents, TribunalService } from "./contract.ts";
export { phaseOf, type DraftError, type DraftPhase } from "./factions.ts";
export { tribunalHead, type Reads, type TribunalCtx, type TribunalToolCtx, type TribunalView } from "./head.ts";
export { cityCall, schedulingWindow, type ScheduleParams, type SchedulingWindow } from "./schedule.ts";
export { DraftFact, SectionFact, type TribunalSection } from "./section.ts";
export type { TribunalStop } from "./view.ts";
export { accusedCount, earliestOpening, exileTarget, factionCap, leadFor, noDraftReason, ransomPrices, tribunalHeld, type RansomPrices } from "./pacing.ts";
export { TribunalOptions, type TribunalSpec, type TribunalTextKey } from "./spec.ts";
export { TribunalSlice, type Draft, type Faction, type Plan, type Planner, type Session, type TribunalState, type Vote } from "./state.ts";
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

// The params of a sampled step that names a resident, or none.
const withAgent = (agent: string | undefined): { agent: string } | undefined => (agent === undefined ? undefined : { agent });

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
	tools: {
		vote: { run: ({ target }, ctx) => runVote(ctx, target), sample: sampleVote },
		nominate: { run: ({ agent }, ctx) => runNominate(ctx, agent), sample: (ctx, random) => withAgent(sampleStep(ctx, "nominate", random)) },
		join: {
			run: ({ leader }, ctx) => runJoin(ctx, leader),
			sample: (ctx, random) => {
				const leader = sampleStep(ctx, "join", random);
				return leader === undefined ? undefined : { leader };
			},
		},
		refuse: { run: ({ agent }, ctx) => runRefuse(ctx, agent), sample: (ctx, random) => withAgent(sampleStep(ctx, "refuse", random)) },
		scheduleTribunal: { run: (params, ctx) => runSchedule(ctx, params) },
	},
	services: {
		// What others pay for a ransom of a gate that opened now (old `ransomPrices().price`); the standoff halves it (J121).
		"ransom-price": { price: (_input, ctx) => prices(ctx).price },
		// Who stands trial next (old `TribunalViewApi.atRisk`, J142).
		"trial-risk": { atRisk: (_input, ctx) => atRisk(ctx) ?? null },
		// What the run's stop rule of `arena` reads (old `TribunalViewApi.stop`).
		"tribunal-view": { stop: (_input, ctx) => stopOf(ctx) },
		// Old `TribunalApi.missing`, which the seal asks (A91).
		tribunal: { missing: (_input, ctx) => missing(ctx) },
	},
	pipeline: {
		// The old `enabledTools`: the vote while one is due, the draft's steps by phase; the gamemaker's plan while offered.
		lock: (call, ctx) => {
			if (call.owner !== ctx.mechanic) return undefined;
			const locked = refuse("TOOL_LOCKED", ctx.prompt("tribunal/replies/locked", {}));
			if (call.tool === "scheduleTribunal") return mayScheduleTribunal(ctx) ? undefined : locked;
			if (call.resident === undefined) return undefined;
			const open = call.tool === "vote" ? canVote(ctx, call.resident) : stepOpen(ctx, call.tool, call.resident);
			return open ? undefined : locked;
		},
	},
	hooks: {
		// Old `HOOK_ORDER.minuteStarted.tribunal` (300): after the door (it requires `progression`, so loads after it), the
		// motives and the names; before the seal and the standoff, which name it in their `after`.
		tickStarted: { after: ["motives", "names"], run: tick },
		turnInputs: (resident, ctx) => statusLines(ctx, resident),
	},
	facts: {
		/** The data of the gamemaker's tribunal section (old `tribunalLines`); null without a tribunal or before the first tick. */
		section: {
			output: SectionFact,
			compute: (view) => {
				const reads = readsOf(view);
				return reads === undefined ? null : sectionOf(reads);
			},
		},
		/** The running faction draft: its group and leaders. */
		draft: { output: DraftFact, compute: draftOf },
	},
	listeners: (kit) => [
		// A verdict that waited at the decision gate is committed as it stands.
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind === VERDICT && settled.owner === ctx.mechanic && Check(Verdict, settled.proposal)) commitVerdict(ctx, settled.proposal);
		}),
	],
});
