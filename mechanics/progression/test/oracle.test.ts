// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of `submitSolution`, the acts, the locks of the levels and the task line: every submission and
 * look of the Whispers and City files is played again at its minute, and the answer (of a look: its open tools), the
 * events of the progression and its locks per resident, and the task a resident reads are compared with the file. The pieces and the receipt ids come from stand-ins that read the file
 * (`support.ts`); the lines the old task carried under it (names, holdout rule, marks terms) are other mechanics'
 * own lines on this platform (erratum J31), so the file's task must start with the progression's.
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation, Envelope } from "@swarmtales/contracts";
import { checkResumeEveryBoundary, play, scriptedDriver, type CallRecord } from "@swarmtales/testkit";
import { callsOf, fixture, gameOf, oldTurns, unnamed, type Fixture } from "./support.ts";

const FILES = [
	["whispers", "whispers-s7"],
	["whispers", "whispers-s11"],
	["whispers", "whispers-holdout-s7"],
	["cityofkeys", "cityofkeys-act1-s7"],
	["cityofkeys", "cityofkeys-act1-s11"],
	["cityofkeys", "cityofkeys-burn-s7"],
] as const;

const residentOf = ({ actor }: { readonly actor: string }): string => actor.slice("resident:".length);

const PLAYED = ["submitSolution", "getStatus", "activeTools"];

function planOf(fix: Fixture) {
	const calls = callsOf(fix.oracle, PLAYED);
	return (activation: Activation) => calls.filter((call) => call.minute === activation.tick && call.resident === residentOf(activation)).map((call) => ({ tool: call.tool, params: { level: call.params.level ?? 0, code: call.params.code ?? "" } }));
}

