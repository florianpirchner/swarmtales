// SPDX-License-Identifier: Apache-2.0
/**
 * The `puzzles` mechanic after an exile: the listener to `exile.exiled` does what the pieces' part of the old
 * exile's `onExiled` did (the first exile of the oracle `cityofkeys-burn-s7`), after the ledger whatever the game's
 * order is, and `lacking` reads the direct messages.
 */
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { testKernel, type TestKernel } from "@swarmtales/testkit";
import { city, judge, ledgerStandIn, oracleEvents, prompts, written, type Options } from "./support.ts";

// Where the residents of the oracle stand at its first exile: all before door 4, doors 1 to 3 passed.
const AT_DOOR_4 = Object.fromEntries(["A01", "A02", "A03", "A04", "A05", "A06"].map((id) => [id, { level: 4, passed: [1, 2, 3] }]));
const after = (test: TestKernel) => written(test.kernel.log.all(), "ledger", "puzzles").filter(([type]) => type !== "fragments_dealt");
const contracted = (levels: readonly number[], excluded: readonly string[]) => levels.map((level) => ["level_contracted", { level, excluded }]);

async function banished(options: Options, ...residents: readonly string[]): Promise<TestKernel> {
	const test = testKernel(city(7, options), { prompts });
	for (const resident of residents) expect(await test.call("A06", "strike", { target: resident })).toMatchObject({ ok: true });
	return test;
}

describe("a banished holder", () => {
	it("burns the fragment its teammates still need and contracts the levels nobody has reached, as the oracle's first exile", async () => {
		const test = await banished({ standings: AT_DOOR_4 }, "A04");
		const burned = oracleEvents("cityofkeys-burn-s7", "puzzles", "factor_burned")[0];
		expect(burned).toEqual({ agent: "A04", level: 4, piece: "L4-fragment", needers: ["A05", "A01"] });
		// The oracle contracts levels 5 to 10; levels 8 to 10 are additive and not dealt here.
		expect(oracleEvents("cityofkeys-burn-s7", "puzzles", "level_contracted").slice(0, 3)).toEqual(contracted([5, 6, 7], ["A04"]).map(([, payload]) => payload));
		expect(after(test)).toEqual([["ledger_entry", { debit: "A04", reason: "exiled A04" }], ["factor_burned", burned], ...contracted([5, 6, 7], ["A04"])]);
		expect(test.fact("puzzles.exclusions")).toEqual([5, 6, 7].map((level) => ({ level, excluded: ["A04"] })));
	});

	it("gives one factor_burned per held piece and one level_contracted per level from the standing on", async () => {
		// Nothing passed: A04 holds a fragment for a teammate on levels 2, 3 and 4 (level 1 is solo).
		const standings = Object.fromEntries(Object.keys(AT_DOOR_4).map((id) => [id, { level: 4 }]));
		const test = await banished({ standings }, "A04");
		const burns = after(test).filter(([type]) => type === "factor_burned");
		expect(burns.map(([, payload]) => payload)).toMatchObject([2, 3, 4].map((level) => ({ agent: "A04", level, piece: `L${String(level)}-fragment` })));
		expect(after(test).slice(4)).toEqual(contracted([5, 6, 7], ["A04"]));
	});

	it("without standings everyone stands on the first level: nothing burns (level 1 is solo), levels 2 to 7 contract", async () => {
		const test = await banished({}, "A04", "A02");
		const second = [["ledger_entry", { debit: "A02", reason: "exiled A02" }], ...contracted([2, 3, 4, 5, 6, 7], ["A02", "A04"])];
		expect(after(test)).toEqual([["ledger_entry", { debit: "A04", reason: "exiled A04" }], ...contracted([2, 3, 4, 5, 6, 7], ["A04"]), ...second]);
	});

	it("a second exile names both in the game's order, and a holder whose needers are gone burns nothing for them", async () => {
		const test = await banished({ standings: AT_DOOR_4 }, "A04", "A05");
		expect(after(test).slice(5)).toEqual([
			["ledger_entry", { debit: "A05", reason: "exiled A05" }],
			["factor_burned", { agent: "A05", level: 4, piece: "L4-fragment", needers: ["A01"] }],
			...contracted([5, 6, 7], ["A04", "A05"]),
		]);
	});
});

describe("the order of the listeners", () => {
	it("is the same when the game lists puzzles before the ledger: the ledger's burn, then the pieces", async () => {
		const orders = [
			city(7, { standings: AT_DOOR_4 }),
			city(7, { standings: AT_DOOR_4 }, (own) => [own, exile(), judge(), ledgerStandIn()]),
			city(7, { standings: AT_DOOR_4 }, (own) => [exile(), own, ledgerStandIn(), judge()]),
		];
		const logs = [];
		for (const game of orders) {
			const test = testKernel(game, { prompts });
			await test.call("A06", "strike", { target: "A04" });
			logs.push(after(test));
		}
		expect(logs[0]?.map(([type]) => type)).toEqual(["ledger_entry", "factor_burned", "level_contracted", "level_contracted", "level_contracted"]);
		expect(logs[1]).toEqual(logs[0]);
		expect(logs[2]).toEqual(logs[0]);
	});
});

describe("lacking", () => {
	it("lists per holder the teammates before the door without a copy; a direct message with the fragment is a copy", async () => {
		const test = testKernel(city(7, { standings: AT_DOOR_4 }, (own) => [channels(), exile(), judge(), own]), { prompts });
		// Level 4, team 0: A01 holds Q3LY, A04 holds C88Q3, A05 holds LYS (oracle `fragments_dealt`).
		const owed = () => test.fact("puzzles.lacking");
		expect(owed()).toHaveLength(6);
		expect(owed()).toContainEqual({ level: 4, holder: "A04", lacking: ["A01", "A05"] });
		await test.call("A04", "sendDM", { target: "A05", message: "mine is c88-q3, yours?" });
		expect(owed()).toContainEqual({ level: 4, holder: "A04", lacking: ["A01"] });
		await test.call("A06", "strike", { target: "A04" });
		// A banished holder owes nothing, and nobody waits on a banished teammate's copy.
		expect(owed()).toEqual([
			{ level: 4, holder: "A01", lacking: ["A05"] },
			{ level: 4, holder: "A02", lacking: ["A03", "A06"] },
			{ level: 4, holder: "A03", lacking: ["A02", "A06"] },
			{ level: 4, holder: "A05", lacking: ["A01"] },
			{ level: 4, holder: "A06", lacking: ["A02", "A03"] },
		]);
	});
});
