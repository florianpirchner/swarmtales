/**
 * The `consensus` mechanic: a gate for "a team must agree before a tool call is released". The
 * captain proposes a value for the gated tool's parameter (`proposeMove`), the other members vote
 * (`castVote`), and a `rule` pipeline handler refuses the gated tool unless the caller is the
 * captain and the called parameter equals the value that won the vote.
 *
 * Rules (fixed, decided in advance so nobody can bargain about them):
 * - the voters are the team without its captain; the proposal itself is not a vote;
 * - `majority`: the proposal wins with more than half of the voters in favour. A tie (two voters,
 *   one against one) is no consensus: the proposal is rejected and the captain can NOT override it;
 * - a team without voters (only the captain) agrees with itself at once;
 * - the move timer: a round is a whole minute in which the team was on move from the start and
 *   nothing was played. After `maxRounds` rounds `onDeadlock: "forfeitRandomLegalMove"` plays a
 *   random legal value through `ConsensusSourceApi.playForfeit` (the draw comes from the seeded
 *   `ctx.rng`, so it is the same in every replay) and records `consensus_forfeited`; with
 *   `"refuse"` nothing is played, `consensus_deadlocked` is written once and the gate stays shut.
 *
 * - `maxConsecutiveForfeits` (0 = off): that many forfeits in a row, with no agreed move between them,
 *   write `match_invalid{reason, forfeits}` and ask the source to end the match as invalid
 *   (`ConsensusSourceApi.invalidate`), so a match nobody played is not mistaken for a result.
 *
 * It knows no game: the team on move, the captain and the legal values come from the story's
 * `ConsensusSourceApi` provider. Residents of the waiting team and non-members are refused.
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { defineApi, defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ConsensusSourceApi } from "./source.ts";

export { ConsensusSourceApi };

export const ConsensusApi = defineApi({
	name: "consensus",
	summary: "Resets the gate between games.",
	methods: {
		reset: {
			kind: "command",
			summary: "Forgets every proposal, vote, agreement and timer (a new game begins); the forfeit counters stay.",
			input: Type.Object({}),
			output: Type.Null(),
		},
	},
});

interface Vote {
	readonly agree: boolean;
	readonly reason: string;
}

interface TeamState {
	proposal: { readonly cell: number; readonly reason: string } | undefined;
	votes: Map<string, Vote>;
	/** The value that won the vote and has not been played yet. */
	won: number | undefined;
	/** The last proposal that was rejected, until the next one. */
	rejected: number | undefined;
	rounds: number;
	/** The minute from which the team has been on move at a minute's start (a whole minute counts from it); undefined while it is not on move or went on move mid-minute. */
	since: number | undefined;
	forfeits: number;
	deadlocked: boolean;
}

interface GateState {
	readonly teams: Map<string, TeamState>;
	/** The last minute in which something was played through the gate; -1 for none. */
	moved: number;
	/** Forfeits in a row with no agreed move between them (across teams). */
	streak: number;
}

const freshTeam = (forfeits: number): TeamState => ({ proposal: undefined, votes: new Map(), won: undefined, rejected: undefined, rounds: 0, since: undefined, forfeits, deadlocked: false });

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

const head = defineHead({
	id: "consensus",
	summary: "A team must agree before a gated tool call is released.",
	requires: [ConsensusSourceApi],
	provides: [ConsensusApi],
	options,
	state: ({ options: chosen }): GateState => ({ teams: new Map(Object.keys(chosen.teams).map((team) => [team, freshTeam(0)])), moved: -1, streak: 0 }),
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
});

type Ctx = ContextOf<typeof head>;

function teamOf(ctx: Ctx, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return Object.entries(ctx.options.teams).find(([, members]) => members.includes(resident))?.[0];
}

function votersOf(ctx: Ctx, team: string, captain: string): readonly string[] {
	return (ctx.options.teams[team] ?? []).filter((member) => member !== captain);
}

function tally(votes: ReadonlyMap<string, Vote>): { agree: number; disagree: number } {
	const all = [...votes.values()];
	return { agree: all.filter((vote) => vote.agree).length, disagree: all.filter((vote) => !vote.agree).length };
}

function decide(voters: number, agree: number, disagree: number): "pending" | "reached" | "rejected" {
	if (agree * 2 > voters) return "reached";
	// Even if every missing voter agreed, the majority is out of reach (a tie included).
	if ((voters - disagree) * 2 <= voters) return "rejected";
	return "pending";
}

/** Common checks of both tools: a member of the team on move; the captain or not as asked. */
function refusal(ctx: Ctx, resident: string | undefined, asCaptain: boolean): { team: string; captain: string } | ReturnType<typeof refuse> {
	const team = teamOf(ctx, resident);
	if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
	if (ctx.call(ConsensusSourceApi, "team", {}) !== team) return refuse("NOT_ON_MOVE", "your team is not on move");
	const captain = ctx.call(ConsensusSourceApi, "captain", {});
	if (asCaptain && resident !== captain) return refuse("NOT_CAPTAIN", "only the captain proposes");
	if (!asCaptain && resident === captain) return refuse("CAPTAIN_CANNOT_VOTE", "the captain proposes, the others vote");
	return { team, captain };
}

