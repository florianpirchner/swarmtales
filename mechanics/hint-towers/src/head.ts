// SPDX-License-Identifier: Apache-2.0
/** The head of the `hint-towers` mechanic: its options, its state, its events, services, prompts and tools. */
import { Type, type Static } from "typebox";
import { defineHead, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { CardTableService } from "@swarmtales/mechanic-card-table/contract";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { HintTowersEvents } from "./events.ts";
import { TowerGameSlice, EndReason } from "./model.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 3, description: "Games in the match; the run ends after the last one." }),
	handSize: Type.Integer({ minimum: 1, default: 4, description: "Cards each seat holds." }),
	signals: Type.Integer({ minimum: 1, default: 6, description: "Signal tokens: the crew starts with this many and never holds more." }),
	strikes: Type.Integer({ minimum: 1, default: 3, description: "Misfires that end a game (with soft strikes: the misfire from which each one costs points)." }),
	strikePenalty: Type.Integer({ minimum: 0, default: 0, description: "Soft strikes: 0 ends the game at the last strike; above 0 the strikes never end it, and every misfire from the last strike on costs this many points." }),
	debriefNote: Type.Optional(Type.String({ description: "A line added to the record every seat gets after a game (for example a question for the retro)." })),
	refillOnTower: Type.Boolean({ default: true, description: "A completed tower gives a signal back." }),
	recent: Type.Integer({ minimum: 0, default: 8, description: "Last actions of the game shown in the status." }),
	playableOdds: Type.Boolean({ default: false, description: "Decision-time aid: each own slot also shows the share of its possible cards that are playable now, the chance a play lights it (P430)." }),
	listCandidates: Type.Integer({ minimum: 0, default: 6, description: "A slot's possible cards are listed when there are at most this many (0: only the count)." }),
	maxIdleMinutes: Type.Integer({ minimum: 1, default: 2, description: "Whole minutes a seat may leave its turn open before the move timer acts for it." }),
	maxConsecutiveForfeits: Type.Integer({ minimum: 0, default: 0, description: "That many timer actions in a row end the match as invalid (0: off)." }),
	side: Type.Optional(Type.String({ description: "The side a strategy brain names as moving first (a crew's team name); default: the first seat." })),
	quietTools: Type.Array(Type.String(), { default: [], description: "Tools locked for every seat while a game runs and opened between games (for example a team chat)." }),
});

const GameRecord = Type.Object({ game: Type.Integer(), reason: EndReason, score: Type.Integer(), baseline: Type.Integer(), lost: Type.Integer(), misfires: Type.Integer(), signals: Type.Integer() });

/**
 * The result of one finished game of the match.
 *
 * @public
 */
export type GameRecord = Static<typeof GameRecord>;

const HintSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	core: Type.Union([TowerGameSlice, Type.Null()]),
	baseline: Type.Integer(),
	signalsGiven: Type.Integer(),
	misfires: Type.Integer(),
	results: Type.Array(GameRecord),
	finished: Type.Boolean(),
	invalid: Type.Optional(Type.Boolean()),
	held: Type.Boolean(),
	due: Type.Boolean(),
	watch: Type.String(),
	idle: Type.Integer(),
	forfeits: Type.Integer(),
	debrief: Type.Array(Type.String()),
	/** Every card discarded in this game, with what it was still needed for (the debrief names them, P170). */
	discarded: Type.Array(Type.String()),
});

/**
 * The state of the hint towers: the running game, the results of the match and the move timer.
 *
 * @public
 */
export type HintState = Static<typeof HintSlice>;

const Slot = Type.Object({ slot: Type.Integer({ minimum: 1, description: "Your slot, from 1 (your oldest card)." }) });

/**
 * The head of the hint towers: everything that can be read without running a handler.
 *
 * @public
 */
export const hintTowersHead = defineHead({
	id: "hint-towers",
	package: "@swarmtales/mechanic-hint-towers",
	summary: "A cooperative game of hidden hands: signals about suit or rank, towers lit in rank order, bridged losses.",
	options,
	state: HintSlice,
	// The seats come from the card table when the run starts.
	start: (): HintState => ({ seats: [], game: 0, core: null, baseline: 0, signalsGiven: 0, misfires: 0, results: [], finished: false, held: false, due: false, watch: "", idle: 0, forfeits: 0, debrief: [], discarded: [] }),
	events: HintTowersEvents.events,
	audiences: { deal_revealed: ["human"], card_drawn: ["human"], game_scored: ["human"] },
	provides: [BrainSourceService],
	requires: [CardTableService],
	uses: [StrategyBrainService],
	prompts: {
		"hint-towers/tools/viewTowers": [],
		"hint-towers/tools/giveSignal": [],
		"hint-towers/tools/playSlot": [],
		"hint-towers/tools/discardSlot": [],
	},
	tools: {
		viewTowers: { description: "hint-towers/tools/viewTowers", params: Type.Object({}), for: ["resident"] },
		giveSignal: {
			description: "hint-towers/tools/giveSignal",
			params: Type.Object({
				to: Type.String({ description: 'The seat you signal, for example "A03".' }),
				about: Type.String({ description: 'One suit name (for example "Moss") or one rank (for example "3").' }),
			}),
			for: ["resident"],
		},
		playSlot: { description: "hint-towers/tools/playSlot", params: Slot, for: ["resident"] },
		discardSlot: { description: "hint-towers/tools/discardSlot", params: Slot, for: ["resident"] },
	},
});

/**
 * The context of the hint towers' hooks, jobs, services and tools.
 *
 * @public
 */
export type HintTowersCtx = CtxOf<typeof hintTowersHead>;

/**
 * The read-only view of the hint towers' facts and run limit.
 *
 * @public
 */
export type HintTowersView = ViewOf<typeof hintTowersHead>;
