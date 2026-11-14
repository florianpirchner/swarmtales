// SPDX-License-Identifier: Apache-2.0
/**
 * What the fake driver (`--fake`) plays in Lanterns: the `sample` of each resident tool. A sample gives a call only
 * where the call is legal now, so a fake run holds accepted clues and guesses. The driver calls the first open tool
 * that samples, in grant order: the look at the grid and a second guess give a call only now and then, so that the
 * tools after them get their turn. No sample changes state.
 */
import type { RandomSource } from "@swarmtales/contracts";
import { clueRefusal, guessRefusal, teamOf } from "./flow.ts";
import type { ClueGridToolCtx } from "./head.ts";
import { clueProblem, hiddenOf } from "./model.ts";

type ToolCtx = ClueGridToolCtx;

/** The share of the times the look at the grid is sampled. */
const LOOK_RATE = 0.125;
/** The share of the times the caller guesses on after a hit; otherwise it stops. */
const GO_ON_RATE = 0.5;
/** Clue words of the fake keeper: none is in the word pool, holds a pool word or shares a stem with one. */
const CLUES = ["quixotic", "zephyr", "ubiquity", "jovial", "oblique", "whimsy"];

/**
 * A look at the grid, for a member of a team.
 *
 * @param ctx - The tool's context.
 * @param random - The fake driver's random source.
 * @returns The empty arguments, or undefined most of the time and for a resident outside the teams.
 */
export function sampleView(ctx: ToolCtx, random: RandomSource): Record<string, never> | undefined {
	return teamOf(ctx.state, ctx.resident) === undefined || random.next() >= LOOK_RATE ? undefined : {};
}

/**
 * A legal clue for the keeper on turn: a fixed word, a random number and that many of the team's hidden words.
 *
 * @param ctx - The tool's context.
 * @param random - The fake driver's random source.
 * @returns The arguments of `giveClue`, or undefined for anybody but the keeper on turn.
 */
export function sampleClue(ctx: ToolCtx, random: RandomSource): { word: string; number: number; targets: string[]; reason: string } | undefined {
	const state = ctx.state;
	const words = CLUES.filter((clue) => clueProblem(clue, state.grid) === undefined);
	const own = hiddenOf(state.grid, state.team);
	if (words.length === 0 || own.length === 0) return undefined;
	const number = random.int(1, Math.min(ctx.options.maxNumber, own.length));
	const call = { word: random.pick(words), number, targets: random.shuffle(own).slice(0, number), reason: "fake" };
	return clueRefusal(ctx, ctx.resident, call.word, call.number, call.targets) === undefined ? call : undefined;
}

/**
 * A random hidden word for the caller of the clue being guessed.
 *
 * @param ctx - The tool's context.
 * @param random - The fake driver's random source.
 * @returns The arguments of `guess`; undefined for anybody but the caller, and half of the times after a hit.
 */
export function sampleGuess(ctx: ToolCtx, random: RandomSource): { word: string } | undefined {
	const hidden = ctx.state.grid.filter((card) => !card.revealed);
	if (guessRefusal(ctx, ctx.resident) !== undefined || hidden.length === 0) return undefined;
	if ((ctx.state.clue?.guesses.length ?? 0) > 0 && random.next() >= GO_ON_RATE) return undefined;
	return { word: random.pick(hidden).word };
}

/**
 * A stop for the caller of the clue being guessed, once it has guessed.
 *
 * @param ctx - The tool's context.
 * @returns The empty arguments, or undefined when a stop would be refused.
 */
export function sampleStop(ctx: ToolCtx): Record<string, never> | undefined {
	return guessRefusal(ctx, ctx.resident) === undefined && (ctx.state.clue?.guesses.length ?? 0) > 0 ? {} : undefined;
}
