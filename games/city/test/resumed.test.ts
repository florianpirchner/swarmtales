// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `cityofkeys-act1-s7-resumed.json` against the game (issue M5-46): the old run of `cityofkeys-act1-s7.json`, saved
 * after minute 6 and continued on a fresh instance. By A34 the resumed log equals the straight log once its marker is
 * taken out, so the file is `cityofkeys-act1-s7.json` plus one `resume` entry, and the straight file matches at level 3
 * (`oracle.test.ts`). What is left to prove is the resume on this platform: the game, driven by the file's calls,
 * resumed from every tick boundary, writes the log of its straight run. `runOracle` plays no `resume` entry, so the
 * drivers are the file's script with each actor's activation counted from the kernel's log (a fresh driver after a
 * resume knows nothing), and their straight run is the run `runOracle` compares.
 */
import { join } from "node:path";
import type { Envelope, Kernel } from "@swarmtales/contracts";
import { checkResumeEveryBoundary, playOracle, playStanding, readOracle, scriptedDriver, timelineOf, type OracleEntry, type PlannedCall, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES } from "./support.ts";

const STRAIGHT = readOracle(join(ORACLES, "cityofkeys-act1-s7.json"));
const RESUMED = readOracle(join(ORACLES, "cityofkeys-act1-s7-resumed.json"));

// The actor whose activation an entry of the file opens, as `runOracle` reads it.
function openedBy(entry: OracleEntry): string | undefined {
	if (entry.k === "turn") return `resident:${entry.resident}`;
	return entry.k === "event" && entry.source === "core" && entry.type === "overseer_called" && entry.actor === "gamemaker" ? "director:gamemaker" : undefined;
}

// The calls of each actor, activation by activation (the gamemaker takes its firings first, as `runOracle`'s driver).
function scriptOf(timeline: readonly OracleEntry[]): ReadonlyMap<string, readonly (readonly PlannedCall[])[]> {
	const script = new Map<string, PlannedCall[][]>();
	for (const entry of timeline) {
		const opened = openedBy(entry);
		if (opened !== undefined) script.set(opened, [...(script.get(opened) ?? []), opened.startsWith("director:") ? [{ tool: "take", params: {} }] : []]);
		if (entry.k === "call") script.get(entry.actor === "gamemaker" ? "director:gamemaker" : entry.actor)?.at(-1)?.push({ tool: entry.tool, params: entry.params });
	}
	return script;
}

const isOpening = (actor: string) => (event: Envelope): boolean => event.source === "kernel" && event.type === "activation_opened" && typeof event.payload === "object" && event.payload !== null && Reflect.get(event.payload, "actor") === actor;

// The drivers of the file: at an actor's n-th activation in the log, the calls of its n-th activation in the file.
function fileDrivers(timeline: readonly OracleEntry[]): StandingDrivers {
	const script = scriptOf(timeline);
	return (kernel: Kernel) => {
		const driver = scriptedDriver((activation) => script.get(activation.actor)?.[kernel.log.all().filter(isOpening(activation.actor)).length - 1] ?? []);
		return { resident: driver, director: driver };
	};
}

describe("city: the resumed Act I file", () => {
	it("is the straight file with one resume entry after the look of minute 6 (A34)", () => {
		const at = RESUMED.timeline.findIndex((entry) => entry.k === "resume");
		expect(RESUMED.timeline[at]).toEqual({ k: "resume", minute: 6 });
		expect(RESUMED.timeline[at + 1]).toEqual({ k: "minute", minute: 7 });
		expect(RESUMED.timeline.filter((entry) => entry.k !== "resume")).toEqual(STRAIGHT.timeline);
		expect({ ...RESUMED, timeline: [], source: {}, counts: {} }).toEqual({ ...STRAIGHT, timeline: [], source: {}, counts: {} });
	});

	it("the drivers of the file play the run that runOracle compares", async () => {
		const game = gameOf(STRAIGHT);
		const straight = await playStanding(game, fileDrivers(STRAIGHT.timeline), { seed: STRAIGHT.seed });
		expect(timelineOf(straight.events)).toEqual(timelineOf((await playOracle(STRAIGHT, game)).events));
	}, 120_000);

	it("resumed from every boundary, among them the save after minute 6, the log is the straight log", async () => {
		expect(await checkResumeEveryBoundary(gameOf(RESUMED), fileDrivers(RESUMED.timeline), { seed: RESUMED.seed })).toEqual([]);
	}, 300_000);
});
