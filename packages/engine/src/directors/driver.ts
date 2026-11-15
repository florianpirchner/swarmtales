// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The driver of a Director: what one activation of a Director does. It takes the firings the plugin `directors`
 * queued, asks the model once through the port `AskModel`, and hands an answer that fits to the Director's `act`,
 * whose only way into the run is a tool call of the activation. The engine imports no model: the asker is given.
 * Beside it, the answerer port of the stage `review`, which asks the Director that answers a review.
 */
import type { ActorDriver, AskModel, DriverTable, ModelAnswer, RecordSource, ReviewPort } from "@swarmtales/contracts";
import { DIRECTOR_TAKE, parseTake, type DirectorContext, type ResolvedDirector, type ResolvedGame } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

const AskedSchema = Type.Object({ firings: Type.Array(Type.Integer({ minimum: 1, description: "The number `n` of one firing, as the reply of `take` before this record lists it; no place on the log" }), { description: "The firings the question is about, in log order" }) }, { additionalProperties: false, description: "A Director took its firings and asks its model" });

const AnsweredSchema = Type.Object(
	{
		ok: Type.Boolean({ description: "True when the model gave an answer that fits the Director's `output`" }),
		fallback: Type.Boolean({ description: "True when the Director acts on its fallback answer" }),
		costUsd: Type.Number({ minimum: 0, description: "What the question cost, in US dollars; 0 when the asker named no cost" }),
		reason: Type.Optional(Type.Union([Type.Literal("limit"), Type.Literal("invalid"), Type.Literal("error")], { description: "Why there is no answer of the model to act on" })),
		detail: Type.Optional(Type.String({ description: "The reason in words" })),
	},
	{ additionalProperties: false, description: "The model's answer to a Director came in; with `ok` or `fallback` the Director acts next, else it does nothing" },
);

/**
 * The record source of the Director's driver: `asked` before the model is asked, `answered` before the Director
 * acts. Pass it to the `records` of game resolution, else the first record ends the run (`SWT-R017`).
 *
 * @public
 */
export const DIRECTOR_RECORDS: RecordSource = Object.freeze({ id: "@swarmtales/engine/director", events: { asked: AskedSchema, answered: AnsweredSchema } });

/**
 * What the Directors' drivers are made from.
 *
 * @public
 */
export interface DirectorDriverInput {
	/** The resolved game: it holds the Director definitions with the options of their uses. */
	readonly game: ResolvedGame;
	/** The model port: `createAsker` or `scriptedAsker` of the models package, or a function of a test. */
	readonly ask: AskModel;
}

// What the model's answer is worth: the value to act on, when there is one, and the record `answered`.
function settle(director: ResolvedDirector, ctx: DirectorContext<unknown>, answer: ModelAnswer): { readonly value: unknown; readonly record: Static<typeof AnsweredSchema> } {
	if (answer.ok && Check(director.definition.output, answer.value)) return { value: answer.value, record: { ok: true, fallback: false, costUsd: answer.costUsd } };
	const why = answer.ok ? { costUsd: answer.costUsd, reason: "invalid" as const, detail: "the answer does not fit the output of the Director" } : { costUsd: 0, reason: answer.reason, detail: answer.detail };
	const value = director.definition.fallback(ctx);
	return { value, record: { ok: false, fallback: value !== undefined, ...why } };
}

// The driver of one Director; `take` is the name its grant shows for the tool of the plugin `directors`.
function driverOf(director: ResolvedDirector, take: string, ask: AskModel): ActorDriver {
	const { definition } = director;
	return async (activation) => {
		const taken = await activation.call(take, {});
		const firings = taken.ok ? (parseTake(taken.reply)?.firings ?? []) : [];
		if (firings.length === 0) return;
		const ctx: DirectorContext<unknown> = { name: director.name, options: director.options, tick: activation.tick, firings };
		const question = { system: definition.system(ctx), input: definition.input(ctx), output: definition.output };
		activation.record(DIRECTOR_RECORDS.id, "asked", { firings: firings.map((firing) => firing.n) } satisfies Static<typeof AskedSchema>);
		const { value, record } = settle(director, ctx, await ask(activation, question));
		activation.record(DIRECTOR_RECORDS.id, "answered", record);
		if (value !== undefined) await definition.act(value, { ...ctx, call: (tool, params) => activation.call(tool, params) });
	};
}

