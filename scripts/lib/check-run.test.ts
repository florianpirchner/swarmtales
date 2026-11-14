// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { readText } from "./files.ts";
import { CHECK_BUDGET, failures, GATES, groupMemoryMb, summary, type GateResult } from "./check-run.ts";

const pass = (peakMb = 100, seconds = 1): readonly GateResult[] => GATES.map((gate) => ({ name: gate.name, ok: true, seconds, peakMb }));

describe("pnpm check", () => {
	it("has the decided budget: ten minutes and 6 GB", () => {
		expect(CHECK_BUDGET).toEqual({ seconds: 600, memoryMb: 6144 });
	});

	it("runs only scripts that package.json defines, and lint in a 4 GB heap", () => {
		const scripts = JSON.stringify(JSON.parse(readText("package.json")));
		for (const gate of GATES) expect(scripts).toContain(`"${gate.command[1] ?? ""}":`);
		expect(scripts).toContain('"lint":"node scripts/lint.ts"');
		expect(readText("scripts/lint.ts")).toContain('"--max-old-space-size=4096", "node_modules/eslint/bin/eslint.js"');
		expect(scripts).toContain('"check":"node scripts/check.ts"');
	});

	it("sums the memory of one process group", () => {
		const ps = "  100  2048\n  100 1024\n  200 4096\n\n";
		expect(groupMemoryMb(ps, 100)).toBe(3);
		expect(groupMemoryMb(ps, 300)).toBe(0);
	});

	it("is green when every gate passes inside the budget", () => {
		expect(failures(pass())).toEqual([]);
		expect(summary(pass())).toContain("pnpm check: green");
		expect(summary(pass().map((result) => ({ ...result, peakMb: undefined })))).toContain("peak memory not measured");
	});

	it("fails on a failed gate, a gate that did not run, and a crossed budget", () => {
		const results = pass();
		expect(failures([{ name: "typecheck", ok: false, seconds: 1, peakMb: 1 }])).toEqual([
			'the gate "typecheck" failed',
			`${GATES.length - 1} gate(s) did not run`,
		]);
		expect(failures(pass(100, 80))).toEqual([`the check took ${80 * GATES.length} s; the budget is 600 s`]);
		expect(failures(pass(7000))).toEqual(["the check used 7000 MB; the budget is 6144 MB"]);
		expect(summary(results.map((result, index) => ({ ...result, ok: index !== 2 })))).toContain("pnpm check: FAILED");
	});
});
