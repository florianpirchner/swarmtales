// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The last criterion of M1: a run that `swt run --fake` wrote for tic-tac-toe teams opens in the viewer and verifies there. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { indexRun, loadRun, memorySource, verifyRun } from "@swarmtales/viewer-core";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const out = mkdtempSync(join(tmpdir(), "viewer-real-"));
afterAll(() => {
	rmSync(out, { recursive: true, force: true });
});

describe("a run of tic-tac-toe teams written by the command line", () => {
	it("opens in the viewer with its events, its six residents and an ok chain verdict", async () => {
		const played = spawnSync(process.execPath, ["--conditions", "development", "apps/cli/src/bin.ts", "run", "games/tictactoe/game.ts", "--fake", "--seed", "7", "--out", out], { cwd: ROOT, encoding: "utf8" });
		expect(played.status, played.stderr).toBe(0);
		const [name] = readdirSync(out);
		expect(name).toBeDefined();
		const directory = join(out, name ?? "");
		const dir = `runs/${name ?? ""}`;
		const files = Object.fromEntries(readdirSync(directory).map((file) => [`${dir}/${file}`, readFileSync(join(directory, file), "utf8")]));
		const model = await loadRun(memorySource(files), dir);
		expect(model.issues).toEqual([]);
		expect(model.events.length).toBeGreaterThan(100);
		expect(model.events.at(0)?.type).toBe("run_started");
		expect(model.events.at(-1)?.type).toBe("run_ended");
		expect(model.meta).toMatchObject({ storyId: "tictactoe", effective: { agents: 6, seed: 7 } });
		const actors = indexRun(model.events).actors();
		expect(actors.filter((actor) => /^A0[1-6]$/.test(actor)).sort()).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
		expect(verifyRun(model)).toMatchObject({ signed: true, verdict: { ok: true, lines: model.events.length, finished: true } });
	});
});
