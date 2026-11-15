// SPDX-License-Identifier: Apache-2.0
/**
 * The oracle proof of `submitSolution` and of the task line: every submission of the Whispers and City files is
 * played again at its minute, and the answer, the events of the progression per resident and the task a resident
 * reads are compared with the file. The pieces and the receipt ids come from stand-ins that read the file
 * (`support.ts`); the lines the old task carried under it (names, holdout rule, marks terms) are other mechanics'
 * own lines on this platform (erratum J31), so the file's task must start with the progression's.
 */
import { describe, expect, it } from "vitest";
import type { Activation, Envelope } from "@swarmtales/contracts";
import { checkResumeEveryBoundary, play, scriptedDriver, type CallRecord } from "@swarmtales/testkit";
import { callsOf, fixture, gameOf, unnamed, type Fixture } from "./support.ts";

const FILES = [
	["whispers", "whispers-s7"],
	["whispers", "whispers-s11"],
	["whispers", "whispers-holdout-s7"],
	["cityofkeys", "cityofkeys-act1-s7"],
	["cityofkeys", "cityofkeys-act1-s11"],
	["cityofkeys", "cityofkeys-burn-s7"],
] as const;

const residentOf = ({ actor }: { readonly actor: string }): string => actor.slice("resident:".length);

function planOf(fix: Fixture) {
	const calls = callsOf(fix.oracle, ["submitSolution"]);
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

const fileEvents = (fix: Fixture) => fix.oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "progression" && ["submission", "level_up", "level_entered"].includes(entry.type) ? [entry] : []));
const runEvents = (events: readonly Envelope[]) => events.filter((event) => event.source.endsWith("/progression"));

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
		const { events } = await play(gameOf(fix), { drivers: { resident: driver } });
		const expected = callsOf(fix.oracle, ["submitSolution"]);
		expect(expected.length).toBeGreaterThan(17);
		const key = (minute: number, resident: string, answer: string) => `${String(minute)} ${resident} ${answer}`;
		expect(record.map((entry) => key(entry.tick, residentOf(entry), answerOf(entry))).sort()).toEqual(expected.map((call) => key(call.minute, call.resident, call.answer)).sort());
		expect(perResident(runEvents(events))).toEqual(perResident(fileEvents(fix)));
		// Every task the file showed starts with the progression's task, shown at the same minute.
		const fileTasks: { readonly at: string; readonly text: string }[] = [];
		let minute = 0;
		for (const entry of fix.oracle.timeline) {
			if (entry.k === "minute") minute = entry.minute;
			// The fragment levels only: the additive levels are dealt by `puzzles` (M5-18) and their ladder restarts with the act (M5-20).
			if (entry.k === "turn") for (const note of entry.inputs) if (note.kind === "task" && !note.text.startsWith("Level 8:")) fileTasks.push({ at: `${String(minute)} ${entry.resident}`, text: unnamed(fix.oracle)(note.text) });
		}
		expect(fileTasks.length).toBeGreaterThan(5);
		for (const { at, text } of fileTasks) expect(`${at} ${text.slice(0, (tasks.get(at) ?? "").length)}`).toBe(`${at} ${tasks.get(at) ?? "(none)"}`);
	});

	it("resumes at every tick boundary to the log of the straight run", async () => {
		expect(await checkResumeEveryBoundary(gameOf(fix), () => ({ resident: scriptedDriver(planOf(fix)) }))).toEqual([]);
	});
});
