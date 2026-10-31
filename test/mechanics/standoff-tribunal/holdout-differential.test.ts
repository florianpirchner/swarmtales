/**
 * The holdout tribunal against the old engine (team T4b, carve-round2-T4.md "Gate"): the golden log
 * of Whispers only finds blockers, so every later path runs as a scripted scenario on the old
 * `HoldoutTribunal` and on the new host, and the events, posts, notices, notes, strikes, replies,
 * every resident's status each minute and the DM cap exemptions must be equal.
 */
import { describe, expect, it } from "vitest";
import { newRun, playNew, recordOf, runOld, type HoldoutRecord } from "./differential.ts";
import { SCENARIOS } from "./scenarios.ts";

async function runNew(scenario: Parameters<typeof newRun>[0]): Promise<HoldoutRecord> {
	const run = newRun(scenario);
	await playNew(run, scenario);
	return recordOf(run);
}

describe("standoff-tribunal against the old HoldoutTribunal (stand-in puzzles, progression, exile, channels, notes)", () => {
	it.each(SCENARIOS)("%s: the same events, posts, notices, notes, strikes, replies, status and exemptions", async (_name, scenario) => {
		const old = runOld(scenario()).record;
		const now = await runNew(scenario());
		expect(now.events).toEqual(old.events);
		expect(now.posts).toEqual(old.posts);
		expect(now.notices).toEqual(old.notices);
		expect(now.notes).toEqual(old.notes);
		expect(now.strikes).toEqual(old.strikes);
		expect(now.replies).toEqual(old.replies);
		expect(now.status).toEqual(old.status);
		expect(now.exempt).toEqual(old.exempt);
	});

	it("covers every tool's reply, every refusal code and every way a tribunal ends", async () => {
		// One after another: the probe runs one host at a time.
		const records: HoldoutRecord[] = [];
		for (const [, scenario] of SCENARIOS) records.push(await runNew(scenario()));
		const codes = new Set(records.flatMap((record) => record.replies).map((text) => /^([A-Z_]+):/.exec(text)?.[1]));
		for (const code of ["NOT_NOW", "INVALID_ACCUSED", "NOT_A_BLOCKER", "UNKNOWN_AGENT", "INVALID_CANDIDATES", "ALREADY_DRAWN", "NOT_ALLOWED", "NO_LOT", "NOTHING_TO_ANNOUNCE", "TOOL_LOCKED"]) {
			expect(codes, code).toContain(code);
		}
		const types = new Set(records.flatMap((record) => record.events).map((line) => /"type":"([^"]+)"/.exec(line)?.[1]));
		expect(types).toEqual(new Set(["blocker_found", "blocker_cleared", "holdout_called", "lot_drawn", "holdout_vote_opened", "holdout_ballot", "holdout_vote_result", "holdout_announced", "holdout_ended"]));
		const outcomes = new Set(records.flatMap((record) => record.events).flatMap((line) => /"outcome":"([^"]+)"/.exec(line)?.[1] ?? []));
		expect(outcomes).toEqual(new Set(["dropped", "banished", "lot", "spared"]));
		expect(records.some((record) => record.exempt.length > 0)).toBe(true);
		const status = records.flatMap((record) => record.status).filter((line) => !line.endsWith(" []"));
		for (const part of ["tribunal on you: vote", "grace until", "your ballot: no", "you have not voted", "about to strike"]) expect(status.some((line) => line.includes(part)), part).toBe(true);
		expect(records.flatMap((record) => record.notes).length).toBeGreaterThan(0);
		expect(records.flatMap((record) => record.notices).some((line) => line.includes("You now hold its fragment"))).toBe(true);
	});
});
