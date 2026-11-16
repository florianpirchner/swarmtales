// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { readText } from "./files.ts";
import { CHECK_BUDGET, failures, GATES, groupMemoryMb, lanes, summary, type CheckRun, type GateResult } from "./check-run.ts";

const passed = (peakMb = 100, seconds = 1): readonly GateResult[] => GATES.map((gate) => ({ name: gate.name, ok: true, seconds, peakMb }));
const run = (results: readonly GateResult[], seconds = 1, peakMb: number | undefined = 100): CheckRun => ({ results, seconds, peakMb });

describe("pnpm check", () => {
	it("has the decided budget: ten minutes and 6 GB", () => {
		expect(CHECK_BUDGET).toEqual({ seconds: 600, memoryMb: 6144 });
	});

	it("runs only scripts that package.json defines, and the typecheck and lint in 4 GB heaps", () => {
		const scripts = JSON.stringify(JSON.parse(readText("package.json")));
		for (const gate of GATES) expect(scripts).toContain(`"${gate.command[1] ?? ""}":`);
		expect(scripts).toContain('"lint":"node scripts/lint.ts"');
		expect(readText("scripts/lint.ts")).toContain('fork(import.meta.filename, ["--worker"], { execArgv: ["--max-old-space-size=4096"');
		expect(scripts).toContain('"check":"node scripts/check.ts"');
		// The API reports read the build only, so they need no order of the packages (M5-103).
		expect(scripts).toContain('"api":"pnpm -r --no-sort api"');
	});

	it("runs every gate once, and the build and the API reports after the typecheck in the same lane", () => {
		const byLane = lanes(GATES);
		expect(byLane.flat().map((gate) => gate.name).sort()).toEqual(GATES.map((gate) => gate.name).sort());
		const types = byLane.find((gates) => gates.some((gate) => gate.name === "build")) ?? [];
		expect(types.map((gate) => gate.command.join(" "))).toEqual(["pnpm lint", "pnpm build", "pnpm api"]);
		expect(lanes([{ name: "b", command: [], lane: 2 }, { name: "a", command: [], lane: 0 }, { name: "c", command: [], lane: 2 }]).map((gates) => gates.map((gate) => gate.name))).toEqual([["a"], ["b", "c"]]);
	});

	it("runs the tests on two Vitest workers (M5-103, after decision A112)", () => {
		expect(GATES.filter((gate) => gate.command[1] === "test").map((gate) => gate.command)).toEqual([["pnpm", "test", "--maxWorkers=2"]]);
	});

	it("sums the memory of one process group", () => {
		const ps = "  100  2048\n  100 1024\n  200 4096\n\n";
		expect(groupMemoryMb(ps, 100)).toBe(3);
		expect(groupMemoryMb(ps, 300)).toBe(0);
	});

	it("is green when every gate passes inside the budget", () => {
		expect(failures(run(passed()))).toEqual([]);
		expect(summary(run(passed()))).toContain("pnpm check: green");
		expect(summary({ results: passed(), seconds: 1, peakMb: undefined })).toContain("peak memory not measured");
	});

	it("fails on a failed gate, a gate that did not run, and a crossed budget of the whole", () => {
		expect(failures(run([{ name: "layer check", ok: false, seconds: 1, peakMb: 1 }]))).toEqual([
			'the gate "layer check" failed',
			`${GATES.length - 1} gate(s) did not run`,
		]);
		// The time is the time of the whole, not the sum of the gates: the lanes run side by side.
		expect(failures(run(passed(100, 400), 500))).toEqual([]);
		expect(failures(run(passed(100, 80), 640))).toEqual(["the check took 640 s; the budget is 600 s"]);
		// The memory is that of all gates at once, which no single gate shows.
		expect(failures(run(passed(3000), 1, 7000))).toEqual(["the check used 7000 MB; the budget is 6144 MB"]);
		expect(summary(run(passed().map((result, index) => ({ ...result, ok: index !== 2 }))))).toContain("pnpm check: FAILED");
	});
});
