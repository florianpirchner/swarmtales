// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The variant `briefed` of the city slice (issue M3-33), offline: off, the family gives the game of the committed
 * timelines; on, every resident has the briefing, the court's notice is an input line of every resident in the
 * tick the session opens, and the scripted run plays to its end and replays. The run folder (`swt run --set
 * briefed=true`, `swt log verify`) is in `apps/cli/test/city-slice-briefed.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { turns } from "@swarmtales/engine";
import { resolveGame, type ResolvedGame } from "@swarmtales/sdk";
import { replay, testKernel } from "@swarmtales/testkit";
import { briefing } from "../briefing.ts";
import sliceFamily from "../family.ts";
import game, { sliceGame } from "../game.ts";
import { drivers, RECORDS, resolved, TICKS } from "./support.ts";

const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const TEXT = briefing({ residents: RESIDENTS, startPoints: 30, ticks: 12, opensAt: 4, closesAt: 6, window: 2 });
const TOOLS = ["transferPoints", "readBoard", "postBoard", "sendDM", "vote"];
const NOTICE = "[CITY] The court is in session since tick 4 and closes at the start of tick 6.";

const family = (params?: { briefed: boolean }): ResolvedGame => resolveGame({ game: sliceFamily, ...(params === undefined ? {} : { params }), seed: 7, schedulers: { turns }, prompts: { render: (_owner, id) => id }, records: RECORDS });

describe("the variant briefed", () => {
	it("is off by default: the family without a param is the game of the timelines, with its hash and without a briefing", () => {
		const [plain, off] = [resolved(7), family()];
		expect(off.data).toEqual(plain.data);
		expect([off.definition.game.hash, off.briefings, off.params]).toEqual([plain.definition.game.hash, {}, { briefed: false }]);
		expect(JSON.parse(JSON.stringify(sliceGame()))).toEqual(JSON.parse(JSON.stringify(game)));
		expect(family({ briefed: true }).definition.game.hash).not.toBe(plain.definition.game.hash);
	});

	it("gives every resident the same briefing: the place, the points, the tools of its grant, the session and the banishing, and no instruction", () => {
		const on = family({ briefed: true });
		expect(on.briefings).toEqual(Object.fromEntries(RESIDENTS.map((id) => [`resident:${id}`, TEXT])));
		expect(game.grants?.resident).toEqual(TOOLS);
		for (const tool of TOOLS) expect(TEXT, tool).toContain(tool);
		for (const part of ["starts with 30 points", "opens at the start of tick 4 and closes at the start of tick 6", "at the start of tick 8", "A banished resident has no further turn"]) expect(TEXT).toContain(part);
		expect(TEXT).not.toMatch(/\b(you|should|must|try)\b/i);
	});

	it("plays the scripted run to its end and replays; in tick 4 every resident's activation holds the court's notice", async () => {
		const briefed = sliceGame({ briefed: true });
		const { kernel } = testKernel(briefed, { seed: 7, records: RECORDS });
		expect(await kernel.run(drivers(7), { ticks: TICKS })).toEqual({ reason: "ticks", tick: TICKS });
		const log = kernel.log.all();
		const opened = log.filter((event) => event.type === "activation_opened" && event.actor.startsWith("resident:"));
		const noticed = opened.filter((event) => JSON.stringify(event.payload).includes(NOTICE));
		expect(noticed.map((event) => [event.tick, event.actor]).sort()).toEqual(RESIDENTS.map((id) => [4, `resident:${id}`]));
		expect(log.filter((event) => event.type === "notice" && event.tick === 4)).toHaveLength(RESIDENTS.length);
		// The story of the script is the story of the timeline: three votes against A04, the verdict, the exile at tick 8.
		expect(log.filter((event) => ["session_closed", "exiled", "verdict"].includes(event.type)).map((event) => [event.tick, event.type, event.payload])).toEqual([
			[6, "session_closed", { tally: { A02: 2, A04: 3 } }],
			[8, "exiled", { agent: "A04", by: "court" }],
			[8, "verdict", { exiled: "A04", decision: "D1" }],
		]);
		const again = await replay({ game: briefed, log, records: RECORDS });
		expect([again.equal, again.firstDifference, again.log.length]).toEqual([true, undefined, log.length]);
		// The game of the timelines does not replay this log: the two variants are two games.
		expect((await replay({ game, log, records: RECORDS })).equal).toBe(false);
	});
});
