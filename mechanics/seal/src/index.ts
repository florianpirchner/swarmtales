/**
 * The `seal` mechanic (carve step 14, team T4b, docs/design/carve-round2-T4.md): the black seal
 * auction of one act. The logic is the old `SealHouse` (house.ts) over the state this mechanic
 * holds; the old `World` wiring is here: the act's seal begins after the goals are dealt
 * (`act_started`, `LISTENER_ORDER.act_started.seal`) and ends before they are resolved
 * (`act_ended`, `LISTENER_ORDER.act_ended.seal`), the auctions tick between the tribunal and the
 * standoff (`HOOK_ORDER.minuteStarted.seal`), the bid and the bearer show on the status line, and
 * exile tells it of every exile (`SealApi.onExiled`).
 */
import { Type } from "typebox";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { ChannelsApi, ExileApi, HOOK_ORDER, LedgerApi, LISTENER_ORDER, ProgressionApi, ProgressionEvents, SealApi, STATUS_ORDER, TribunalApi } from "@swarmtales/mechanic-shared";
import { auctionOf, bidOf, borne, emptySeal, holds, pendingSeals, SealHouse, type SealData, type SealPorts } from "./house.ts";
import { sealEvents } from "./events.ts";
import { sealSnapshot } from "./slice.ts";
import { SealSectionFact } from "./section.ts";

export { renderSealSection, SealSectionFact, sealSectionOf, type SealSection } from "./section.ts";
/** The auction's rules over a state of its own, for tests of the rules alone. */
export { auctionOf, bidOf, borne, emptySeal, holds, SealHouse, sealCount, type SealData, type SealPorts } from "./house.ts";

const CITY = "CITY";
const Int = Type.Integer();

const text = (description: string) => Type.String({ description });

const options = Type.Object({
	act: Type.Integer({ minimum: 1, description: "The first level of the act whose seal this is; it begins and ends with that act." }),
	announceAfter: Type.Integer({ minimum: 0, description: "Minutes into the act until the first auction opens." }),
	bidMinutes: Type.Integer({ minimum: 1, description: "How long an auction takes bids, in minutes." }),
	perResidents: Type.Integer({ minimum: 1, description: "One seal per this many residents in the city at the act's start (rounded up, at least one)." }),
	spacing: Type.Integer({ minimum: 0, description: "Minutes between the openings of two auctions of one act." }),
	texts: Type.Object(
		{
			announcement: text("Board post when the bidding opens: the rules ({seal}, {until}, {seals})."),
			won: text("Board post when someone won; it never names the holder ({seal})."),
			winnerNotice: text("Private notice to the winner ({seal}, {bid})."),
			paidNotice: text("Private notice to every other bidder ({seal}, {bid})."),
			noBids: text("Board post when nobody bid ({seal})."),
			used: text("Board post when the seal is broken ({holder}, {target})."),
			expired: text("Private notice to a holder whose seal is gone unused ({seal})."),
		},
		{ description: "The story's texts of the seal (old `SealTexts`)." },
	),
});

export interface SealState {
	data: SealData;
}

export const sealHead = defineHead({
	id: "seal",
	summary: "The black seal auction.",
	options,
	state: (): SealState => ({ data: emptySeal() }),
	events: sealEvents,
	provides: [SealApi],
	requires: [LedgerApi, ProgressionApi, ChannelsApi, ExileApi, TribunalApi],
	prompts: {
		"tools/bid": [],
		"tools/permaDeath": [],
		"replies/bid-none": ["until"],
		"replies/bid-stands": ["points", "until"],
		"replies/seal-broken": ["target"],
		"replies/locked": [],
		"competitor/status/seal-auction": ["until", "bid"],
		"competitor/status/seal-bid": ["bid"],
		"competitor/status/seal-bearer": [],
	},
});

type Ctx = ContextOf<typeof sealHead>;
type ToolCtx = ToolContextOf<typeof sealHead>;

function portsFor(ctx: Ctx): SealPorts {
	return {
		ids: ctx.residents.ids,
		points: (agent) => ctx.call(LedgerApi, "balance", { account: agent }),
		standing: (agent) => ctx.call(ExileApi, "standing", { resident: agent }),
		missing: () => ctx.call(TribunalApi, "missing", {}),
		burn: (agent, points, reason) => {
			ctx.call(LedgerApi, "burn", { account: agent, amount: points, reason });
		},
		post: (body) => {
			ctx.call(ChannelsApi, "post", { author: CITY, text: body });
		},
		notify: (agent, body) => {
			ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: body });
		},
		emit: (type, payload) => {
			ctx.emit(type, payload);
		},
		strike: (target) => {
			ctx.call(ExileApi, "strike", { resident: target, by: "seal" });
		},
		shuffle: (seal, agents) => ctx.rng("seal", seal).shuffle(agents),
	};
}

