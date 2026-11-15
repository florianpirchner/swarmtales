// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The motives mechanic, carried from the old `test/mechanics/motives/motives.test.ts`: the deals of the oracle files
 * of Whispers (with its whisperer, asked of `whispers`) and the City of Keys (with its seeded cast of figures), one
 * drive above all, seeded and kept, named figures and refused casts, the facts the gamemaker reads, the service
 * `motives`, the core-motive check of a Director's note, the documented options and the resume at every boundary.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkResumeEveryBoundary, idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { MotivesService } from "../src/contract.ts";
import { MotiveRecord, motiveLine, motives, renderMotive } from "../src/index.ts";
import { gameOf, ORACLES, setupOf, type Setup } from "./support.ts";

const Timeline = Type.Object({ setup: Type.Object({ seed: Type.Integer() }), timeline: Type.Array(Type.Object({ k: Type.String(), type: Type.Optional(Type.String()), payload: Type.Optional(Type.Unknown()) })) });

// The `motive_dealt` payloads of an oracle file, and its seed.
function oracle(game: string, file: string): { readonly seed: number; readonly dealt: readonly string[] } {
	const read = Value.Parse(Timeline, JSON.parse(readFileSync(resolve(ORACLES, game, `${file}.json`), "utf8")));
	return { seed: read.setup.seed, dealt: read.timeline.filter((entry) => entry.k === "event" && entry.type === "motive_dealt").map((entry) => JSON.stringify(entry.payload)) };
}

function dealt(test: TestKernel): readonly MotiveRecord[] {
	return test.kernel.log
		.all()
		.filter((event) => event.type === "motive_dealt")
		.map((event) => Value.Parse(MotiveRecord, event.payload));
}

const CITY = setupOf("cityofkeys", "cityofkeys");
const PLAIN: Setup = { motives: { ...CITY.motives } };
delete PLAIN.motives.figures;

describe("the deals of the oracle files", () => {
	it.each([
		["whispers", "whispers-s7", "whispers"],
		["whispers", "whispers-s11", "whispers"],
		["cityofkeys", "cityofkeys-act1-s7", "cityofkeys"],
		["cityofkeys", "cityofkeys-act1-s11", "cityofkeys"],
	])("deals the core motives of %s/%s byte for byte, in the old key order", (game, file, setup) => {
		const old = oracle(game, file);
		expect(old.dealt).toHaveLength(6);
		const test = testKernel(gameOf(setupOf(game, setup), { seed: old.seed }));
		const fresh = test.kernel.log.all().filter((event) => event.type === "motive_dealt");
		expect(fresh.map((event) => JSON.stringify(event.payload))).toEqual(old.dealt);
	});

	it("gives the whisperer the character of the game (A06 in whispers-s7)", () => {
		const setup = setupOf("whispers", "whispers");
		const test = testKernel(gameOf(setup));
		expect(test.fact("whispers.whisperer")).toBe("A06");
		expect(dealt(test).find((entry) => entry.agent === "A06")).toMatchObject({ bigFive: setup.motives.whispererCoreMotive?.bigFive, drives: setup.motives.whispererCoreMotive?.drives });
		const alone = testKernel(gameOf({ motives: setup.motives }));
		expect(dealt(alone).find((entry) => entry.agent === "A06")?.drives).not.toEqual(setup.motives.whispererCoreMotive?.drives);
	});
});

