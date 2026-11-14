// SPDX-License-Identifier: Apache-2.0
/**
 * Game files: a TypeScript or JavaScript module that default-exports a game, or a JSON or YAML file that holds one
 * in its data form. The loader reads the file and says what it found; it does not judge the game. Every field is
 * checked by game resolution (`resolveGame`, step 1), which reports all problems together with their data paths.
 */
import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SwtError, type GameData, type SwtIssue } from "@swarmtales/contracts";
import type { Game } from "@swarmtales/sdk";
import { parse as parseYaml } from "yaml";

/**
 * How a game file is read: imported as a module, or parsed as JSON or as YAML 1.2.
 *
 * @public
 */
export type GameFileType = "module" | "json" | "yaml";

/**
 * Every file extension of a game file with the way it is read.
 *
 * @public
 */
export const GAME_FILE_TYPES: ReadonlyMap<string, GameFileType> = new Map([
	[".ts", "module"],
	[".mts", "module"],
	[".js", "module"],
	[".mjs", "module"],
	[".json", "json"],
	[".yaml", "yaml"],
	[".yml", "yaml"],
]);

/**
 * A game as it was read from a file, before resolution.
 *
 * @public
 */
export interface LoadedGame {
	/** The absolute path of the file. */
	readonly file: string;
	/** How the file was read. A `json` or `yaml` game names its mechanics by id and needs the installed table. */
	readonly type: GameFileType;
	/** The game: the builder form from a module, the data form from a data file. Not yet checked field by field. */
	readonly game: Game | GameData;
}

/**
 * `SWT-C001`: the game file was not found.
 *
 * @param input - The file.
 * @param input.file - The absolute path that was looked for.
 * @returns The issue.
 *
 * @public
 */
export function gameFileNotFound(input: { readonly file: string }): SwtIssue {
	return {
		code: "SWT-C001",
		summary: "the game file was not found",
		where: { file: input.file },
		why: "`swt run` plays the game of one file, and the path is read from the current directory.",
		fix: "Correct the path, or change to the directory the path starts from.",
	};
}

/**
 * `SWT-C002`: the file is of a type that holds no game, or its content is no game.
 *
 * @param input - The file and what is wrong with it.
 * @param input.file - The absolute path of the file.
 * @param input.problem - What is wrong, as the rest of the sentence "the game file ...".
 * @returns The issue.
 *
 * @public
 */
export function unsupportedGameFile(input: { readonly file: string; readonly problem: string }): SwtIssue {
	return {
		code: "SWT-C002",
		summary: `the game file ${input.problem}`,
		where: { file: input.file },
		why: `A game file is a module that default-exports a game (${typesOf("module")}), or a game in its data form (${typesOf("json")}, ${typesOf("yaml")}).`,
		fix: "Default-export the result of `defineGame` from a module, or write the fields of the game as one JSON or YAML object.",
	};
}

const typesOf = (type: GameFileType): string => [...GAME_FILE_TYPES].flatMap(([extension, its]) => (its === type ? [`\`${extension}\``] : [])).join(", ");

const reasonOf = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/**
 * Imports the module of one file. This is the one place of the command line that imports a target it computes: a
 * game file and an installed mechanic package are named by the user's files, not by the source.
 *
 * @param file - The absolute path of the module.
 * @returns The module's namespace.
 * @throws Whatever the import throws: a syntax error, a missing import, a failing module body.
 *
 * @public
 */
export async function importFile(file: string): Promise<unknown> {
	const loaded: unknown = await import(pathToFileURL(file).href);
	return loaded;
}

/**
 * Tells whether a value can be a game at all: one object. Resolution checks its fields.
 *
 * @param value - What a file gave.
 * @returns True for an object that is no list.
 */
function isGame(value: unknown): value is Game | GameData {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads what a game file holds.
 *
 * @param file - The absolute path of the file.
 * @param type - How to read it.
 * @returns The default export of a module, or the parsed value of a data file.
 * @throws SwtError `SWT-C002` when the module cannot be imported or the text cannot be parsed.
 */
async function read(file: string, type: GameFileType): Promise<unknown> {
	try {
		if (type === "json") return JSON.parse(readFileSync(file, "utf8"));
		if (type === "yaml") return parseYaml(readFileSync(file, "utf8"));
		const loaded = await importFile(file);
		return typeof loaded === "object" && loaded !== null && "default" in loaded ? loaded.default : undefined;
	} catch (cause) {
		const what = type === "module" ? "could not be imported" : `is not valid ${type === "json" ? "JSON" : "YAML"}`;
		throw new SwtError(unsupportedGameFile({ file, problem: `${what}: ${reasonOf(cause)}` }), { cause });
	}
}

/**
 * Loads a game from a file: `.ts`, `.mts`, `.js` and `.mjs` are imported and must default-export a game; `.json`,
 * `.yaml` and `.yml` are parsed as a game in its data form.
 *
 * @param path - The path of the file, absolute or relative to `cwd`.
 * @param cwd - The directory a relative path starts from; the current directory when left out.
 * @returns The game and how it was read.
 * @throws SwtError `SWT-C001` when there is no such file; `SWT-C002` when the extension is none of a game file,
 * the file cannot be read as its type, or what it holds is not one object.
 * @example
 * ```ts
 * const { game, type } = await loadGame("games/hello/game.yaml");
 * ```
 *
 * @public
 */
export async function loadGame(path: string, cwd: string = process.cwd()): Promise<LoadedGame> {
	const file = resolve(cwd, path);
	const type = GAME_FILE_TYPES.get(extname(file).toLowerCase());
	if (statSync(file, { throwIfNoEntry: false })?.isFile() !== true) throw new SwtError(gameFileNotFound({ file }));
	if (type === undefined) throw new SwtError(unsupportedGameFile({ file, problem: `has the extension "${extname(file)}", which is no type of a game file` }));
	const game = await read(file, type);
	if (!isGame(game)) throw new SwtError(unsupportedGameFile({ file, problem: type === "module" ? "does not default-export a game" : "does not hold one object" }));
	return { file, type, game };
}
