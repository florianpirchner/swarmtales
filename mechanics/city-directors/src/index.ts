// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Directors: the gamemaker, the Confessor, the judge and the guard of the City and Whispers (decision A58). M5-34
 * brings the gamemaker's head, its input from the facts (the old report of the city) and its system text.
 *
 * @packageDocumentation
 */
export { defineGamemaker, gamemaker, GAMEMAKER_FACTS, type GamemakerFact, type GamemakerSight } from "./gamemaker/director.ts";
export { budgetLine, gamemakerOptions, GamemakerOptionsSchema, notesUsed, type GamemakerOptions } from "./gamemaker/options.ts";
export { FigureSchema, type Figure } from "./gamemaker/report/characters.ts";
export { gamemakerSituation, type GamemakerNote, type LookParts } from "./gamemaker/report/situation.ts";
export { type ResidentTrack } from "./gamemaker/report/progression.ts";
export { DIRECTION_LEVELS, type DirectionLevel, type GamemakerActRole, type GamemakerPromptInput, type GamemakerRole, type GamemakerRules, type GamemakerSpec, type HoldoutTiming, type PenaltyLadder } from "./gamemaker/spec.ts";
export { gamemakerSystemPrompt, MAX_NOTE_LENGTH } from "./gamemaker/system-prompt.ts";
export { fillTemplate, GAMEMAKER_PROMPT_OWNER, gamemakerTexts, type GamemakerTexts } from "./gamemaker/texts.ts";
