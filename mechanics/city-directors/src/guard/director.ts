// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The guard, ported from old `packages/roles/src/interpret/guard.ts`: the answerer `guard` of the `review` handler of
 * `puzzles` on the guarded tools (12-m5-spec.md 4.3, decision A79). The city's own check runs first, in `puzzles`,
 * with the rule's `minRun`; only a text it lets through is asked here. The guard reads the rule, the text and the
 * secrets the author holds, and answers whether the text keeps the rule.
 *
 * - **Question.** The old pieces (`guard/rule`, `guard/wants` with what the tool's text is, the secrets, the message
 *   cut to 2000 characters, `guard/question`).
 * - **Answer.** The old verdict, `{ allowed, reason }`, the reason at most 300 characters. A verdict against the
 *   rule is `GUARD_BLOCKED` with its reason; an answer that fails or does not fit reaches the handler as
 *   `{ ok: false }`, which lets the call through ("fail open"), as before.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { defineDirector, type DirectorContext, type DirectorDefinition } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { fillTemplate, gamemakerTexts } from "../gamemaker/texts.ts";

/** Characters of the text shown to the guard (the old `GUARD_TEXT_CHARS`). */
const TEXT_CHARS = 2_000;

/** Characters of the guard's reason, which the author reads (the old `GUARD_REASON_MAX`). */
const REASON_MAX = 300;

/**
 * The text of the old answer tool `verdict` (`guard/tool-verdict`), the description of the answer's schema.
 *
 * @public
 */
export const GUARD_VERDICT_TEXT = "Record whether the message keeps the city's rule, and why.";

/**
 * The guard's answer: the old verdict tool's parameters, read by `puzzles` as `{ allowed, reason? }`.
 *
 * @public
 */
export const GuardAnswer = Type.Object(
	{
		allowed: Type.Boolean({ description: "true when the message keeps the rule, false when it breaks it" }),
		reason: Type.String({ minLength: 1, maxLength: REASON_MAX, description: "One short sentence for the author; never a secret" }),
	},
	{ description: GUARD_VERDICT_TEXT },
);

/**
 * The question of the `review` handler of `puzzles` (old `GuardQuestion`, its `agent` now `resident`).
 *
 * @public
 */
export const GuardQuestion = Type.Object(
	{
		resident: Type.String({ description: "The author" }),
		tool: Type.String({ description: "The guarded tool, by bare name" }),
		rule: Type.String({ description: "The city's rule" }),
		text: Type.String({ description: "The guarded text of the call" }),
		secrets: Type.Array(Type.Object({ label: Type.String({ description: "What it is" }), value: Type.String({ description: "The secret" }) }, { description: "A secret the author holds" }), { description: "Empty when the rule names no secrets" }),
	},
	{ description: "Does the text keep the city's rule?" },
);

/** The tools whose text the guard is told in words (`guard/tool-<tool>`); any other is `guard/tool-other`. */
const TOOLS = ["postBoard", "postGroup", "sendDM", "transferPoints", "createGroup"] as const;

const Template = (what: string) => Type.String({ minLength: 1, description: `The template of ${what}, its variables as \`{{name}}\`` });

/**
 * The options of a use of the guard: its system text and the templates of its question, composed by
 * {@link guardOptions}.
 *
 * @public
 */
export const GuardOptionsSchema = Type.Object(
	{
		system: Type.String({ minLength: 1, description: "The system text (`guard/system`)." }),
		rule: Template("`guard/rule`"),
		wants: Template("`guard/wants`"),
		secretsHeading: Type.String({ minLength: 1, description: "`guard/secrets-heading`" }),
		secretLine: Template("`guard/secret-line`"),
		message: Template("`guard/message`"),
		question: Type.String({ minLength: 1, description: "`guard/question`" }),
		tools: Type.Record(Type.String(), Type.String(), { description: "What each guarded tool's text is (`guard/tool-<tool>`)" }),
		otherTool: Template("`guard/tool-other`"),
	},
	{ additionalProperties: false, description: "The options of the guard" },
);

/**
 * The options of a use of the guard, parsed.
 *
 * @public
 */
export type GuardOptions = Static<typeof GuardOptionsSchema>;

/**
 * The options of a game's guard: its system text and the templates of its question.
 *
 * @param prompts - The game's prompt lookup, which finds this package's prompt files.
 * @returns The options, to put into the game's `directors[].options`.
 * @throws Whatever the lookup throws: a missing prompt file, or variables that differ from the file's.
 * @example
 * ```ts
 * defineGame({ ..., directors: [{ use: guard, options: guardOptions(createPromptLookup()) }] });
 * ```
 *
 * @public
 */
export function guardOptions(prompts: PromptLookup): GuardOptions {
	const texts = gamemakerTexts(prompts);
	const template = (id: string, names: readonly string[]): string => texts.render(id, Object.fromEntries(names.map((name) => [name, `{{${name}}}`])));
	return {
		system: texts.text("guard/system"),
		rule: template("guard/rule", ["rule"]),
		wants: template("guard/wants", ["agent", "what"]),
		secretsHeading: texts.text("guard/secrets-heading"),
		secretLine: template("guard/secret-line", ["label", "value"]),
		message: template("guard/message", ["text"]),
		question: texts.text("guard/question"),
		tools: Object.fromEntries(TOOLS.map((tool) => [tool, texts.text(`guard/tool-${tool}`)])),
		otherTool: template("guard/tool-other", ["tool"]),
	};
}

/**
 * The guard's question in words (old `guardPrompt`): the rule, who wants to send what, the secrets, the message, the
 * question.
 *
 * @param question - The question of the handler.
 * @param options - The guard's options.
 * @returns The input text.
 *
 * @public
 */
export function guardPrompt(question: Static<typeof GuardQuestion>, options: GuardOptions): string {
	const what = options.tools[question.tool] ?? fillTemplate(options.otherTool, { tool: question.tool });
	const secrets = question.secrets.map((secret) => fillTemplate(options.secretLine, { label: secret.label, value: secret.value }));
	return [
		fillTemplate(options.rule, { rule: question.rule }),
		"",
		fillTemplate(options.wants, { agent: question.resident, what }),
		...(secrets.length === 0 ? [] : ["", options.secretsHeading, ...secrets]),
		"",
		fillTemplate(options.message, { text: JSON.stringify(question.text.slice(0, TEXT_CHARS)) }),
		"",
		options.question,
	].join("\n");
}

// The question of the review; a question of another shape is a mistake of the game, and fails the run.
const input = (ctx: DirectorContext<GuardOptions>): string => guardPrompt(Parse(GuardQuestion, ctx.question), ctx.options);

/**
 * The guard: the answerer `guard` of the `review` handler of `puzzles`. It is woken by nothing else.
 *
 * @example
 * ```ts
 * defineGame({ ..., directors: [{ use: guard, options: guardOptions(createPromptLookup()) }] });
 * ```
 *
 * @public
 */
export const guard: DirectorDefinition = defineDirector(
	{ id: "guard", summary: "Decides whether a resident's guarded text keeps the city's rule.", options: GuardOptionsSchema, on: [], output: GuardAnswer, answers: "guard" },
	{ system: (ctx) => ctx.options.system, input, act: () => Promise.resolve() },
);
