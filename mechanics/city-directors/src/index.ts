// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Directors: the gamemaker, the Confessor, the judge and the guard of the City and Whispers (decision A58). M5-34
 * brings the gamemaker's head, its input from the facts (the old report of the city) and its system text; M5-36 the
 * Confessor with the mechanic `interpretations`, which writes its labels and remembers its conversations; M5-37 the
 * judge of `blame` and the guard of the review handler of `puzzles`, two answerers of the stage `review`.
 *
 * @packageDocumentation
 */
import { defineMechanic } from "@swarmtales/sdk";
import { interpretationsBody, interpretationsHead } from "./confessor/interpretations.ts";

export { confessor, confessorOptions, ConfessorAnswerSchema, ConfessorOptionsSchema, defineConfessor, type ConfessorDials, type ConfessorOptions, type ConfessorSight } from "./confessor/director.ts";
export { HistoryFact, interpretationsHead, LABELS, ResidentsFact } from "./confessor/interpretations.ts";
export { conversationKey, STATEMENT_EVENTS, statementOf, StatementSchema, type Statement, type StatementEvent } from "./confessor/statements.ts";
export { defineGamemaker, gamemaker, GAMEMAKER_FACTS, type GamemakerFact, type GamemakerSight } from "./gamemaker/director.ts";
export { budgetLine, gamemakerOptions, GamemakerOptionsSchema, notesUsed, type GamemakerOptions } from "./gamemaker/options.ts";
export { FigureSchema, type Figure } from "./gamemaker/report/characters.ts";
export { gamemakerSituation, type GamemakerNote, type LookParts } from "./gamemaker/report/situation.ts";
export { type ResidentTrack } from "./gamemaker/report/progression.ts";
export { DIRECTION_LEVELS, type DirectionLevel, type GamemakerActRole, type GamemakerPromptInput, type GamemakerRole, type GamemakerRules, type GamemakerSpec, type HoldoutTiming, type PenaltyLadder } from "./gamemaker/spec.ts";
export { gamemakerSystemPrompt, MAX_NOTE_LENGTH } from "./gamemaker/system-prompt.ts";
export { fillTemplate, GAMEMAKER_PROMPT_OWNER, gamemakerTexts, type GamemakerTexts } from "./gamemaker/texts.ts";
export { GUARD_VERDICT_TEXT, guard, GuardAnswer, guardOptions, GuardOptionsSchema, guardPrompt, GuardQuestion, type GuardOptions } from "./guard/director.ts";
export { JUDGE_TEMPERS, JUDGE_VERDICT_TEXT, judge, JudgeAnswer, judgeOptions, JudgeOptionsSchema, judgePrompt, type JudgeOptions, type JudgeTemper } from "./judge/director.ts";

/**
 * The mechanic `interpretations`, which a game loads beside the Confessor and whose tool `interpret` it grants to it:
 * the Confessor's labels as the old events, and the conversations it remembers between two looks.
 *
 * @example
 * ```ts
 * defineGame({ ..., mechanics: [..., interpretations()], directors: [{ use: confessor, options: confessorOptions(prompts) }, ...] });
 * ```
 *
 * @public
 */
export const interpretations = defineMechanic(interpretationsHead, interpretationsBody);
