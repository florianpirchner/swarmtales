/**
 * The golden gate of the task in a turn's inputs (docs/design/carve-round2-T3.md, "Gate"): the task
 * each resident reads at the start of a turn, with the marks terms under it, equals the golden's
 * `turn_input` part that starts with the level. The replay plays each resident's calls at its own
 * turn. The names announcement and the holdout rule belong to other mechanics and are left out.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { dropJustified, goldenTurnInputs, inputPart } from "@swarmtales/testkit";
import { GOLDEN_NAMES, goldenLog, progressionHost, replayTurns, storyOf } from "./harness.ts";

const Pass = Type.Object({ pass: Type.Integer() });
const NAME_LINE = "Choose the name the city will know you by";

describe("progression: the task of a turn against the golden", () => {
	it.each(GOLDEN_NAMES)("%s: every turn opens with the golden's task", async (name) => {
		const host = progressionHost(name, []);
		const tasks = await replayTurns(host, name);
		const lines = goldenLog(name).filter((line) => line.type === "turn_input");
		const finished = storyOf(name).finishedNotice;
		const golden = goldenTurnInputs(goldenLog(name)).map((input, index) => ({
			key: `${input.minute}:${input.agent}:${Parse(Pass, lines[index]).pass}`,
			task: inputPart(input, "Level ") ?? input.inputs.find((part) => part.includes(finished)),
		}));
		const rule = storyOf(name).holdout?.texts.rule;
		const named = golden.flatMap((entry) => (entry.task === undefined ? [] : [entry.task]));
		expect(named.length).toBeGreaterThan(0);
		// What the strip below removes, said once: a stale exclusion would fail here.
		const dropped = dropJustified(
			named.flatMap((task) => task.split("\n")),
			(line) => line === rule || line.startsWith(NAME_LINE),
			"the names announcement and the holdout rule under a task are the lines of the names and standoff tribunal mechanics",
		);
		expect(dropped.dropped).toBeGreaterThan(0);
		const strip = (task: string | undefined): string | undefined =>
			task === undefined
				? undefined
				: task
						.split("\n")
						.filter((line) => line !== rule && !line.startsWith(NAME_LINE))
						.join("\n")
						// The names mechanic shows a chosen name (Slate-7306) where the ids stand here.
						.replace(/\b(?:[A-Z][a-z]+-\d{4}|A\d{2})\b/g, "<resident>");
		const mismatches = golden.filter((entry) => strip(entry.task) !== strip(tasks.get(entry.key)));
		expect(mismatches.map((entry) => entry.key)).toEqual([]);
	}, 60_000);
});
