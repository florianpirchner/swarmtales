// SPDX-License-Identifier: Apache-2.0
/** The head of the `convoy` mechanic: its options, its state, its events, services, prompts and tools. */
import { Type } from "typebox";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { CardKind, ConvoySlice, PlayRecord, Role, SeatReference, StageRecord, Vote, type ConvoyState } from "./model.ts";

const Seat = Type.String({ minLength: 1, maxLength: 8 });

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; the roles are dealt anew for each; the run ends after the last." }),
	saboteurs: Type.Integer({ minimum: 1, default: 2, description: "Saboteurs dealt per game; they know each other." }),
	crews: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, default: [2, 2, 3, 3, 3, 3, 4, 4], description: "The crew size of each stage; its length is the number of stages." }),
	damageToLose: Type.Integer({ minimum: 1, default: 3, description: "Damaged stages that stop the convoy: the saboteurs win." }),
	cooldown: Type.Integer({ minimum: 1, default: 3, description: "A saboteur who played damage in stage s may play damage again from stage s + cooldown (3: at most one damage card per three stages)." }),
	talkPosts: Type.Integer({ minimum: 0, default: 2, description: "Lines a seat may speak per stage." }),
	maxTalkLength: Type.Integer({ minimum: 20, default: 400, description: "The longest line a seat may speak, in characters." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a proposal, vote, card or accusation stays open before the missing ones are filled in (crew in seat order, yes, safe, none) and marked missed." }),
	talkMinutes: Type.Integer({ minimum: 1, default: 2, description: "Minutes the talk before a vote stays open at most; it closes at the end of a minute once every seat had a turn in it." }),
});

// The three checks the old platform made when the run started.
function tableProblem(seats: number, saboteurs: number, crews: readonly number[], damageToLose: number): string | undefined {
	if (crews.some((size) => size >= seats)) return "convoy: every crew must be smaller than the table";
	if (saboteurs * 2 >= seats) return "convoy: the saboteurs must be fewer than half the table";
	return damageToLose > crews.length ? "convoy: damageToLose is more than the stages" : undefined;
}

/**
 * The head of Convoy: everything that can be read without running a handler.
 *
 * @public
 */
