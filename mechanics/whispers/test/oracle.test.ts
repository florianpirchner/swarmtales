// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of the whispers (the old "golden gates for the whisperer, the vote, the duty and the forgery"):
 * the residents' direct messages, ballots and forgery of the three Whispers files are played again at their ticks
 * over the real `ledger`, `channels`, `receipts` and `marks`, with the old arena's draw of turns. Compared with the
 * file: every event of `whispers` in order (the seeded whisperer, the rounds, the ballots, the duty, the forgery), the
 * city's posts and notices of the vote and the duty, the forged show, the points of the vote, the replies of
 * `nameFavourite` and `forgeReceipt`, and the vote's part of every status line.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Activation, Envelope } from "@swarmtales/contracts";
import { play, readOracle, scriptedDriver, type CallRecord, type Oracle } from "@swarmtales/testkit";
import { gameOf, ORACLES, storyOptions } from "./support.ts";

const FILES = [
	{ file: "whispers-s7", story: "whispers" },
	{ file: "whispers-s11", story: "whispers" },
	{ file: "whispers-rumours-s7", story: "whispers-rumours" },
];
const PLAYED = ["sendDM", "nameFavourite", "forgeReceipt"];
const VOTE_PART = /popularity vote \([^)]*\) open until minute \d+ · (?:you have named nobody \(nameFavourite\)|you named \w+)/;

interface Play {
	readonly minute: number;
	readonly resident: string;
	readonly tool: string;
	readonly params: unknown;
	readonly answer: string;
}

type Entry = Oracle["timeline"][number];

// A resident's call of a played tool, or undefined.
function playOf(entry: Entry, minute: number): Play | undefined {
	if (entry.k !== "call" || !entry.actor.startsWith("resident:") || !PLAYED.includes(entry.tool)) return undefined;
	return { minute, resident: entry.actor.slice("resident:".length), tool: entry.tool, params: entry.params, answer: entry.ok ? (entry.reply ?? "") : (entry.code ?? "") };
}

// The vote's part of each input line of a turn, `tick resident part` (`-` for a line without one).
const partsOf = (entry: Entry, minute: number): readonly string[] => (entry.k === "turn" ? entry.inputs.map((note) => `${String(minute)} ${entry.resident} ${VOTE_PART.exec(note.text)?.[0] ?? "-"}`) : []);

// The file's calls the test plays, its events, and the vote's part of each status line.
function fileOf(oracle: Oracle) {
	const calls: Play[] = [];
	const events: Extract<Entry, { k: "event" }>[] = [];
	const parts: string[] = [];
	let minute = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k === "event") events.push(entry);
		parts.push(...partsOf(entry, minute));
		const call = playOf(entry, minute);
		if (call !== undefined) calls.push(call);
	}
	return { calls, events, parts: parts.filter((part) => !part.endsWith(" -")) };
}

const CITY_TEXT = (text: string): boolean => text.startsWith("[for you alone]") || text.startsWith("THE CITY ASKS") || text.startsWith("The city has counted") || text.includes("shows you a receipt: the city verifies");
const textOf = (payload: unknown): string => String(Reflect.get(Object(payload), "text"));

// The lines compared: whispers' own events whole, the city's texts of the vote and the duty, the vote's points.
function compared(events: readonly { readonly source: string; readonly type: string; readonly payload: unknown }[]): readonly string[] {
	return events.flatMap((event) => {
		if (event.source === "whispers") return [`${event.type} ${JSON.stringify(event.payload)}`];
		if ((event.type === "notice" || event.type === "board_post") && CITY_TEXT(textOf(event.payload))) return [`${event.type} ${String(Reflect.get(Object(event.payload), "to") ?? "board")} ${textOf(event.payload)}`];
		if (event.type === "ledger_entry" && Reflect.get(Object(event.payload), "reason") === "popularity vote") return [`points ${String(Reflect.get(Object(event.payload), "credit"))} ${String(Reflect.get(Object(event.payload), "amount"))}`];
		return [];
	});
}

async function playFile(file: string, story: string) {
	const oracle = readOracle(resolve(ORACLES, "whispers", `${file}.json`));
	const expected = fileOf(oracle);
	const parts: string[] = [];
	const record: CallRecord[] = [];
	const driver = scriptedDriver((activation: Activation) => {
		const resident = activation.actor.slice("resident:".length);
		for (const note of activation.inputs) if (note.source.endsWith("whispers")) parts.push(`${String(activation.tick)} ${resident} ${note.text}`);
		return expected.calls.filter((call) => call.minute === activation.tick && call.resident === resident).map((call) => ({ tool: call.tool, params: call.params }));
	}, record);
	const game = gameOf(storyOptions(story), { seed: oracle.seed, ticks: oracle.setup.minutes, receipts: story === "whispers" });
	const { events } = await play(game, { drivers: { resident: driver } });
	return { expected, events, parts, record };
}

const sourced = (events: readonly Envelope[]) => events.map((event) => ({ source: event.source.split("/").at(-1) ?? "", type: event.type, payload: event.payload }));

describe.each(FILES)("oracle $file", ({ file, story }) => {
	it("writes the file's whispers events, the city's texts of the vote and the duty, and the vote's points, in order", async () => {
		const { expected, events } = await playFile(file, story);
		const wanted = compared(expected.events.map((event) => ({ source: event.source, type: event.type, payload: event.payload })));
		expect(wanted.filter((line) => line.startsWith("popularity_result")).length).toBe(3);
		expect(wanted.some((line) => line.startsWith("whisper_duty"))).toBe(true);
		expect(compared(sourced(events))).toEqual(wanted);
	});

	it("answers the file's ballots and forgery and shows the vote's part of each status line", async () => {
		const { expected, parts, record } = await playFile(file, story);
		const answers = record.filter((entry) => entry.tool !== "sendDM").map((entry) => (entry.outcome.ok ? entry.outcome.reply : entry.outcome.code));
		expect(answers).toEqual(expected.calls.filter((call) => call.tool !== "sendDM").map((call) => call.answer));
		expect(expected.parts.length).toBeGreaterThan(10);
		expect(parts).toEqual(expected.parts);
	});
});