/**
 * The drivers of the Directors of a game: one per Director, keyed by its actor id (`director:<name>`).
 *
 * One activation: the driver calls `take`; without a firing it ends. Else it builds `system` and `input`, writes
 * the record `asked`, asks the model, writes the record `answered` and runs `act` on the answer. When the model
 * gives no answer, or one that does not fit the Director's `output`, the answer is the Director's `fallback`;
 * without one the Director does nothing. `maxCalls` is the plugin's rule and `maxCostUsd` the asker's.
 *
 * @param input - The resolved game and the model port.
 * @returns The driver table, to merge with the residents' drivers; empty for a game without a Director.
 * @throws Nothing itself. A driver rejects, which fails its activation and ends the run, when `system`, `input`,
 * `fallback`, `act` or the asker throws, and with `SWT-R017` when `DIRECTOR_RECORDS` is not declared in the run.
 * @example
 * ```ts
 * const game = resolveGame({ game: city, schedulers: { turns }, prompts, records: [DIRECTOR_RECORDS] });
 * const drivers = { resident, ...createDirectorDrivers({ game, ask: scriptedAsker({ "director:warden": [{ line: "Heard." }] }) }) };
 * ```
 *
 * @public
 */
export function createDirectorDrivers(input: DirectorDriverInput): DriverTable {
	const take = input.game.definition.names[DIRECTOR_TAKE] ?? "take";
	return Object.fromEntries((input.game.directors ?? []).map((director) => [director.actor, driverOf(director, take, input.ask)]));
}

const ReviewAskedSchema = Type.Object({ answerer: Type.String({ description: "Who answers" }), question: Type.Unknown({ description: "The question of the review, as data" }) }, { additionalProperties: false, description: "A review of a call asks its answerer; the lane is held until the answer is in" });

const ReviewAnsweredSchema = Type.Object({ answerer: Type.String({ description: "Who answered" }), ok: Type.Boolean({ description: "True when the answer fits the Director's `output`" }), answer: Type.Optional(Type.Unknown({ description: "The answer, with `ok`" })), costUsd: Type.Number({ minimum: 0, description: "What the question cost, in US dollars" }), reason: Type.Optional(Type.Union([Type.Literal("limit"), Type.Literal("invalid"), Type.Literal("error")], { description: "Why there is no answer" })) }, { additionalProperties: false, description: "The answer to a review came in; without `ok` the reviewer gets `{ ok: false }` and decides" });

/**
 * The record source of the answerer port: `asked` before the answerer is asked, `answered` when the answer is in,
 * both inside the call under review. Pass it to the `records` of game resolution, else the first question ends the
 * run (`SWT-R017`).
 *
 * @public
 */
export const REVIEW_RECORDS: RecordSource = Object.freeze({ id: "@swarmtales/engine/review", events: { asked: ReviewAskedSchema, answered: ReviewAnsweredSchema } });

/**
 * The answerer port of a game (`KernelPorts.review`): the answerer of a review is the Director whose head says
 * `answers: "<answerer>"`. One question: the record `asked`; the Director's `system` and `input` with the question
 * in `ctx.question`, asked through the model port as the Director, in a stand-in activation that records into the
 * call and calls no tool (the cost counts under the Director's limits); the record `answered`. An answer that fails
 * or does not fit `output` is `{ ok: false }` for the reviewer, which decides; the Director's `fallback` is not used.
 *
 * @param input - The resolved game and the model port.
 * @returns The port; it answers no name for a game without a Director that has `answers`.
 * @throws Nothing itself. `ask` rejects, which fails the run, when `system`, `input` or the asker throws, and with
 * `SWT-R017` when `REVIEW_RECORDS` is not declared in the run.
 * @example
 * ```ts
 * const game = resolveGame({ game, schedulers: { turns }, prompts, records: [DIRECTOR_RECORDS, REVIEW_RECORDS] });
 * const kernel = createKernel(game.definition, { review: createReviewPort({ game, ask }) });
 * ```
 *
 * @public
 */
export function createReviewPort(input: DirectorDriverInput): ReviewPort {
	const of = (answerer: string): ResolvedDirector | undefined => input.game.directors?.find((director) => director.definition.answers === answerer);
	return {
		answers: (answerer) => of(answerer) !== undefined,
		async ask({ answerer, question, call, record }) {
			const director = of(answerer);
			if (director === undefined) return { ok: false };
			const { tick } = record(REVIEW_RECORDS.id, "asked", { answerer, question });
			const ctx: DirectorContext<unknown> = { name: director.name, options: director.options, tick, firings: [], question };
			const answer = await input.ask({ actor: director.actor, tick, basis: call.seq, detail: {}, inputs: [], tools: [], call: () => Promise.resolve({ ok: false, code: "TOOL_NOT_GRANTED" }), record }, { system: director.definition.system(ctx), input: director.definition.input(ctx), output: director.definition.output });
			const fits = answer.ok && Check(director.definition.output, answer.value);
			record(REVIEW_RECORDS.id, "answered", answer.ok ? { answerer, ok: fits, ...(fits ? { answer: answer.value } : { reason: "invalid" }), costUsd: answer.costUsd } : { answerer, ok: false, costUsd: 0, reason: answer.reason });
			return answer.ok && fits ? { ok: true, answer: answer.value } : { ok: false };
		},
	};
}
