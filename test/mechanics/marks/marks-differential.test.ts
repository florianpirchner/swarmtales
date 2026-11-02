/**
 * Differential test of the marks mechanic against the old `MarksBook` (and the wrappers of the old
 * World, `#spend`'s free-channel rule): the same random sequence of level changes, reads, spends and
 * affordability checks, at growing minutes, answers the same, writes the same `marks_spent` events and
 * leaves the same snapshot. The level comes from `ProgressionApi.levelOf` and moves between minutes
 * and within one (a door level). The task line is compared with the old `#withMarks` text.
 */
import { describe, expect, it } from "vitest";
import { MarksBook } from "@swarmtales/engine";
import type { MarksChannel, MarksRules } from "@swarmtales/contracts";
import { defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { marks } from "@swarmtales/mechanic-marks";
import { legacyTurns, MarksApi } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { idleAgent, playStory } from "@swarmtales/testkit";
import { level, puzzle, team } from "@swarmtales/sdk";
import { Type } from "typebox";
import { ids } from "../t1/support.ts";
import { oldRun } from "../../helpers/old-engine-recorder.ts";
import { payloadOf } from "../t1/differential.ts";
import { progressionStandIn } from "../t1/stand-ins.ts";

const CHANNELS: readonly MarksChannel[] = ["board", "group", "dm", "receipt"];

function lcg(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const LEVELS = [1, 2, 3, 4, 5, 6].map((number) => level(number, { title: `Door ${String(number)}`, puzzle: puzzle.fragments([6, 8]), team: team.solo(), reward: 2, tools: ["getStatus"], task: "x", ...(number === 4 ? { marks: { perLevel: 3 } } : {}) }));
const OVERRIDES = [{ level: 4, perLevel: 3 }];

const RULES: readonly (readonly [string, MarksRules])[] = [
	["levels with ranges, refills and an override", { fromLevel: 2, perLevel: 5, prices: { board: 0, group: 1, dm: 2 }, ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1, receipt: 2 }, refill: { marks: 1, everyMinutes: 2 } }, { fromLevel: 5, perLevel: 2, refill: { marks: 2, everyMinutes: 3 } }] }],
	["a run-wide allowance", { fromLevel: 1, perRun: 7, prices: { board: 1, group: 1, dm: 1, receipt: 2 } }],
];

interface Step {
	readonly minute: number;
	readonly agent: string;
	readonly op: "up" | "left" | "spend" | "afford" | "price";
	readonly to: number;
	readonly channel: MarksChannel;
}

function steps(seed: number, count: number): readonly Step[] {
	const random = lcg(seed);
	let minute = 0;
	return Array.from({ length: count }, (): Step => {
		minute += random() < 0.35 ? 1 : 0;
		const op = (["up", "left", "spend", "spend", "spend", "afford", "price"] as const)[Math.floor(random() * 7)] ?? "left";
		return { minute, agent: ids(3)[Math.floor(random() * 3)] ?? "A01", op, to: 1 + Math.floor(random() * 6), channel: CHANNELS[Math.floor(random() * 4)] ?? "dm" };
	});
}

/** The options of the mechanic for the old rules (mutable copies, as the schema's static type has them). */
function optionsOf(rules: MarksRules) {
	const { ranges, perLevel, perRun, ...rest } = rules;
	return { rules: { ...rest, ...(perLevel === undefined ? {} : { perLevel }), ...(perRun === undefined ? {} : { perRun }), ...(ranges === undefined ? {} : { ranges: ranges.map((range) => ({ ...range })) }) }, levels: OVERRIDES };
}

const show = (status: { readonly remaining: number; readonly budget: number } | null | undefined): string => (status === null || status === undefined ? "none" : `${String(status.remaining)}/${String(status.budget)}`);

describe.each(RULES)("the allowance against MarksBook: %s", (_name, rules) => {
	it.each([1, 2, 3, 4])("answers 400 random operations alike (seed %i): replies, events and snapshot", async (seed) => {
		const plan = steps(seed, 400);
		// The new side: the same plan, played at the start of each minute through the API.
		const progression = progressionStandIn();
		for (const id of ids(3)) progression.levels[id] = 1;
		const newReplies: string[] = [];
		const driver = defineMechanic(
			{ id: "driver", summary: "Plays the plan.", options: Type.Object({}), state: () => undefined, events: {}, requires: [MarksApi] },
			() => ({
				hooks: {
					minuteStarted: (ctx) => {
						for (const step of plan) {
							if (step.minute !== ctx.minute) continue;
							if (step.op === "up") {
								progression.levels[step.agent] = step.to;
								newReplies.push("up");
							} else if (step.op === "left") newReplies.push(show(ctx.call(MarksApi, "left", { resident: step.agent })));
							else if (step.op === "afford") newReplies.push(String(ctx.call(MarksApi, "canAfford", { resident: step.agent, channel: step.channel })));
							else if (step.op === "price") newReplies.push(String(ctx.call(MarksApi, "priceOf", { resident: step.agent, channel: step.channel }) ?? "none"));
							else newReplies.push(show(ctx.call(MarksApi, "spend", { resident: step.agent, channel: step.channel })));
						}
					},
				},
			}),
		).with();
		const last = Math.max(...plan.map((step) => step.minute));
		const options = optionsOf(rules);
		const definition = defineCoreStory({ id: "marks-differential", seed: 3, minutes: last + 1, residents: ids(3), mechanics: [progression.use, marks.with(options), driver], grants: {}, turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }) });
		const run = await playStory({ story: definition, prompts: createPromptLookup() }, idleAgent);
		const turnOrder = new Map<number, string[]>();
		for (const event of run.events) {
			if (event.type !== "turn_started") continue;
			turnOrder.set(event.minute, [...(turnOrder.get(event.minute) ?? []), String(payloadOf(event).resident)]);
		}
		// The old side: MarksBook with the world's wrappers, recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`).
		const old = oldRun({ rules, plan, turnOrder: [...turnOrder], last }, OldBook, () => playOldBook(rules, plan, turnOrder, last));
		expect(newReplies).toEqual(old.replies);
		expect(run.events.filter((event) => event.type === "marks_spent").map((event) => `${String(payloadOf(event).agent)}|${String(payloadOf(event).channel)}|${String(payloadOf(event).remaining)}`)).toEqual(old.events);
		const saved = run.host.snapshot().mechanics.marks?.data;
		expect(JSON.parse(JSON.stringify(saved))).toEqual({ allowances: old.allowances });
	});
});

