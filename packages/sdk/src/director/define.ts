// SPDX-License-Identifier: Apache-2.0
/**
 * `defineDirector(head, body)`: the definition of a Director. A Director is a model actor that is no resident: it
 * is woken by events of the game's mechanics, asks its model once, and acts only through tools of its grant. The
 * head is data (id, triggers, the schema of the answer, limits); the body builds the question and acts on the
 * answer. Nothing here runs a model: game resolution reads the definition, the plugin `directors` queues the
 * firings, and the Director's driver asks and calls `act`.
 */
import { closest, SwtError, type JsonValue, type ToolOutcome } from "@swarmtales/contracts";
import { Type, type Static, type TSchema } from "typebox";
import { Clone, Default, Errors } from "typebox/value";
import { optionMismatch } from "../errors.ts";
import { isJson } from "../game/family.ts";

/**
 * What wakes a Director: one event type of a mechanic of the game.
 *
 * @public
 */
export interface DirectorTrigger {
	/** `<mechanic>.<event>`: the id of the mechanic and the event type it declares, for example `decisions.decision_proposed`. */
	readonly event: string;
	/** Keeps a firing; left out: every event of the type fires. Pure. */
	readonly where?: (payload: unknown) => boolean;
}

/**
 * One event that fired a trigger of a Director.
 *
 * @public
 */
export interface Firing {
	/** The place of the event on the log. */
	readonly seq: number;
	/** The tick of the event. */
	readonly tick: number;
	/** `<mechanic>.<event>`, as the trigger names it. */
	readonly event: string;
	/** The payload of the event. */
	readonly payload: unknown;
}

/**
 * The most a Director may do in one run.
 *
 * @public
 */
export interface DirectorLimits {
	/** The most times the Director is asked; the plugin `directors` counts them. */
	readonly maxCalls?: number;
	/** The most money its model calls may cost, in US dollars; the asker counts it. */
	readonly maxCostUsd?: number;
}

/**
 * What a Director's `system`, `input` and `fallback` read.
 *
 * @public
 */
export interface DirectorContext<O> {
	/** The name of the Director in this game: its `as`, else its id. */
	readonly name: string;
	/** The options of this use, parsed, with defaults. */
	readonly options: O;
	/** The tick of the activation. */
	readonly tick: number;
	/** The firings since the Director was asked last, in log order. */
	readonly firings: readonly Firing[];
}

/**
 * What a Director's `act` reads, and its one way to change the run.
 *
 * @public
 */
export interface DirectorActContext<O> extends DirectorContext<O> {
	/** A tool call of the Director, under the name its grant shows; a refusal is an outcome, not a throw. */
	call(tool: string, params: unknown): Promise<ToolOutcome>;
}

/**
 * The head of a Director: everything that is data.
 *
 * @public
 */
export interface DirectorHead<O extends TSchema, A extends TSchema> {
	/** The id a game names in `directors[].use`. */
	readonly id: string;
	/** One sentence on what the Director does. */
	readonly summary: string;
	/** The schema of its options, an object schema; without it the Director takes none. */
	readonly options?: O;
	/** The triggers; at least one, else the Director is never woken. */
	readonly on: readonly DirectorTrigger[];
	/** The schema the model's answer must fit. */
	readonly output: A;
	/** The limits of the definition; the `limits` of a use replace them. */
	readonly limits?: DirectorLimits;
}

/**
 * The body of a Director: the question to its model and the act on the answer.
 *
 * @public
 */
export interface DirectorBody<O extends TSchema, A extends TSchema> {
	/** The system text of the question. */
	system(ctx: DirectorContext<Static<O>>): string;
	/** The input text of the question. */
	input(ctx: DirectorContext<Static<O>>): string;
	/** Acts on an answer that fits `output`, through `ctx.call` only. */
	act(answer: Static<A>, ctx: DirectorActContext<Static<O>>): Promise<void>;
	/** The answer when the model gives none (a limit, an invalid answer, an error); left out, or undefined: the Director does nothing. */
	fallback?(ctx: DirectorContext<Static<O>>): Static<A> | undefined;
}

/**
 * A Director definition: what `defineDirector` returns, with the types of its options and its answer erased. Game
 * resolution finds it by `id` and parses the options; the driver checks an answer against `output` before `act`.
 *
 * @public
 */
