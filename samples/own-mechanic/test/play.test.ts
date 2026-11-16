// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 5 in process: the two mechanics play, `tryCall` answers undefined without `exile`, an immune id that is
 * no actor is refused, a holder's amendment is what the tribunal commits, and the game passes the conformance
 * checks of the testkit and the standing checks (replay, and resume from every boundary). No model is asked.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import { decisions } from "@swarmtales/mechanic-decisions";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame } from "@swarmtales/sdk";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkReplay, checkResumeEveryBoundary, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, scriptedDriver, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { marks, tribunal } from "../src/index.ts";

const SEED = 3;
const fake = { seed: SEED, drivers: (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, SEED) }) };
// A01, A02 and A03 mark A04; A04 marks A02.
const SCRIPT = { A01: [["mark", { name: "A04" }]], A02: [["mark", { name: "A04" }]], A03: [["mark", { name: "A04" }]], A04: [["mark", { name: "A02" }]] } as const;

const TOLD = ["marked", "decision_proposed", "decision_amended", "exiled", "sentenced"];
const told = (events: readonly Envelope[], types: readonly string[] = TOLD): readonly unknown[] =>
	events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.payload]);

/** The game of the sample with other mechanics: no `exile`, or the mechanics in another order. */
const variant = (mechanics: Parameters<typeof defineGame>[0]["mechanics"]) => defineGame({ id: "own-mechanic", seed: SEED, residents: 4, mechanics, grants: { resident: ["mark"], human: ["amendDecision"] }, end: { ticks: 4 } });

describe("sample 5: marks and tribunal in process", () => {
	it("the marks reach the threshold, the tribunal proposes, the decision settles, and exile banishes", async () => {
		const { events } = await play(game, fake);
		expect(told(events)).toMatchObject([
			[0, "marked", { by: "A02", name: "A03" }],
			[0, "marked", { by: "A04", name: "A02" }],
			[0, "marked", { by: "A01", name: "A04" }],
			[0, "marked", { by: "A03", name: "A02" }],
			[0, "decision_proposed", { decision: "D1", kind: "tribunal.sentence", owner: "tribunal", proposal: { resident: "A02" }, deadline: 1, holders: ["human"] }],
			[1, "exiled", { agent: "A02", by: "tribunal" }],
			[1, "sentenced", { resident: "A02", changed: false, exiled: true }],
		]);
		expect(events.filter((event) => event.type === "tool_refused")).toEqual([]);
	});

	it("without exile, tryCall answers undefined: the sentence stands and nobody is banished", async () => {
		const { events } = await play(variant([tribunal(), marks(), decisions({ holders: ["human"] })]), { seed: SEED, script: SCRIPT });
		expect(told(events, ["exiled", "sentenced"])).toEqual([[1, "sentenced", { resident: "A04", changed: false, exiled: false }]]);
	});

	it("a holder's amendment stands, and the tribunal commits it", async () => {
		const test = testKernel(game, { seed: SEED });
		for (const [resident, calls] of Object.entries(SCRIPT)) for (const [tool, params] of calls) expect((await test.call(resident, tool, params)).ok).toBe(true);
		const amended = await test.kernel.submit({ actor: "human", as: "amendDecision", params: { decision: "D1", proposal: { resident: "A02" }, reason: "A04 was framed" } });
		expect(amended.ok).toBe(true);
		await test.playTicks(idleDriver, 2);
		expect(told(test.kernel.log.all(), ["decision_amended", "sentenced"])).toMatchObject([
			[0, "decision_amended", { decision: "D1", by: "human", proposal: { resident: "A02" } }],
			[1, "sentenced", { resident: "A02", changed: true, exiled: true }],
		]);
	});

	it("refuses an immune id that is no actor of the run, before the run starts", async () => {
		await expect(play(variant([tribunal(), marks({ immune: ["resident:A09"] }), decisions({ holders: ["human"] })]), fake)).rejects.toThrow(/SWT-G020[\s\S]*resident:A09/);
	});

	it("the listener order does not follow the game's order of mechanics", async () => {
		const reordered = variant([marks({ immune: ["resident:A01"] }), decisions({ holders: ["human"] }), exile(), tribunal({ threshold: 2, window: 1 })]);
		expect(told((await play(reordered, fake)).events)).toEqual(told((await play(game, fake)).events));
	});

	it("passes the conformance checks", async () => {
		const manifest: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		for (const mechanic of [marks, tribunal]) {
			expect(checkPackage(mechanic, manifest)).toEqual([]);
			expect(checkOptionsDocumented(mechanic)).toEqual([]);
		}
		// Every resident marks A04 at tick 0, and A04 marks A02: a driver that decides from the activation alone.
		const driver = () => scriptedDriver((activation) => (activation.tick === 0 ? [{ tool: "mark", params: { name: activation.actor === "resident:A04" ? "A02" : "A04" } }] : []));
		expect(await checkDeterminism(game, driver, { seed: SEED })).toEqual([]);
		expect(await checkSnapshotRoundTrip(game, driver, 1, { seed: SEED })).toEqual([]);
	});

	it("the log replays equal, and resumed from each of its 4 boundaries it is the straight log", async () => {
		expect(await checkReplay(game, fake.drivers, { seed: SEED })).toEqual([]);
		expect(await checkResumeEveryBoundary(game, fake.drivers, { seed: SEED })).toEqual([]);
	});
});
