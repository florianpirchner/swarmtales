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
 * - **What it keeps** (M5-35, decision A74): nothing. The tracks, the notes and the budget line come from the facts of
 *   {@link GAMEMAKER_LOOK_FACTS}; the events since the last look are the firings of its quiet triggers on the events of
 *   {@link GAMEMAKER_EVENTS}, which the look on `round_end` takes along (`look.ts`).
 */
import { defineDirector, type DirectorContext, type DirectorDefinition } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { GAMEMAKER_LOOK_FACTS, lookParts } from "./look.ts";
import { GamemakerOptionsSchema, type GamemakerOptions } from "./options.ts";
import { GAMEMAKER_EVENTS, type GamemakerEvent } from "./recent.ts";
import { gamemakerSituation } from "./report/situation.ts";

/**
 * Every fact of the old report that a game chooses, by key, when their mechanic is loaded (`puzzles.secrets` is the
 * secret guard's); a look always reads {@link GAMEMAKER_LOOK_FACTS} besides.
 *
 * @public
 */
export const GAMEMAKER_FACTS = ["progression.section", "motives.lines", "motives.coreMotives", "goals.texts", "tribunal.section", "whispers.section", "standoff-tribunal.section", "seal.section", "puzzles.needs", "standoff.section", "puzzles.secrets"] as const;

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
	/** The facts of the report it reads: those of the game's loaded mechanics (a fact no mechanic computes fails the look, `SWT-R015`). Every fact of {@link GAMEMAKER_FACTS} when left out; the facts of {@link GAMEMAKER_LOOK_FACTS} are read always. */
	readonly facts?: readonly GamemakerFact[];
	/** The events it shows since its last look, through quiet triggers: those of the game's loaded mechanics (a trigger on an event no mechanic declares fails the game, `SWT-D001`). Every event of {@link GAMEMAKER_EVENTS} when left out. */
	readonly events?: readonly GamemakerEvent[];
	/** Rounds between two looks (the game's `gamemaker.every`); 1 when left out. */
	readonly every?: number;
}

const RoundEnd = Type.Object({ round: Type.Integer({ description: "The old round: the tick plus one" }) }, { description: "The part of `arena.round_end` the gamemaker reads" });

const input = (ctx: DirectorContext<GamemakerOptions>): string => gamemakerSituation(ctx.facts, lookParts(ctx));

/**
 * Defines a gamemaker for a game: its sight and its cadence.
 *
 * @param sight - The facts and events it reads and the rounds between two looks.
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
			on: [{ event: "arena.round_end", where: (payload) => Check(RoundEnd, payload) && payload.round % every === 0 }, ...(sight.events ?? GAMEMAKER_EVENTS).map((event) => ({ event, quiet: true }))],
			facts: [...new Set<string>([...GAMEMAKER_LOOK_FACTS, ...(sight.facts ?? GAMEMAKER_FACTS)])],
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
