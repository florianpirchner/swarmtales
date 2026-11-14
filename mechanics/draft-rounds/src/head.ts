// SPDX-License-Identifier: Apache-2.0
/** The head of the `draft-rounds` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { defineHead, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { Breakdown, Card, copyState, DraftSlice, PickRecord, Reference, type DraftState } from "./model.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; the run ends after the last." }),
	packs: Type.Integer({ minimum: 1, maximum: 4, default: 2, description: "Pack rounds per game; the passing direction turns every round." }),
	packSize: Type.Integer({ minimum: 2, maximum: 15, default: 6, description: "Cards in a pack." }),
	wilds: Type.Integer({ minimum: 0, default: 4, description: "Lodestones (wild ore) in a game's deck; the rest is split over the four resources." }),
	majorityBonus: Type.Integer({ minimum: 0, default: 5, description: "Points for strictly the most cards of a resource (wilds do not count; a tie scores nothing)." }),
	burnCost: Type.Integer({ minimum: 0, default: 0, description: "Points a burn costs (0 since P123: bots showed a burn pays only when it is free and late)." }),
	placeBonus: Type.Array(Type.Integer({ minimum: 0 }), { maxItems: 8, default: [10, 5], description: "Points per game for the first, second, ... place by the score before this bonus; a tie shares the better place. Empty: none." }),
	maxBurns: Type.Integer({ minimum: 0, default: 2, description: "Burns a seat may make per game." }),
	openHands: Type.Boolean({ default: false, description: "Every seat sees every quarry during the game (off: only at the game's end)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a pick stays open before a missing pick takes the first card of the pack." }),
});

/**
 * The head of the draft: everything that can be read without running a handler.
 *
 * @public
 */
export const draftRoundsHead = defineHead({
	id: "draft-rounds",
	package: "@swarmtales/mechanic-draft-rounds",
	summary: "The drafting game Quarry for solo seats: packs passed around a table, one sealed pick each, quarries of four resources scored at the end of a game.",
	options,
	state: DraftSlice,
	start: (setup): DraftState => ({
		seats: [...setup.residents],
		game: 0,
		packRound: 0,
		step: 0,
		opened: 0,
		deck: [],
		packs: {},
		from: {},
		hands: {},
		burned: [],
		burns: {},
		owing: [],
		told: [],
		briefed: [],
		picks: [],
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		gameScores: {},
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	snapshot: {
		save: (state: DraftState) => copyState(state),
		load: (data): DraftState => copyState(data),
	},
	events: {
		draft_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), deck: Type.Array(Card, { description: "The deck in deal order (sealed: audience human)." }) }),
		draft_pick_opened: Type.Object({ game: Type.Integer(), pack: Type.Integer(), step: Type.Integer(), sizes: Type.Record(Type.String(), Type.Integer(), { description: "Cards in front of each seat." }) }),
		draft_card_picked: PickRecord,
		draft_game_ended: Type.Object({
			game: Type.Integer(),
			hands: Type.Record(Type.String(), Type.Array(Card)),
			breakdown: Type.Record(Type.String(), Breakdown),
			totals: Type.Record(Type.String(), Type.Number()),
		}),
		draft_game_scored: Type.Object({ game: Type.Integer(), reference: Reference }),
		draft_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Sealed: the deal and the picks; the reference score is for the human and the reporter only.
	audiences: { draft_game_started: ["human"], draft_card_picked: ["human"], draft_game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"draft-rounds/tools/viewTable": [],
		"draft-rounds/tools/pick": [],
		"draft-rounds/rules": ["seats", "games", "packs", "packSize", "deck", "majorityBonus", "burnRule", "places"],
		"draft-rounds/game-head": ["game", "games"],
		"draft-rounds/task-pick": ["pack", "packs", "step", "from", "cards", "quarry", "burnLine", "receiver"],
	},
	tools: {
		viewTable: { description: "draft-rounds/tools/viewTable", params: Type.Object({}), for: ["resident"] },
		pick: {
			description: "draft-rounds/tools/pick",
			params: Type.Object({
				card: Type.String({ minLength: 1, maxLength: 8, description: "The id of the card you keep (for example A3)." }),
				burn: Type.Optional(Type.String({ maxLength: 8, description: "Optional: the id of a second card of the pack to destroy before the pack moves on (limited per game)." })),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			for: ["resident"],
		},
	},
});

/**
 * The context of the draft's hooks, jobs, services and tools.
 *
 * @public
 */
export type DraftRoundsCtx = CtxOf<typeof draftRoundsHead>;

/**
 * The read-only view of the draft's fact and run limit.
 *
 * @public
 */
export type DraftRoundsView = ViewOf<typeof draftRoundsHead>;
