// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt report` of a Whispers run (issue M5-49, `12-m5-spec.md` 4.7): the facts table of a short fake run has a row
 * for every metric of every mechanic the game loads, with its title, and names no plugin whose metrics are missing.
 * That the metrics have values on a scripted run is `metrics.test.ts`'s.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "@swarmtales/cli/src/main.ts";
import { Value } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { whispersGame, WhispersParams } from "../game.ts";

const GAME = join(import.meta.dirname, "..", "game.ts");

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-whispers-report-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

const swt = (...args: readonly string[]): Promise<number> => main(args, { cwd, now: () => new Date("2026-11-16T12:00:00.000Z"), out: () => undefined, err: () => undefined, env: {} });

describe("whispers: swt report", () => {
	it("writes a facts table with a row for every metric the game exports", async () => {
		expect(await swt("run", GAME, "--fake", "--set", "minutes=3", "--out", "runs")).toBe(0);
		expect(await swt("report", "runs/whispers-001", "--game", GAME)).toBe(0);
		const text = readFileSync(join(cwd, "runs/whispers-001/REPORT.md"), "utf8");
		const metrics = whispersGame(Value.Parse(WhispersParams, Value.Default(WhispersParams, {}))).mechanics.flatMap(({ mechanic }) => mechanic.head.metrics.map((metric) => [`${mechanic.id}.${metric.id}`, metric.title] as const));
		expect(metrics.map(([key]) => key)).toContain("whispers.forgeries");
		for (const [key, title] of metrics) expect(text, key).toContain(`| \`${key}\` | ${title} |`);
		expect(text).not.toContain("metrics absent");
	}, 120_000);
});
