// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `salt-market` mechanic: its options, its state, its events, services, prompts and tools. */
import { Type } from "typebox";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { saltMarketMetrics } from "./metrics.ts";
import { Bundle, Later, MarketSlice, Offer, Pledge, Profile, Reference, type MarketState } from "./model.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 4, description: "Games in the match; the run ends after the last." }),
	rotate: Type.Boolean({ default: true, description: "Deals rotate: one deal per cycle of as many games as traders, passed on one seat each game, so every trader plays every position once (P141)." }),
	saltValue: Type.Integer({ minimum: 0, default: 2, description: "What a unit of salt is worth to every trader (P142)." }),
	shipShare: Type.Number({ minimum: 0, maximum: 1, default: 0.35, description: "The chance that a dealt unit of a perishable good comes in the trader's shipment at the end of a later round instead of at the start (P143)." }),
	rounds: Type.Integer({ minimum: 2, maximum: 20, default: 6, description: "Trading rounds per game." }),
	roundMinutes: Type.Integer({ minimum: 1, default: 1, description: "Minutes a round lasts." }),
	salt: Type.Integer({ minimum: 0, default: 6, description: "Salt every trader starts a game with." }),
	slack: Type.Integer({ minimum: 0, default: 2, description: "Units of each perishable good beyond the joint demand of the contracts." }),
	contractBonus: Type.Integer({ minimum: 0, default: 20, description: "Points for holding at least the contract bundle at the game's end." }),
	taxFree: Type.Integer({ minimum: 0, default: 6, description: "Units a trade may move now without tax." }),
	tax: Type.Integer({ minimum: 0, default: 1, description: "Salt each side pays for a trade that moves more than taxFree units." }),
	escrowFee: Type.Integer({ minimum: 0, default: 1, description: "Salt the proposer pays when the bank holds later goods in escrow." }),
	maxOpenOffers: Type.Integer({ minimum: 1, default: 3, description: "Open offers a trader may have at once." }),
	maxSays: Type.Integer({ minimum: 0, default: 3, description: "Messages a trader may send per round." }),
	spoil: Type.Boolean({ default: true, description: "Goods spoil at the end of each round but the last." }),
	// Optional without a default, so that the resolved options and the hash of a game without it stay those of the old platform (A41).
	markOwnOffers: Type.Optional(Type.Boolean({ description: "true: a trader's own offers are marked as its own in the open offers it reads (A46, P478); left out or false: the text of the old platform." })),
});

const goodsShape = (what: string) =>
	Type.Object(
		{
			salt: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			cloth: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			copper: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			spice: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			wax: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
		},
		{ description: what },
	);

const offerParams = Type.Object({
	to: Type.String({ minLength: 1, maxLength: 8, description: "The trader the offer is for (for example A02), or all: the first trader to accept takes it." }),
	give: Type.Optional(goodsShape('What you give now, by good (for example {"cloth": 2}).')),
	get: Type.Optional(goodsShape("What you want now in return, by good.")),
	later: Type.Optional(
		Type.Object(
			{
				salt: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				cloth: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				copper: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				spice: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				wax: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				round: Type.Integer({ minimum: 1, maximum: 20, description: "The round at whose end you deliver." }),
				escrow: Type.Optional(Type.Boolean({ description: "true: the bank holds these goods from the trade on and delivers them (you pay the escrow fee); false or left out: a plain promise you keep with give." })),
			},
			{ description: "Optional: goods you deliver later, at the end of a later round of this game." },
		),
	),
	note: Type.Optional(Type.String({ maxLength: 300, description: "A short note the other side reads with the offer." })),
});

const tools = {
	viewMarket: { description: "salt-market/tools/viewMarket", params: Type.Object({}), for: ["resident"] },
	offer: { description: "salt-market/tools/offer", params: offerParams, for: ["resident"] },
	accept: { description: "salt-market/tools/accept", params: Type.Object({ offer: Type.String({ minLength: 1, maxLength: 8, description: "The offer's id (for example O3)." }) }), for: ["resident"] },
	decline: {
		description: "salt-market/tools/decline",
		params: Type.Object({ offer: Type.String({ minLength: 1, maxLength: 8, description: "The offer's id." }), note: Type.Optional(Type.String({ maxLength: 300, description: "A short note to the proposer." })) }),
		for: ["resident"],
	},
	withdraw: { description: "salt-market/tools/withdraw", params: Type.Object({ offer: Type.String({ minLength: 1, maxLength: 8, description: "The id of your own open offer." }) }), for: ["resident"] },
	give: {
		description: "salt-market/tools/give",
		params: Type.Object({
			to: Type.String({ minLength: 1, maxLength: 8, description: "The trader who gets the goods." }),
			goods: goodsShape("What you hand over, by good."),
			note: Type.Optional(Type.String({ maxLength: 300, description: "A short note, for example which promise this keeps." })),
		}),
		for: ["resident"],
	},
	say: {
		description: "salt-market/tools/say",
		params: Type.Object({
			text: Type.String({ minLength: 1, maxLength: 300, description: "The message." }),
			to: Type.Optional(Type.String({ maxLength: 8, description: "One trader for a private message; left out or all: everyone." })),
		}),
		for: ["resident"],
	},
} as const;

