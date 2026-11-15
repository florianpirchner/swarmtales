// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `whispers` mechanic: the whisperer, chosen from the seed, who gets a duty notice from the city; the forged
 * receipt (`forgeReceipt`); and the popularity vote (`nameFavourite`). Carried from the old `mechanics/whispers`. It
 * reads the direct messages and speaks through `channels`, pays the vote's points through `ledger`, and reads the
 * receipts (`receipt-source`), the marks (`allowance`), the names (`identity`), the exile and the hand-over test of
 * `puzzles` through their services, each when a provider is loaded. It provides the whisperer's id (`whispers`, in
 * its `/contract`), checks a Director's note for the whisperer's role, and closes `defy` for all but its whisperer.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { refuse, defineMechanic, type StageCall } from "@swarmtales/sdk";
import type { Refusal } from "@swarmtales/contracts";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { DutyNow, dutyNow, tickDuty, tickVote } from "./duty-notice.ts";
import { whispersHead, type WhispersCtx, type WhispersView } from "./head.ts";
import { checkRole, mayDefy } from "./role.ts";
import { checkFavourite, checkForge, favourite, forge, sampleFavourite, sampleForge } from "./tools.ts";
import { isAlive, roundsOf, shown } from "./view.ts";

export { WhispersEvents, WhispersService } from "./contract.ts";
export { busiestPair, Direction, Duty, dutyDue, isForgeable, previousDuty, Quota, quotaMet, quotaOf, tallyWhispers, WhispererSpec, type Dm, type DmReceipt, type Forgery, type Tally } from "./duty.ts";
export { DutyNow, renderTemplate, type DutyNowValue } from "./duty-notice.ts";
export { whispersHead, WhispersOptions, type WhispersCtx, type WhispersState, type WhispersToolCtx, type WhispersView } from "./head.ts";
export { roleLeaks } from "./role.ts";
export { countBallots, dutyTarget, namesList, PopularitySpec, Round, type Counted, type Phase, type VoteCount } from "./vote.ts";

/** The order of the vote's part of the status line (old `STATUS_ORDER.popularity`). */
const STATUS_ORDER = 1300;

/**
 * The fact `whispers.section`, the whisperer's part of the gamemaker's report (old `WhispererSectionFact`): null
 * without a whisperer or once he left the city.
 *
 * @public
 */
export const WhispererSection = Type.Union(
	[
		Type.Null({ description: "No whisperer in the city" }),
		Type.Object(
			{ whisperer: Type.String({ description: "The whisperer" }), minute: Type.Integer({ description: "The tick of the report" }), duty: Type.Union([DutyNow, Type.Null({ description: "No orders" })], { description: "His orders" }) },
			{ description: "The whisperer" },
		),
	],
	{ description: "The whisperer's part of the gamemaker's report" },
);

function section(view: WhispersView) {
	const agent = view.state.whisperer;
	if (agent === null || view.tryCall(ExileService, "isExiled", { resident: agent }) === true) return null;
	return { whisperer: agent, minute: view.tick, duty: dutyNow(view) };
}

// The locks of the whispers' own tools, asked live: the forgery is the whisperer's wherever it may show a receipt,
// and the vote's tool is open to a resident in the city while a round is open.
function lockOwn(tool: string, resident: string | undefined, ctx: WhispersCtx): boolean {
	if (tool === "forgeReceipt") return !(resident !== undefined && resident === ctx.state.whisperer && ctx.options.whisperer?.forgery === true && ctx.access.isOpen(resident, "showReceipt"));
	if (tool === "nameFavourite") return ctx.state.phase !== "open" || (resident !== undefined && !isAlive(ctx, resident));
	return false;
}

// The `lock` handler: the whispers' own tools, and `defy` (of `channels`), which is the whisperer's alone.
function lock(call: StageCall, ctx: WhispersCtx): Refusal | undefined {
	const resident = call.resident;
	const closed = call.tool === "defy" ? resident !== undefined && !mayDefy(ctx, resident) : call.owner === ctx.mechanic && lockOwn(call.tool, resident, ctx);
	return closed ? refuse("TOOL_LOCKED", ctx.prompt("whispers/replies/locked", {})) : undefined;
}

// The vote's part of the status line while a round is open.
function statusLines(resident: string, ctx: WhispersCtx) {
	const round = roundsOf(ctx)[ctx.state.round];
	if (ctx.state.phase !== "open" || round === undefined || !isAlive(ctx, resident)) return [];
	const ballot = ctx.state.ballots.get(resident);
	const named = ballot === undefined ? ctx.prompt("whispers/status/popularity-nobody", {}) : ctx.prompt("whispers/status/popularity-named", { ballot });
	return [{ kind: "status", order: STATUS_ORDER, text: shown(ctx, ctx.prompt("whispers/status/popularity-vote", { label: round.label, countsAt: round.countsAt, ballot: named })) }];
}

/**
 * The whispers: the whisperer and its duty, `forgeReceipt`, the popularity vote with `nameFavourite`.
 *
 * @example
 * ```ts
 * const duty = { kind: "afterVote", text: "Minute {minute}: {ranking}. Until {next}; marks {marks}; forge: {forgeable}." } as const;
 * const game = defineGame({ id: "whispers", residents: 6, mechanics: [ledger(), channels(), receipts({ quoteDms: true }), whispers({ whisperer: { forgery: true, duty } })], directors: [{ use: judge }], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export const whispers = defineMechanic(whispersHead, {
	tools: {
		forgeReceipt: { check: checkForge, run: forge, sample: sampleForge },
		nameFavourite: { check: checkFavourite, run: favourite, sample: sampleFavourite },
	},
	services: { whispers: { whisperer: (_input, ctx) => ctx.state.whisperer } },
	pipeline: { lock, rule: checkRole },
	hooks: {
		runStarted: (ctx) => {
			if (ctx.state.whisperer !== null) ctx.emit("whisperer_chosen", { agent: ctx.state.whisperer });
		},
		// The duty falls due before the vote is counted (old `startMinute`), after the ultimatums of `standoff` (old
		// `HOOK_ORDER.minuteStarted` 600 after 500; decisions A77 and A78).
		tickStarted: {
			after: ["standoff"],
			run: (ctx) => {
				tickDuty(ctx);
				tickVote(ctx);
			},
		},
		turnInputs: statusLines,
	},
	facts: {
		whisperer: { output: Type.Union([Type.String({ description: "The whisperer" }), Type.Null({ description: "None plays" })], { description: "The whisperer" }), compute: (view) => view.state.whisperer },
		round: { output: Type.Integer({ description: "The index of the current round of the vote" }), compute: (view) => view.state.round },
		// Computed live from the direct messages, the exile and the hand-over test: a strike or a message of this turn shows at once.
		dutyNow: { output: Type.Union([DutyNow, Type.Null({ description: "No orders" })], { description: "The whisperer's measured orders now" }), compute: dutyNow },
		section: { output: WhispererSection, compute: section },
	},
});
