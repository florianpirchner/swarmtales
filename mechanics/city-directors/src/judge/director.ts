// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The judge of a blame, ported from old `packages/roles/src/overseer/judge.ts` and `judge-runtime.ts`: the answerer
 * `judge` of the review of `blame` (mechanic `receipts`). It decides one yes/no question per blame: does the accused
 * resident's later message deny receiving the DM? The city has checked every fact it can check itself.
 *
 * - **Temper.** The game picks it (`judgeOptions(prompts, temper)`); it fixes the system text, the old
 *   `judge/system-<temper>`.
 * - **Question.** The old pieces (`judge/delivered`, `judge/text`, `judge/later`, `judge/standing`,
 *   `judge/question`), each quote cut to 1000 characters, inside `judge/input` with no standing orders.
 * - **Answer.** The old verdict: the ruling, the words for the board and the word for the gamemaker, each at most
 *   400 characters (the old answer tool's limits). An answer that fails or does not fit reaches `blame` as
 *   `{ ok: false }`, which refuses with `JUDGE_FAILED`, as before.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { JudgeQuestion, JudgeVerdict } from "@swarmtales/mechanic-receipts/contract";
import { defineDirector, type DirectorContext, type DirectorDefinition } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { fillTemplate, gamemakerTexts } from "../gamemaker/texts.ts";

/**
 * The tempers of the judge (the old `--judge-temper`): how it rules and what it says on which channel.
 *
 * @public
 */
export const JUDGE_TEMPERS = ["fair", "partial", "capricious"] as const;

/**
 * A temper of the judge.
 *
 * @public
 */
export type JudgeTemper = (typeof JUDGE_TEMPERS)[number];

/** Characters of each quoted message shown to the judge (the old `JUDGE_QUOTE_CHARS`). */
const QUOTE_CHARS = 1_000;

/** Characters of each of the judge's two channels (the old `JUDGE_WORDS_MAX`). */
const WORDS_MAX = 400;

/**
 * The text of the old answer tool `verdict` (`judge/tool-verdict`), the description of the answer's schema.
 *
 * @public
 */
export const JUDGE_VERDICT_TEXT = "Record your ruling, your words for the board and your word for the gamemaker.";

/**
 * The judge's answer: the old verdict tool's parameters, `JudgeVerdict` of `receipts` with the old limits.
 *
 * @public
 */
export const JudgeAnswer = Type.Object(
	{
		deniesReceipt: JudgeVerdict.properties.deniesReceipt,
		board: Type.Optional(Type.String({ maxLength: WORDS_MAX, description: "Your words for the board, one or two sentences; the city's record quotes them" })),
		gamemaker: Type.Optional(Type.String({ maxLength: WORDS_MAX, description: "Your word for the gamemaker alone, one or two sentences" })),
	},
	{ description: JUDGE_VERDICT_TEXT },
);

const Template = (what: string) => Type.String({ minLength: 1, description: `The template of ${what}, its variables as \`{{name}}\`` });

/**
 * The options of a use of the judge: its system text and the templates of its question, composed by
 * {@link judgeOptions}.
 *
 * @public
 */
export const JudgeOptionsSchema = Type.Object(
	{
		system: Type.String({ minLength: 1, description: "The system text of the game's temper (`judge/system-<temper>`)." }),
		input: Template("`judge/input`"),
		delivered: Template("`judge/delivered`"),
		text: Template("`judge/text`"),
		later: Template("`judge/later`"),
		standing: Template("`judge/standing`"),
		standingEntry: Template("`judge/standing-entry`"),
		question: Template("`judge/question`"),
		channels: Type.Object({ dm: Type.String({ description: "`judge/channel-dm`" }), board: Type.String({ description: "`judge/channel-board`" }), group: Type.String({ description: "`judge/channel-group`" }) }, { description: "Where the later message was written, in words" }),
	},
	{ additionalProperties: false, description: "The options of the judge" },
);

/**
 * The options of a use of the judge, parsed.
 *
 * @public
 */
export type JudgeOptions = Static<typeof JudgeOptionsSchema>;

/** Each template's prompt id and its variables. */
const TEMPLATES = {
	input: ["judge/input", ["question", "standingOrders"]],
	delivered: ["judge/delivered", ["number", "sender", "accused"]],
	text: ["judge/text", ["text"]],
	later: ["judge/later", ["number", "accused", "channel"]],
	standing: ["judge/standing", ["residents", "sender", "accused"]],
	standingEntry: ["judge/standing-entry", ["agent", "points", "rank"]],
	question: ["judge/question", ["sender", "accused", "claim", "dm"]],
} as const;

/**
 * The options of a game's judge: the system text of its temper and the templates of its question.
 *
 * @param prompts - The game's prompt lookup, which finds this package's prompt files.
 * @param temper - The temper; `fair` (the city's default) when left out.
 * @returns The options, to put into the game's `directors[].options`.
 * @throws Whatever the lookup throws: a missing prompt file, or variables that differ from the file's.
 * @example
 * ```ts
 * defineGame({ ..., directors: [{ use: judge, options: judgeOptions(createPromptLookup(), "partial") }] });
 * ```
 *
 * @public
 */
export function judgeOptions(prompts: PromptLookup, temper: JudgeTemper = "fair"): JudgeOptions {
	const texts = gamemakerTexts(prompts);
	const template = ([id, names]: readonly [string, readonly string[]]): string => texts.render(id, Object.fromEntries(names.map((name) => [name, `{{${name}}}`])));
	return {
		system: texts.text(`judge/system-${temper}`),
		input: fillTemplate(template(TEMPLATES.input), { standingOrders: "" }),
		delivered: template(TEMPLATES.delivered),
		text: template(TEMPLATES.text),
		later: template(TEMPLATES.later),
		standing: template(TEMPLATES.standing),
		standingEntry: template(TEMPLATES.standingEntry),
		question: template(TEMPLATES.question),
		channels: { dm: texts.text("judge/channel-dm"), board: texts.text("judge/channel-board"), group: texts.text("judge/channel-group") },
	};
}

/**
 * The judge's question in words (old `judgePrompt`): the delivered DM, the later message, where both stand, the
 * question.
 *
 * @param question - The question of `blame`.
 * @param options - The judge's options.
 * @returns The input text.
 *
 * @public
 */
export function judgePrompt(question: Static<typeof JudgeQuestion>, options: JudgeOptions): string {
	const quote = (value: string): string => JSON.stringify(value.slice(0, QUOTE_CHARS));
	const { sender, accused, dm, claim, standing } = question;
	const where = (agent: string, at: { readonly points: number; readonly rank: number }): string => fillTemplate(options.standingEntry, { agent, points: at.points, rank: at.rank });
	const words = [
		fillTemplate(options.delivered, { number: dm.number, sender, accused }),
		fillTemplate(options.text, { text: quote(dm.text) }),
		"",
		fillTemplate(options.later, { number: claim.number, accused, channel: options.channels[claim.channel] }),
		fillTemplate(options.text, { text: quote(claim.text) }),
		"",
		fillTemplate(options.standing, { residents: standing.residents, sender: where(sender, standing.sender), accused: where(accused, standing.accused) }),
		"",
		fillTemplate(options.question, { sender, accused, claim: claim.number, dm: dm.number }),
	].join("\n");
	return fillTemplate(options.input, { question: words });
}

// The question of the review; a question of another shape is a mistake of the game, and fails the run.
const input = (ctx: DirectorContext<JudgeOptions>): string => judgePrompt(Parse(JudgeQuestion, ctx.question), ctx.options);

/**
 * The judge: the answerer `judge` of the review of `blame`. It is woken by nothing else.
 *
 * @example
 * ```ts
 * defineGame({ ..., directors: [{ use: judge, options: judgeOptions(createPromptLookup()) }] });
 * ```
 *
 * @public
 */
export const judge: DirectorDefinition = defineDirector(
	{ id: "judge", summary: "Decides whether a resident's message denies receiving a DM (blame).", options: JudgeOptionsSchema, on: [], output: JudgeAnswer, answers: "judge" },
	{ system: (ctx) => ctx.options.system, input, act: () => Promise.resolve() },
);