// The event schemas stand outside the head so that its metrics are typed by them.
const events = {
	market_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), profiles: Type.Record(Type.String(), Profile, { description: "Values, contracts and start bundles (sealed: audience human)." }) }),
	market_round_started: Type.Object({ game: Type.Integer(), round: Type.Integer(), spoils: Type.String() }),
	market_offer_made: Offer,
	market_offer_closed: Type.Object({ game: Type.Integer(), id: Type.String(), status: Type.String(), by: Type.String(), note: Type.String() }),
	market_offer_passed: Type.Object({ game: Type.Integer(), id: Type.String(), by: Type.String(), note: Type.String() }),
	market_trade: Type.Object({
		game: Type.Integer(),
		round: Type.Integer(),
		offer: Type.String(),
		from: Type.String(),
		to: Type.String(),
		give: Bundle,
		get: Bundle,
		later: Type.Optional(Later),
		tax: Type.Integer(),
		fee: Type.Integer(),
	}),
	market_gift: Type.Object({ game: Type.Integer(), round: Type.Integer(), from: Type.String(), to: Type.String(), goods: Bundle, note: Type.String() }),
	market_said: Type.Object({ game: Type.Integer(), round: Type.Integer(), from: Type.String(), to: Type.String(), text: Type.String() }),
	market_promise_settled: Pledge,
	market_shipment_arrived: Type.Object({ game: Type.Integer(), round: Type.Integer(), trader: Type.String(), shipment: Bundle, escrow: Bundle }),
	market_spoiled: Type.Object({ game: Type.Integer(), round: Type.Integer(), good: Type.String(), losses: Type.Record(Type.String(), Type.Integer()) }),
	market_game_ended: Type.Object({
		game: Type.Integer(),
		holdings: Type.Record(Type.String(), Bundle),
		profiles: Type.Record(Type.String(), Profile),
		scores: Type.Record(Type.String(), Type.Number()),
		met: Type.Array(Type.String()),
		totals: Type.Record(Type.String(), Type.Number()),
	}),
	market_game_scored: Type.Object({ game: Type.Integer(), reference: Reference }),
	market_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
};

/**
 * The event schemas of Salt Market, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type SaltMarketEvents = typeof events;

/**
 * The head of Salt Market: everything that can be read without running a handler.
 *
 * @public
 */
export const saltMarketHead = defineHead({
	id: "salt-market",
	package: "@swarmtales/mechanic-salt-market",
	summary: "The negotiation game Salt Market for solo seats: five goods, secret values and contracts, offers through a bank, escrowed or plain promises, spoilage and a trade tax.",
	options,
	state: MarketSlice,
	start: (setup): MarketState => ({
		seats: [...setup.residents],
		game: 0,
		round: 0,
		opened: 0,
		running: false,
		finished: false,
		held: false,
		due: false,
		profiles: {},
		holdings: {},
		offers: [],
		pledges: [],
		reserved: {},
		arrived: [],
		counter: 0,
		spoils: "",
		spoilLog: [],
		spoiled: {},
		says: {},
		inbox: {},
		briefed: [],
		told: {},
		stats: {},
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		gameScores: {},
		lastResult: "",
	}),
	// A snapshot file sorts the keys: the state comes back in the order of its schema, so the events written from it equal the straight run's (A43).
	snapshot: { save: (state: MarketState) => structuredClone(state), load: (data): MarketState => inSchemaOrder(MarketSlice, data) },
	events,
	metrics: saltMarketMetrics(events),
	// Sealed: the deal; private messages; the reference score is for the human and the reporter only.
	audiences: { market_game_started: ["human"], market_said: ["human"], market_game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"salt-market/tools/viewMarket": [],
		"salt-market/tools/offer": [],
		"salt-market/tools/accept": [],
		"salt-market/tools/decline": [],
		"salt-market/tools/withdraw": [],
		"salt-market/tools/give": [],
		"salt-market/tools/say": [],
		"salt-market/rules": ["seats", "games", "rounds", "salt", "saltValue", "contractBonus", "taxFree", "tax", "escrowFee", "maxOpenOffers", "maxSays", "spoil", "rotation"],
		"salt-market/game-head": ["game", "games"],
		"salt-market/round": ["round", "rounds", "spoils", "goods", "book", "shipments", "offers", "pledges"],
	},
	tools,
});

/**
 * The context of Salt Market's hooks, jobs, services and tools.
 *
 * @public
 */
export type SaltMarketCtx = CtxOf<typeof saltMarketHead>;

/**
 * The read-only view of Salt Market's fact and run limit.
 *
 * @public
 */
export type SaltMarketView = ViewOf<typeof saltMarketHead>;
