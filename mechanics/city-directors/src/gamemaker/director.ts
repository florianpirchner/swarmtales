// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker: a Director that acts by tool use (`acts: "tools"`, REWRITE 3.6's declared exception), ported from
 * old `packages/roles/src/overseer/gamemaker.ts`.
 *
 * - **Trigger.** The old gamemaker looked after every round whose number is a multiple of `every`, and took no look
 *   after the last round or once the run would stop (old `worthALook`). Here the look follows the run frame's
 *   `arena.round_end` (its `round` is the old round): the firing of the last round, or of a round after which the
 *   run stops, has no slot left to act in, so no look follows it, as before.
 * - **Input.** The old report of the city (`gamemakerSituation`), from the facts the head lists: its sight.
 * - **System text.** The game's, composed by `gamemakerOptions` from the game and the direction, the same for
 *   every look.
 * - **Tools.** The open tools of its grant; the checks, budgets and replies are the mechanics'. A look ends when
 *   the model calls no more tools, or at `limits.maxRequests` (2, the old `modelCallsPerTurn`).
 *
 * The tracks, the notes and the events since the last look are issue M5-35's: until then a look reads fresh tracks,
 * no notes and "nothing happened".
 */
import { defineDirector, type DirectorContext, type DirectorDefinition } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { budgetLine, GamemakerOptionsSchema, type GamemakerOptions } from "./options.ts";
import { gamemakerSituation } from "./report/situation.ts";

/**
 * Every fact the old report read, by key: `progression.section` always, the others when their mechanic is loaded.
 *
 * @public
 */
export const GAMEMAKER_FACTS = ["progression.section", "motives.lines", "motives.coreMotives", "goals.texts", "tribunal.section", "whispers.section", "standoff-tribunal.section", "seal.section", "puzzles.needs", "standoff.section"] as const;

/**
 * A fact the gamemaker can read.
 *
 * @public
 */
export type GamemakerFact = (typeof GAMEMAKER_FACTS)[number];

/**
 * What a gamemaker is defined with.
 *
 * @public
 */
export interface GamemakerSight {
	/** The facts it reads: those of the game's loaded mechanics (a fact no mechanic computes fails the look, `SWT-R015`). `progression.section` must be among them. Every fact of {@link GAMEMAKER_FACTS} when left out. */
	readonly facts?: readonly GamemakerFact[];
	/** Rounds between two looks (the game's `gamemaker.every`); 1 when left out. */
	readonly every?: number;
}

const RoundEnd = Type.Object({ round: Type.Integer({ description: "The old round: the tick plus one" }) }, { description: "The part of `arena.round_end` the gamemaker reads" });

// The round the look follows: the last firing's, or the tick when none carries one.
function roundOf(ctx: DirectorContext<GamemakerOptions>): number {
	const payload = ctx.firings.at(-1)?.payload;
	return Check(RoundEnd, payload) ? payload.round : ctx.tick;
}

function input(ctx: DirectorContext<GamemakerOptions>): string {
	const { options } = ctx;
	return gamemakerSituation(ctx.facts, {
		round: roundOf(ctx),
		direction: options.direction,
		cast: options.figures,
		tracks: new Map(),
		recent: [],
		labels: [],
		notes: [],
		budget: budgetLine(options, [], [], ctx.tick),
	});
}

/**
 * Defines a gamemaker for a game: its sight and its cadence.
 *
 * @param sight - The facts it reads and the rounds between two looks.
 * @returns The Director `gamemaker`, to name in the game's `directors[].use` with the options of `gamemakerOptions`.
 *
 * @public
 */
export function defineGamemaker(sight: GamemakerSight = {}): DirectorDefinition {
	const every = sight.every ?? 1;
	return defineDirector(
		{
			id: "gamemaker",
			summary: "Looks at the city after every round (or every few) and may send residents private notes or post on the board through its tools.",
			options: GamemakerOptionsSchema,
			on: [{ event: "arena.round_end", where: (payload) => Check(RoundEnd, payload) && payload.round % every === 0 }],
			facts: sight.facts ?? GAMEMAKER_FACTS,
			output: Type.Object({}, { description: "No answer: the gamemaker acts by its tools." }),
			acts: "tools",
		},
		{ system: (ctx) => ctx.options.system, input, act: () => Promise.resolve() },
	);
}

/**
 * The gamemaker with every fact of the old report, looking after every round.
 *
 * @example
 * ```ts
 * defineGame({ ..., directors: [{ use: gamemaker, options: gamemakerOptions(input, createPromptLookup()) }] });
 * ```
 *
 * @public
 */
export const gamemaker = defineGamemaker();
