// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Confessor (the old classifier), ported from old `packages/roles/src/overseer/classifier.ts`: a Director that
 * labels what the residents said in a round (promise, threat, lie, ...), for the gamemaker.
 *
 * - **When.** After every round, on the run frame's `arena.round_end`, as the gamemaker (erratum J125); a game
 *   names it before the gamemaker, so the gamemaker's look follows its labels in the same slot (old `OVERSEER_ORDER`).
 *   The round's statements are quiet firings of the events of `STATEMENT_EVENTS` (decision A74), taken along.
 * - **Question.** The old prompt: the round, the residents with their names, the earlier messages of the round's
 *   conversations (the fact `interpretations.history`) and the statements, each with its reference. One question
 *   per round: the old batches of at most 60 statements were one call each, and a Director asks once per look.
 * - **Act.** The answer goes to the tool `interpret` of the mechanic `interpretations`, which drops what is unknown
 *   and writes the old events. **Fail open:** without an answer the round is written as an `interpretation_error`
 *   and stays unlabelled; its statements are remembered all the same.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { defineDirector, type DirectorContext, type DirectorDefinition } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { fillTemplate, GAMEMAKER_PROMPT_OWNER } from "../gamemaker/texts.ts";
import { HistoryFact, LABELS, ResidentsFact } from "./interpretations.ts";
import { conversationKey, STATEMENT_EVENTS, statementOf, type Statement, type StatementEvent } from "./statements.ts";

const Templates = Type.Object(
	{
		input: Type.String({ description: "`classifier/input`, with `{{batch}}` and `{{standingOrders}}`" }),
		round: Type.String({ description: "`classifier/round`, with `{{round}}`, `{{minute}}` and `{{residents}}`" }),
		named: Type.String({ description: "`classifier/resident-named`, with `{{agent}}` and `{{name}}`" }),
		context: Type.String({ description: "`classifier/context-heading`" }),
		statements: Type.String({ description: "`classifier/statements-heading`" }),
		dm: Type.String({ description: "`classifier/where-dm`, with `{{to}}`" }),
		board: Type.String({ description: "`classifier/where-board`" }),
		group: Type.String({ description: "`classifier/where-group`, with `{{group}}`" }),
	},
	{ additionalProperties: false, description: "The templates of the question, rendered from the carried prompt files" },
);

/**
 * The options of a use of the Confessor.
 *
 * @public
 */
export const ConfessorOptionsSchema = Type.Object(
	{
		label: Type.String({ default: "", description: "The Confessor's model as written into every interpretation, e.g. anthropic/claude-haiku-5-5" }),
		maxChars: Type.Integer({ default: 1500, minimum: 20, description: "Characters of one statement shown to the model" }),
		system: Type.String({ minLength: 1, description: "The system text (`classifier/system-plain`)" }),
		texts: Templates,
	},
	{ additionalProperties: false, description: "The options of the Confessor" },
);

/**
 * The options of a use of the Confessor, parsed.
 *
 * @public
 */
export type ConfessorOptions = Static<typeof ConfessorOptionsSchema>;

/**
 * The Confessor's answer (the old arguments of its tool `label`, whose description it carries).
 *
 * @public
 */
export const ConfessorAnswerSchema = Type.Object(
	{
		items: Type.Array(
			Type.Object(
				{
					ref: Type.Integer({ description: "Reference number of the statement, e.g. 12 for #12" }),
					labels: Type.Array(Type.String({ description: LABELS.join(", ") }), { description: "The labels" }),
					targets: Type.Optional(Type.Array(Type.String({ description: "Resident ID, e.g. A03" }), { description: "The targets" })),
				},
				{ description: "A labelled statement" },
			),
			{ description: "Every statement with at least one label" },
		),
	},
	{ description: "Record the labels of every statement that has at least one." },
);

type Answer = Static<typeof ConfessorAnswerSchema>;

// The fallback when the model gives no answer: only `act` knows this object, so it writes the round as failed.
const NO_ANSWER: Answer = Object.freeze({ items: [] });

/**
 * The dials of a game's Confessor.
 *
 * @public
 */
export interface ConfessorDials {
	/** The model's name as written into every interpretation; empty when left out. */
	readonly label?: string;
	/** Characters of one statement shown to the model; 1500 when left out. */
	readonly maxChars?: number;
}

/**
 * The options of a game's Confessor: the system text and the templates of the question from the carried prompt
 * files under `prompts/classifier/` (owner `city-directors`, the old ids), read through the game's lookup.
 *
 * @param prompts - The game's prompt lookup.
 * @param dials - The model's label and the characters shown of one statement; the old defaults when left out.
 * @returns The options, to put into the game's `directors[].options`.
 * @throws Whatever the lookup throws: a missing prompt file, or variables that differ from the file's.
 *
 * @public
 */
