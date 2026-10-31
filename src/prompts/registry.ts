/**
 * Every prompt the code renders, with the variables it takes. The code asks for a prompt by its id
 * (the path under `library/prompts/` without `.md`), so a wrong id or a missing or extra variable
 * is a compile error; `pnpm validate` checks that the files agree with this list.
 */
import { AGENT_PROMPTS } from "./keys/agents.ts";
import { GAMEMAKER_PROMPTS } from "./keys/gamemaker.ts";
import { NOVEL_PROMPTS } from "./keys/novel.ts";

export const PROMPTS = { ...AGENT_PROMPTS, ...GAMEMAKER_PROMPTS, ...NOVEL_PROMPTS } as const;

export type PromptId = keyof typeof PROMPTS;

/** The variables a prompt takes, as an object type. */
export type PromptVariables<I extends PromptId> = Readonly<Record<(typeof PROMPTS)[I][number], string | number>>;

/** The ids of the prompts that take no variables. */
export type PlainPromptId = { [I in PromptId]: (typeof PROMPTS)[I] extends readonly [] ? I : never }[PromptId];