function houseFor(ctx: Ctx): SealHouse {
	const { texts, ...rule } = ctx.options;
	return new SealHouse({ ...rule, texts }, portsFor(ctx), ctx.state.data);
}

/** The old `sealParts`: an auction to bid in, or the seal the resident bears. */
function sealParts(ctx: Ctx, agent: string): readonly string[] {
	const standing = ctx.call(ExileApi, "standing", { resident: agent }).kind;
	if (standing === "exiled") return [];
	const data = ctx.state.data;
	const parts: string[] = [];
	const auction = auctionOf(data);
	if (auction !== undefined && standing === "alive") {
		const bid = bidOf(data, agent);
		parts.push(ctx.prompt("competitor/status/seal-auction", { until: auction.until, bid: bid === undefined ? "" : ` ${ctx.prompt("competitor/status/seal-bid", { bid })}` }));
	}
	if (holds(data, agent)) parts.push(ctx.prompt("competitor/status/seal-bearer", {}));
	return parts;
}

/** The old `enabledTools`: `bid` while an auction runs for a resident in the city, `permaDeath` for a bearer. */
function enabled(ctx: Ctx, tool: string, agent: string): boolean {
	if (tool === "bid") return auctionOf(ctx.state.data) !== undefined && ctx.call(ExileApi, "standing", { resident: agent }).kind === "alive";
	return holds(ctx.state.data, agent);
}

export const seal = defineMechanic(sealHead, (kit) => ({
	tools: [
		kit.tool({
			name: "bid",
			description: "tools/bid",
			parameters: Type.Object({ points: Type.Integer({ description: "Whole points, 0 or more", minimum: 0 }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ points }, ctx: ToolCtx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("NO_RESIDENT");
				const result = houseFor(ctx).bid(agent, points);
				if (!result.ok) return refuse(result.error, result.detail);
				const { points: standing, until } = result.value;
				return reply(standing === 0 ? ctx.prompt("replies/bid-none", { until }) : ctx.prompt("replies/bid-stands", { points: standing, until }));
			},
		}),
		kit.tool({
			name: "permaDeath",
			description: "tools/permaDeath",
			parameters: Type.Object({ target: Type.String({ description: "A resident, by name or ID, e.g. A03" }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ target }, ctx: ToolCtx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("NO_RESIDENT");
				const result = houseFor(ctx).use(agent, target);
				if (!result.ok) return refuse(result.error, result.detail);
				return reply(ctx.prompt("replies/seal-broken", { target: result.value }));
			},
		}),
	],
	services: [
		kit.provide(SealApi, {
			onExiled: ({ resident }, ctx) => {
				houseFor(ctx).onExiled(resident);
				return null;
			},
		}),
	],
	listeners: [
		kit.listen(
			ProgressionEvents,
			"act_started",
			({ fromLevel, residents }, ctx) => {
				if (fromLevel === ctx.options.act) houseFor(ctx).begin(ctx.minute, residents.length);
			},
			{ immediate: true, order: LISTENER_ORDER.act_started.seal },
		),
		kit.listen(
			ProgressionEvents,
			"act_ended",
			({ fromLevel }, ctx) => {
				if (fromLevel === ctx.options.act) houseFor(ctx).end();
			},
			{ immediate: true, order: LISTENER_ORDER.act_ended.seal },
		),
	],
	pipeline: {
		lock: (call, ctx) => {
			if (call.owner !== "seal" || call.resident === undefined) return undefined;
			return enabled(ctx, call.tool, call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
		},
	},
	hooks: {
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.seal,
			run: (ctx) => {
				houseFor(ctx).tick(ctx.minute);
			},
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => sealParts(ctx, resident).map((part) => ({ kind: "status", text: part, order: STATUS_ORDER.seal })),
		},
	},
	facts: {
		/** The old `sealLines` of the gamemaker's situation read these: never who bids or bears. */
		auction: kit.fact(Type.Union([Type.Object({ seal: Int, until: Int }), Type.Null()]), (view) => auctionOf(view.state.data) ?? null),
		borne: kit.fact(Int, (view) => borne(view.state.data)),
		pending: kit.fact(Int, (view) => pendingSeals(view.state.data)),
		/** The three together, the gamemaker's "Black seal" lines (`renderSealSection`; step 18, item 2). */
		section: kit.fact(SealSectionFact, (view) => ({ auction: auctionOf(view.state.data) ?? null, borne: borne(view.state.data), pending: pendingSeals(view.state.data) })),
	},
	snapshot: kit.snapshot(sealSnapshot),
}));
