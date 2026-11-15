// SPDX-License-Identifier: Apache-2.0
/**
 * Sample 6 in process: the steward amends the crew's choice on a structured answer, keeps it on its fallback, and
 * the game holds the standing checks (replay, and resume from every boundary) with both answers. No model is asked:
 * the asker is a function of the test.
 */
import type { AskModel, DriverTable, Envelope, Kernel } from "@swarmtales/contracts";
import { createDirectorDrivers, DIRECTOR_RECORDS, turns } from "@swarmtales/engine";
import { resolveGame } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { STEWARD_FALLBACK } from "../src/index.ts";

const SEED = 5;
const RECORDS = [DIRECTOR_RECORDS];

/** An asker that gives every question the same answer; it keeps nothing, so a resumed run asks as the straight one. */
const answering =
	(value: unknown): AskModel =>
	() =>
		Promise.resolve({ ok: true, value, costUsd: 0 });

/** The steward wants A02 and says why. */
const AMEND = answering({ captain: "A02", line: "A02 knows these waters." });
/** An answer that does not fit the output: the steward takes its fallback. */
const UNFIT = answering({ captain: "" });

/** The drivers of a run: the fake driver for the residents, the steward's driver with the given asker. */
const driversWith =
	(ask: AskModel) =>
	(kernel: Kernel): DriverTable => {
		const resolved = resolveGame({ game, seed: SEED, schedulers: { turns }, prompts: { render: (_owner, id) => id }, records: RECORDS });
		return { resident: fakeDriver(kernel, SEED), ...createDirectorDrivers({ game: resolved, ask }) };
	};

const told = (events: readonly Envelope[]): readonly unknown[] =>
	events.filter((event) => ["decision_proposed", "answered", "decision_amended", "remarked", "captain_named"].includes(event.type)).map((event) => [event.tick, event.type, event.payload]);

describe("sample 6: the steward in process", () => {
	it("a structured answer: the steward amends the crew's choice, says its line, and its captain is named", async () => {
		const { events, end } = await play(game, { seed: SEED, drivers: driversWith(AMEND), records: RECORDS });
		expect(end?.reason).toBe("limit");
		expect(told(events)).toMatchObject([
			[0, "decision_proposed", { decision: "D1", kind: "crew.captain", proposal: { captain: "A03" }, deadline: 2, holders: ["human", "director:steward"] }],
			[0, "answered", { ok: true, fallback: false }],
			[0, "decision_amended", { decision: "D1", n: 1, by: "director:steward", proposal: { captain: "A02" }, reason: "A02 knows these waters." }],
			[0, "remarked", { line: "A02 knows these waters." }],
			[2, "captain_named", { captain: "A02", changed: true }],
		]);
	});

	it("an answer that does not fit: the fallback keeps the crew's choice and says the fallback line", async () => {
		const { events } = await play(game, { seed: SEED, drivers: driversWith(UNFIT), records: RECORDS });
		expect(told(events)).toMatchObject([
			[0, "decision_proposed", { proposal: { captain: "A03" } }],
			[0, "answered", { ok: false, fallback: true, reason: "invalid" }],
			[0, "remarked", { line: STEWARD_FALLBACK }],
			[2, "captain_named", { captain: "A03", changed: false }],
		]);
	});

	it.each([
		{ name: "answered", ask: AMEND },
		{ name: "fallback", ask: UNFIT },
	])("$name: the log replays equal, and resumed from every boundary it is the straight log", async ({ ask }) => {
		const options = { seed: SEED, records: RECORDS };
		expect(await checkReplay(game, driversWith(ask), options)).toEqual([]);
		expect(await checkResumeEveryBoundary(game, driversWith(ask), options)).toEqual([]);
	});
});
