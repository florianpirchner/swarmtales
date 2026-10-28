/**
 * Cores, goals and the black seal in the run's documents (v09, spec section
 * 7): REPORT.md's facts, minutes.md and the digest's timeline show who each
 * resident was, what it secretly wanted, and who won and broke the seal.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeLog, renderDigest } from "../../src/digest/digest.ts";
import { writeMinuteReport } from "../../src/log/minute-report.ts";
import { JsonlEventLog } from "../../src/log/sinks.ts";
import { computeFacts } from "../../src/report/facts.ts";
import { factsMarkdown } from "../../src/report/render.ts";
import { act, createFixture, say } from "../helpers/fixture.ts";

let directory = "";
let jsonl = "";

beforeAll(async () => {
	directory = mkdtempSync(join(tmpdir(), "arena-drama-"));
	// Act II from minute 0: the auction runs minutes 4-7; A01 wins with 6 and breaks the seal on A02 at minute 8.
	const fixture = createFixture({
		agents: 6,
		level: 8,
		minutes: 10,
		sinks: [new JsonlEventLog(join(directory, "events.jsonl"))],
		script: () => ({
			A01: [say(), say(), say(), say(), act({ name: "bid", args: { points: 6 } }), say(), say(), say(), act({ name: "permaDeath", args: { target: "A02" } }), say()],
			A03: [say(), say(), say(), say(), act({ name: "bid", args: { points: 2 } }), say(), say(), say(), say(), say()],
		}),
	});
	await fixture.run();
	fixture.world.closeActs();
	jsonl = readFileSync(join(directory, "events.jsonl"), "utf8");
});

afterAll(() => {
	rmSync(directory, { recursive: true, force: true });
});

describe("the drama in the run's documents (v09)", () => {
	it("puts cores, goals and the seal into the report's computed facts", () => {
		const facts = computeFacts("run-v09", { events: jsonl });
		expect(facts.residents.every((resident) => resident.core?.startsWith("above all ") === true)).toBe(true);
		expect(facts.goals).toHaveLength(6);
		expect(facts.goals.find((goal) => goal.agent === "A02")?.outcome).toBe("void");
		expect(facts.seals).toMatchObject([{ seal: 1, winner: { agent: "A01", bid: 6 }, used: { target: "A02", minute: 8 } }]);
		const markdown = factsMarkdown(facts).join("\n");
		expect(markdown).toContain("## Cores");
		expect(markdown).toMatch(/\| A01 \| above all \w+/);
		expect(markdown).toContain("## Goals");
		expect(markdown).toMatch(/\| A02 \| 8 \| .+ \| void \|/);
		expect(markdown).toMatch(/\| Black seal \| seal 1: won by A01 for 6 \(#\d+\) \(bids A01 6, A03 2\), broken on A02 at minute 8 \(#\d+\) \|/);
	});

	it("adds Cores and Goals tables to minutes.md", () => {
		const minutes = readFileSync(writeMinuteReport(directory), "utf8");
		expect(minutes).toContain("## Cores\n\n| Agent | Core |");
		expect(minutes).toMatch(/\| A06 \| above all \w+/);
		expect(minutes).toContain("## Goals\n\n| Agent | Act | Goal | Outcome |");
		expect(minutes).toMatch(/\| A02 \| 8 \| .+ \| void \|/);
	});

	it("tells the seal in the timeline and lists cores and goals at its head", () => {
		const timeline = renderDigest(analyzeLog("run-v09", jsonl)).timeline;
		expect(timeline).toContain("## Cores\n\n| Resident | Drives | Temperament |");
		expect(timeline).toContain("## Goals\n\n| Resident | Act | Goal | Outcome |");
		expect(timeline).toContain("A01 bid 6 points in secret for black seal 1.");
		expect(timeline).toContain("A01 won black seal 1 for 6 points (bids: A01 6, A03 2).");
		expect(timeline).toContain("A01 broke black seal 1 on A02.");
		expect(timeline).toContain("A02 was struck from the city by the black seal: exiled.");
	});
});