export interface DirectorDefinition {
	/** The id a game names in `directors[].use`. */
	readonly id: string;
	/** One sentence on what the Director does. */
	readonly summary: string;
	/** The schema of its options; an empty object schema when the head has none. */
	readonly options: TSchema;
	/** The triggers. */
	readonly on: readonly DirectorTrigger[];
	/** The schema the model's answer must fit. */
	readonly output: TSchema;
	/** The limits of the definition; `{}` when the head has none. */
	readonly limits: DirectorLimits;
	/**
	 * Parses the options of one use and fills the defaults.
	 *
	 * @throws SwtError One `SWT-G020` per option that is unknown or does not match the schema, each with a path relative to the use (`options.tone`).
	 */
	parseOptions(raw: unknown): Readonly<Record<string, JsonValue>>;
	/** The system text of the question. */
	system(ctx: DirectorContext<unknown>): string;
	/** The input text of the question. */
	input(ctx: DirectorContext<unknown>): string;
	/** Acts on an answer; the caller has checked it against `output`. */
	act(answer: unknown, ctx: DirectorActContext<unknown>): Promise<void>;
	/** The answer when the model gives none; undefined when the body has no `fallback` or it gives none. */
	fallback(ctx: DirectorContext<unknown>): unknown;
}

const NO_OPTIONS = Type.Object({}, { description: "No options" });

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

// `/lines/0/tone` as `options.lines[0].tone`.
const optionPath = (pointer: string): string => pointer.split("/").slice(1).reduce((path, part) => (/^\d+$/.test(part) ? `${path}[${part}]` : `${path}.${part}`), "options");

// The options with defaults filled; every problem is one `SWT-G020` whose path is relative to the use.
function parseOptions(id: string, schema: TSchema, raw: unknown): Readonly<Record<string, JsonValue>> {
	const wrong = (path: string, message: string) => optionMismatch({ owner: id, kind: "director", path, message });
	if (raw !== undefined && !isRecord(raw)) throw new SwtError(wrong("options", "must be an object"));
	const known = "properties" in schema && isRecord(schema.properties) ? Object.keys(schema.properties) : [];
	const unknown = Object.keys(raw ?? {}).flatMap((key) => {
		const near = closest(key, known);
		return known.includes(key) ? [] : [wrong(`options.${key}`, near === undefined ? "is unknown" : `is unknown; did you mean "${near}"?`)];
	});
	// Defaults go into a copy: the game's own option objects stay as the author wrote them.
	const value: unknown = Default(schema, Clone(raw ?? {}));
	const issues = [...unknown, ...Errors(schema, value).map((error) => wrong(optionPath(error.instancePath), error.message))];
	if (issues.length > 0) throw new SwtError(issues);
	if (!isJson(value) || !isRecord(value)) throw new SwtError(wrong("options", "must be plain JSON data"));
	return value;
}

/**
 * Defines a Director from its head and its body.
 *
 * @param head - The data: id, summary, options schema, triggers, the schema of the answer, limits.
 * @param body - The texts of the question (`system`, `input`), the act on the answer and the fallback.
 * @returns The definition: a game names it by `id` in `directors[].use` (a builder game may put the definition
 * itself there), and `resolveGame` takes it from the game or from `ResolveInput.directors`.
 * @example
 * ```ts
 * export const warden = defineDirector(
 * 	{ id: "warden", summary: "Comments on a proposed decision.", on: [{ event: "decisions.decision_proposed" }], output: Type.Object({ line: Type.String({ description: "The line" }) }, { description: "The answer" }), limits: { maxCalls: 3 } },
 * 	{
 * 		system: () => "You are the warden of the city.",
 * 		input: (ctx) => `${String(ctx.firings.length)} decision(s) were proposed.`,
 * 		act: async (answer, ctx) => {
 * 			await ctx.call("postBoard", { message: answer.line });
 * 		},
 * 		fallback: () => ({ line: "The warden watches." }),
 * 	},
 * );
 * ```
 *
 * @public
 */
export function defineDirector<O extends TSchema, A extends TSchema>(head: DirectorHead<O, A>, body: DirectorBody<O, A>): DirectorDefinition;
export function defineDirector(head: DirectorHead<TSchema, TSchema>, body: DirectorBody<TSchema, TSchema>): DirectorDefinition {
	const options = head.options ?? NO_OPTIONS;
	return {
		id: head.id,
		summary: head.summary,
		options,
		on: head.on,
		output: head.output,
		limits: head.limits ?? {},
		parseOptions: (raw) => parseOptions(head.id, options, raw),
		system: (ctx) => body.system(ctx),
		input: (ctx) => body.input(ctx),
		act: (answer, ctx) => body.act(answer, ctx),
		fallback: (ctx) => body.fallback?.(ctx),
	};
}
