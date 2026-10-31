/**
 * The golden gate of the task in a turn's inputs (docs/design/carve-round2-T3.md, "Gate"): the task
 * each resident reads at the start of a turn, with the names line, the holdout rule and the marks
 * terms under it, equals the golden's `turn_input` part that starts with the level, byte for byte.
 * The replay plays each resident's calls at its own turn. The names and the holdout tribunal are the
 * real mechanics (round 3, must-fix 5).
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { dropJustified, goldenTurnInputs, inputPart } from "@swarmtales/testkit";
import { GOLDEN_NAMES, goldenLog, progressionHost, replayTurns, storyOf } from "./harness.ts";

const Pass = Type.Object({ pass: Type.Integer() });
const OWN_STATUS = /^(minute \d+|level \d+|the city never confirms)/;

describe("progression: the task of a turn against the golden", () => {
	it.each(GOLDEN_NAMES)("%s: every turn opens with the golden's task", async (name) => {
		const host = progressionHost(name, []);
		const { tasks, status } = await replayTurns(host, name);
		const lines = goldenLog(name).filter((line) => line.type === "turn_input");
		const finished = storyOf(name).finishedNotice;
		const golden = goldenTurnInputs(goldenLog(name)).map((input, index) => ({
			key: `${input.minute}:${input.agent}:${Parse(Pass, lines[index]).pass}`,
			task: inputPart(input, "Level ") ?? input.inputs.find((part) => part.includes(finished)),
		}));
		const named = golden.flatMap((entry) => (entry.task === undefined ? [] : [entry.task]));
		expect(named.length).toBeGreaterThan(0);
		// The tasks carry the names line (real names) and the holdout rule (real standoff tribunal) as they are.
		const holdout = storyOf(name).holdout?.texts.rule;
		if (holdout !== undefined) expect(named.some((task) => task.includes(holdout))).toBe(true);
		const choose = storyOf(name).names;
		if (choose !== undefined && name.startsWith("cityofkeys")) expect(named.some((task) => task.includes(choose.announcement.replace("{untilMinute}", String(choose.untilMinute))))).toBe(true);
		const mismatches = golden.filter((entry) => entry.task !== tasks.get(entry.key));
		expect(mismatches.map((entry) => entry.key)).toEqual([]);

		// The status line: the parts progression owns (minute, level, the unconfirmed code) in every turn.
		const dropped: string[] = [];
		const wrong = goldenTurnInputs(goldenLog(name)).flatMap((input, index) => {
			const parts = (inputPart(input, "[status] ") ?? "").slice("[status] ".length).split(" · ");
			const { kept } = dropJustified(parts, (part) => !OWN_STATUS.test(part), "points, rank, receipts, marks, goals, held pieces and the name belong to other mechanics' status parts, or need every resident's real points (the twin tests compare the rank with real books)");
			dropped.push(...parts.filter((part) => !kept.includes(part)));
			const key = `${input.minute}:${input.agent}:${Parse(Pass, lines[index]).pass}`;
			const ours = (status.get(key) ?? []).map((part) => part.replace(/^\[status\] /, "")).filter((part) => OWN_STATUS.test(part));
			return JSON.stringify(ours) === JSON.stringify(kept) ? [] : [`${key}: ${JSON.stringify(kept)} / ${JSON.stringify(ours)}`];
		});
		expect(dropped.length).toBeGreaterThan(0);
		expect(wrong).toEqual([]);
	}, 60_000);
});
