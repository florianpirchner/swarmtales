// SPDX-License-Identifier: Apache-2.0
/**
 * The driver of a Director: what one activation of a Director does. It takes the firings the plugin `directors`
 * queued, asks the model once through the port `AskModel`, and hands an answer that fits to the Director's `act`,
 * whose only way into the run is a tool call of the activation. The engine imports no model: the asker is given.
 */
import type { ActorDriver, AskModel, DriverTable, ModelAnswer, RecordSource } from "@swarmtales/contracts";
import { DIRECTOR_TAKE, parseTake, type DirectorContext, type ResolvedDirector, type ResolvedGame } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

const AskedSchema = Type.Object({ firings: Type.Array(Type.Integer({ description: "The seq of one event that fired a trigger" }), { description: "The firings the question is about, in log order" }) }, { additionalProperties: false, description: "A Director took its firings and asks its model" });

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
		activation.record(DIRECTOR_RECORDS.id, "asked", { firings: firings.map((firing) => firing.seq) } satisfies Static<typeof AskedSchema>);
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
