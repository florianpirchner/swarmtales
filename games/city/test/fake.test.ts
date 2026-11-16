// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fake run of the City (`swt run --fake`, `12-m5-spec.md` 2.5, rule 11; issue M5-48): the residents and the
 * gamemaker play the old story's run of 80 minutes, both acts, through the `sample` of their tools, the Confessor
 * labels every round on its fallback, and the judge is asked for every blame. The gamemaker steers at direction 10,
 * where it has the ultimatum and residents may defy it; the run of the default dials reaches a subset of the same
 * tools. Every tool a fake run can reach is accepted at least once; the others are listed with the reason none is.
 */
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import { metricsOf, play, readOracle } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { cityGame, CityParams } from "../game.ts";
import { fakeRun, RECORDS } from "./fake.ts";
import { ORACLES } from "./support.ts";

const SEED = 1;

/** The resident tools a fake run reaches. */
const RESIDENT = ["transferPoints", "chooseName", "readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "defy", "showReceipt", "getStatus", "activeTools", "getProblem", "submitSolution", "listAgents", "claimPiece", "payRansom", "lastWill", "vote", "nominate", "join", "refuse", "bid", "permaDeath"];

/** The resident tools a fake run does not reach, and why. */
const UNREACHED: Readonly<Record<string, string>> = {
	signPetition: "locked: no door of the City opens it",
	listPetitions: "locked: no door of the City opens it",
	blame: "called from door 8, and refused with JUDGE_FAILED: the judge of a fake run asks no model and gives no verdict",
};

/** The tools of the Directors a fake run reaches. */
const DIRECTOR = ["take", "interpret", "notify", "boardNote", "ultimatum", "scheduleTribunal"];

/** The refusals a fake run meets: its samples do not count the caps, the marks, the factions or the note checks. */
const REFUSALS = ["GROUP_LIMIT", "FACTION_FULL", "LEAK_BLOCKED", "MAILBOX_SENDER_LIMIT", "NO_MARKS", "JUDGE_FAILED"];

const bare = (event: Envelope): string => event.tool?.split("/").at(-1) ?? "";
const accepted = (events: readonly Envelope[], kind: string): ReadonlySet<string> => new Set(events.filter((event) => event.type === "tool_result" && event.actor.startsWith(`${kind}:`)).map(bare));
const field = (event: Envelope, name: string): unknown => (typeof event.payload === "object" && event.payload !== null ? Reflect.get(event.payload, name) : undefined);

describe("city, played by the fake driver", () => {
	it("lists every resident tool of the old setup as reached or not reached", () => {
		expect([...RESIDENT, ...Object.keys(UNREACHED)].sort()).toEqual([...readOracle(join(ORACLES, "cityofkeys-act1-s7.json")).setup.residentTools].sort());
	});

	it(`seed ${String(SEED)}: plays 80 minutes through both acts and accepts a call of every reachable tool`, async () => {
		const game = cityGame(Value.Parse(CityParams, Value.Default(CityParams, { gmDirection: 10 })));
		const { drivers, review } = fakeRun(game, SEED);
		const { end, events } = await play(game, { seed: SEED, records: RECORDS, review, drivers });
		expect(end).toMatchObject({ reason: "ticks", tick: 80 });
		expect(events.filter((event) => event.type === "act_started").map((event) => field(event, "fromLevel"))).toEqual([1, 8]);
		const residents = accepted(events, "resident");
		for (const tool of RESIDENT) expect(residents.has(tool), tool).toBe(true);
		const directors = accepted(events, "director");
		for (const tool of DIRECTOR) expect(directors.has(tool), tool).toBe(true);
		const refused = events.filter((event) => event.type === "tool_refused");
		expect(refused.some((event) => bare(event) === "blame" && field(event, "code") === "JUDGE_FAILED")).toBe(true);
		expect(events.some((event) => event.type === "asked" && field(event, "answerer") === "judge")).toBe(true);
		expect([...new Set(refused.map((event) => String(field(event, "code"))))].filter((code) => !REFUSALS.includes(code))).toEqual([]);
		// The facts table (issue M5-49): every metric of every loaded mechanic, the Confessor's labels among them, has a value.
		const facts = game.mechanics.flatMap(({ mechanic }) => Object.entries(metricsOf(game, mechanic.id, events)).map(([id, value]) => [`${mechanic.id}.${id}`, value] as const));
		expect(facts.map(([key]) => key)).toContain("interpretations.labelledPromise");
		expect(facts.filter(([, value]) => value === "absent")).toEqual([]);
	}, 120_000);
});
