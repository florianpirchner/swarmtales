// SPDX-License-Identifier: LicenseRef-SUL-1.0
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
 * - the move timer: a round is a whole tick in which the team was on move from the start and
 *   nothing was played. After `maxRounds` rounds `onDeadlock: "forfeitRandomLegalMove"` plays a
 *   random legal value through `ConsensusSourceService.playForfeit` (the draw comes from the seeded
 *   `ctx.rng`, so it is the same in every replay) and records `consensus_forfeited`; with
 *   `"refuse"` nothing is played, `consensus_deadlocked` is written once and the gate stays shut.
 *
 * - `maxConsecutiveForfeits` (0 = off): that many forfeits in a row, with no agreed move between them,
 *   write `match_invalid{reason, forfeits}` and ask the source to end the match as invalid
 *   (`ConsensusSourceService.invalidate`), so a match nobody played is not mistaken for a result.
 *
 * It knows no game: the team on move, the captain and the legal values come from the game's
 * `ConsensusSourceService` provider. Residents of the waiting team and non-members are refused.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ConsensusSourceService } from "@swarmtales/mechanic-contracts";
import { defineMechanic, refuse, reply, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { ConsensusAgreedService, ConsensusService } from "./contract.ts";
import { freshTeam, head, type TeamState, type Vote } from "./head.ts";

export { ConsensusAgreedService, ConsensusService, ConsensusSourceService };

type Ctx = CtxOf<typeof head>;
type ToolCtx = ToolCtxOf<typeof head>;
/** The share of the votes of the fake driver (`--fake`) that agree: two voters agree in more than half of the proposals. */
const FAKE_AGREE = 0.75;

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

// Common checks of both tools: a member of the team on move; the captain or not as asked.
function refusal(ctx: Ctx, resident: string | undefined, asCaptain: boolean): { team: string; captain: string } | ReturnType<typeof refuse> {
	const team = teamOf(ctx, resident);
	if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
	if (ctx.call(ConsensusSourceService, "team", {}) !== team) return refuse("NOT_ON_MOVE", "your team is not on move");
	const captain = ctx.call(ConsensusSourceService, "captain", {});
	if (asCaptain && resident !== captain) return refuse("NOT_CAPTAIN", "only the captain proposes");
	if (!asCaptain && resident === captain) return refuse("CAPTAIN_CANNOT_VOTE", "the captain proposes, the others vote");
	return { team, captain };
}

function isRefusal(value: { team: string; captain: string } | ReturnType<typeof refuse>): value is ReturnType<typeof refuse> {
	return "ok" in value;
}

// Why the caller may not vote now, or undefined: the check of `castVote`, and what its `sample` asks.
function voteProblem(ctx: ToolCtx): ReturnType<typeof refuse> | undefined {
	const who = refusal(ctx, ctx.resident, false);
	if (isRefusal(who)) return who;
	const state = ctx.state.teams.get(who.team);
	if (state?.proposal === undefined || state.won !== undefined) return refuse("NO_OPEN_PROPOSAL", "there is nothing to vote on");
	if (state.votes.has(ctx.resident ?? "")) return refuse("ALREADY_VOTED", "you have voted on this proposal");
	return undefined;
}

// Whether the caller is the captain of the team on move and its team has no open proposal and no agreement: when the fake driver proposes.
function mayPropose(ctx: ToolCtx): boolean {
	const who = refusal(ctx, ctx.resident, true);
	const state = isRefusal(who) ? undefined : ctx.state.teams.get(who.team);
	return state !== undefined && state.proposal === undefined && state.won === undefined;
}

function paramOf(params: unknown, name: string): unknown {
	if (typeof params !== "object" || params === null) return undefined;
	return Object.entries(params).find(([key]) => key === name)?.[1];
}

// Whether the value a call names is the one the team agreed on; a value that is no number and no string never is.
function isAgreed(called: unknown, won: number): boolean {
	return (typeof called === "number" || typeof called === "string") && Number(called) === won;
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

// The lines of the captain of the team on move: go ahead with the agreed value, or the rejection of the last proposal.
function captainLines(ctx: Ctx, state: TeamState): string[] {
	if (state.won !== undefined) return [ctx.prompt("consensus/go-ahead", { cell: state.won })];
	if (state.rejected !== undefined) return [ctx.prompt("consensus/rejected-notice", { cell: state.rejected })];
	return [];
}

// The deadlock rule of a team whose rounds are used up: shut the gate for good, or play a seeded random legal value as a forfeit.
function deadlock(ctx: Ctx, team: string, state: TeamState): void {
	if (ctx.options.onDeadlock === "refuse") {
		state.deadlocked = true;
		ctx.emit("consensus_deadlocked", { team, rounds: state.rounds });
		return;
	}
	const cells = ctx.call(ConsensusSourceService, "legalCells", {});
	if (cells.length === 0) return;
	const cell = ctx.rng("consensus", "forfeit", team, ctx.tick, state.forfeits).pick(cells);
	if (!ctx.call(ConsensusSourceService, "playForfeit", { cell })) return;
	const rounds = state.rounds;
	const forfeits = state.forfeits + 1;
	clear(state);
	state.forfeits = forfeits;
	ctx.state.moved = ctx.tick;
	ctx.emit("consensus_forfeited", { team, cell, rounds });
	ctx.state.streak += 1;
	const limit = ctx.options.maxConsecutiveForfeits;
	if (limit > 0 && ctx.state.streak >= limit) {
		const reason = `${String(ctx.state.streak)} forfeits in a row and no agreed move: the teams did not play`;
		if (ctx.call(ConsensusSourceService, "invalidate", { reason })) ctx.emit("match_invalid", { reason, forfeits: ctx.state.streak });
	}
}

/**
 * The `consensus` mechanic: a team must agree by vote before its captain may call the gated tool. Calling it gives
 * the use for a game's `mechanics` list; the game also lists a mechanic that provides `ConsensusSourceService`.
 *
 * @example
 * ```ts
 * consensus({ teams: { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] }, maxRounds: 3 })
 * ```
 *
 * @public
 */
export const consensus = defineMechanic(head, {
	services: {
		consensus: {
			reset: (_input, ctx) => {
				for (const [team, state] of ctx.state.teams) {
					ctx.state.teams.set(team, freshTeam(state.forfeits));
				}
				return null;
			},
		},
		"consensus-agreed": { agreed: ({ team }, ctx) => ctx.state.teams.get(team)?.won ?? null },
	},
	tools: {
		proposeMove: {
			check: (params, ctx) => {
				const who = refusal(ctx, ctx.resident, true);
				if (isRefusal(who)) return who;
				if ((ctx.state.teams.get(who.team)?.won) !== undefined) return refuse("ALREADY_AGREED", "the team has agreed; play the agreed move");
				if (!ctx.call(ConsensusSourceService, "legalCells", {}).includes(params.cell)) return refuse("ILLEGAL_CELL", "that move is not legal");
				return undefined;
			},
			// A random legal value, once per vote: the captain waits while its proposal is open and plays once it won.
			sample: (ctx, random) => {
				const cells = mayPropose(ctx) ? ctx.call(ConsensusSourceService, "legalCells", {}) : [];
				return cells.length === 0 ? undefined : { cell: random.pick(cells), reason: "A legal move." };
			},
			run: (params, ctx) => {
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
		},
		castVote: {
			check: (_params, ctx) => voteProblem(ctx),
			// One vote per voter and proposal, most of them in favour.
			sample: (ctx, random) => (voteProblem(ctx) !== undefined ? undefined : random.next() < FAKE_AGREE ? { agree: true, reason: "Agreed." } : { agree: false, reason: "Another move." }),
			run: (params, ctx) => {
				const team = teamOf(ctx, ctx.resident);
				const state = team === undefined ? undefined : ctx.state.teams.get(team);
				const voter = ctx.resident;
				if (team === undefined || state?.proposal === undefined || voter === undefined) return refuse("NO_OPEN_PROPOSAL", "there is nothing to vote on");
				const cell = state.proposal.cell;
				state.votes.set(voter, { agree: params.agree, reason: params.reason });
				const { agree, disagree } = tally(state.votes);
				const outcome = decide(votersOf(ctx, team, ctx.call(ConsensusSourceService, "captain", {})).length, agree, disagree);
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
		},
	},
	pipeline: {
		rule: (call, ctx) => {
			if (call.tool !== ctx.options.tool || call.resident === undefined) return undefined;
			const team = teamOf(ctx, call.resident);
			if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
			if (ctx.call(ConsensusSourceService, "team", {}) !== team) return refuse("NOT_ON_MOVE", "your team is not on move");
			if (ctx.call(ConsensusSourceService, "captain", {}) !== call.resident) return refuse("NOT_CAPTAIN", "only the captain plays the agreed move");
			const won = ctx.state.teams.get(team)?.won;
			if (won === undefined) return refuse("NO_CONSENSUS", "the team has not agreed on a move");
			return isAgreed(paramOf(call.params, ctx.options.param), won) ? undefined : refuse("CONSENSUS_MISMATCH", "play the move the team agreed on");
		},
		after: (call, outcome, ctx) => {
			if (call.tool !== ctx.options.tool || !outcome.ok) return;
			const team = teamOf(ctx, call.resident);
			const state = team === undefined ? undefined : ctx.state.teams.get(team);
			if (state === undefined) return;
			clear(state);
			ctx.state.moved = ctx.tick;
		},
	},
	hooks: {
		turnInputs: (resident, ctx) => {
			const team = teamOf(ctx, resident);
			const state = team === undefined ? undefined : ctx.state.teams.get(team);
			if (team === undefined || state === undefined || ctx.call(ConsensusSourceService, "team", {}) !== team) return [];
			const captain = ctx.call(ConsensusSourceService, "captain", {});
			if (resident === captain) return captainLines(ctx, state);
			if (state.proposal === undefined || state.won !== undefined || state.votes.has(resident)) return [];
			return [ctx.prompt("consensus/vote-request", { captain, cell: state.proposal.cell, reason: state.proposal.reason })];
		},
		tickStarted: (ctx) => {
			// A round is a whole tick: only a team on move at the tick's start has it counted (a team that went on move mid-tick starts counting next tick).
			const onMove = ctx.call(ConsensusSourceService, "team", {});
			for (const [team, state] of ctx.state.teams) {
				if (team !== onMove) state.since = undefined;
				else state.since ??= ctx.tick;
			}
		},
		tickEnded: (ctx) => {
			const team = ctx.call(ConsensusSourceService, "team", {});
			const state = ctx.state.teams.get(team);
			// Only a whole tick counts: the team was on move at the tick's start (`since`) and nothing was played in it.
			if (state === undefined || state.deadlocked || state.since === undefined || state.since > ctx.tick || ctx.state.moved === ctx.tick) return;
			state.rounds += 1;
			if (state.rounds < ctx.options.maxRounds) return;
			deadlock(ctx, team, state);
		},
	},
	facts: {
		forfeits: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => Object.fromEntries([...view.state.teams].map(([team, state]) => [team, state.forfeits])) },
		agreed: { output: Type.Record(Type.String(), Type.Union([Type.Null(), Type.Integer()])), compute: (view) => Object.fromEntries([...view.state.teams].map(([team, state]) => [team, state.won ?? null])) },
	},
});
