// SPDX-License-Identifier: Apache-2.0
/** The head of the `consensus` mechanic: its options, its state with the saved form, its events, prompts and tools. */
import { Type } from "typebox";
import { ConsensusSourceService } from "@swarmtales/mechanic-contracts";
import { defineHead } from "@swarmtales/sdk";
import { ConsensusService } from "./contract.ts";

/** One vote on the open proposal. */
export interface Vote {
	readonly agree: boolean;
	readonly reason: string;
}

/** What the gate holds for one team. */
export interface TeamState {
	proposal: { readonly cell: number; readonly reason: string } | undefined;
	votes: Map<string, Vote>;
	/** The value that won the vote and has not been played yet. */
	won: number | undefined;
	/** The last proposal that was rejected, until the next one. */
	rejected: number | undefined;
	rounds: number;
	/** The tick from which the team has been on move at a tick's start (a whole tick counts from it); undefined while it is not on move or went on move mid-tick. */
	since: number | undefined;
	forfeits: number;
	deadlocked: boolean;
}

interface GateState {
	readonly teams: Map<string, TeamState>;
	/** The last tick in which something was played through the gate; -1 for none. */
	moved: number;
	/** Forfeits in a row with no agreed move between them (across teams). */
	streak: number;
}

/**
 * The state of a team at the start of a game.
 *
 * @param forfeits - The forfeits the team has so far; they outlive a game.
 * @returns The state.
 */
export const freshTeam = (forfeits: number): TeamState => ({ proposal: undefined, votes: new Map(), won: undefined, rejected: undefined, rounds: 0, since: undefined, forfeits, deadlocked: false });

const options = Type.Object({
	tool: Type.String({ default: "playMove", description: "The gated tool: it is refused unless the team agreed on the value of `param`." }),
	param: Type.String({ default: "cell", description: "The parameter of the gated tool that the vote is about." }),
	rule: Type.Literal("majority", { default: "majority", description: "When a proposal wins: more than half of the voters (the team without its captain) agree; a tie is no consensus." }),
	maxRounds: Type.Integer({ minimum: 1, default: 3, description: "Rounds (whole minutes with the team on move) without a played move before the deadlock rule applies." }),
	onDeadlock: Type.Union([Type.Literal("forfeitRandomLegalMove"), Type.Literal("refuse")], {
		default: "forfeitRandomLegalMove",
		description: "At the deadlock: play a random legal value for the team and count a forfeit, or only keep refusing the gated tool.",
	}),
	maxConsecutiveForfeits: Type.Integer({ minimum: 0, default: 0, description: "Forfeits in a row with no agreed move between them after which the match is invalid (match_invalid) and the run ends; 0 = off." }),
	teams: Type.Record(Type.String(), Type.Array(Type.String(), { description: "Resident ids of one team, the captain included." }), {
		default: {},
		description: "The teams that must agree, by the names the ConsensusSourceApi provider uses.",
	}),
});

const Outcome = Type.Union([Type.Literal("pending"), Type.Literal("reached"), Type.Literal("rejected")]);

const Saved = Type.Object({
	moved: Type.Integer(),
	streak: Type.Optional(Type.Integer()),
	teams: Type.Record(
		Type.String(),
		Type.Object({
			proposal: Type.Union([Type.Null(), Type.Object({ cell: Type.Integer(), reason: Type.String() })]),
			votes: Type.Record(Type.String(), Type.Object({ agree: Type.Boolean(), reason: Type.String() })),
			won: Type.Union([Type.Null(), Type.Integer()]),
			rejected: Type.Union([Type.Null(), Type.Integer()]),
			rounds: Type.Integer(),
			since: Type.Optional(Type.Union([Type.Null(), Type.Integer()])),
			forfeits: Type.Integer(),
			deadlocked: Type.Boolean(),
		}),
	),
});

/** The head of the mechanic. */
export const head = defineHead({
	id: "consensus",
	package: "@swarmtales/mechanic-consensus",
	summary: "A team must agree before a gated tool call is released.",
	requires: [ConsensusSourceService],
	provides: [ConsensusService],
	options,
	state: Saved,
	snapshot: {
		save: (state: GateState) => ({
			moved: state.moved,
			streak: state.streak,
			teams: Object.fromEntries(
				[...state.teams].map(([team, st]) => [
					team,
					{ proposal: st.proposal ?? null, votes: Object.fromEntries(st.votes), won: st.won ?? null, rejected: st.rejected ?? null, rounds: st.rounds, since: st.since ?? null, forfeits: st.forfeits, deadlocked: st.deadlocked },
				]),
			),
		}),
		load: (data): GateState => ({
			moved: data.moved,
			streak: data.streak ?? 0,
			teams: new Map(
				Object.entries(data.teams).map(([team, st]) => [
					team,
					{ proposal: st.proposal ?? undefined, votes: new Map(Object.entries(st.votes)), won: st.won ?? undefined, rejected: st.rejected ?? undefined, rounds: st.rounds, since: st.since ?? undefined, forfeits: st.forfeits, deadlocked: st.deadlocked },
				]),
			),
		}),
	},
	start: ({ options: chosen }) => ({ teams: new Map(Object.keys(chosen.teams).map((team) => [team, freshTeam(0)])), moved: -1, streak: 0 }),
	events: {
		move_proposed: Type.Object({ team: Type.String(), captain: Type.String(), cell: Type.Integer(), reason: Type.String() }),
		vote_cast: Type.Object({ team: Type.String(), voter: Type.String(), cell: Type.Integer(), agree: Type.Boolean(), reason: Type.String(), outcome: Outcome }),
		consensus_reached: Type.Object({ team: Type.String(), cell: Type.Integer(), agree: Type.Integer(), disagree: Type.Integer() }),
		consensus_forfeited: Type.Object({ team: Type.String(), cell: Type.Integer(), rounds: Type.Integer() }),
		consensus_deadlocked: Type.Object({ team: Type.String(), rounds: Type.Integer() }),
		match_invalid: Type.Object({ reason: Type.String(), forfeits: Type.Integer() }),
	},
	prompts: {
		"consensus/tools/proposeMove": [],
		"consensus/tools/castVote": [],
		"consensus/proposed": ["cell"],
		"consensus/vote-recorded": [],
		"consensus/reached": ["cell"],
		"consensus/rejected": ["cell"],
		"consensus/vote-request": ["captain", "cell", "reason"],
		"consensus/go-ahead": ["cell"],
		"consensus/rejected-notice": ["cell"],
	},
	tools: {
		proposeMove: { description: "consensus/tools/proposeMove", params: Type.Object({ cell: Type.Integer(), reason: Type.String() }), for: ["resident"] },
		castVote: { description: "consensus/tools/castVote", params: Type.Object({ agree: Type.Boolean(), reason: Type.String() }), for: ["resident"] },
	},
});
