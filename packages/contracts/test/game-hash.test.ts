// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract changes of milestone M3 leave every existing game as it is: the manifest that `swt run --fake`
 * writes for each of the four games names the game hash it named before the changes. The hashes are pinned here;
 * a change of one of them is a change of the game format and needs an issue. The games are run as a program,
 * because this package imports no other package.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Value } from "typebox/value";
import { afterAll, describe, expect, it } from "vitest";
import { RunManifestSchema } from "../src/run/index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const out = mkdtempSync(join(tmpdir(), "swt-game-hash-"));
afterAll(() => {
	rmSync(out, { recursive: true, force: true });
});

/** The four games of before M3 with the game hash of their manifest, taken before the first change of M3. */
const PINNED: readonly (readonly [string, string])[] = [
	["hello", "135ac2a91155945c5a8b5a8564d5856c57c55d0ced3bf57850211c4ad4f42db7"],
	["tictactoe-teams", "6d41383c2cd5b7e20648c6587d15ece1e3b9414c75653ce51ce6369b1f1bb2c8"],
	["quarry", "6490b2a8e16e7dfaf9c4180004b0a5c3acb81183a95c5685a7b773e7689041c1"],
	["econ-lab", "2ff219a08c9833e17d517409970f1818781c7575dad26f464b752c9155163dc8"],
];

/**
 * Plays a game with the fake driver and reads the manifest of its run folder.
 *
 * @param name - The folder of the game under `games/`.
 * @returns The manifest, parsed against its schema.
 * @throws RangeError When the program exits with another code than 0 or writes no single run folder.
 */
function manifestOf(name: string) {
	const dir = join(out, name);
	const { status, stderr } = spawnSync(process.execPath, ["--conditions", "development", "apps/cli/src/bin.ts", "run", join("games", name, "game.ts"), "--fake", "--out", dir], { cwd: ROOT, encoding: "utf8" });
	if (status !== 0) throw new RangeError(`swt run of ${name} exited with ${String(status)}: ${stderr}`);
	const runs = readdirSync(dir);
	if (runs.length !== 1 || runs[0] === undefined) throw new RangeError(`swt run of ${name} wrote ${String(runs.length)} run folders`);
	return Value.Parse(RunManifestSchema, JSON.parse(readFileSync(join(dir, runs[0], "manifest.json"), "utf8")));
}

describe("the game hash of the four existing games", () => {
	it.each(PINNED)("%s: its manifest parses and names the hash of before M3", (name, hash) => {
		const manifest = manifestOf(name);
		expect(manifest.game.hash).toBe(hash);
		expect(manifest.human).toBeUndefined();
	});
});
