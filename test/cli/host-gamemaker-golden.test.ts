/**
 * The gamemaker overseer with the host-backed report (apps/cli/src/host/report.ts) on the
 * production story mapping (step 18, item 2): the three golden runs replayed on `hostStoryOf` with
 * every mechanic real, the gamemaker no longer driven by the app's `between` but run as the overseer
 * `gamemaker` with its real runtime on the golden run's scripted model (the golden gamemaker's calls
 * at their minutes, as `gamemakerSteps` of test/golden/host-scripts.ts made them). Nothing of the old
 * `World` takes part: the report is written from the mechanics' facts and the overseer's log reads
 * (support/report-replay.ts).
 *
 * Proof (the report gate, C2-4):
 * - every look's input equals the golden `gamemaker_turn.input` byte for byte, look for look;
 * - every line outside the app and every gamemaker app line (`gamemaker_turn`, `_text`, `_call`,
 *   `_result`, the `usage` of `GM` with its token counts, which pin the bytes of the system prompt,
 *   the tool list and the input the model saw) equals the golden's, in order.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { LegacyLine } from "@swarmtales/testkit";
import { goldenLog, minutesOf, RESIDENTS, SEED, storyOf, type GoldenName } from "../mechanics/puzzles/harness.ts";
import { replayOld } from "../helpers/old-engine.ts";
import { isGamemakerLine, looksOf, outsideApp, placed, replayOnHost, type Dials } from "./support/report-replay.ts";

/** The golden runs' dials (test/golden/golden.test.ts). */
const DIALS: Readonly<Record<GoldenName, Dials>> = {
	"cityofkeys-f4g4": { figureDirection: 4, gmDirection: 4, names: true },
	"cityofkeys-f10g10": { figureDirection: 10, gmDirection: 10, names: true },
	"whispers-f10-grudge": { figureDirection: 10, gmDirection: 4, names: false },
};

/**
 * The old system prompt of the golden run's gamemaker (the old composer's, from the story and the dials),
 * as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`).
 */
async function oldSystemPrompt(name: GoldenName): Promise<string> {
	return Promise.resolve(replayOld({ name, story: storyOf(name), dials: DIALS[name] }, Type.String()));
}

describe.each(["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const)("the host-backed gamemaker report on golden %s", (name) => {
	it("writes every golden look's input byte for byte, and the golden's lines outside the app and the gamemaker's, in order", async () => {
		const golden = goldenLog(name);
		const old = { minutes: minutesOf(name), lines: golden, system: await oldSystemPrompt(name), residents: [...RESIDENTS] };
		const run = await replayOnHost(storyOf(name), old, SEED, DIALS[name]);
		const want = looksOf(golden);
		expect(want.length).toBeGreaterThan(10);
		const got = looksOf(run.lines);
		for (const [index, look] of want.entries()) expect(got[index]).toEqual(look);
		expect(got.length).toBe(want.length);
		const kept = (line: LegacyLine): boolean => outsideApp(line) || isGamemakerLine(line);
		expect(golden.filter(isGamemakerLine).length).toBeGreaterThan(30);
		expect(run.lines.filter(kept).map(placed)).toEqual(golden.filter(kept).map(placed));
	}, 120_000);
});
