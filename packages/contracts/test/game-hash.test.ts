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

/**
 * The four games of before M3 with the game hash of their manifest, taken before the first change of M3, and pinned
 * again by M6-06: the rename of the mechanic and game ids moves the game hash (`13-m6-spec.md` 4.3).
 */
const PINNED: readonly (readonly [string, string])[] = [
	["hello", "6fd90368d1f7ea83142801fcef589e47b084aa9f12ec64e640c88a4809e670af"],
	["tictactoe", "cc6cf9b9195493d528bfbe560103aeb4fe59d8d9d8ac1ce71d6bf78cfd3dd6a1"],
	["quarry", "a146fca086cc39a064d749efb973ebd6e154df7e5e1e9da15f7f7066ccb567a9"],
	["econ-lab", "4cb7ff3e344d795a9319247b259f4e49ce4ac85a6979b3144176a75332614f4d"],
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
