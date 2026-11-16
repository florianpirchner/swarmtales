// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `seal` mechanic: the black seal of one act, the port of the old `mechanics/seal` (12-m5-spec.md, section 10,
 * row 44). Once the act has begun (it listens to `progression.act_started`, after the goals are dealt) the city
 * auctions its seals at the start of a tick (after the tribunal, before the standoff), takes the secret bids
 * (`bid`), burns every bid at the close and tells the winner privately. The bearer breaks the seal once with
 * `permaDeath`, which banishes the target through `exile` with `by: "seal"`. A seal is gone with its bearer (it
 * listens to `exile.exiled`) and at the act's end (`progression.act_ended`, before the goals are resolved), and it
 * crumbles once the tribunal's target, which it asks of `tribunal.missing`, is reached.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { RandomSource } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { enabled, houseFor, statusLines } from "./city.ts";
import { sealHead, type SealToolCtx, type SealView } from "./head.ts";
import { auctionOf, borne, holds, pendingSeals } from "./house.ts";

export { SealEvents } from "./contract.ts";
export { sealHead, type SealCtx, type SealToolCtx, type SealView } from "./head.ts";
export { auctionOf, bidOf, borne, holds, pendingSeals, SealHouse, sealCount, type BidError, type Result, type SealError, type SealPorts, type SealRule } from "./house.ts";
export { emptySeal, SealOptions, SealSlice, type SealData, type SealEntry, type SealStage, type SealTexts } from "./state.ts";

// A text as the resident reads it: every id shown by its name (old `display` of `names`).
const shown = (ctx: SealToolCtx, text: string): string => ctx.tryCall(IdentityService, "display", { text }) ?? text;

function runBid(ctx: SealToolCtx, points: number) {
	if (ctx.resident === undefined) return refuse("NO_RESIDENT");
	const result = houseFor(ctx).bid(ctx.resident, points);
	if (!result.ok) return refuse(result.error, result.detail);
	const { points: standing, until } = result.value;
	return reply(standing === 0 ? ctx.prompt("seal/replies/bid-none", { until }) : ctx.prompt("seal/replies/bid-stands", { points: standing, until }));
}

// Old `permaDeath`: the target as the id a name stands for (old `resolve` of `names`), then the old checks.
function runPermaDeath(ctx: SealToolCtx, target: string) {
	if (ctx.resident === undefined) return refuse("NO_RESIDENT");
	const result = houseFor(ctx).use(ctx.resident, ctx.tryCall(IdentityService, "resolve", { text: target }) ?? target);
	if (!result.ok) return refuse(result.error, shown(ctx, result.detail));
	return reply(shown(ctx, ctx.prompt("seal/replies/seal-broken", { target: result.value })));
}

// A bid the fake driver may place: up to what the resident holds, while an auction is open to it.
function sampleBid(ctx: SealToolCtx, random: RandomSource): { points: number } | undefined {
	if (ctx.resident === undefined || auctionOf(ctx.state) === undefined || ctx.call(ExileService, "standing", { resident: ctx.resident }).kind !== "alive") return undefined;
	return { points: random.int(0, Math.max(0, ctx.call(LedgerService, "balance", { account: ctx.resident }))) };
}

// A strike the fake driver may make: the bearer on another resident still in the city.
function sampleStrike(ctx: SealToolCtx, random: RandomSource): { target: string } | undefined {
	const holder = ctx.resident;
	if (holder === undefined || !holds(ctx.state, holder)) return undefined;
	const others = ctx.call(ExileService, "alive", {}).filter((agent) => agent !== holder);
	return others.length === 0 ? undefined : { target: random.pick(others) };
}

const Int = (description: string) => Type.Integer({ description });
const Auction = Type.Union([Type.Object({ seal: Int("The seal"), until: Int("The auction ends") }, { description: "A running auction" }), Type.Null({ description: "None" })], { description: "The auction" });

/** The old facts: what the gamemaker may know, never who bids or bears. */
const facts = {
	auction: { output: Auction, compute: (view: SealView) => auctionOf(view.state) ?? null },
	borne: { output: Int("Unused seals borne"), compute: (view: SealView) => borne(view.state) },
	pending: { output: Int("Seals still to auction in this act"), compute: (view: SealView) => pendingSeals(view.state) },
	// The gamemaker's "Black seal" lines read this (A73: `SealSectionSchema` of `mechanics/city-directors/src/gamemaker/report/whisperer-seal.ts`).
	section: {
		output: Type.Object({ auction: Auction, borne: Int("Unused seals borne"), pending: Int("Seals still to auction in this act") }, { description: "The black seal's part of the gamemaker's report" }),
		compute: (view: SealView) => ({ auction: auctionOf(view.state) ?? null, borne: borne(view.state), pending: pendingSeals(view.state) }),
	},
};

/**
 * The black seal.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), exile(), progression(levels), goals(spec), tribunal(spec), seal(SEAL)], end: { ticks: 80 } });
 * ```
 *
 * @public
 */
export const seal = defineMechanic(sealHead, {
	tools: {
		bid: { run: ({ points }, ctx) => runBid(ctx, points), sample: sampleBid },
		permaDeath: { run: ({ target }, ctx) => runPermaDeath(ctx, target), sample: sampleStrike },
	},
	pipeline: {
		// The old `enabledTools` of the seal's own two tools.
		lock: (call, ctx) => {
			if (call.owner !== ctx.mechanic || call.resident === undefined) return undefined;
			return enabled(ctx, call.tool, call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("seal/replies/locked", {}));
		},
	},
	hooks: {
		// Old `HOOK_ORDER.minuteStarted.seal` (400): after the motives, the names and the tribunal; the standoff names the seal
		// in its `after`, and the door clock (700) names the standoff, so the seal must not name `progression` (a cycle,
		// SWT-R016). The door (100) has no `after` and comes first by load order: `progression` loads before the seal (A96).
		tickStarted: {
			after: ["motives", "names", "tribunal"],
			run: (ctx) => {
				houseFor(ctx).tick(ctx.tick);
			},
		},
		turnInputs: (resident, ctx) => statusLines(ctx, resident),
	},
	facts,
	listeners: (kit) => [
		// Old `LISTENER_ORDER.act_started`: the goals are dealt, then the seal begins (J196).
		kit.listen(
			ProgressionEvents,
			"act_started",
			({ fromLevel, residents }, ctx) => {
				if (fromLevel === ctx.options.act) houseFor(ctx).begin(ctx.tick, residents.length);
			},
			{ after: ["goals"] },
		),
		// The goals name the seal in their `after`: the seal ends, then the goals are resolved.
		kit.listen(ProgressionEvents, "act_ended", ({ fromLevel }, ctx) => {
			if (fromLevel === ctx.options.act) houseFor(ctx).end();
		}),
		// Old `SealApi.onExiled`, which the exile called for every exile.
		kit.listen(ExileEvents, "exiled", ({ agent }, ctx) => {
			houseFor(ctx).onExiled(agent);
		}),
	],
});