export const convoyHead = defineHead({
	id: "convoy",
	package: "@swarmtales/mechanic-convoy",
	summary: "The hidden-role card game Convoy for solo seats: secret saboteurs, crews from a rotating lead, votes of confidence, sealed safe or damage cards revealed as a count, one audit per game.",
	options,
	state: ConvoySlice,
	start: (setup): ConvoyState => {
		const problem = tableProblem(setup.residents.length, setup.options.saboteurs, setup.options.crews, setup.options.damageToLose);
		if (problem !== undefined) throw new RangeError(problem);
		return {
			seats: [...setup.residents],
			game: 0,
			roles: {},
			phase: "idle",
			opened: 0,
			stage: 0,
			lead: "",
			nextLead: 0,
			proposals: 0,
			crew: [],
			votes: {},
			firstVotes: {},
			noVote: [],
			plays: {},
			lastDamage: {},
			owing: [],
			told: [],
			briefed: [],
			stages: [],
			sealed: [],
			log: [],
			talk: [],
			seenLog: {},
			spoken: {},
			auditUsed: false,
			accusations: {},
			missed: {},
			scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	// A snapshot file sorts the keys: the state comes back in the order of its schema, so the events written from it equal the straight run's (A43).
	snapshot: { save: (state: ConvoyState) => structuredClone(state), load: (data): ConvoyState => inSchemaOrder(ConvoySlice, data) },
	events: {
		convoy_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), roles: Type.Record(Type.String(), Role, { description: "The secret deal (audience human)." }) }),
		convoy_crew_proposed: Type.Object({ game: Type.Integer(), stage: Type.Integer(), lead: Type.String(), crew: Type.Array(Type.String()), proposal: Type.Integer(), missed: Type.Boolean() }),
		convoy_spoken: Type.Object({ game: Type.Integer(), stage: Type.Integer(), from: Type.String(), text: Type.String() }),
		convoy_votes_revealed: Type.Object({ game: Type.Integer(), stage: Type.Integer(), lead: Type.String(), crew: Type.Array(Type.String()), votes: Type.Record(Type.String(), Vote), missed: Type.Array(Type.String()), confidence: Type.Boolean() }),
		convoy_card_played: PlayRecord,
		convoy_stage_revealed: StageRecord,
		convoy_audited: Type.Object({ game: Type.Integer(), stage: Type.Integer(), seat: Type.String(), card: CardKind, by: Type.String() }),
		convoy_accused: Type.Object({ game: Type.Integer(), seat: Type.String(), accused: Type.Array(Type.String()), missed: Type.Boolean() }),
		convoy_game_ended: Type.Object({
			game: Type.Integer(),
			winner: Type.Union([Type.Literal("convoy"), Type.Literal("saboteurs")]),
			roles: Type.Record(Type.String(), Role),
			damaged: Type.Integer(),
			stages: Type.Integer(),
			cards: Type.Array(PlayRecord),
			totals: Type.Record(Type.String(), Type.Number()),
		}),
		convoy_game_scored: Type.Object({
			game: Type.Integer(),
			seats: Type.Record(Type.String(), SeatReference),
			/** The tracker's top suspects from the public record alone, and their posteriors. */
			tracker: Type.Array(Type.String()),
			posterior: Type.Record(Type.String(), Type.Number()),
		}),
		convoy_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Sealed: the deal, every card and the accusations; the reference is for the human and the reporter only.
	audiences: { convoy_game_started: ["human"], convoy_card_played: ["human"], convoy_accused: ["human"], convoy_game_scored: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService],
	prompts: {
		"convoy/tools/viewConvoy": [],
		"convoy/tools/proposeCrew": [],
		"convoy/tools/speak": [],
		"convoy/tools/voteConfidence": [],
		"convoy/tools/playCrewCard": [],
		"convoy/tools/audit": [],
		"convoy/tools/accuse": [],
		"convoy/rules": ["seats", "saboteurs", "stages", "crews", "damageToLose", "cooldown", "talkPosts"],
		"convoy/game-head": ["game", "games"],
		"convoy/role-loyal": ["seat", "saboteurs"],
		"convoy/role-saboteur": ["seat", "partners", "cooldown", "damageToLose"],
		"convoy/task-propose": ["seat", "stage", "stages", "size", "damaged", "damageToLose", "vote"],
		"convoy/task-talk": ["seat", "stage", "lead", "crew", "posts", "audit"],
		"convoy/task-vote": ["seat", "stage", "lead", "crew"],
		"convoy/task-play": ["seat", "stage", "crew", "choice"],
		"convoy/task-accuse": ["seat", "count"],
	},
	tools: {
		viewConvoy: { description: "convoy/tools/viewConvoy", params: Type.Object({}), for: ["resident"] },
		proposeCrew: {
			description: "convoy/tools/proposeCrew",
			params: Type.Object({
				crew: Type.Array(Seat, { minItems: 1, maxItems: 12, description: 'The seats of the crew (for example ["A01", "A04"]); you may name yourself.' }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (not shown to the table; speak to explain)." })),
			}),
			for: ["resident"],
		},
		speak: { description: "convoy/tools/speak", params: Type.Object({ text: Type.String({ minLength: 1, maxLength: 1000, description: "What you say to the whole table." }) }), for: ["resident"] },
		voteConfidence: {
			description: "convoy/tools/voteConfidence",
			params: Type.Object({ vote: Vote, reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (not shown to the table)." })) }),
			for: ["resident"],
		},
		playCrewCard: {
			description: "convoy/tools/playCrewCard",
			params: Type.Object({ card: CardKind, reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (never shown to the table)." })) }),
			for: ["resident"],
		},
		audit: {
			description: "convoy/tools/audit",
			params: Type.Object({ seat: Type.String({ minLength: 1, maxLength: 8, description: "A seat that was on the crew of that stage." }), stage: Type.Integer({ minimum: 1, description: "An earlier stage." }) }),
			for: ["resident"],
		},
		accuse: {
			description: "convoy/tools/accuse",
			params: Type.Object({
				seats: Type.Array(Seat, { minItems: 1, maxItems: 6, description: "The seats you believe are the saboteurs." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			for: ["resident"],
		},
	},
});

/**
 * The context of Convoy's hooks, jobs, services and tools.
 *
 * @public
 */
export type ConvoyCtx = CtxOf<typeof convoyHead>;

/**
 * The read-only view of Convoy's fact and run limit.
 *
 * @public
 */
export type ConvoyView = ViewOf<typeof convoyHead>;
