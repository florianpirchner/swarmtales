// SPDX-License-Identifier: Apache-2.0
/**
 * `defineGame` and `gameData`: the builder form of a game and its data form (a port of the old `defineCoreStory`
 * and `storyData`). The builder form names its mechanics by typed uses, so a grant or a lock of a tool whose
 * mechanic is not listed does not compile; the data form names them by id and is what is hashed and recorded.
 */
import type { GameData } from "@swarmtales/contracts";
import type { MechanicDefinition } from "../mechanic/types.ts";
import type { Game, MechanicUse } from "./types.ts";

/**
 * Checks the tool names of a game's `grants` and `locked` against its mechanics at compile time; game resolution
 * checks the rest at load.
 *
 * @param game - The game in its builder form.
 * @returns The same game, with its mechanics as a tuple type.
 * @example
 * ```ts
 * const game = defineGame({ id: "duel", residents: 2, mechanics: [gridGame({ size: 3 })], locked: ["playMove"], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export function defineGame<const Ms extends readonly MechanicUse[]>(game: Game<Ms>): Game<Ms> {
	return game;
}

type DataUse = GameData["mechanics"][number];
type DataGrants = NonNullable<GameData["grants"]>;

function dataUse(use: MechanicUse): DataUse {
	return { use: use.mechanic.id, ...(use.options === undefined ? {} : { options: use.options }), ...(use.as === undefined ? {} : { as: { ...use.as } }) };
}

function dataGrants(grants: NonNullable<Game["grants"]>): DataGrants {
	const data: DataGrants = {};
	for (const [grant, entry] of Object.entries(grants)) {
		if (entry === undefined) continue;
		if ("length" in entry) data[grant] = [...entry];
		else data[grant] = { ...(entry.drop === undefined ? {} : { drop: [...entry.drop] }), ...(entry.add === undefined ? {} : { add: [...entry.add] }) };
	}
	return data;
}

/**
 * Turns a builder game into its data form: `schema: 1`, and the mechanics by id with their options and renames.
 *
 * @param game - The game in its builder form.
 * @returns The data form, and the definitions the game used, by id. When a mechanic is listed twice its id stands
 * for the first use's definition; game resolution reports the double (`SWT-G021`).
 * @example
 * ```ts
 * const { data, mechanics } = gameData(game);
 * data.mechanics; // [{ use: "grid-game", options: { size: 3 } }]
 * ```
 *
 * @public
 */
export function gameData(game: Game): { readonly data: GameData; readonly mechanics: Readonly<Record<string, MechanicDefinition>> } {
	const { mechanics: uses, grants, locked, ...rest } = game;
	const data: GameData = {
		...rest,
		schema: 1,
		mechanics: uses.map(dataUse),
		...(grants === undefined ? {} : { grants: dataGrants(grants) }),
		...(locked === undefined ? {} : { locked: [...locked] }),
	};
	const mechanics: Record<string, MechanicDefinition> = {};
	for (const use of uses) mechanics[use.mechanic.id] ??= use.mechanic;
	return { data, mechanics };
}
