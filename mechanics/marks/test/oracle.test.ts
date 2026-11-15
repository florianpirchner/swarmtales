// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of the marks (the old "golden gate for `marks_spent`"): every priced call and every submission of
 * the Whispers and City files is played again at its tick, the levels following the file's `level_up` after each
 * submission. Compared with the file: the `marks_spent` of each resident, the `marks n/m` part of every status line,
 * the `marks n/m left` part of every reply (the stand-ins of the priced tools write it as `channels` and `receipts`
 * do, from `allowance`: `left` less `priceOf`, erratum J48) and the terms under every task (erratum J31).
 */
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation, ToolOutcome } from "@swarmtales/contracts";
import { AllowanceService } from "@swarmtales/mechanic-contracts";
import { defineGame, defineHead, defineMechanic, refuse, reply, type MechanicUse, type ToolCtxOf } from "@swarmtales/sdk";
import { play, readOracle, scriptedDriver, type CallRecord, type Oracle } from "@swarmtales/testkit";
import { marks, MarksOptions, type Channel } from "../src/index.ts";
import { levelsStandIn } from "./support.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles");
const FILES = ["whispers/whispers-s7", "whispers/whispers-s11", "whispers/whispers-holdout-s7", "cityofkeys/cityofkeys-act1-s7", "cityofkeys/cityofkeys-act1-s11"];
const PRICED: Readonly<Record<string, Channel>> = { postBoard: "board", sendDM: "dm", postGroup: "group", showReceipt: "receipt", forgeReceipt: "receipt" };

const Story = Type.Object({ rules: Type.Object({ marks: Type.Unknown() }), levels: Type.Array(Type.Object({ number: Type.Integer(), opensAt: Type.Optional(Type.Integer()) })) }, { description: "The old story file" });
const Effective = Type.Object({ file: Type.String(), effective: Type.Object({ startLevel: Type.Integer(), lastLevel: Type.Integer() }) }, { description: "The definition of a file" });
const Up = Type.Object({ agent: Type.String(), to: Type.Integer() }, { description: "A level-up" });
const MARKS = /marks \d+\/\d+( left)?/;

interface Play {
	readonly minute: number;
	readonly resident: string;
	readonly tool: string;
	readonly params: { readonly code?: string };
	readonly answer: string;
}

const PLAYED = (tool: string): boolean => PRICED[tool] !== undefined || tool === "submitSolution";

type Entry = Oracle["timeline"][number];

// The call of a resident the test plays, or undefined.
function playOf(entry: Entry, minute: number): Play | undefined {
	if (entry.k !== "call" || !entry.actor.startsWith("resident:") || !PLAYED(entry.tool)) return undefined;
	return { minute, resident: entry.actor.slice("resident:".length), tool: entry.tool, params: entry.ok || entry.code === undefined ? {} : { code: entry.code }, answer: entry.ok ? (entry.reply ?? "") : (entry.code ?? "") };
}

// The calls of the file that the test plays, and per resident the levels each submission entered.
function callsOf(oracle: Oracle): { readonly calls: readonly Play[]; readonly queued: Map<string, number[][]> } {
	const calls: Play[] = [];
	const queued = new Map<string, number[][]>();
	let minute = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k === "event" && entry.type === "level_up") {
			const { agent, to } = Value.Parse(Up, entry.payload);
			queued.get(agent)?.at(-1)?.push(to);
		}
		const call = playOf(entry, minute);
		if (call === undefined) continue;
		if (call.tool === "submitSolution") queued.set(call.resident, [...(queued.get(call.resident) ?? []), []]);
		calls.push(call);
	}
	return { calls, queued };
}

const Answer = Type.Object({ code: Type.Optional(Type.String({ description: "The file's refusal" })) }, { description: "What the file answered" });
const messagesHead = defineHead({ id: "messages", package: "@test/messages", summary: "Test: the priced tools.", uses: [AllowanceService], tools: Object.fromEntries(Object.keys(PRICED).map((tool) => [tool, { description: "Test.", params: Answer, for: ["resident"] as const }])) });

// A refusal of the file, else a reply with the marks part as `channels` writes it: `left` less `priceOf`.
function answer(tool: string, code: string | undefined, ctx: ToolCtxOf<typeof messagesHead>): ToolOutcome {
	if (code !== undefined) return refuse(code);
	const resident = ctx.resident ?? "";
	const left = ctx.tryCall(AllowanceService, "left", { resident });
	const price = ctx.tryCall(AllowanceService, "priceOf", { resident, channel: PRICED[tool] ?? "dm" }) ?? 0;
	return reply(left === undefined || left === null ? "ok" : `ok · marks ${String(left.remaining - price)}/${String(left.budget)} left`);
}

/** The priced tools as stand-ins (see {@link answer}). */
function pricedStandIn(): MechanicUse {
	const tools = Object.fromEntries(Object.keys(PRICED).map((tool) => [tool, { run: ({ code }: Static<typeof Answer>, ctx: ToolCtxOf<typeof messagesHead>) => answer(tool, code, ctx) }]));
	return defineMechanic(messagesHead, { tools })();
}

