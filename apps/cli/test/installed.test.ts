// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The installed table of a project (decision A121, issue M6-02): a YAML game in a fixture project names a mechanic
 * and a Director of the project's own dependencies by id, and plays fake, verifies and replays. The fixture packages
 * are plain JavaScript beside the project, linked into its `node_modules` as a workspace links them.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SwtError } from "@swarmtales/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installedPackages, installedTable, packageFilesFor } from "../src/installed.ts";
import { cli, eventsOf } from "./support.ts";

const OWN = fileURLToPath(new URL("../package.json", import.meta.url));

const MECHANICS = `export { guessNumber } from "@swarmtales/testkit";\n`;

const DIRECTORS = `import { defineDirector } from "@swarmtales/sdk";
import { Type } from "typebox";
const Line = Type.Object({ line: Type.String({ description: "The line." }) }, { description: "A line." });
export const crier = defineDirector(
	{ id: "crier", summary: "Counts the guesses.", on: [{ event: "guess-number.guessed" }], output: Line },
	{ system: () => "You are the crier.", input: (ctx) => String(ctx.firings.length) + " guesses", act: async () => undefined, fallback: () => ({ line: "heard" }) },
);
export const twin = defineDirector({ id: "crier", summary: "A second crier.", on: [], output: Line }, { system: () => "", input: () => "", act: async () => undefined });
export const plain = { id: "plain" };
`;

const game = (director: string): string => `schema: 1
id: project-game
seed: 4
residents: 2
mechanics:
  - use: guess-number
    options: { max: 20 }
directors:
  - use: ${director}
scheduler: { id: turns, options: { afterBlocks: [director] } }
end:
  ticks: 6
`;

let root = "";
const at = (...parts: readonly string[]): string => join(root, ...parts);
function put(text: string, ...parts: readonly string[]): string {
	const file = at(...parts);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
	return file;
}
const manifest = (name: string, swarmtales: object): string => JSON.stringify({ name, version: "1.0.0", type: "module", exports: "./index.js", swarmtales });
// A package of the workspace, linked into the project's `node_modules` where the command line resolves it.
function link(name: string, target: string): void {
	mkdirSync(dirname(at("node_modules", name)), { recursive: true });
	symlinkSync(target, at("node_modules", name), "dir");
}

async function codeOf(run: () => Promise<unknown>): Promise<string> {
	const failure: unknown = await run().then(
		() => undefined,
		(cause: unknown) => cause,
	);
	return failure instanceof SwtError ? `${failure.code} ${failure.issues[0]?.summary ?? ""}` : `no SwtError: ${String(failure)}`;
}

beforeAll(() => {
	root = realpathSync(mkdtempSync(join(tmpdir(), "swt-project-")));
	put(JSON.stringify({ name: "fixture-project", type: "module", dependencies: { "fixture-mechanics": "1.0.0", "fixture-directors": "1.0.0" } }), "package.json");
	put(manifest("fixture-mechanics", { kind: "mechanic", mechanics: ["guessNumber"] }), "plugins", "mechanics", "package.json");
	put(MECHANICS, "plugins", "mechanics", "index.js");
	put(manifest("fixture-directors", { kind: "mechanic", directors: ["crier"] }), "plugins", "directors", "package.json");
	put(DIRECTORS, "plugins", "directors", "index.js");
	link("fixture-mechanics", at("plugins", "mechanics"));
	link("fixture-directors", at("plugins", "directors"));
	for (const name of ["@swarmtales/sdk", "@swarmtales/testkit", "typebox"]) link(name, realpathSync(join(dirname(OWN), "node_modules", name)));
	put(game("crier"), "game.yaml");
	put(game("warden"), "games", "unknown.yaml");
});
afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("a data game of a project", () => {
	it("names a mechanic and a Director of the project's dependencies by id, and plays fake, verifies and replays", async () => {
		const swt = cli(root);
		const played = await swt("run", at("game.yaml"), "--fake");
		expect([played.code, played.err]).toEqual([0, ""]);
		expect(played.out.at(-1)).toBe("run: runs/project-game-001");
		const crier = eventsOf(at("runs", "project-game-001")).filter((event) => event.actor === "director:crier");
		expect(crier.length).toBeGreaterThan(0);
		expect((await swt("log", "verify", "runs/project-game-001")).code).toBe(0);
		const replayed = await swt("replay", "runs/project-game-001", "--game", at("game.yaml"));
		expect([replayed.code, replayed.err]).toEqual([0, ""]);
		expect(replayed.out[0]).toMatch(/^equal, \d+ lines$/);
	});

	it("refuses a Director the installed table does not hold, from a game file below the project's folder", async () => {
		const refused = await cli(root)("run", at("games", "unknown.yaml"), "--fake");
		expect([refused.code, refused.issue]).toEqual([1, "SWT-D002"]);
		expect(refused.err).toContain("crier");
	});
});

describe("installedPackages", () => {
	it("reads the project's package.json first, then the command line's own, a package once", async () => {
		expect(packageFilesFor(at("games"), OWN)).toEqual([at("package.json"), OWN]);
		expect(packageFilesFor(dirname(OWN), OWN)).toEqual([OWN]);
		const table = await installedPackages([at("package.json"), at("package.json"), OWN]);
		expect([Object.keys(table.mechanics), Object.keys(table.directors)]).toEqual([["guess-number"], ["crier"]]);
		// A second file that lists a package again: read once, so its mechanic is not installed twice.
		const asked: string[] = [];
		const again = await installedPackages([at("package.json"), put(JSON.stringify({ dependencies: { "fixture-mechanics": "1.0.0" } }), "other", "package.json")], async (name) => {
			asked.push(name);
			return import(at("plugins", name === "fixture-mechanics" ? "mechanics" : "directors", "index.js"));
		});
		expect([asked, Object.keys(again.mechanics)]).toEqual([["fixture-mechanics", "fixture-directors"], ["guess-number"]]);
		expect(await installedTable(OWN)).toEqual({});
	});

	it("refuses a Director export that is none, and a Director id installed twice, as SWT-C030", async () => {
		const project = (name: string, directors: readonly string[]): string => {
			put(manifest("fixture-directors", { kind: "mechanic", directors }), name, "node_modules", "fixture-directors", "package.json");
			return put(JSON.stringify({ name, dependencies: { "fixture-directors": "1.0.0" } }), name, "package.json");
		};
		const load = async (): Promise<unknown> => import(at("plugins", "directors", "index.js"));
		expect(await codeOf(() => installedPackages([project("plain", ["plain"])], load))).toBe('SWT-C030 the export "plain" of "fixture-directors" is no Director definition');
		expect(await codeOf(() => installedPackages([project("missing", ["missing"])], load))).toBe('SWT-C030 the export "missing" of "fixture-directors" is no Director definition');
		expect(await codeOf(() => installedPackages([project("twice", ["crier", "twin"])], load))).toBe('SWT-C030 the Director id "crier" is installed twice; the second is the export "twin" of "fixture-directors"');
	});
});
