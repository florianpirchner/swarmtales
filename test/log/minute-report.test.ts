import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeEvent, JsonlEventLog } from "../../src/log/sinks.ts";
import { readNames, readRunEnd, readSnapshots, renderMinuteReport, writeMinuteReport } from "../../src/log/minute-report.ts";
import { UsageCollector } from "../../src/log/usage.ts";
import { createFixture, say, submit } from "../helpers/fixture.ts";

describe("minute report, usage and console", () => {
	it("rebuilds minutes.md from the round_end snapshots in events.jsonl", async () => {
		const directory = mkdtempSync(join(tmpdir(), "arena-minutes-"));
		try {
			const fixture = createFixture({
				agents: 2,
				minutes: 2,
				only: 1,
				sinks: [new JsonlEventLog(join(directory, "events.jsonl"))],
				script: (world) => ({ A01: [say(), submit(world, "A01", 1)], A02: [say(), say()] }),
			});
			await fixture.run();
			const path = writeMinuteReport(directory);
			const report = readFileSync(path, "utf8");
			expect(report).toContain("# Minute report");
			expect(report).toContain("## Minute 0 (round 1)");
			expect(report).toContain("## Minute 1 (round 2)");
			expect(report).toContain("| A01 | 2 | 20 | 1 | 21 | yes |");
			expect(report).toContain("## Totals");
			// The report says how the run ended.
			expect(report).toContain("## End\n\nMinute 2: time is up.");
			expect(readSnapshots(readFileSync(join(directory, "events.jsonl"), "utf8"))).toHaveLength(2);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	it("ignores lines that are not snapshots", () => {
		const lines = ['{"type":"text","agent":"A01","text":"x"}', '{"type":"round_end","round":1,"minute":0,"standings":[{"agent":"A01"}]}', ""].join("\n");
		expect(readSnapshots(lines)).toEqual([]);
		expect(renderMinuteReport([], "x")).toContain("# Minute report");
		expect(readRunEnd(['{"type":"run_end","minute":7,"reason":"seats decided"}', lines].join("\n"))).toEqual({ minute: 7, reason: "seats decided" });
		expect(renderMinuteReport([], "x", { minute: 9 })).toContain("Minute 9: time is up.");
	});

	it("shows resident names with their IDs (v08)", () => {
		const lines = [
			'{"type":"name_chosen","agent":"A01","name":"Mira","fallback":false}',
			'{"type":"round_end","round":1,"minute":0,"standings":[{"agent":"A01","level":1,"points":15,"rank":1,"tools":3,"activated":true},{"agent":"A02","level":1,"points":15,"rank":2,"tools":3,"activated":false}]}',
		].join("\n");
		const report = renderMinuteReport(readSnapshots(lines), "x", undefined, readNames(lines));
		expect(report).toContain("| Mira (A01) | 1 | 15 | 1 | 3 | yes |");
		expect(report).toContain("| A02 | 1 | 15 | 2 | 3 | no |");
		expect(report).toContain("| Mira (A01) | 1 | 1 | 15 | 1 |");
	});

	it("sums usage per competitor", () => {
		const usage = new UsageCollector();
		const base = { seq: 1, minute: 0, type: "usage", provider: "p", model: "m", input: 10, output: 2, cacheRead: 1, cacheWrite: 0, costUsd: 0.5 } as const;
		usage.record({ ...base, agent: "A02" });
		usage.record({ ...base, agent: "A01" });
		usage.record({ ...base, agent: "A01" });
		expect(usage.totals()).toEqual({ requests: 3, input: 30, output: 6, cacheRead: 3, cacheWrite: 0, costUsd: 1.5 });
		expect(usage.perAgent().map((entry) => [entry.agent, entry.requests])).toEqual([["A01", 2], ["A02", 1]]);
		expect(usage.summary()).toContain("1.5000 USD");
	});

	it("keeps a resumed run's prefix spend apart from its own (SPEC 17)", () => {
		const usage = new UsageCollector();
		const base = { seq: 1, minute: 0, type: "usage", provider: "p", model: "m", input: 10, output: 2, cacheRead: 1, cacheWrite: 0, costUsd: 0.5 } as const;
		usage.replay({ ...base, agent: "A01" });
		usage.replay({ ...base, agent: "A02" });
		usage.record({ ...base, agent: "A01", costUsd: 0.25 });
		expect(usage.own().totals).toMatchObject({ requests: 1, costUsd: 0.25 });
		expect(usage.prefix().totals).toMatchObject({ requests: 2, costUsd: 1 });
		expect(usage.totals()).toMatchObject({ requests: 3, costUsd: 1.25 });
		expect(usage.perAgent().map((entry) => [entry.agent, entry.requests])).toEqual([["A01", 2], ["A02", 1]]);
		const file = usage.toJSON();
		expect(file.totals.costUsd).toBe(1.25);
		expect(file.own.perAgent.map((entry) => entry.agent)).toEqual(["A01"]);
		expect(file.prefix.perAgent.map((entry) => entry.agent)).toEqual(["A01", "A02"]);
		expect(usage.summary()).toMatch(/^cost: 0\.2500 USD this run \+ 1\.0000 USD before the snapshot = 1\.2500 USD · 1 requests/);
	});

	it("describes events for the console", () => {
		expect(describeEvent({ seq: 1, minute: 3, type: "level_up", agent: "A01", from: 1, to: 2 })).toBe("  A01 reached level 2");
		expect(describeEvent({ seq: 2, minute: 3, type: "usage", agent: "A01", provider: "p", model: "m", input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0 })).toBeUndefined();
	});
});
