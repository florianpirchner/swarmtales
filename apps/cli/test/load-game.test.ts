// SPDX-License-Identifier: Apache-2.0
/** Game files of the three kinds load to the same data, and the installed table is built from a fixture package. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { GameDefinitionSchema, SwtError, type GameData } from "@swarmtales/contracts";
import { isGameFamily } from "@swarmtales/sdk";
import { Check } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installedTable } from "../src/installed.ts";
import { loadGame, type LoadedGame } from "../src/load-game.ts";

const DATA = { schema: 1, id: "fixture-game", seed: 7, residents: ["A01", "A02"], mechanics: [{ use: "marker", options: { size: 3 } }], end: { ticks: 4 } };

const MECHANIC = `const definition = (name) => Object.assign((options) => ({ mechanic: definition(name), options }), { id: name, package: "fixture-mechanic", parseOptions: (raw) => raw, resolve: () => ({}) });
export const marker = definition("marker");
export const second = definition("second");
export const twin = definition("marker");
export const noDefinition = { id: "plain" };
`;

const MODULE = `import { marker } from "./node_modules/fixture-mechanic/index.mjs";
const residents: readonly string[] = ["A01", "A02"];
export default { id: "fixture-game", seed: 7, residents, mechanics: [marker({ size: 3 })], end: { ticks: 4 } };
`;

const YAML = `schema: 1
id: fixture-game
seed: 7
residents: [A01, A02]
mechanics:
  - use: marker
    options: { size: 3 }
end:
  ticks: 4
`;

let root = "";
const at = (...parts: readonly string[]): string => join(root, ...parts);
function put(text: string, ...parts: readonly string[]): string {
	const file = at(...parts);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
	return file;
}
const registration = (mechanics: readonly string[]): string => JSON.stringify({ name: "fixture-mechanic", type: "module", exports: "./index.mjs", swarmtales: { kind: "mechanic", mechanics } });

/**
 * A stand-in for `gameData` of the sdk (issue 19, not on the branch yet): the data form of what a file gave.
 *
 * @param loaded - The loaded game.
 * @returns The game with `schema: 1` and its mechanics named by id.
 */
function dataOf(loaded: LoadedGame): GameData {
	if (isGameFamily(loaded.game)) expect.fail("the file holds a game family");
	const mechanics = loaded.game.mechanics.map((use) => ("use" in use ? use : { use: use.mechanic.id, options: use.options }));
	const data: unknown = JSON.parse(JSON.stringify({ ...loaded.game, schema: 1, mechanics }));
	if (!Check(GameDefinitionSchema, data)) expect.fail("the file holds no game in its data form");
	return data;
}

async function codeOf(run: () => Promise<unknown>): Promise<string> {
	const failure: unknown = await run().then(
		() => undefined,
		(cause: unknown) => cause,
	);
	return failure instanceof SwtError ? `${failure.code} ${failure.issues[0]?.summary ?? ""}` : `no SwtError: ${String(failure)}`;
}

beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "swt-load-game-"));
	put(JSON.stringify({ name: "fixture-app", dependencies: { "plain-lib": "1.0.0", "fixture-mechanic": "1.0.0" } }), "package.json");
	put(JSON.stringify({ name: "plain-lib", swarmtales: { layer: "L1" } }), "node_modules", "plain-lib", "package.json");
	put(registration(["marker", "second"]), "node_modules", "fixture-mechanic", "package.json");
	put(MECHANIC, "node_modules", "fixture-mechanic", "index.mjs");
	put(MODULE, "game.ts");
	put(JSON.stringify(DATA), "game.json");
	put(YAML, "game.yaml");
});
afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("loadGame", () => {
	it("loads a .ts, a .json and a .yaml file to the same data", async () => {
		const [module, json, yaml] = [await loadGame("game.ts", root), await loadGame(at("game.json")), await loadGame("game.yaml", root)];
		expect([module.type, json.type, yaml.type]).toEqual(["module", "json", "yaml"]);
		expect(module.file).toBe(at("game.ts"));
		expect(json.game).toEqual(DATA);
		expect(yaml.game).toEqual(DATA);
		expect(dataOf(module)).toEqual(DATA);
	});

	it("reports a missing file as SWT-C001, whatever its extension", async () => {
		expect(await codeOf(() => loadGame("nowhere.yaml", root))).toBe("SWT-C001 the game file was not found");
		expect(await codeOf(() => loadGame("nowhere.txt", root))).toMatch(/^SWT-C001 /);
	});

	it("reports a wrong extension as SWT-C002", async () => {
		const file = put(JSON.stringify(DATA), "game.txt");
		const failure: unknown = await loadGame(file).catch((cause: unknown) => cause);
		expect(failure).toBeInstanceOf(SwtError);
		expect(failure instanceof SwtError ? failure.issues[0] : undefined).toMatchObject({ code: "SWT-C002", summary: 'the game file has the extension ".txt", which is no type of a game file', where: { file } });
	});

	it("reports a file that holds no game as SWT-C002", async () => {
		put("export const game = {};\n", "named.mjs");
		put("export default 'a text';\n", "text.mjs");
		put("export default {;\n", "broken.mjs");
		put("[1, 2]", "list.json");
		put("{ id: ", "broken.json");
		put("id: a\nid: b\n", "doubled.yaml");
		expect(await codeOf(() => loadGame("named.mjs", root))).toBe("SWT-C002 the game file does not default-export a game");
		expect(await codeOf(() => loadGame("text.mjs", root))).toBe("SWT-C002 the game file does not default-export a game");
		expect(await codeOf(() => loadGame("broken.mjs", root))).toMatch(/^SWT-C002 the game file could not be imported: /);
		expect(await codeOf(() => loadGame("list.json", root))).toBe("SWT-C002 the game file does not hold one object");
		expect(await codeOf(() => loadGame("broken.json", root))).toMatch(/^SWT-C002 the game file is not valid JSON: /);
		expect(await codeOf(() => loadGame("doubled.yaml", root))).toMatch(/^SWT-C002 the game file is not valid YAML: /);
	});
});

describe("installedTable", () => {
	it("builds the table from the swarmtales field of the dependencies of a package.json", async () => {
		const table = await installedTable(at("package.json"));
		expect(Object.keys(table)).toEqual(["marker", "second"]);
		expect(table.marker?.package).toBe("fixture-mechanic");
		const builder = await loadGame("game.ts", root);
		expect(dataOf(builder).mechanics.map((use) => use.use)).toEqual(Object.keys(table).slice(0, 1));
	});

	it("imports through the given loader, and no package without mechanics", async () => {
		const asked: string[] = [];
		const table = await installedTable(at("package.json"), async (name) => {
			asked.push(name);
			const real: unknown = await import(at("node_modules", "fixture-mechanic", "index.mjs"));
			return { marker: Object.assign(() => undefined, { id: "other", package: name, parseOptions: () => undefined, resolve: () => undefined }), second: typeof real === "object" && real !== null && "second" in real ? real.second : undefined };
		});
		expect(asked).toEqual(["fixture-mechanic"]);
		expect(Object.keys(table)).toEqual(["other", "second"]);
	});

	it("refuses a table that cannot be built as SWT-C030", async () => {
		const app = (name: string, mechanics: readonly string[], dependencies: Readonly<Record<string, string>> = { "fixture-mechanic": "1.0.0" }): string => {
			put(registration(mechanics), name, "node_modules", "fixture-mechanic", "package.json");
			put(MECHANIC, name, "node_modules", "fixture-mechanic", "index.mjs");
			return put(JSON.stringify({ name, dependencies }), name, "package.json");
		};
		expect(await codeOf(() => installedTable(app("no-export", ["missing"])))).toBe('SWT-C030 the export "missing" of "fixture-mechanic" is no mechanic definition');
		expect(await codeOf(() => installedTable(app("no-definition", ["noDefinition"])))).toMatch(/^SWT-C030 the export "noDefinition" /);
		expect(await codeOf(() => installedTable(app("twice", ["marker", "twin"])))).toMatch(/^SWT-C030 the mechanic id "marker" is installed twice/);
		expect(await codeOf(() => installedTable(app("absent", ["marker"], { "not-there": "1.0.0" })))).toBe('SWT-C030 the dependency "not-there" is not installed');
		expect(await codeOf(() => installedTable(at("nowhere", "package.json")))).toBe("SWT-C030 the package file cannot be read");
		expect(await codeOf(() => installedTable(put(JSON.stringify({ dependencies: ["a"] }), "bad", "package.json")))).toBe("SWT-C030 the package file cannot be read");
	});
});
