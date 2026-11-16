// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * P483 (M5-89): the manifest of a live run names a model for every actor a model plays, and none for the actor
 * `script`, which is no model actor (`docs/RERUN-PLAN-M5.md`, "The models, as the manifests name them"). No request
 * leaves the process.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema } from "@swarmtales/contracts";
import { say, scriptedSource } from "@swarmtales/models";
import { Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runLive } from "../src/live.ts";
import type { CliIo } from "../src/main.ts";

const GAME = fileURLToPath(new URL("./fixtures/bell.ts", import.meta.url));

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-bell-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

describe("the models of a manifest", () => {
	it("names no model for the actor `script`, and the model of every resident", async () => {
		const io: CliIo = { cwd, now: () => new Date("2026-11-16T12:00:00.000Z"), out: () => undefined, err: () => undefined };
		const source = scriptedSource({ "resident:A01": [say(), say()], "resident:A02": [say(), say()] });
		const played = await runLive({ file: GAME, seed: undefined, out: "live", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: `sk-${"b".repeat(37)}` }, source }, io);
		const manifest = Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, played.run ?? "", "manifest.json"), "utf8")));
		const models = manifest.actors.map((actor) => [actor.id, actor.kind, actor.model?.requestedId ?? "no model"]);
		expect(models).toEqual([["resident:A01", "resident", "claude-haiku-5-5"], ["resident:A02", "resident", "claude-haiku-5-5"], ["script", "script", "no model"]]);
	});
});
