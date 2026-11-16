// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Confessor against the old classifier (`12-m5-spec.md` 3.4, "the Confessor"; legacy
 * `test/overseers/classifier.test.ts` and its recording): the scripted run says the old statements, the model
 * answers by the old rule, and the questions and the events are the old ones, with the registered changes of the
 * port: no thoughts or asides (no event carries them), one question per round in place of batches of 60, and the
 * number of a firing as the reference in place of the old log `seq`. The run replays and resumes equal.
 */
import { checkReplay, checkResumeEveryBoundary, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { confessor, ConfessorAnswerSchema, STATEMENT_EVENTS } from "../src/index.ts";
import { drivers, GAME, isPrivate, LINE, OLD, type Asker } from "./confessor-support.ts";
import { lookup } from "./support.ts";

const CONTEXT = "Earlier messages of these conversations (context only, do not label):";
const STATEMENTS = "Statements of this round:";

const textOf = (quoted: string): string => {
	const value: unknown = JSON.parse(quoted);
	return typeof value === "string" ? value : "";
};

// The statements of a question: reference and text of each line after the heading.
const statementsOf = (input: string) => (input.split(`${STATEMENTS}\n`)[1]?.split("\n") ?? []).flatMap((line) => {
	const found = LINE.exec(line);
	return found === null ? [] : [{ ref: Number(found[1]), text: textOf(found[4] ?? '""') }];
});

// The old seq of each statement, by its text (every text of the old script is its own).
const OLD_SEQ = new Map(OLD.prompts.flatMap((prompt) => prompt.split("\n").flatMap((line) => {
	const found = LINE.exec(line);
	return found === null ? [] : [[textOf(found[4] ?? '""'), Number(found[1])] as const];
})));

// The old answer rule (legacy `itemsFor`), on the old seq; every fourth stays unlabelled, unknowns are in the mix.
const oldRule: Asker = (input) => ({
	items: [
		...statementsOf(input).flatMap(({ ref, text }) => {
			const seq = OLD_SEQ.get(text) ?? 0;
			return seq % 4 === 0 ? [] : [{ ref, labels: seq % 7 === 0 ? ["bogus"] : seq % 3 === 0 ? ["promise", "bogus"] : ["threat", "accusation"], targets: seq % 2 === 0 ? ["maren", "A01", "A99", "A03"] : ["A04"] }];
		}),
		{ ref: 99_999, labels: ["lie"] },
	],
});

const fields = (payload: unknown): Readonly<Record<string, unknown>> => (typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {});

async function scripted(ask: Asker) {
	const inputs: string[] = [];
	const { events } = await play(GAME, { drivers: drivers(ask, inputs) });
	const refOf = new Map(inputs.flatMap((input) => statementsOf(input).map(({ ref, text }) => [text, ref] as const)));
	const written = events.filter((event) => event.source.endsWith("/interpretations")).map((event): Readonly<Record<string, unknown>> => ({ type: event.type, ...fields(event.payload) }));
	return { inputs, refOf, written };
}

// An old line with the reference of the new run.
const renumbered = (line: string, refOf: ReadonlyMap<string, number>): string => line.replace(/^#\d+/, `#${String(refOf.get(textOf(LINE.exec(line)?.[4] ?? '""')))}`);

// The old question of a round, merged into one: its batches' contexts and statements, without thoughts and asides.
function oldQuestion(round: number, refOf: ReadonlyMap<string, number>): string {
	const batches = OLD.prompts.filter((prompt) => prompt.startsWith(`Round ${String(round)} `)).map((prompt) => prompt.split("\n"));
	const context = [...new Set(batches.flatMap((lines) => (lines.includes(CONTEXT) ? lines.slice(lines.indexOf(CONTEXT) + 1, lines.indexOf(STATEMENTS) - 1) : [])))];
	const statements = batches.flatMap((lines) => lines.slice(lines.indexOf(STATEMENTS) + 1)).filter((line) => !isPrivate(line));
	const head = batches[0]?.[0] ?? "";
	return [head, "", ...(context.length === 0 ? [] : [CONTEXT, ...context, ""]), STATEMENTS, ...statements].map((line) => renumbered(line, refOf)).join("\n");
}

// The old events without the labels of thoughts and asides, renumbered, each round with its counts of this run.
function oldEvents(refOf: ReadonlyMap<string, number>): readonly Readonly<Record<string, unknown>>[] {
	const textOfSeq = new Map([...OLD_SEQ].map(([text, seq]) => [seq, text]));
	let labeled = 0;
	return OLD.events.flatMap((event): Readonly<Record<string, unknown>>[] => {
		if (event.type === "interpretation") {
			if (event.source === "thought" || event.source === "aside") return [];
			labeled += 1;
			return [{ ...event, ref: refOf.get(textOfSeq.get(Number(event.ref)) ?? "") }];
		}
		const round = { ...event, statements: statementsOf(oldQuestion(Number(event.round), refOf)).length, labeled };
		labeled = 0;
		return [round];
	});
}

describe("the Confessor", () => {
	it("is a Director after every round, taking the round's statements along, and reading the two facts of its mechanic", () => {
		expect(confessor.id).toBe("confessor");
		expect(confessor.acts).toBe("answer");
		expect(confessor.on.map((trigger) => ("event" in trigger ? trigger.event : trigger.every))).toEqual(["arena.round_end", ...STATEMENT_EVENTS]);
		expect(confessor.facts).toEqual(["interpretations.residents", "interpretations.history"]);
		expect(confessor.output).toBe(ConfessorAnswerSchema);
		// The old tool `label`: its description is the answer's.
		expect(ConfessorAnswerSchema).toMatchObject({ description: lookup.render("city-directors", "classifier/tool-label", {}, []) });
	});

	it("asks the old question of each round: the round, the names, the context of earlier rounds, the statements", async () => {
		const { inputs, refOf } = await scripted(oldRule);
		expect(inputs).toHaveLength(4);
		expect(inputs).toEqual([1, 2, 3, 4].map((round) => oldQuestion(round, refOf)));
		expect(inputs[0]).toContain("A02 (called Maren)");
		expect(inputs[1]).toContain(CONTEXT);
		// The city's own post is no statement; the references are the firings' numbers, in log order.
		expect(statementsOf(inputs[0] ?? "").map(({ ref }) => ref)).toEqual([1, 2, 3, 5, 6]);
		expect(confessor.system({ name: "confessor", options: confessor.parseOptions(GAME.directors?.[0]?.options), tick: 1, firings: [], facts: {} })).toBe(lookup.render("city-directors", "classifier/system-plain", {}, []));
	});

	it("writes the old events in the old order, without what the model may not name", async () => {
		const { written, refOf } = await scripted(oldRule);
		expect(written).toEqual(oldEvents(refOf));
		expect(written.filter((event) => event.type === "interpretation_round").map((event) => event.round)).toEqual([1, 2, 3, 4]);
		expect(written.some((event) => JSON.stringify(event).includes("bogus") || JSON.stringify(event).includes("A99"))).toBe(false);
		expect(written.find((event) => event.type === "interpretation" && JSON.stringify(event).includes('"A02"'))).toBeDefined();
	});

	it("fails open: a round without an answer is an error and stays unlabelled, and its messages are context all the same", async () => {
		const { written, inputs, refOf } = await scripted((input, tick) => (tick === 3 ? undefined : oldRule(input, tick)));
		expect(written.filter((event) => event.type !== "interpretation")).toEqual([
			{ type: "interpretation_round", round: 1, classifier: "test/classifier", statements: 5, labeled: 3 },
			{ type: "interpretation_round", round: 2, classifier: "test/classifier", statements: 2, labeled: 1 },
			{ type: "interpretation_error", round: 3, message: "the classifier gave no answer" },
			{ type: "interpretation_round", round: 4, classifier: "test/classifier", statements: 1, labeled: 1 },
		]);
		expect(inputs[3]).toBe(oldQuestion(4, refOf));
	});

	it("asks nothing and writes nothing for a round without statements, as the old classifier (P481)", async () => {
		const inputs: string[] = [];
		const { events } = await play({ ...GAME, end: { ticks: 6 } }, { drivers: drivers(oldRule, inputs) });
		// Round 5 has no statement: its question is empty, which the asker does not send, and no tool is called.
		expect(inputs.map((input) => input === "")).toEqual([false, false, false, false, true]);
		const written = events.filter((event) => event.source.endsWith("/interpretations") && event.type !== "interpretation");
		expect(written.map((event) => [event.type, fields(event.payload).round])).toEqual([1, 2, 3, 4].map((round) => ["interpretation_round", round]));
		expect(events.filter((event) => event.type === "tool_called" && fields(event.payload).as === "interpret")).toHaveLength(4);
	});

	it("replays equal, and resumes equal from every boundary", async () => {
		expect(await checkReplay(GAME, drivers(oldRule))).toEqual([]);
		expect(await checkResumeEveryBoundary(GAME, drivers(oldRule), { boundaries: [0, 1, 2, 3, 4] })).toEqual([]);
	});
});