export function confessorOptions(prompts: PromptLookup, dials: ConfessorDials = {}): ConfessorOptions {
	const render = (id: string, ...names: readonly string[]): string => prompts.render(GAMEMAKER_PROMPT_OWNER, `classifier/${id}`, Object.fromEntries(names.map((name) => [name, `{{${name}}}`])), names);
	const texts = { input: render("input", "batch", "standingOrders"), round: render("round", "round", "minute", "residents"), named: render("resident-named", "agent", "name"), context: render("context-heading"), statements: render("statements-heading"), dm: render("where-dm", "to"), board: render("where-board"), group: render("where-group", "group") };
	return { label: dials.label ?? "", maxChars: dials.maxChars ?? 1500, system: render("system-plain"), texts };
}

const RoundEnd = Type.Object({ round: Type.Integer({ description: "The old round: the tick plus one" }) }, { description: "The part of `arena.round_end` the Confessor reads" });

// The round the statements belong to: the run frame's, or the one being played.
function roundOf(ctx: DirectorContext<ConfessorOptions>): number {
	const payload = ctx.firings.findLast((firing) => firing.event === "arena.round_end")?.payload;
	return Check(RoundEnd, payload) ? payload.round : ctx.tick + 1;
}

// The residents of the facts, and the statements of the firings.
function seen(ctx: DirectorContext<ConfessorOptions>) {
	const residents = Check(ResidentsFact, ctx.facts["interpretations.residents"]) ? ctx.facts["interpretations.residents"] : [];
	const history = Check(HistoryFact, ctx.facts["interpretations.history"]) ? ctx.facts["interpretations.history"] : [];
	const ids = new Set(residents.map((resident) => resident.id));
	const statements = ctx.firings.flatMap((firing) => statementOf(firing, (id) => ids.has(id)) ?? []);
	return { residents, history, statements };
}

function cut(text: string, maxChars: number): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 3)}...`;
}

// One line of the question (old `line`).
function line(statement: Statement, { texts, maxChars }: ConfessorOptions): string {
	const where = statement.source === "board" ? texts.board : statement.source === "group" ? fillTemplate(texts.group, { group: statement.group ?? "?" }) : fillTemplate(texts.dm, { to: statement.to.join(", ") });
	return `#${String(statement.ref)} ${statement.agent} ${where}: ${JSON.stringify(cut(statement.text, maxChars))}`;
}

// The question of the round (old `calls`, one batch): the round, the context of earlier rounds, the statements.
function input(ctx: DirectorContext<ConfessorOptions>): string {
	const { options } = ctx;
	const { texts } = options;
	const { residents, history, statements } = seen(ctx);
	const keys = new Set(statements.flatMap((statement) => conversationKey(statement) ?? []));
	const context = history.flatMap((entry) => (keys.has(entry.conversation) ? entry.statements : [])).sort((a, b) => a.ref - b.ref);
	const round = roundOf(ctx);
	const shown = residents.map((resident) => (resident.name === null ? resident.id : fillTemplate(texts.named, { agent: resident.id, name: resident.name }))).join(", ");
	const batch = [
		fillTemplate(texts.round, { round, minute: round - 1, residents: shown }),
		"",
		...(context.length === 0 ? [] : [texts.context, ...context.map((statement) => line(statement, options)), ""]),
		texts.statements,
		...statements.map((statement) => line(statement, options)),
	].join("\n");
	return fillTemplate(texts.input, { batch, standingOrders: "" });
}

/**
 * What a Confessor is defined with.
 *
 * @public
 */
export interface ConfessorSight {
	/** The events it reads statements from: those of the game's loaded mechanics. Every event of `STATEMENT_EVENTS` when left out. */
	readonly statements?: readonly StatementEvent[];
}

/**
 * Defines a Confessor for a game: the events its statements come from.
 *
 * @param sight - The events it reads.
 * @returns The Director `confessor`, to name in the game's `directors[].use` before the gamemaker, with the options
 * of `confessorOptions`; the game loads `arena` and `interpretations` and grants `interpret` to it.
 *
 * @public
 */
export function defineConfessor(sight: ConfessorSight = {}): DirectorDefinition {
	return defineDirector(
		{
			id: "confessor",
			summary: "Labels what residents say each round (promise, threat, lie, ...), for the gamemaker.",
			options: ConfessorOptionsSchema,
			on: [{ event: "arena.round_end" }, ...(sight.statements ?? STATEMENT_EVENTS).map((event) => ({ event, quiet: true }))],
			facts: ["interpretations.residents", "interpretations.history"],
			output: ConfessorAnswerSchema,
		},
		{
			system: (ctx) => ctx.options.system,
			input,
			act: async (answer, ctx) => {
				const failed = answer === NO_ANSWER ? { error: "the classifier gave no answer" } : {};
				await ctx.call("interpret", { round: roundOf(ctx), classifier: ctx.options.label, statements: seen(ctx).statements, items: answer.items, ...failed });
			},
			fallback: () => NO_ANSWER,
		},
	);
}

/**
 * The Confessor reading every event of `STATEMENT_EVENTS`.
 *
 * @example
 * ```ts
 * defineGame({ ..., mechanics: [..., interpretations()], directors: [{ use: confessor, options: confessorOptions(prompts) }, { use: gamemaker, options }], grants: { confessor: ["interpret"] } });
 * ```
 *
 * @public
 */
export const confessor = defineConfessor();
