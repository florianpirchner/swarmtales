// SPDX-License-Identifier: Apache-2.0
/** The head of the `sealed-auction` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { AuctionSlice, type AuctionState } from "./model.ts";
import { Reference } from "./reference.ts";
import { Lot, LotKind, LotResult } from "./rules.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games of the match; every game deals fresh lots and a full purse." }),
	lots: Type.Array(LotKind, {
		minItems: 1,
		maxItems: 20,
		default: ["first-price", "second-price", "common", "first-price", "common", "second-price"],
		description: "The kinds of the lots of each game, in order.",
	}),
	purse: Type.Integer({ minimum: 1, default: 100, description: "Coins per seat and game." }),
	valueMin: Type.Integer({ minimum: 0, default: 10 }),
	valueMax: Type.Integer({ minimum: 1, default: 60 }),
	worthMin: Type.Integer({ minimum: 0, default: 20 }),
	worthMax: Type.Integer({ minimum: 1, default: 80 }),
	noise: Type.Integer({ minimum: 0, default: 15, description: "The largest error of an estimate of a common lot." }),
	reserve: Type.Integer({ minimum: 1, default: 1, description: "The least bid that counts, and the least price." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a lot stays open before missing bids count as a pass." }),
});

/**
 * The head of the sealed auction: everything that can be read without running a handler.
 *
 * @public
 */
export const sealedAuctionHead = defineHead({
	id: "sealed-auction",
	package: "@swarmtales/mechanic-sealed-auction",
	summary: "Sealed bids on a series of lots (pay-your-bid, pay-the-runner-up, shared worth) with a purse per game, private values and a winner's-curse reference.",
	options,
	state: AuctionSlice,
	start: (setup): AuctionState => ({
		seats: [...setup.residents],
		game: 0,
		lots: [],
		lot: 0,
		open: false,
		opened: 0,
		owing: [],
		told: [],
		briefed: [],
		bids: {},
		reasons: {},
		results: [],
		coins: {},
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		gameScores: {},
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	snapshot: { save: (state: AuctionState) => structuredClone(state), load: (data): AuctionState => inSchemaOrder(AuctionSlice, data) },
	events: {
		game_started: Type.Object({ game: Type.Integer(), lots: Type.Array(LotKind), purse: Type.Integer(), seats: Type.Array(Type.String()) }),
		lots_dealt: Type.Object({ game: Type.Integer(), lots: Type.Array(Lot) }),
		lot_opened: Type.Object({ game: Type.Integer(), lot: Type.Integer(), kind: LotKind }),
		bid_placed: Type.Object({ game: Type.Integer(), lot: Type.Integer(), resident: Type.String(), amount: Type.Integer(), reason: Type.Optional(Type.String()) }),
		lot_resolved: Type.Object({ game: Type.Integer(), ...LotResult.properties, worth: Type.Optional(Type.Integer()) }),
		game_ended: Type.Object({ game: Type.Integer(), scores: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()), coins: Type.Record(Type.String(), Type.Number()) }),
		game_scored: Type.Object({ game: Type.Integer(), reference: Reference }),
		match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// The deal and the bids are sealed; the reference is for the human and the reporter only.
	audiences: { lots_dealt: ["human"], bid_placed: ["human"], game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"sealed-auction/tools/viewAuction": [],
		"sealed-auction/tools/bid": [],
		"sealed-auction/game-head": ["game", "games", "lots"],
		"sealed-auction/rules": ["purse", "lots", "reserve", "valueMin", "valueMax", "worthMin", "worthMax", "noise"],
		"sealed-auction/task-first-price": ["lot", "lots", "value", "coins"],
		"sealed-auction/task-second-price": ["lot", "lots", "value", "coins"],
		"sealed-auction/task-common": ["lot", "lots", "estimate", "coins", "noise"],
	},
	tools: {
		viewAuction: { description: "sealed-auction/tools/viewAuction", params: Type.Object({}), for: ["resident"] },
		bid: {
			description: "sealed-auction/tools/bid",
			params: Type.Object({
				amount: Type.Integer({ minimum: 0, description: "Coins bid on the open lot; 0 passes." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			for: ["resident"],
		},
	},
});

/**
 * The context of the sealed auction's hooks, jobs, services and tools.
 *
 * @public
 */
export type SealedAuctionCtx = CtxOf<typeof sealedAuctionHead>;

/**
 * The read-only view of the sealed auction's fact and run limit.
 *
 * @public
 */
export type SealedAuctionView = ViewOf<typeof sealedAuctionHead>;
