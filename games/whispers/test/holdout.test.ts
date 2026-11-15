// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `whispers-holdout-s7.json` (addition 1 of issue M5-11, issue M5-39): the holdout tribunal to its end. The file is
 * compared at level 3 up to the gamemaker's call of the tribunal, and from there to its end by a projection of the
 * trial at level 1 (`oracles/whispers/README.md`, "Registered changes against the files").
 *
 * The call is made in the look after round 16, which runs in the start slot of tick 16 (J126), and its grace reads
 * that tick (J137): it ends at 19, where the file's ends at 18. Every stage of the trial after it is one tick later
 * than in the file, in step with the gamemaker's looks, so the gamemaker announces the first failed vote and draws
 * the lot in the same looks as on `legacy`. The residents' ballots stay at the file's minutes and still fall into
 * the vote they were cast for; the city's own announcement of a stage, due a tick after the stage began, now comes
 * after the ballots of that tick (the erratum of M5-39 on the trial's minutes).
 */
import { join } from "node:path";
import { playOracle, projectLog, projectOracle, readOracle, runOracle, type Oracle, type ProjectedEvent, type ProjectionSelector } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES, registered } from "./support.ts";

const FILE = join(ORACLES, "whispers-holdout-s7.json");
/** The tick of the look that calls the tribunal. */
const CALL = 16;

/** The file up to the end of the tick before the call (the look after round 16 is the start of tick 16). */
function beforeCall(oracle: Oracle): Oracle {
	const cut = oracle.timeline.findIndex((entry) => entry.k === "minute" && entry.minute === CALL);
	return { ...oracle, timeline: oracle.timeline.slice(0, cut), truncated: { afterMinute: CALL - 1, reason: "the tribunal is called in the next look (J126, J137)" } };
}

const TRIAL = "standoff-tribunal";
const SELECTORS: readonly ProjectionSelector[] = [
	...["holdout_called", "holdout_vote_opened", "holdout_ballot", "holdout_vote_result", "holdout_announced", "lot_drawn", "holdout_ended"].map((type) => ({ source: TRIAL, type })),
	{ source: "exile", type: "exiled" },
];

const UNTIL = /until minute (\d+)/g;
const later = (text: string): string => text.replace(UNTIL, (_all, minute: string) => `until minute ${String(Number(minute) + 1)}`);

// One event of the file's trial as this platform writes it: every `until` one tick later, in the field and in the text.
function shifted(event: ProjectedEvent): ProjectedEvent {
	if (typeof event.payload !== "object" || event.payload === null) return event;
	const payload: Record<string, unknown> = { ...event.payload };
	if (typeof payload.until === "number") payload.until += 1;
	if (typeof payload.text === "string") payload.text = later(payload.text);
	return { ...event, payload };
}

const byCity = (event: ProjectedEvent): boolean => event.type === "holdout_announced" && typeof event.payload === "object" && event.payload !== null && Reflect.get(event.payload, "by") === "city";

/** The file's trial, registered: one tick later, and each announcement of the city right before the next count. */
function registeredTrial(events: readonly ProjectedEvent[]): readonly ProjectedEvent[] {
	const out: ProjectedEvent[] = [];
	let held: ProjectedEvent[] = [];
	for (const event of events.map(shifted)) {
		if (byCity(event)) {
			held.push(event);
			continue;
		}
		if (event.type === "holdout_vote_result") {
			out.push(...held);
			held = [];
		}
		out.push(event);
	}
	return [...out, ...held];
}

describe("whispers-holdout-s7.json", () => {
	it("up to the tribunal's call: runOracle finds no mismatch at level 3", async () => {
		const oracle = beforeCall(registered(readOracle(FILE)));
		expect(oracle.timeline.length).toBeGreaterThan(400);
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	}, 120_000);

	it("the trial to its end: the projection at level 1 is the file's, one tick later from the call", async () => {
		const oracle = readOracle(FILE);
		const { events, end } = await playOracle(oracle, gameOf(oracle));
		const expected = registeredTrial(projectOracle(oracle.timeline, SELECTORS));
		expect(expected.map((event) => event.type)).toContain("lot_drawn");
		expect(projectLog(events, SELECTORS)).toEqual(expected);
		expect(end).toEqual({ reason: "ticks", tick: oracle.end?.minute });
	}, 120_000);
});
