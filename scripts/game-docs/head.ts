// SPDX-License-Identifier: Apache-2.0
/**
 * The heads the overview of `GAMES.md` reads: the default export of every game file on `games/index.ts`, built with
 * the defaults of its params where it is a game family. Only data is read: the residents, the mechanic ids, the
 * Director ids and the names of the params. No game runs.
 *
 * The scripts are no package and depend on none, so a game file's export is read as untrusted data and checked.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The id of a definition (a function or an object with an `id`), or the id itself. */
function idOf(definition: unknown, folder: string): string {
	const id: unknown = typeof definition === "function" || isRecord(definition) ? Reflect.get(definition, "id") : definition;
	if (typeof id !== "string") throw new TypeError(`game-docs: games/${folder}/game.ts uses a mechanic or a Director without an id`);
	return id;
}

const Built = Type.Object(
	{
		id: Type.String({ description: "The game id." }),
		residents: Type.Union([Type.Integer({ description: "A count." }), Type.Array(Type.String({ description: "A resident id." }), { description: "The ids." })], { description: "The residents." }),
		mechanics: Type.Array(Type.Object({ mechanic: Type.Unknown({ description: "The definition: a function or an object with an `id`." }) }, { description: "A mechanic use." }), { description: "The mechanics." }),
		directors: Type.Optional(Type.Array(Type.Object({ use: Type.Unknown({ description: "A Director id, or a definition with an `id`." }) }, { description: "A placement." }), { description: "The Directors." })),
	},
	{ description: "A game in its builder form, as far as the overview shows it." },
);

/** What the overview shows of one game. */
export interface GameHead {
	/** The folder under `games/`. */
	readonly folder: string;
	readonly residents: number;
	readonly mechanics: readonly string[];
	readonly directors: readonly string[];
	/** The names of the params; `undefined` for a game that is no family. */
	readonly params: readonly string[] | undefined;
}

/** The default of every param, as `swt run` builds a family without `--set`. */
function defaultsOf(properties: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
	return Object.fromEntries(Object.entries(properties).map(([name, param]) => [name, isRecord(param) ? Value.Clone(param.default) : undefined]));
}

/**
 * Reads the head of a game from what its game file exports.
 *
 * @param folder - The folder under `games/`.
 * @param exported - The default export: a game or a game family.
 * @returns The head.
 * @throws TypeError when the export is neither a game nor a family whose defaults build one, or a use has no id.
 */
export function headOf(folder: string, exported: unknown): GameHead {
	const build: unknown = isRecord(exported) ? exported.build : undefined;
	const schema: unknown = isRecord(exported) ? exported.params : undefined;
	const properties: unknown = isRecord(schema) ? schema.properties : undefined;
	const family = typeof build === "function" && isRecord(properties);
	const game: unknown = family ? Reflect.apply(build, exported, [defaultsOf(properties)]) : exported;
	if (!Value.Check(Built, game)) throw new TypeError(`game-docs: games/${folder}/game.ts exports no game and no game family whose defaults build one`);
	const data: Static<typeof Built> = game;
	return {
		folder,
		residents: typeof data.residents === "number" ? data.residents : data.residents.length,
		mechanics: data.mechanics.map((use) => idOf(use.mechanic, folder)),
		directors: (data.directors ?? []).map((placement) => idOf(placement.use, folder)),
		params: family ? Object.keys(properties) : undefined,
	};
}

/**
 * Loads the head of every game of a list, from source.
 *
 * @param root - The repository root.
 * @param games - The games list (`games/index.ts`).
 * @returns The heads, in the order of the list.
 * @throws TypeError when a game file exports no readable game.
 */
export async function loadHeads(root: string, games: readonly { readonly name: string; readonly file: string }[]): Promise<readonly GameHead[]> {
	const heads: GameHead[] = [];
	for (const entry of games) {
		const module: unknown = await import(pathToFileURL(join(root, entry.file)).href);
		heads.push(headOf(entry.name, isRecord(module) ? module.default : undefined));
	}
	return heads;
}
