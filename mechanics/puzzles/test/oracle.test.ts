// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proofs of the pieces (specification of M3, section 2.5, projections 1 to 3). No City of Keys oracle
 * can be replayed whole, so each proof lays the same selectors over the oracle's timeline and over the log of a
 * run of this platform and compares the two projections byte for byte. Every proof is run a second time against a
 * copy of the oracle that was changed by hand, and must then name the changed event.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { exile } from "@swarmtales/mechanic-exile";
import { eventBurst, OracleSchema, projectionDifference, projectLog, projectOracle, readOracle, testKernel, type Oracle, type OracleEntry, type ProjectedEvent, type ProjectionSelector } from "@swarmtales/testkit";
import { city, judge, ledgerStandIn, prompts, type Options } from "./support.ts";

const pathOf = (file: string): string => resolve(import.meta.dirname, `../../../oracles/cityofkeys/${file}.json`);
// A copy of an oracle file with one text replaced by hand; the copy is still a valid oracle.
function changed(file: string, from: string, to: string): Oracle {
	const text = readFileSync(pathOf(file), "utf8");
	expect(text.split(from)).toHaveLength(2);
	return Value.Parse(OracleSchema, JSON.parse(text.replace(from, to)));
}

const DEAL: readonly ProjectionSelector[] = [{ source: "puzzles", type: "fragments_dealt" }];
// `exiled` has the new field `by` (a registered change), so only `agent` is compared.
const EXILE: readonly ProjectionSelector[] = [
	{ source: "exile", type: "exiled", fields: ["agent"] },
	{ source: "puzzles", type: "factor_burned" },
	{ source: "puzzles", type: "level_contracted" },
];
const dealOf = (seed: number): readonly ProjectedEvent[] => projectLog(testKernel(city(seed), { prompts }).kernel.log.all(), DEAL);

describe("projections 1 and 2: the deal of levels 1 to 7", () => {
	it.each(["cityofkeys-act1-s7", "cityofkeys-act1-s11", "cityofkeys-burn-s7"])("%s: every fragments_dealt payload is byte-equal", (file) => {
		const oracle = readOracle(pathOf(file));
		const expected = projectOracle(oracle.timeline, DEAL);
		expect(expected).toHaveLength(7);
		expect(projectionDifference(expected, dealOf(oracle.seed))).toBeUndefined();
	});

	it.each(["cityofkeys-act1-s7", "cityofkeys-burn-s7"])("%s: a fragment changed by hand in a copy of the oracle is found", (file) => {
		const copy = changed(file, '"fragment":"C88Q3"', '"fragment":"C88Q4"');
		const difference = projectionDifference(projectOracle(copy.timeline, DEAL), dealOf(copy.seed));
		expect(difference?.index).toBe(3);
		expect(JSON.stringify(difference?.expected)).toContain('{"agent":"A04","team":0,"fragment":"C88Q4"}');
		expect(JSON.stringify(difference?.actual)).toContain('{"agent":"A04","team":0,"fragment":"C88Q3"}');
	});

	it("a deal of another seed, a missing level and a changed key order are differences", () => {
		const expected = projectOracle(readOracle(pathOf("cityofkeys-act1-s7")).timeline, DEAL);
		expect(projectionDifference(expected, dealOf(11))?.index).toBe(0);
		expect(projectionDifference(expected, dealOf(7).slice(0, 6))).toEqual({ index: 6, expected: expected[6] });
		expect(projectionDifference(expected.slice(0, 6), dealOf(7))?.expected).toBeUndefined();
		const reordered = projectLog(testKernel(city(7), { prompts }).kernel.log.all(), [{ source: "puzzles", type: "fragments_dealt", fields: ["holdings", "level"] }]);
		expect(reordered[0]?.payload).toEqual(expected[0]?.payload);
		expect(projectionDifference(expected, reordered)?.index).toBe(0);
	});
});

const Entered = Type.Object({ agent: Type.String(), level: Type.Integer() });
const Submitted = Type.Object({ agent: Type.String(), level: Type.Integer(), outcome: Type.String() });
const Exiled = Type.Object({ agent: Type.String() });
const Level = Type.Object({ level: Type.Integer() });

// Where each resident stands, read from the oracle's `progression` events: the last level it entered, and the levels it solved.
function standingsOf(before: readonly OracleEntry[]): NonNullable<Options["standings"]> {
	const standings = new Map<string, { level: number; passed: number[] }>();
	const of = (agent: string) => standings.get(agent) ?? standings.set(agent, { level: 1, passed: [] }).get(agent);
	for (const { type, payload } of projectOracle(before, [{ source: "progression", type: "level_entered" }, { source: "progression", type: "submission" }])) {
		if (type === "level_entered") {
			const entered = Value.Parse(Entered, payload);
			const standing = of(entered.agent);
			if (standing !== undefined) standing.level = entered.level;
		} else {
			const submitted = Value.Parse(Submitted, payload);
			if (submitted.outcome === "correct") of(submitted.agent)?.passed.push(submitted.level);
		}
	}
	return Object.fromEntries(standings);
}