// The `marks_spent` of each resident in order (across residents the file's order of turns is not the roster's).
function marksSpent(rows: readonly { readonly type: string; readonly payload: unknown }[]): readonly string[] {
	const lines = rows.filter((row) => row.type === "marks_spent").map((row) => JSON.stringify(row.payload));
	return [...lines].sort((a, b) => a.slice(0, 14).localeCompare(b.slice(0, 14)));
}

// The marks part of one input line of the file: of a status line, `-` when it has none; of a task, its terms.
function partOf(at: string, note: { readonly kind?: string; readonly text: string }): readonly string[] {
	if (note.kind === "status") return [`${at} status ${MARKS.exec(note.text)?.[0] ?? "-"}`];
	const terms = /\n(Marks (on this level|for the whole run)[^\n]*)$/.exec(note.text)?.[1];
	return note.kind === "task" && terms !== undefined ? [`${at} task ${terms}`] : [];
}

// The marks parts of the file's turns: `tick resident kind part`, with `-` for a status line without one.
function fileParts(oracle: Oracle): readonly string[] {
	let minute = 0;
	const parts: string[] = [];
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k !== "turn") continue;
		for (const note of entry.inputs) parts.push(...partOf(`${String(minute)} ${entry.resident}`, note));
	}
	return parts;
}

async function playFile(file: string) {
	const oracle = readOracle(resolve(ORACLES, `${file}.json`));
	const definition = Value.Parse(Effective, oracle.setup.definition);
	const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, file.split("/")[0] ?? "", definition.file), "utf8")));
	const { calls, queued } = callsOf(oracle);
	const levels = levelsStandIn({ levels: new Map(), queued, start: definition.effective.startLevel, lastLevel: definition.effective.lastLevel, opensAt: (level) => story.levels.find((entry) => entry.number === level)?.opensAt ?? 0 });
	const residentOf = (activation: { readonly actor: string }) => activation.actor.slice("resident:".length);
	const parts: string[] = [];
	const record: CallRecord[] = [];
	const driver = scriptedDriver((activation: Activation) => {
		const resident = residentOf(activation);
		const status = activation.inputs.find((note) => note.kind === "status" && note.source.endsWith("marks"));
		parts.push(`${String(activation.tick)} ${resident} status ${status?.text ?? "-"}`);
		for (const note of activation.inputs) if (note.kind === "task" && note.source.endsWith("marks")) parts.push(`${String(activation.tick)} ${resident} task ${note.text}`);
		return calls.filter((call) => call.minute === activation.tick && call.resident === resident).map((call) => ({ tool: call.tool, params: call.params }));
	}, record);
	const base = { levels: [], startLevel: definition.effective.startLevel };
	const options = Value.Parse(MarksOptions, story.rules.marks === null || story.rules.marks === undefined ? base : { ...base, rules: story.rules.marks });
	const game = defineGame({ id: "marks-oracle", seed: oracle.seed, residents: [...oracle.setup.residents], mechanics: [levels, pricedStandIn(), marks(options)], scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } }, end: { ticks: oracle.setup.minutes } });
	const { events } = await play(game, { drivers: { resident: driver } });
	return { oracle, calls, events, parts, record };
}

describe.each(FILES)("oracle %s", (file) => {
	// whispers-holdout-s7 shows no receipt, so it spends nothing; the four others spend.
	it("spends, shows and answers the marks of the file", async () => {
		const { oracle, calls, events, parts, record } = await playFile(file);
		const fileSpent = marksSpent(oracle.timeline.flatMap((entry) => (entry.k === "event" ? [entry] : [])));
		expect(marksSpent(events)).toEqual(fileSpent);
		const expected = fileParts(oracle);
		expect(expected.filter((part) => !part.endsWith(" -")).length).toBeGreaterThan(20);
		expect(expected.filter((part) => part.includes(" task ")).length).toBeGreaterThan(5);
		const at = new Set(expected.map((part) => part.split(" ").slice(0, 2).join(" ")));
		expect(parts.filter((part) => at.has(part.split(" ").slice(0, 2).join(" "))).sort()).toEqual([...expected].sort());
		const residentOf = (actor: string) => actor.slice("resident:".length);
		const answers = record.filter((entry) => entry.tool !== "submitSolution").map((entry) => `${String(entry.tick)} ${residentOf(entry.actor)} ${entry.tool} ${entry.outcome.ok ? (MARKS.exec(entry.outcome.reply)?.[0] ?? "-") : entry.outcome.code}`);
		const priced = calls.filter((call) => call.tool !== "submitSolution").map((call) => `${String(call.minute)} ${call.resident} ${call.tool} ${MARKS.exec(call.answer)?.[0] ?? (call.params.code ?? "-")}`);
		expect(priced.some((answer) => MARKS.test(answer))).toBe(true);
		expect([...answers].sort()).toEqual([...priced].sort());
	});
});