function isRefusal(value: { team: string; captain: string } | ReturnType<typeof refuse>): value is ReturnType<typeof refuse> {
	return "ok" in value;
}

function paramOf(params: unknown, name: string): unknown {
	if (typeof params !== "object" || params === null) return undefined;
	return Object.entries(params).find(([key]) => key === name)?.[1];
}

function clear(state: TeamState): void {
	state.proposal = undefined;
	state.votes = new Map();
	state.won = undefined;
	state.rejected = undefined;
	state.rounds = 0;
	state.since = undefined;
	state.deadlocked = false;
}

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

export const consensus = defineMechanic(head, (kit) => ({
	services: [
		kit.provide(ConsensusApi, {
			reset: (_input, ctx) => {
				for (const [team, state] of ctx.state.teams) {
					ctx.state.teams.set(team, freshTeam(state.forfeits));
				}
				return null;
			},
		}),
	],
	tools: [
		kit.tool({
			name: "proposeMove",
			description: "consensus/tools/proposeMove",
			parameters: Type.Object({ cell: Type.Integer(), reason: Type.String() }),
			suggest: ["resident"],
			rule: (params, ctx) => {
				const who = refusal(ctx, ctx.resident, true);
				if (isRefusal(who)) return who;
				if ((ctx.state.teams.get(who.team)?.won) !== undefined) return refuse("ALREADY_AGREED", "the team has agreed; play the agreed move");
				if (!ctx.call(ConsensusSourceApi, "legalCells", {}).includes(params.cell)) return refuse("ILLEGAL_CELL", "that move is not legal");
				return undefined;
			},
			execute: (params, ctx) => {
				const team = teamOf(ctx, ctx.resident);
				const state = team === undefined ? undefined : ctx.state.teams.get(team);
				if (team === undefined || state === undefined || ctx.resident === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
				state.proposal = { cell: params.cell, reason: params.reason };
				state.votes = new Map();
				state.rejected = undefined;
				ctx.emit("move_proposed", { team, captain: ctx.resident, cell: params.cell, reason: params.reason });
				if (votersOf(ctx, team, ctx.resident).length === 0) {
					state.won = params.cell;
					ctx.state.streak = 0;
					ctx.emit("consensus_reached", { team, cell: params.cell, agree: 0, disagree: 0 });
					return reply(ctx.prompt("consensus/reached", { cell: params.cell }));
				}
				return reply(ctx.prompt("consensus/proposed", { cell: params.cell }));
			},
		}),
		kit.tool({
			name: "castVote",
			description: "consensus/tools/castVote",
			parameters: Type.Object({ agree: Type.Boolean(), reason: Type.String() }),
			suggest: ["resident"],
			rule: (_params, ctx) => {
				const who = refusal(ctx, ctx.resident, false);
				if (isRefusal(who)) return who;
				const state = ctx.state.teams.get(who.team);
				if (state?.proposal === undefined || state.won !== undefined) return refuse("NO_OPEN_PROPOSAL", "there is nothing to vote on");
				if (state.votes.has(ctx.resident ?? "")) return refuse("ALREADY_VOTED", "you have voted on this proposal");
				return undefined;
			},
			execute: (params, ctx) => {
				const team = teamOf(ctx, ctx.resident);
				const state = team === undefined ? undefined : ctx.state.teams.get(team);
				const voter = ctx.resident;
				if (team === undefined || state?.proposal === undefined || voter === undefined) return refuse("NO_OPEN_PROPOSAL", "there is nothing to vote on");
				const cell = state.proposal.cell;
				state.votes.set(voter, { agree: params.agree, reason: params.reason });
				const { agree, disagree } = tally(state.votes);
				const outcome = decide(votersOf(ctx, team, ctx.call(ConsensusSourceApi, "captain", {})).length, agree, disagree);
				ctx.emit("vote_cast", { team, voter, cell, agree: params.agree, reason: params.reason, outcome });
				if (outcome === "reached") {
					state.won = cell;
					ctx.state.streak = 0;
					ctx.emit("consensus_reached", { team, cell, agree, disagree });
					return reply(ctx.prompt("consensus/reached", { cell }));
				}
				if (outcome === "rejected") {
					state.proposal = undefined;
					state.votes = new Map();
					state.rejected = cell;
					return reply(ctx.prompt("consensus/rejected", { cell }));
				}
				return reply(ctx.prompt("consensus/vote-recorded", {}));
			},
		}),
	],
	pipeline: {
		rule: (call, ctx) => {
			if (call.tool !== ctx.options.tool || call.resident === undefined) return undefined;
			const team = teamOf(ctx, call.resident);
			if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
			if (ctx.call(ConsensusSourceApi, "team", {}) !== team) return refuse("NOT_ON_MOVE", "your team is not on move");
			if (ctx.call(ConsensusSourceApi, "captain", {}) !== call.resident) return refuse("NOT_CAPTAIN", "only the captain plays the agreed move");
			const won = ctx.state.teams.get(team)?.won;
			if (won === undefined) return refuse("NO_CONSENSUS", "the team has not agreed on a move");
			const called = paramOf(call.params, ctx.options.param);
			if (typeof called !== "number" && typeof called !== "string") return refuse("CONSENSUS_MISMATCH", "play the move the team agreed on");
			return Number(called) === won ? undefined : refuse("CONSENSUS_MISMATCH", "play the move the team agreed on");
		},
		after: (call, outcome, ctx) => {
			if (call.tool !== ctx.options.tool || !outcome.ok) return;
			const team = teamOf(ctx, call.resident);
			const state = team === undefined ? undefined : ctx.state.teams.get(team);
			if (state === undefined) return;
			clear(state);
			ctx.state.moved = ctx.minute;
		},
	},
	hooks: {
		turnInputs: {
			order: HOOK_ORDER.turnInputs.consensus,
			run: (resident, ctx) => {
				const team = teamOf(ctx, resident);
				const state = team === undefined ? undefined : ctx.state.teams.get(team);
				if (team === undefined || state === undefined || ctx.call(ConsensusSourceApi, "team", {}) !== team) return [];
				const captain = ctx.call(ConsensusSourceApi, "captain", {});
				if (resident === captain) {
					if (state.won !== undefined) return [ctx.prompt("consensus/go-ahead", { cell: state.won })];
					if (state.rejected !== undefined) return [ctx.prompt("consensus/rejected-notice", { cell: state.rejected })];
					return [];
				}
				if (state.proposal === undefined || state.won !== undefined || state.votes.has(resident)) return [];
				return [ctx.prompt("consensus/vote-request", { captain, cell: state.proposal.cell, reason: state.proposal.reason })];
			},
		},
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.consensus,
			run: (ctx) => {
				// A round is a whole minute: only a team on move at the minute's start has it counted (a team that went on move mid-minute starts counting next minute).
				const onMove = ctx.call(ConsensusSourceApi, "team", {});
				for (const [team, state] of ctx.state.teams) {
					if (team !== onMove) state.since = undefined;
					else state.since ??= ctx.minute;
				}
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.consensus,
			run: (ctx) => {
				const team = ctx.call(ConsensusSourceApi, "team", {});
				const state = ctx.state.teams.get(team);
				// Only a whole minute counts: the team was on move at the minute's start (`since`) and nothing was played in it.
				if (state === undefined || state.deadlocked || state.since === undefined || state.since > ctx.minute || ctx.state.moved === ctx.minute) return;
				state.rounds += 1;
				if (state.rounds < ctx.options.maxRounds) return;
				if (ctx.options.onDeadlock === "refuse") {
					state.deadlocked = true;
					ctx.emit("consensus_deadlocked", { team, rounds: state.rounds });
					return;
				}
				const cells = ctx.call(ConsensusSourceApi, "legalCells", {});
				if (cells.length === 0) return;
				const cell = ctx.rng("consensus", "forfeit", team, ctx.minute, state.forfeits).pick(cells);
				if (!ctx.call(ConsensusSourceApi, "playForfeit", { cell })) return;
				const rounds = state.rounds;
				const forfeits = state.forfeits + 1;
				clear(state);
				state.forfeits = forfeits;
				ctx.state.moved = ctx.minute;
				ctx.emit("consensus_forfeited", { team, cell, rounds });
				ctx.state.streak += 1;
				const limit = ctx.options.maxConsecutiveForfeits;
				if (limit > 0 && ctx.state.streak >= limit) {
					const reason = `${String(ctx.state.streak)} forfeits in a row and no agreed move: the teams did not play`;
					if (ctx.call(ConsensusSourceApi, "invalidate", { reason })) ctx.emit("match_invalid", { reason, forfeits: ctx.state.streak });
				}
			},
		},
	},
	facts: {
		forfeits: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries([...view.state.teams].map(([team, state]) => [team, state.forfeits]))),
		agreed: kit.fact(Type.Record(Type.String(), Type.Union([Type.Null(), Type.Integer()])), (view) => Object.fromEntries([...view.state.teams].map(([team, state]) => [team, state.won ?? null]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Saved,
		save: (state) => ({
			moved: state.moved,
			streak: state.streak,
			teams: Object.fromEntries(
				[...state.teams].map(([team, st]) => [
					team,
					{ proposal: st.proposal ?? null, votes: Object.fromEntries(st.votes), won: st.won ?? null, rejected: st.rejected ?? null, rounds: st.rounds, since: st.since ?? null, forfeits: st.forfeits, deadlocked: st.deadlocked },
				]),
			),
		}),
		load: (data) => ({
			moved: data.moved,
			streak: data.streak ?? 0,
			teams: new Map(
				Object.entries(data.teams).map(([team, st]) => [
					team,
					{ proposal: st.proposal ?? undefined, votes: new Map(Object.entries(st.votes)), won: st.won ?? undefined, rejected: st.rejected ?? undefined, rounds: st.rounds, since: st.since ?? undefined, forfeits: st.forfeits, deadlocked: st.deadlocked },
				]),
			),
		}),
	}),
}));
