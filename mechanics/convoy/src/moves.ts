// SPDX-License-Identifier: Apache-2.0
/** The tools of the crew and the vote: why a seat may not act now, a crew proposal, a line of talk, a sealed vote with their replies, and what a fake run samples. */
import type { RandomSource, Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { list, normalize, phaseLine, propose, record, refreshLocks, resolveVote, sizeOf } from "./flow.ts";
import type { ConvoyCtx } from "./head.ts";
import type { ConvoyState, Vote } from "./model.ts";

type Ctx = ConvoyCtx;

const VOTE = "voteConfidence";
const NO_SEAT = (): Refusal => refuse("NOT_A_SEAT", "You have no seat at this table.");

/**
 * Why `crew` is not a valid crew for the stage.
 *
 * @param ctx - The context of the mechanic.
 * @param crew - The seats as the lead wrote them.
 * @returns The refusal, or undefined when the crew is valid.
 *
 * @public
 */
export function crewProblem(ctx: Ctx, crew: readonly string[]): Refusal | undefined {
	const size = sizeOf(ctx, ctx.state.stage);
	const ids = crew.map(normalize);
	const unknown = ids.filter((id) => !ctx.state.seats.includes(id));
	if (unknown.length > 0) return refuse("NOT_A_SEAT", `${unknown.join(", ")} is not a seat. The seats: ${list(ctx.state.seats)}.`);
	if (new Set(ids).size !== ids.length) return refuse("CREW_REPEATS", "A seat can be on the crew only once.");
	if (ids.length !== size) return refuse("CREW_SIZE", `Stage ${String(ctx.state.stage)} needs a crew of exactly ${String(size)} seats; you named ${String(ids.length)}.`);
	return undefined;
}

/**
 * Why `resident` may not make the move of `phase` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param phase - The phase the move belongs to.
 * @param what - The verb of the move, for the refusal text.
 * @returns The refusal, or undefined when the move is the caller's to make.
 *
 * @public
 */
export function phaseProblem(ctx: Ctx, resident: string | undefined, phase: ConvoyState["phase"], what: string): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (resident === undefined || !state.seats.includes(resident)) return NO_SEAT();
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (state.phase !== phase) return refuse("WRONG_PHASE", `There is nothing to ${what} now: ${phaseLine(ctx)}`);
	if (phase !== "talk" && !state.owing.includes(resident)) return refuse("NOT_YOURS", `You have nothing to ${what} now: ${phaseLine(ctx)} End your turn.`);
	return undefined;
}

/**
 * The tool `proposeCrew`: the lead names the crew of the stage.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param crew - The seats of the crew.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function proposeNow(ctx: Ctx, resident: string | undefined, crew: readonly string[]): ToolSuccess | Refusal {
	const refusal = phaseProblem(ctx, resident, "propose", "propose") ?? crewProblem(ctx, crew);
	if (refusal !== undefined) return refusal;
	propose(ctx, crew, false, ctx.tick);
	return reply(`You proposed ${list(ctx.state.crew)}. ${ctx.state.phase === "talk" ? "The table talks now, then votes; end your turn now." : "It goes out without a vote; end your turn now unless you are on the crew and asked to play."}`);
}

/**
 * The tool `speak`: one line to the whole table during the talk.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param text - The line; cut at the longest length a line may have.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function speakNow(ctx: Ctx, resident: string | undefined, text: string): ToolSuccess | Refusal {
	const refusal = phaseProblem(ctx, resident, "talk", "talk about");
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	const state = ctx.state;
	if ((state.spoken[resident] ?? 0) >= ctx.options.talkPosts) return refuse("TALK_CAP", `You have spoken ${String(ctx.options.talkPosts)} times this stage; end your turn.`);
	const line = text.trim().slice(0, ctx.options.maxTalkLength);
	state.spoken[resident] = (state.spoken[resident] ?? 0) + 1;
	state.talk.push({ stage: state.stage, from: resident, text: line });
	record(ctx, `${resident} says: "${line}"`);
	// The speaker has seen its own line.
	state.seenLog[resident] = state.log.length;
	ctx.emit("convoy_spoken", { game: state.game, stage: state.stage, from: resident, text: line });
	refreshLocks(ctx);
	const left = ctx.options.talkPosts - (state.spoken[resident] ?? 0);
	return reply(`Said. ${left > 0 ? `You may speak ${String(left)} more time${left === 1 ? "" : "s"} this stage.` : "That was your last line this stage."} End your turn now; you will see the replies at your next turn.`);
}

/**
 * Why `resident` may not vote now: a vote is taken in the vote, and already during the talk, once.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @returns The refusal, or undefined when the vote is the caller's to cast.
 *
 * @public
 */
export function voteProblem(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.running && state.phase === "talk" && resident !== undefined && state.seats.includes(resident)) return state.votes[resident] === undefined ? undefined : refuse("ALREADY_VOTED", "You have voted on this crew already; end your turn.");
	return phaseProblem(ctx, resident, "vote", "vote on");
}

/**
 * The tool `voteConfidence`: a sealed vote on the lead's crew; the votes are shown once all are in.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param vote - The vote.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function voteNow(ctx: Ctx, resident: string | undefined, vote: Vote): ToolSuccess | Refusal {
	const refusal = voteProblem(ctx, resident);
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	const state = ctx.state;
	state.votes[resident] = vote;
	if (state.phase === "talk") {
		ctx.access.lock(resident, VOTE);
		return reply(`You voted ${vote} (sealed). You may still speak while the talk is open; the votes are shown once all are in. End your turn now.`);
	}
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.access.lock(resident, VOTE);
	if (state.owing.length === 0) resolveVote(ctx, ctx.tick, []);
	return reply(`You voted ${vote}. The votes are shown once all are in; end your turn now.`);
}

/**
 * The `sample` of `proposeCrew` for the fake driver (`--fake`): a random crew of the stage's size.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The crew, or undefined when the resident owes no proposal.
 *
 * @public
 */
export function sampleCrew(ctx: Ctx, resident: string | undefined, random: RandomSource): { crew: string[] } | undefined {
	if (phaseProblem(ctx, resident, "propose", "propose") !== undefined) return undefined;
	return { crew: random.shuffle(ctx.state.seats).slice(0, sizeOf(ctx, ctx.state.stage)) };
}

/**
 * The `sample` of `speak` for the fake driver: a line about the crew, half of the times a seat may speak.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The line, or undefined when the resident may not speak or stays silent.
 *
 * @public
 */
export function sampleLine(ctx: Ctx, resident: string | undefined, random: RandomSource): { text: string } | undefined {
	if (resident === undefined || phaseProblem(ctx, resident, "talk", "talk about") !== undefined) return undefined;
	if ((ctx.state.spoken[resident] ?? 0) >= ctx.options.talkPosts || random.int(1, 2) === 1) return undefined;
	return { text: `${resident}: ${random.pick(["I trust", "I doubt"])} the crew ${list(ctx.state.crew)}.` };
}

/**
 * The `sample` of `voteConfidence` for the fake driver: yes two times of three.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The vote, or undefined when the resident has no vote to cast.
 *
 * @public
 */
export function sampleVote(ctx: Ctx, resident: string | undefined, random: RandomSource): { vote: Vote } | undefined {
	if (voteProblem(ctx, resident) !== undefined) return undefined;
	return { vote: random.int(1, 3) === 3 ? "no" : "yes" };
}
