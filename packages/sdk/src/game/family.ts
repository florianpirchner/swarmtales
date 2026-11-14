// SPDX-License-Identifier: Apache-2.0
/**
 * The game family: a game built from typed params, for a game with variants and for the arms of an experiment.
 * What is hashed and recorded is the data of the game that `build` returns, so two param sets give two game hashes.
 */
import type { JsonValue, SwtIssue } from "@swarmtales/contracts";
import type { Static, TObject } from "typebox";
import { Value } from "typebox/value";
import { paramOverride } from "../errors.ts";
import type { Game } from "./types.ts";

/**
 * A game built from typed params. What is hashed and recorded is the data `build` returns.
 *
 * @public
 */
export interface GameFamily<P extends TObject = TObject> {
	/** The schema of the params: an object schema whose properties carry a `default`, so that no override gives the base game. */
	readonly params: P;
	/**
	 * Builds the game of one param set. A pure function of its params: no clock, no random number.
	 *
	 * @param params - The effective params: the defaults of the schema with the overrides on top.
	 * @returns The game, in its builder form.
	 */
	build(params: Static<P>): Game;
}

/**
 * Declares a game family: a game with variants that differ in typed params.
 *
 * @param params - The schema of the params, each with a `default` and a `description`.
 * @param build - Builds the game of one param set.
 * @returns The family; `resolveGame` takes it in place of a game, with the overrides in `ResolveInput.params`.
 * @example
 * ```ts
 * export default defineGameFamily(Type.Object({ size: Type.Integer({ default: 3, description: "The side of the board." }) }), ({ size }) =>
 * 	defineGame({ id: "grid", residents: 2, mechanics: [gridGame({ size })], end: { ticks: 20 } }),
 * );
 * ```
 *
 * @public
 */
export function defineGameFamily<P extends TObject>(params: P, build: (params: Static<P>) => Game): GameFamily<P> {
	return { params, build };
}

/**
 * Tells a game family from a game: a family has a `params` schema and a `build` function, which no game has.
 *
 * @param game - What a game file exports or `resolveGame` is given.
 * @returns True for a game family.
 *
 * @public
 */
export function isGameFamily(game: unknown): game is GameFamily {
	return typeof game === "object" && game !== null && "build" in game && typeof game.build === "function" && "params" in game && typeof game.params === "object" && game.params !== null;
}

/**
 * Tells whether a value is plain JSON data.
 *
 * @param value - Any value.
 * @returns True for null, a string, a boolean, a finite number, and an array or an object of such values.
 *
 * @internal
 */
export function isJson(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every(isJson);
	return typeof value === "object" && Object.values(value).every(isJson);
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The effective params of a family: the defaults of its schema with the overrides on top, checked.
 *
 * @param family - The family.
 * @param overrides - The overrides by param name (`--set`, an arm of an experiment); left out: none.
 * @returns The effective params, and one `SWT-G041` per override that names no param of the family and per param
 * whose value does not match its schema or is no JSON value. The params are to be used only when there is no issue.
 *
 * @public
 */
export function familyParams(family: GameFamily, overrides: Readonly<Record<string, unknown>> = {}): { readonly params: Readonly<Record<string, JsonValue>>; readonly issues: readonly SwtIssue[] } {
	const known = Object.keys(family.params.properties);
	const filled: unknown = Value.Default(family.params, Value.Clone(overrides));
	const entries = isRecord(filled) ? Object.entries(filled) : [];
	const wrong = new Map<string, string>();
	for (const error of Value.Errors(family.params, filled)) {
		// The name of the param is the first part of the path; a param that is missing (no default, no override) is named by the error itself.
		const name = error.instancePath.split("/")[1] ?? "";
		if (name !== "" && !wrong.has(name)) wrong.set(name, error.message);
	}
	const issues = [
		...Object.keys(overrides).filter((name) => !known.includes(name)).map((name) => paramOverride({ name, problem: "unknown", known })),
		...known.filter((name) => !wrong.has(name) && !entries.some(([key]) => key === name)).map((name) => paramOverride({ name, problem: "mismatch", known, message: "is missing: the param has no default and no override" })),
		...[...wrong].filter(([name]) => known.includes(name)).map(([name, message]) => paramOverride({ name, problem: "mismatch", known, message })),
		...entries.filter(([name, value]) => known.includes(name) && !wrong.has(name) && !isJson(value)).map(([name]) => paramOverride({ name, problem: "mismatch", known, message: "is no JSON value" })),
	];
	return { params: Object.fromEntries(entries.flatMap(([name, value]): [string, JsonValue][] => (known.includes(name) && isJson(value) ? [[name, value]] : []))), issues };
}
