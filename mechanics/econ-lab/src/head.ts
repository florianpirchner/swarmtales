// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `econ-lab` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { defineHead, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { Action, Block, DilemmaPayoffs, EconSlice, GameKind, Outcome, Reference, RoundRecord, type EconState } from "./model.ts";
import { econGamesMetrics } from "./metrics.ts";

const Reason = Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." }));

const options = Type.Object({
	blocks: Type.Array(Block, {
		minItems: 1,
		default: [
			{ game: "ultimatum", rounds: 6 },
			{ game: "public-goods", rounds: 6 },
			{ game: "dilemma", rounds: 6 },
		],
		description: "The games of the match in order, each with its rounds; the run ends after the last.",
	}),
	endowment: Type.Integer({ minimum: 1, default: 10, description: "Public goods: the tokens each seat gets per round." }),
	multiplier: Type.Number({ exclusiveMinimum: 0, default: 1.6, description: "Public goods: the factor on the fund before it is split equally (a dilemma when it lies between 1 and the number of seats)." }),
	pie: Type.Integer({ minimum: 1, default: 10, description: "Ultimatum: the points to split per pair and round." }),
	dilemma: Type.Object(DilemmaPayoffs.properties, { default: { bothA: 3, bothB: 1, temptation: 5, sucker: 0 }, description: "The payoff table of the A-or-B game (a dilemma when temptation > bothA > bothB > sucker and 2 bothA > temptation + sucker)." }),
	showHorizon: Type.Boolean({ default: false, description: "Tell the seats how many rounds a game has (off: unknown horizon, against end-game defection)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a phase stays open before missing decisions take the default." }),
	showEarlierPoints: Type.Optional(Type.Boolean({ description: "false: `viewTable` shows a seat its points of the running game only, and no points between two games, so that it carries no points of an earlier game into the next (LH19). Shown when absent." })),
});

const copyHistory = (history: readonly RoundRecord[]): RoundRecord[] => history.map((record) => ({ ...record, outcomes: record.outcomes.map((outcome) => ({ ...outcome })) }));

// The event schemas stand outside the head so that the metrics are typed by them, and before the state: the declaration
// build then meets the four decision names in the order of `Action` first, so the tool names of the API report keep one
// order however the build walks the files.
const events = {
	block_started: Type.Object({ block: Type.Integer(), game: GameKind, rounds: Type.Integer(), seats: Type.Array(Type.String()) }),
	round_opened: Type.Object({ block: Type.Integer(), round: Type.Integer(), game: GameKind, pairs: Type.Array(Type.Array(Type.String()), { description: "The pairs of the round (the proposer first in the ultimatum game); '' is the bye of an odd table." }) }),
	decision_made: Type.Object({ block: Type.Integer(), round: Type.Integer(), resident: Type.String(), action: Action, value: Type.Number(), reason: Type.Optional(Type.String()) }),
	round_resolved: Type.Object({ block: Type.Integer(), round: RoundRecord.properties.round, game: GameKind, pool: Type.Optional(Type.Number()), outcomes: Type.Array(Outcome) }),
	block_ended: Type.Object({ block: Type.Integer(), game: GameKind, scores: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()) }),
	block_scored: Type.Object({ block: Type.Integer(), game: GameKind, reference: Reference }),
	match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
};

/**
 * The event schemas of the econ games, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type EconGamesEvents = typeof events;

/**
 * The head of the econ games: everything that can be read without running a handler.
 *
 * @public
 */
export const econGamesHead = defineHead({
	id: "econ-lab",
	package: "@swarmtales/mechanic-econ-lab",
	summary: "Public goods, ultimatum and an A-or-B dilemma in rounds for solo seats: sealed decisions, payoffs, a match of games.",
	options,
	events,
	metrics: econGamesMetrics(events),
	// Sealed until the round resolves; the reference score is for the human and the reporter only.
	audiences: { decision_made: ["human"], block_scored: ["human"] },
	state: EconSlice,
	start: (setup): EconState => ({
		seats: [...setup.residents],
		block: 0,
		round: 0,
		phase: "idle",
		opened: 0,
		owing: [],
		told: [],
		briefed: [],
		reported: [],
		values: {},
		reasons: {},
		missed: [],
		history: [],
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		blockScores: {},
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	snapshot: {
		save: (state: EconState) => ({
			...state,
			seats: [...state.seats],
			owing: [...state.owing],
			told: [...state.told],
			briefed: [...state.briefed],
			reported: [...state.reported],
			values: { ...state.values },
			reasons: { ...state.reasons },
			missed: [...state.missed],
			history: copyHistory(state.history),
			scores: { ...state.scores },
			blockScores: { ...state.blockScores },
		}),
		load: (data): EconState => ({
			...data,
			seats: [...data.seats],
			owing: [...data.owing],
			told: [...data.told],
			briefed: [...data.briefed],
			reported: [...(data.reported ?? [])],
			values: { ...data.values },
			reasons: { ...data.reasons },
			missed: [...data.missed],
			history: copyHistory(data.history),
			scores: { ...data.scores },
			blockScores: { ...data.blockScores },
		}),
	},
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"econ-lab/tools/viewTable": [],
		"econ-lab/tools/contribute": [],
		"econ-lab/tools/offer": [],
		"econ-lab/tools/respond": [],
		"econ-lab/tools/choose": [],
		"econ-lab/rules-public-goods": ["endowment", "multiplier", "seats"],
		"econ-lab/rules-ultimatum": ["pie"],
		"econ-lab/rules-dilemma": ["bothA", "bothB", "temptation", "sucker"],
		"econ-lab/horizon-known": ["rounds"],
		"econ-lab/horizon-hidden": [],
		"econ-lab/block-head": ["block", "blocks"],
		"econ-lab/task-contribute": ["round", "endowment"],
		"econ-lab/task-offer": ["round", "partner", "pie"],
		"econ-lab/task-respond": ["round", "partner", "offer", "keep"],
		"econ-lab/task-wait": ["round", "partner"],
		"econ-lab/task-choose": ["round", "partner"],
		"econ-lab/sits-out": ["round"],
	},
	tools: {
		viewTable: { description: "econ-lab/tools/viewTable", params: Type.Object({}), for: ["resident"] },
		contribute: { description: "econ-lab/tools/contribute", params: Type.Object({ amount: Type.Integer({ minimum: 0, description: "Tokens to put into the shared fund." }), reason: Reason }), for: ["resident"] },
		offer: { description: "econ-lab/tools/offer", params: Type.Object({ amount: Type.Integer({ minimum: 0, description: "Points offered to the partner." }), reason: Reason }), for: ["resident"] },
		respond: { description: "econ-lab/tools/respond", params: Type.Object({ accept: Type.Boolean({ description: "true accepts the offer, false rejects it." }), reason: Reason }), for: ["resident"] },
		choose: { description: "econ-lab/tools/choose", params: Type.Object({ option: Type.Union([Type.Literal("A"), Type.Literal("B")], { description: "A or B." }), reason: Reason }), for: ["resident"] },
	},
});

/**
 * The context of the econ games' hooks, jobs, services and tools.
 *
 * @public
 */
export type EconGamesCtx = CtxOf<typeof econGamesHead>;

/**
 * The read-only view of the econ games' fact and run limit.
 *
 * @public
 */
export type EconGamesView = ViewOf<typeof econGamesHead>;