// What the oracle wrote after its first exile, and what a run of this platform writes when the same resident is banished from the same standings.
async function firstExile(oracle: Oracle, dealt = 7): Promise<{ expected: readonly ProjectedEvent[]; actual: readonly ProjectedEvent[]; standings: NonNullable<Options["standings"]> }> {
	const burst = eventBurst(oracle.timeline, "exile", "exiled");
	const before = oracle.timeline.slice(0, burst.index);
	// The oracle holds no direct message before its first exile: there is nothing to give as `dmRecords`.
	expect(projectOracle(before, [{ source: "channels", type: "dm_sent" }])).toEqual([]);
	const standings = standingsOf(before);
	// Registered change: levels 8 to 10 are additive and not dealt, so their `level_contracted` is absent.
	const expected = projectOracle(burst.entries, EXILE).filter((event) => event.type !== "level_contracted" || Value.Parse(Level, event.payload).level <= dealt);
	const { agent } = Value.Parse(Exiled, expected[0]?.payload);
	const test = testKernel(city(oracle.seed, { standings }, (own) => [own, ledgerStandIn(), exile(), judge()]), { prompts });
	const striker = oracle.setup.residents.find((id) => id !== agent) ?? "";
	expect(await test.call(striker, "strike", { target: agent })).toMatchObject({ ok: true });
	return { expected, actual: projectLog(test.kernel.log.all(), EXILE), standings };
}

describe("projection 3: the first exile of cityofkeys-burn-s7", () => {
	it("exiled, factor_burned and level_contracted for levels 5 to 7 are byte-equal, from the standings the oracle reached", async () => {
		const { expected, actual, standings } = await firstExile(readOracle(pathOf("cityofkeys-burn-s7")));
		expect(standings).toEqual(Object.fromEntries(["A01", "A03", "A06", "A04", "A05", "A02"].map((id) => [id, { level: 4, passed: [1, 2, 3] }])));
		expect(expected.map((event) => event.type)).toEqual(["exiled", "factor_burned", "level_contracted", "level_contracted", "level_contracted"]);
		expect(expected[1]?.payload).toEqual({ agent: "A04", level: 4, piece: "L4-fragment", needers: ["A05", "A01"] });
		expect(projectionDifference(expected, actual)).toBeUndefined();
	});

	it.each([
		["the needers in another order", '"needers":["A05","A01"]', '"needers":["A01","A05"]', 1],
		["another piece", '"piece":"L4-fragment","needers":["A05","A01"]', '"piece":"L3-fragment","needers":["A05","A01"]', 1],
		["a level contracted for someone else", '{"level":6,"excluded":["A04"]}', '{"level":6,"excluded":["A05"]}', 3],
	] as const)("a copy of the oracle with %s is found", async (_what, from, to, index) => {
		const { expected, actual } = await firstExile(changed("cityofkeys-burn-s7", from, to));
		expect(projectionDifference(expected, actual)?.index).toBe(index);
	});

	it("a copy in which a teammate had already passed door 4 gives other standings and another burn", async () => {
		// In the copy A05 solved level 4: the run does not burn the fragment for it, but the oracle still names it.
		const copy = changed("cityofkeys-burn-s7", '"payload":{"agent":"A05","level":3,"outcome":"correct"', '"payload":{"agent":"A05","level":4,"outcome":"correct"');
		const { expected, actual, standings } = await firstExile(copy);
		expect(standings.A05).toEqual({ level: 4, passed: [1, 2, 4] });
		expect(projectionDifference(expected, actual)).toMatchObject({ index: 1, actual: { payload: { needers: ["A01"] } } });
	});
});

describe("eventBurst", () => {
	it("cuts the events one cause wrote, and finds none for an event the oracle does not hold", () => {
		const { timeline } = readOracle(pathOf("cityofkeys-burn-s7"));
		const first = eventBurst(timeline, "exile", "exiled");
		const second = eventBurst(timeline, "exile", "exiled", 1);
		expect(first.entries).toHaveLength(10);
		expect(first.entries.every((entry) => entry.k === "event")).toBe(true);
		expect(timeline[first.index + first.entries.length]?.k).toBe("call");
		expect(second.index).toBeGreaterThan(first.index);
		expect(projectOracle(second.entries, EXILE)[0]?.payload).toEqual({ agent: "A02" });
		expect(eventBurst(timeline, "exile", "exiled", 2)).toEqual({ index: -1, entries: [] });
	});
});
