/**
 * The golden gate of the puzzles mechanic over the whole run (docs/design/carve-round2-T3.md, "Gate"):
 * with progression opening the doors and the golden's progression calls replayed, the puzzles lines
 * of every minute (the deals behind a door, the released city factors) equal the golden's, not only
 * those of minute 0. The script that releases the city factors is a stand-in (factorScript).
 */
import { describe, expect, it } from "vitest";
import { legacySink } from "@swarmtales/chronicle";
import { compareGolden, ownedBy, type LegacyLine } from "@swarmtales/testkit";
import { goldenLog, GOLDEN_NAMES } from "./harness.ts";
import { factorScript } from "./harness.ts";
import { progressionHost, replay } from "../progression/harness.ts";

/** The levels whose city factor the golden released. */
function released(name: (typeof GOLDEN_NAMES)[number]): readonly number[] {
	return goldenLog(name).flatMap((line) => (line.type === "factor_revealed" && typeof line.level === "number" ? [line.level] : []));
}

describe("puzzles: the golden gate over every minute", () => {
	it.each(GOLDEN_NAMES)("%s: every puzzles line of the run equals the golden's", async (name) => {
		const host = progressionHost(name, [], [factorScript(released(name)).with()], ["revealFactor"]);
		const records: LegacyLine[] = [];
		host.subscribe(legacySink((event) => records.push(Object.fromEntries(Object.entries(event)))));
		await replay(host, name);
		const expected = ownedBy(goldenLog(name), ["puzzles"]);
		// Minute 0 was written before the sink subscribed; the later minutes are the point here.
		const later = expected.filter((line) => !line.includes('"minute":0}'));
		// Whispers deals everything at minute 0; the cityofkeys goldens deal and release behind doors.
		expect(later.length > 0 || name.startsWith("whispers")).toBe(true);
		expect(compareGolden(later, ownedBy(records, ["puzzles"]))).toBeUndefined();
	}, 60_000);
});
