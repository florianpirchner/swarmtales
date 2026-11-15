// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rules of the allowance, carried from the old `test/mechanics/marks/marks.test.ts` ("the rules of the
 * allowance"): the old scenarios drove `MarksApi` at the start of their minutes; here they drive the same functions of
 * the book at the same ticks, with the level set as the old stand-in of the progression set it.
 */
import { describe, expect, it } from "vitest";
import { canAfford, spend, statusOf, type Channel, type MarksState, type Rules } from "../src/index.ts";

const RANGES: Rules = {
	fromLevel: 1,
	perLevel: 4,
	prices: { board: 0, group: 1, dm: 2 },
	ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 1 } }, { fromLevel: 5, perLevel: 2 }],
};

/** What a scenario can do at a tick, as the old probe could at the start of a minute. */
interface Probe {
	up(agent: string, to: number): void;
	spend(agent: string, channel: Channel): string;
	left(agent: string): string;
	canAfford(agent: string, channel: Channel): boolean;
}

const show = (status: { readonly remaining: number; readonly budget: number } | undefined): string => (status === undefined ? "none" : `${String(status.remaining)}/${String(status.budget)}`);

function scenario(rules: Rules, steps: Readonly<Record<number, (probe: Probe) => void>>, options: { readonly overrides?: ReadonlyMap<number, number>; readonly startLevel?: number } = {}): void {
	const state: MarksState = { allowances: new Map(), shown: new Map() };
	const levels = new Map<string, number>();
	for (const [tick, step] of Object.entries(steps)) {
		const book = { rules, overrides: options.overrides ?? new Map<number, number>(), levelOf: (agent: string) => levels.get(agent) ?? options.startLevel ?? 1, tick: Number(tick) };
		step({
			up: (agent, to) => levels.set(agent, to),
			spend: (agent, channel) => show(spend(state, book, agent, channel)),
			left: (agent) => show(statusOf(state, book, agent)),
			canAfford: (agent, channel) => canAfford(state, book, agent, channel),
		});
	}
}

describe("the rules of the allowance", () => {
	it("takes allowance, prices and refill from the range of the level, and refills one mark per minute up to the allowance", () => {
		const seen: unknown[] = [];
		scenario(RANGES, {
			0: (probe) => {
				probe.up("A01", 3);
				seen.push([1, probe.left("A01"), probe.spend("A01", "dm"), probe.spend("A01", "dm"), probe.spend("A01", "dm"), probe.spend("A01", "dm"), probe.left("A01"), probe.canAfford("A01", "board")]);
				seen.push([2, probe.spend("A02", "dm"), probe.left("A02")]);
			},
			2: (probe) => seen.push([3, probe.left("A01"), probe.left("A01")]),
			30: (probe) => {
				seen.push([4, probe.left("A01"), probe.spend("A01", "dm")]);
			},
			31: (probe) => seen.push([5, probe.left("A01")]),
			40: (probe) => seen.push([6, probe.left("A02")]),
		});
		expect(seen).toEqual([
			[1, "4/4", "3/4", "2/4", "1/4", "0/4", "0/4", false],
			[2, "2/4", "2/4"],
			[3, "2/4", "2/4"],
			// A full allowance banks nothing: one spend later, one minute gives one mark back.
			[4, "4/4", "3/4"],
			[5, "4/4"],
			// Without a refill (level 1) nothing comes back.
			[6, "2/4"],
		]);
	});

	it("is free below its first level, and a level change gives a fresh allowance of the new level", () => {
		const seen: unknown[] = [];
		const rules: Rules = { fromLevel: 5, perLevel: 8, prices: { board: 0, group: 1, dm: 2 } };
		scenario(
			rules,
			{
				0: (probe) => {
					seen.push([probe.left("A01"), probe.spend("A01", "dm"), probe.canAfford("A01", "dm")]);
					probe.up("A01", 5);
					seen.push([probe.left("A01"), probe.spend("A01", "dm"), probe.spend("A01", "board"), probe.spend("A01", "receipt")]);
					probe.up("A01", 6);
					seen.push([probe.left("A01"), probe.canAfford("A01", "dm")]);
				},
			},
			{ overrides: new Map([[6, 3]]), startLevel: 4 },
		);
		expect(seen).toEqual([
			["none", "none", true],
			// Level 5: 8 marks, a DM costs 2, the board is free, a receipt costs 1 where the game names no price.
			["8/8", "6/8", "6/8", "5/8"],
			// Level 6 has its own allowance (3): a DM costs 2, so one more is affordable, the second not.
			["3/3", true],
		]);
	});

	it("keeps one balance for the whole run with a run-wide allowance (Whispers)", () => {
		const seen: unknown[] = [];
		scenario({ fromLevel: 1, perRun: 5, prices: { board: 1, group: 1, dm: 1, receipt: 2 } }, {
			0: (probe) => seen.push([probe.spend("A01", "dm"), probe.spend("A01", "receipt")]),
			1: (probe) => {
				probe.up("A01", 2);
				seen.push([probe.left("A01"), probe.spend("A01", "board")]);
			},
		});
		expect(seen).toEqual([["4/5", "2/5"], ["2/5", "1/5"]]);
	});
});
