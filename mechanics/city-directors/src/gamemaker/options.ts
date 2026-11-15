// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The options of the gamemaker, carried from old `packages/roles/src/overseer/gamemaker.ts`
 * (`GamemakerOverseerSchema`, `gamemakerOptions`): the direction, the note budget, the system text composed from
 * the game and the direction, and the cast's figures for the report. The old `every` is the Director's trigger
 * (`defineGamemaker`). The old option `system` fell back to `gamemaker/system/default`; a Director reads no file, so
 * a game always composes the text with {@link gamemakerOptions}, which also renders the template of the budget line.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { Type, type Static } from "typebox";
import { FigureSchema, type Figure } from "./report/characters.ts";
import type { GamemakerNote } from "./report/situation.ts";
import type { DirectionLevel, GamemakerPromptInput } from "./spec.ts";
import { gamemakerSystemPrompt } from "./system-prompt.ts";
import { fillTemplate, gamemakerTexts } from "./texts.ts";

const Direction = Type.Union(
	[Type.Literal(0, { description: "No direction" }), Type.Literal(4, { description: "The default" }), Type.Literal(6, { description: "Direction 6" }), Type.Literal(8, { description: "Direction 8" }), Type.Literal(10, { description: "Full direction" })],
	{ default: 4, description: "The gamemaker's direction level: from 8 its report shows the figures' tendencies and rivals, at 10 their orders and duty." },
);

/**
 * The options of a use of the gamemaker.
 *
 * @public
 */
export const GamemakerOptionsSchema = Type.Object(
	{
		direction: Direction,
		notesPerAgent: Type.Integer({ minimum: 0, default: 1, description: "Notes per resident within `windowMinutes`, for the budget line (the note desk enforces it)." }),
		boardPosts: Type.Integer({ minimum: 0, default: 1, description: "Board posts within `windowMinutes`, for the budget line." }),
		windowMinutes: Type.Integer({ minimum: 1, default: 3, description: "The sliding window of the note budget, in ticks." }),
		system: Type.String({ minLength: 1, description: "The system text, composed from the game and the direction (`gamemakerOptions`)." }),
		budgetLine: Type.String({ minLength: 1, description: "The template of the budget line (`gamemaker/replies/budget-line` with its variables as `{{name}}`)." }),
		figures: Type.Array(FigureSchema, { default: [], description: "The figures of the game's cast with their direction, for the report from direction 8." }),
	},
	{ additionalProperties: false, description: "The options of the gamemaker" },
);

/**
 * The options of a use of the gamemaker, parsed.
 *
 * @public
 */
export type GamemakerOptions = Static<typeof GamemakerOptionsSchema>;

/** The variables of `gamemaker/replies/budget-line`. */
const BUDGET_VARIABLES = ["notes", "posts", "window", "blocked", "board"] as const;

/**
 * The options of a game's gamemaker (old `gamemakerOptions`): the spec's budgets, the direction, the system text
 * composed for that direction, the template of the budget line and the cast's figures.
 *
 * @param input - The game's data and dials; `direction` 4 when left out.
 * @param prompts - The game's prompt lookup, which finds this package's prompt files.
 * @param figures - The figures of the game's cast with their direction; none when left out.
 * @returns The options, to put into the game's `directors[].options`.
 * @throws Whatever the lookup throws: a missing prompt file, or variables that differ from the file's.
 * @example
 * ```ts
 * const options = gamemakerOptions({ city: "ECHO", agents: 6, survivors: 2, rules, spec, holdout, whisperer: true }, createPromptLookup());
 * defineGame({ ..., directors: [{ use: gamemaker, options }] });
 * ```
 *
 * @public
 */
export function gamemakerOptions(input: GamemakerPromptInput, prompts: PromptLookup, figures: readonly Figure[] = []): GamemakerOptions {
	const texts = gamemakerTexts(prompts);
	const direction: DirectionLevel = input.direction ?? 4;
	const budgetLine = texts.render("gamemaker/replies/budget-line", Object.fromEntries(BUDGET_VARIABLES.map((name) => [name, `{{${name}}}`])));
	const { notesPerAgent, boardPosts, windowMinutes } = input.spec;
	return { direction, notesPerAgent, boardPosts, windowMinutes, system: gamemakerSystemPrompt(input, texts), budgetLine, figures: figures.map((figure) => ({ ...figure })) };
}

/**
 * Notes to `to` within the window that ends at `tick` (old `notesUsed`).
 *
 * @param notes - The gamemaker's notes.
 * @param to - A resident id or `board`.
 * @param tick - The tick of the look.
 * @param window - The window in ticks.
 * @returns The count.
 *
 * @public
 */
export function notesUsed(notes: readonly GamemakerNote[], to: string, tick: number, window: number): number {
	return notes.filter((note) => note.to === to && tick - note.minute < window).length;
}

/**
 * The report's last line (old `budgetLine`): who may get no note now and how many board posts are left.
 *
 * @param options - The gamemaker's options: the budget and the template.
 * @param residents - The residents of the run, in roster order.
 * @param notes - The gamemaker's notes.
 * @param tick - The tick of the look.
 * @returns The line.
 *
 * @public
 */
export function budgetLine(options: GamemakerOptions, residents: readonly string[], notes: readonly GamemakerNote[], tick: number): string {
	const blocked = residents.filter((agent) => notesUsed(notes, agent, tick, options.windowMinutes) >= options.notesPerAgent);
	const board = Math.max(0, options.boardPosts - notesUsed(notes, "board", tick, options.windowMinutes));
	return fillTemplate(options.budgetLine, { notes: options.notesPerAgent, posts: options.boardPosts, window: options.windowMinutes, blocked: blocked.length === 0 ? "nobody" : blocked.join(", "), board });
}
