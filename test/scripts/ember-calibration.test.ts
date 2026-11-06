import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { afterAll, describe, expect, it } from "vitest";
import { expectedTricks, mulberry32 } from "../../scripts/ember-calibration/reference.ts";

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
];

const Output = Type.Object({ total: Type.Object({ total: Type.Object({ n: Type.Integer(), hits: Type.Integer(), zeroShare: Type.Number() }) }) });

describe("ember calibration reference", () => {
	it("rates a hand of top cards above a hand of low cards", () => {
		const high = ["Ash 10", "Brine 9", "Cinder 8", "Dust 7"];
		const low = ["Ash 1", "Brine 2", "Cinder 1", "Dust 2"];
		const strong = expectedTricks(high, 0, 4, SUITS, mulberry32(7), 300);
		const weak = expectedTricks(low, 0, 4, SUITS, mulberry32(7), 300);
		expect(strong).toBeGreaterThan(weak + 1);
	});

	it("is deterministic for a fixed seed and stays within [0, cards]", () => {
		const hand = ["Ash 5", "Ember 6", "Dust 3"];
		const first = expectedTricks(hand, 2, 3, SUITS, mulberry32(42), 200);
		const second = expectedTricks(hand, 2, 3, SUITS, mulberry32(42), 200);
		expect(first).toBe(second);
		expect(first).toBeGreaterThanOrEqual(0);
		expect(first).toBeLessThanOrEqual(3);
	});
});

describe("ember calibration analyzer", () => {
	const dir = mkdtempSync(join(tmpdir(), "ember-calibration-"));
	afterAll(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("tabulates bids against tricks taken for a tiny synthetic run", () => {
		const order = ["A", "B", "C", "D"];
		const events = [
			{ type: "cards_dealt", hands: { A: ["Ash 10"], B: ["Dust 1"], C: ["Dust 2"], D: ["Ember 1"] } },
			{ type: "round_started", game: 1, round: 1, cards: 1, dealer: "D", order },
			{ type: "bid_placed", game: 1, round: 1, seat: "A", bid: 1 },
			{ type: "bid_placed", game: 1, round: 1, seat: "B", bid: 0 },
			{ type: "bid_placed", game: 1, round: 1, seat: "C", bid: 1 },
			{ type: "bid_placed", game: 1, round: 1, seat: "D", bid: 0 },
			{ type: "round_scored", game: 1, round: 1, tricks: { A: 1, B: 0, C: 0, D: 0 } },
		];
		writeFileSync(join(dir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
		const output = execFileSync("npx", ["tsx", "--conditions=development", "scripts/ember-calibration/analyze.ts", dir, "--samples", "50", "--json"], { encoding: "utf8" });
		const report = Value.Parse(Output, JSON.parse(output));
		expect(report.total.total.n).toBe(4);
		expect(report.total.total.hits).toBe(3);
		expect(report.total.total.zeroShare).toBe(0.5);
	}, 60000);
});
