// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt run --pause-on` in a fake run of the City (issue M5-48; `12-m5-spec.md` 4.5, A54): the run pauses after the tick
 * in which Act I ends (`progression.act_ended`), which is also the tick in which Act II starts with its deal, writes
 * the snapshot and exits with 3; `swt resume` plays it on with the fake driver to its end, and the resumed log is the
 * straight run's once its marker is taken out (A34). This is how the Act I base of A54 is cut, on the fake driver.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "@swarmtales/cli/src/main.ts";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const GAME = join(import.meta.dirname, "..", "game.ts");
// Seed 7 at the default dials: Act I ends at minute 14 (`standing.test.ts` has the whole Act I of seed 11).
const ARGS = ["--fake", "--set", "minutes=16"];

const Line = Type.Object({ seq: Type.Integer(), tick: Type.Integer(), type: Type.String(), causedBy: Type.Optional(Type.Integer()), basis: Type.Optional(Type.Integer()), payload: Type.Unknown() }, { additionalProperties: true, description: "A line of events.jsonl" });
type Line = Static<typeof Line>;

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-city-pause-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

const swt = (...args: readonly string[]): Promise<number> => main(args, { cwd, now: () => new Date("2026-11-16T12:00:00.000Z"), out: () => undefined, err: () => undefined, env: {} });
const eventsOf = (folder: string): readonly Line[] => readFileSync(join(cwd, folder, "events.jsonl"), "utf8").trimEnd().split("\n").map((line) => Value.Parse(Line, JSON.parse(line)));

// The resumed log as the straight run has it: no marker `run_resumed`, and the positions after it counted without it.
function withoutMarker(events: readonly Line[]): readonly Line[] {
	const marker = events.find((event) => event.type === "run_resumed")?.seq ?? Infinity;
	const back = (seq: number): number => (seq >= marker ? seq - 1 : seq);
	return events.flatMap((event) => (event.seq === marker ? [] : [{ ...event, seq: back(event.seq), ...(event.causedBy === undefined ? {} : { causedBy: back(event.causedBy) }), ...(event.basis === undefined ? {} : { basis: back(event.basis) }) }]));
}

const fromLevel = (payload: unknown): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, "fromLevel") : undefined);
const acts = (events: readonly Line[]): readonly unknown[] => events.filter((event) => event.type === "act_ended" || event.type === "act_started").map((event) => [event.tick, event.type, fromLevel(event.payload)]);

describe("city: swt run --pause-on in a fake run", () => {
	it("pauses after the tick that ends Act I and starts Act II, and resumes to the straight run (A34)", async () => {
		expect(await swt("run", GAME, ...ARGS, "--out", "straight")).toBe(0);
		expect(await swt("run", GAME, ...ARGS, "--out", "base", "--pause-on", "progression.act_ended")).toBe(3);
		const base = eventsOf("base/city-001");
		expect(acts(base)).toEqual([[0, "act_started", 1], [14, "act_ended", 1], [14, "act_started", 8]]);
		expect(base.at(-1)?.tick).toBe(14);
		// Tick 14 is the fifteenth (the first is tick 0): the snapshot is named by the finished ticks.
		expect(readdirSync(join(cwd, "base/city-001/snapshots"))).toEqual(["t15.json"]);
		expect(await swt("resume", "base/city-001", "--game", GAME)).toBe(0);
		const resumed = eventsOf("base/city-002");
		expect(acts(resumed).slice(-1)).toEqual([[16, "act_ended", 8]]);
		expect(withoutMarker(resumed)).toEqual(eventsOf("straight/city-001"));
	}, 300_000);
});