describe("the deal", () => {
	it("gives every resident one core motive with exactly one drive above all", () => {
		const records = dealt(testKernel(gameOf(PLAIN, { residents: 8 })));
		const spec = PLAIN.motives;
		expect(records.map((entry) => entry.agent)).toEqual(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08"]);
		for (const entry of records) {
			expect(entry.drives.filter((drive) => drive.intensity === "aboveAll")).toHaveLength(1);
			expect(entry.drives.length).toBeGreaterThanOrEqual(spec.perResident.min);
			expect(entry.drives.length).toBeLessThanOrEqual(spec.perResident.max);
			expect(entry.bigFive.map((trait) => trait.axis)).toEqual(spec.axes.map((axis) => axis.id));
			expect(entry.figure).toBeUndefined();
		}
		const light = records.filter((entry) => spec.drives.find((drive) => drive.id === entry.drives[0]?.drive)?.tone === "light");
		expect(light).toHaveLength(Math.min(8, Math.round(8 * spec.lightShare)));
	});

	it("deals the same core motives from the same seed, and keeps them for good", async () => {
		const first = dealt(testKernel(gameOf(PLAIN)));
		const test = testKernel(gameOf(PLAIN));
		await test.playTicks(idleDriver, 3);
		expect(dealt(test)).toEqual(first);
		expect(dealt(testKernel(gameOf(PLAIN, { seed: 8 })))).not.toEqual(first);
	});

	it("plays the figures a run names, one per resident, and draws for the rest", () => {
		const ids = (CITY.motives.figures ?? []).map((figure) => figure.id).slice(0, 2);
		const records = dealt(testKernel(gameOf(setupOf("cityofkeys", "cityofkeys", ids))));
		expect(records.flatMap((entry) => (entry.figure === undefined ? [] : [entry.figure])).sort()).toEqual([...ids].sort());
		expect(records.filter((entry) => entry.figure === undefined)).toHaveLength(4);
	});

	it("refuses a cast that names an unknown figure, a figure twice or too many, when the run is set up", () => {
		const all = (CITY.motives.figures ?? []).map((figure) => figure.id);
		const first = all[0] ?? "";
		expect(() => testKernel(gameOf(setupOf("cityofkeys", "cityofkeys", ["nobody"])))).toThrow(/SWT-G020[\s\S]*unknown figure "nobody"/);
		expect(() => testKernel(gameOf(setupOf("cityofkeys", "cityofkeys", [first, first])))).toThrow(/names a figure twice/);
		expect(() => testKernel(gameOf(setupOf("cityofkeys", "cityofkeys", all), { residents: 2 }))).toThrow(/figures for 2 residents/);
	});
});

/** Asks the service `motives`, and stands for a tribunal's note tool with a `reason`. */
const asker = defineMechanic(
	defineHead({
		id: "asker",
		package: "@test/asker",
		summary: "Test: asks the motives; a note with a reason.",
		uses: [MotivesService],
		tools: { ask: { description: "Ask.", params: Type.Object({ resident: Type.String() }), for: ["resident"] }, announce: { description: "Announce.", params: Type.Object({ reason: Type.String() }) } },
	}),
	{
		tools: {
			ask: { run: ({ resident }, ctx) => reply(JSON.stringify([ctx.tryCall(MotivesService, "drivesOf", { resident }), ctx.tryCall(MotivesService, "cuesOf", { resident })])) },
			announce: { run: () => reply("announced") },
		},
	},
);

describe("what others read", () => {
	it("shows the facts the gamemaker reads, in the shapes of its report", () => {
		const test = testKernel(gameOf(CITY));
		const [first] = dealt(test);
		if (first === undefined) throw new Error("no core motive dealt");
		const { agent, ...coreMotive } = first;
		expect(test.fact("motives.lines")).toMatchObject({ [agent]: motiveLine(coreMotive) });
		expect(String(Value.Parse(Type.Record(Type.String(), Type.String()), test.fact("motives.prose"))[agent])).toBe(renderMotive(CITY.motives, coreMotive));
		expect(test.fact("motives.coreMotives")).toMatchObject({ [agent]: { figure: coreMotive.figure } });
	});

	it("answers the drives and the cue words of a resident's core motive through the service motives", async () => {
		const test = testKernel(gameOf(CITY, { more: [asker()] }));
		const [first] = dealt(test);
		const outcome = await test.call("A01", "ask", { resident: "A01" });
		const [drives, cues] = Value.Parse(Type.Tuple([Type.Array(Type.String()), Type.Array(Type.String())]), JSON.parse(outcome.ok ? outcome.reply : "[]"));
		expect(drives).toEqual(first?.drives.map((entry) => entry.drive));
		expect(cues.length).toBeGreaterThan(0);
		const nobody = await test.call("A01", "ask", { resident: "Z99" });
		expect(nobody.ok ? nobody.reply : "").toBe("[null,[]]");
	});
});

describe("the core-motive check of a Director's note", () => {
	it("refuses a note that gives a core motive away in the old words, at stage rule, and lets the others through", async () => {
		const setup: Setup = { motives: { ...CITY.motives, noteTools: ["notify", "boardNote", "announce"] } };
		const test = testKernel(gameOf(setup, { more: [asker()], grants: { script: ["notify", "boardNote", "announce"] } }));
		const note = async (tool: string, params: unknown): Promise<string> => {
			const outcome = await test.kernel.submit({ actor: "script", as: tool, params });
			return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
		};
		const blocked = (who: string) => `PRIVATE_BLOCKED: the text gives away the core motive or the secret goal of ${who}; use them only in a note to that resident`;
		expect(await note("notify", { agent: "A02", text: "A01 is proud deep down. A03 has a secret drive." })).toBe(blocked("A01, A03"));
		expect(await note("boardNote", { text: "Watch A04: above all it wants more." })).toBe(blocked("A04"));
		expect(await note("announce", { reason: "A05 is driven at heart by fear." })).toBe(blocked("A05"));
		expect(await note("notify", { agent: "A01", text: "Deep down, A01, you want to be seen." })).toMatch(/^delivered to A01/);
		expect(await note("boardNote", { text: "Door 2 opens at minute 5." })).toMatch(/^posted as/);
		const refused = test.kernel.log.all().filter((event) => event.type === "tool_refused");
		expect(refused.map((event) => JSON.stringify(event.payload))).toEqual(expect.arrayContaining([expect.stringContaining('"stage":"rule"')]));
	});

	it("refuses a cue word of another resident's drives next to its name", async () => {
		const test = testKernel(gameOf(CITY, { more: [asker()], grants: { script: ["notify"] } }));
		const [first] = dealt(test);
		const outcome = await test.call("A01", "ask", { resident: "A01" });
		const [, cues] = Value.Parse(Type.Tuple([Type.Array(Type.String()), Type.Array(Type.String())]), JSON.parse(outcome.ok ? outcome.reply : "[]"));
		const word = (cues[0] ?? "").replace(/[^a-z0-9 -]/g, "");
		const sent = await test.kernel.submit({ actor: "script", as: "notify", params: { agent: "A02", text: `${first?.agent ?? ""} shows ${word} today.` } });
		expect(sent.ok ? sent.reply : sent.code).toBe("PRIVATE_BLOCKED");
	});
});

describe("standing", () => {
	it("documents its options", () => {
		expect(checkOptionsDocumented(motives)).toEqual([]);
	});

	it("resumes equal at every boundary, with and without the whisperer", async () => {
		expect(await checkResumeEveryBoundary(gameOf(CITY), () => ({ resident: idleDriver }))).toEqual([]);
		expect(await checkResumeEveryBoundary(gameOf(setupOf("whispers", "whispers")), () => ({ resident: idleDriver }))).toEqual([]);
	});
});