const OldBook = Type.Object({ replies: Type.Array(Type.String()), events: Type.Array(Type.String()), allowances: Type.Array(Type.Unknown()) });

/** The live old MarksBook (recording only; deleted with the engine). */
function playOldBook(rules: MarksRules, plan: readonly Step[], turnOrder: ReadonlyMap<number, readonly string[]>, last: number) {
		let minute = 0;
		const book = new MarksBook(rules, LEVELS, () => minute);
		const levels = new Map<string, number>(ids(3).map((id) => [id, 1]));
		const oldReplies: string[] = [];
		const oldEvents: string[] = [];
				const reads = (): void => {
			// Each resident's turn reads its status line (the host's turn inputs) after the minute's start.
			for (const id of turnOrder.get(minute) ?? []) book.status(id, levels.get(id) ?? 1);
		};
		for (const step of plan) {
			while (minute < step.minute) {
				reads();
				minute += 1;
			}
			minute = step.minute;
			const at = levels.get(step.agent) ?? 1;
			if (step.op === "up") {
				levels.set(step.agent, step.to);
				oldReplies.push("up");
			} else if (step.op === "left") oldReplies.push(show(book.status(step.agent, at)));
			else if (step.op === "afford") oldReplies.push(String(book.canAfford(step.agent, at, step.channel)));
			else if (step.op === "price") oldReplies.push(book.activeOn(at) ? String(book.priceOf(at, step.channel)) : "none");
			else {
				const status = book.priceOf(at, step.channel) === 0 ? book.status(step.agent, at) : book.spend(step.agent, at, step.channel);
				if (status !== undefined && book.priceOf(at, step.channel) !== 0) oldEvents.push(`${step.agent}|${step.channel}|${String(status.remaining)}`);
				oldReplies.push(show(status));
			}
		}
		for (; minute <= last; minute++) reads();
		minute = last;
		return { replies: oldReplies, events: oldEvents, allowances: book.snapshot().map((entry) => ({ ...entry })) };
}

describe("the task line against the old #withMarks text", () => {
	async function lineOf(rules: MarksRules, levelNumber: number): Promise<string | null> {
		let line: string | null = null;
		const driver = defineMechanic(
			{ id: "driver", summary: "Reads the task line.", options: Type.Object({}), state: () => undefined, events: {}, requires: [MarksApi] },
			() => ({ hooks: { minuteStarted: (ctx) => { line = ctx.call(MarksApi, "taskLine", { level: levelNumber }); } } }),
		).with();
		const definition = defineCoreStory({ id: "line", seed: 3, minutes: 1, residents: ids(2), mechanics: [progressionStandIn().use, marks.with({ ...optionsOf(rules), levels: [] }), driver], grants: {} });
		await playStory({ story: definition, prompts: createPromptLookup() }, idleAgent);
		return line;
	}

	it("matches the old texts: per level, with a refill, run-wide and off", async () => {
		const rules: MarksRules = { fromLevel: 2, perLevel: 5, prices: { board: 0, group: 1, dm: 2 }, ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1, receipt: 2 }, refill: { marks: 1, everyMinutes: 1 } }, { fromLevel: 4, refill: { marks: 2, everyMinutes: 3 } }] };
		expect(await lineOf(rules, 1)).toBeNull();
		expect(await lineOf(rules, 2)).toBe("Marks on this level: 5. Prices: board 0, group 1, DM 2, showing a receipt 1. Unused marks expire when you change level.");
		expect(await lineOf(rules, 3)).toBe("Marks on this level: 5. Prices: board 1, group 1, DM 1, showing a receipt 2. You regain 1 mark per minute, up to 5. Unused marks expire when you change level.");
		expect(await lineOf(rules, 4)).toBe("Marks on this level: 5. Prices: board 0, group 1, DM 2, showing a receipt 1. You regain 2 marks every 3 minutes, up to 5. Unused marks expire when you change level.");
		expect(await lineOf({ fromLevel: 1, perRun: 7, prices: { board: 1, group: 1, dm: 1, receipt: 2 } }, 3)).toBe(
			"Marks for the whole run: 7, never more (your status line shows what you have left). Prices: board 1, group 1, DM 1, showing a receipt 2.",
		);
	});
});