const answerOf = (record: CallRecord): string => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`);

// The progression's events of each resident, in order: across residents the file's turn order is not the roster's.
function perResident(events: readonly { readonly type: string; readonly payload: unknown }[]): ReadonlyMap<string, readonly string[]> {
	const lines = new Map<string, string[]>();
	for (const { type, payload } of events) {
		const agent = String(typeof payload === "object" && payload !== null ? Reflect.get(payload, "agent") : "");
		lines.set(agent, [...(lines.get(agent) ?? []), `${type} ${JSON.stringify(payload)}`]);
	}
	return lines;
}

const fileEvents = (fix: Fixture) => fix.oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "progression" && ["submission", "level_up", "level_entered", "act_started", "act_ended"].includes(entry.type) ? [entry] : []));
const runEvents = (events: readonly Envelope[]) => events.filter((event) => event.source.endsWith("/progression"));

const Lock = Type.Object({ actor: Type.String(), tool: Type.String(), by: Type.String() });
// The locks the progression wrote, per resident: `tool_locked readBoard`, in order.
function fileLocks(fix: Fixture) {
	const rows = fix.oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "core" && entry.type.startsWith("tool_") && Reflect.get(Object(entry.payload), "by") === "progression" ? [{ type: entry.type, agent: String(Reflect.get(Object(entry.payload), "resident")), tool: String(Reflect.get(Object(entry.payload), "tool")) }] : []));
	return perResident(rows.map(({ type, agent, tool }) => ({ type, payload: { agent, tool } })));
}
function runLocks(events: readonly Envelope[]) {
	const rows = events.flatMap((event) => (event.type.startsWith("tool_") && Value.Check(Lock, event.payload) && event.payload.by.endsWith("progression") ? [{ type: event.type, payload: { agent: event.payload.actor.slice("resident:".length), tool: event.payload.tool.split("/").at(-1) ?? "" } }] : []));
	return perResident(rows);
}

// The notices of a door that opens on the clock (with the task under it, which other mechanics' lines followed on the old platform, J31).
const Notice = Type.Object({ to: Type.String(), text: Type.String() });
const doorNotices = (rows: readonly { readonly type: string; readonly source: string; readonly payload: unknown }[], shown: (text: string) => string): readonly string[] =>
	rows.flatMap((row) => (row.type === "notice" && row.source.endsWith("channels") && Value.Check(Notice, row.payload) && /^Door \d+ is open now/.test(row.payload.text) ? [`${row.payload.to} ${shown(row.payload.text)}`] : []));

// A look's line of the open tools, as the file has it and as the run answered.
const toolLines = (answer: string): readonly string[] => answer.split("\n").filter((line) => /^(unlocked|active) tools: /.test(line));

// The tasks the file showed, by minute and resident.
function fileTasksOf(fix: Fixture): readonly { readonly at: string; readonly text: string }[] {
	const fileTasks: { readonly at: string; readonly text: string }[] = [];
	let minute = 0;
	for (const entry of fix.oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		// The fragment levels only: the values of the additive levels are dealt by `puzzles` (M5-18).
		if (entry.k === "turn") for (const note of entry.inputs) if (note.kind === "task" && !note.text.startsWith("Level 8:")) fileTasks.push({ at: `${String(minute)} ${entry.resident}`, text: unnamed(fix.oracle)(note.text) });
	}
	return fileTasks;
}

describe.each(FILES)("oracle %s/%s", (game, file) => {
	const fix = fixture(game, file);

	it("answers every submission of the file as the file does, and writes the same progression events per resident", async () => {
		const record: CallRecord[] = [];
		const tasks = new Map<string, string>();
		const plan = planOf(fix);
		const driver = scriptedDriver((activation) => {
			const task = activation.inputs.find((note) => note.kind === "task");
			if (task !== undefined) tasks.set(`${String(activation.tick)} ${residentOf(activation)}`, task.text);
			return plan(activation);
		}, record);
		const { events } = await play(gameOf(fix, [], true), { drivers: { resident: driver }, schedulers: { "old-turns": oldTurns } });
		const expected = callsOf(fix.oracle, ["submitSolution"]);
		expect(expected.length).toBeGreaterThan(17);
		const key = (minute: number, resident: string, answer: string) => `${String(minute)} ${resident} ${answer}`;
		expect(record.filter((entry) => entry.tool === "submitSolution").map((entry) => key(entry.tick, residentOf(entry), answerOf(entry))).sort()).toEqual(expected.map((call) => key(call.minute, call.resident, call.answer)).sort());
		expect(perResident(runEvents(events))).toEqual(perResident(fileEvents(fix)));
		// The locks of the levels, and the open tools a look lists.
		expect([...fileLocks(fix).values()].flat().length).toBeGreaterThan(17);
		expect(runLocks(events)).toEqual(fileLocks(fix));
		const fileOpen = doorNotices(fix.oracle.timeline.flatMap((entry) => (entry.k === "event" ? [entry] : [])), unnamed(fix.oracle));
		const runOpen = doorNotices(events, (text) => text);
		expect(runOpen.length).toBe(fileOpen.length);
		for (const [index, line] of runOpen.entries()) expect(fileOpen[index]?.slice(0, line.length)).toBe(line);
		const looks = callsOf(fix.oracle, ["getStatus", "activeTools"]);
		expect(record.filter((entry) => entry.tool !== "submitSolution").map((entry) => key(entry.tick, residentOf(entry), toolLines(answerOf(entry)).join(""))).sort()).toEqual(looks.map((call) => key(call.minute, call.resident, toolLines(call.answer).join(""))).sort());
		// Every task the file showed starts with the progression's task, shown at the same minute.
		const fileTasks = fileTasksOf(fix);
		expect(fileTasks.length).toBeGreaterThan(5);
		for (const { at, text } of fileTasks) expect(`${at} ${text.slice(0, (tasks.get(at) ?? "").length)}`).toBe(`${at} ${tasks.get(at) ?? "(none)"}`);
	});

	it("resumes at every tick boundary to the log of the straight run", async () => {
		expect(await checkResumeEveryBoundary(gameOf(fix), () => ({ resident: scriptedDriver(planOf(fix)) }))).toEqual([]);
	});
});
