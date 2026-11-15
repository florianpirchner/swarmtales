// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of the names (the old "golden gate for `name_chosen`"): the two City files from the start, played
 * with the real `ledger` and `channels` and a stand-in of the progression whose levels are the file's. Compared with
 * the file: the names the city gives at minute 2 (stream `names` of the run seed), the board's announcements and the
 * private notices, the `you are` part of every status line, and the announcement under every task while a resident
 * may choose (its own line since erratum J31).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame } from "@swarmtales/sdk";
import { play, readOracle, scriptedDriver, type Oracle } from "@swarmtales/testkit";
import { names } from "../src/index.ts";
import { levelsStandIn } from "./support.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles/cityofkeys");
const Story = Type.Object(
	{ city: Type.String(), cast: Type.Record(Type.String(), Type.Unknown()), names: Type.Object({ untilMinute: Type.Integer(), announcement: Type.String(), fallbackWords: Type.Array(Type.String()) }) },
	{ description: "The names of the old story file" },
);
const Line = Type.Object({ text: Type.String(), to: Type.Optional(Type.String()), author: Type.String() }, { description: "A post or a notice" });

// Per `tick resident`, the level of the resident's status line in the file.
function levelsOf(oracle: Oracle): Map<string, number> {
	const levels = new Map<string, number>();
	let minute = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k !== "turn") continue;
		const level = /· level (\d+)/.exec(entry.inputs.find((note) => note.kind === "status")?.text ?? "")?.[1];
		if (level !== undefined) levels.set(`${String(minute)} ${entry.resident}`, Number(level));
	}
	return levels;
}

// The names parts of the file's turns: the `you are` part of a status line, the announcement at the end of a task.
function fileParts(oracle: Oracle, announcement: string): readonly string[] {
	let minute = 0;
	const parts: string[] = [];
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k !== "turn") continue;
		for (const note of entry.inputs) {
			const at = `${String(minute)} ${entry.resident} ${note.kind}`;
			if (note.kind === "status") parts.push(`${at} ${note.text.split(" · ").find((part) => part.startsWith("you are ")) ?? "-"}`);
			if (note.kind === "task" && note.text.endsWith(`\n${announcement}`)) parts.push(`${at} ${announcement}`);
		}
	}
	return parts;
}

// The lines of the run and of the file that belong to the names: `name_chosen`, the announcements and the notices.
const said = (rows: readonly { readonly type: string; readonly payload: unknown }[]): readonly string[] =>
	rows.flatMap((row) => {
		if (row.type === "name_chosen") return [JSON.stringify(row.payload)];
		if (!Value.Check(Line, row.payload)) return [];
		// The board's numbers differ: the file's board held the posts of other mechanics before.
		const { text, to, author } = row.payload;
		return (row.type === "board_post" && text.includes(" is now called ")) || (row.type === "notice" && text.startsWith("You chose no name")) ? [`${row.type} ${to ?? "board"} ${author} ${text}`] : [];
	});

async function playFile(file: string) {
	const oracle = readOracle(resolve(ORACLES, `${file}.json`));
	const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, "setup/cityofkeys.story.json"), "utf8")));
	const levels = levelsOf(oracle);
	const parts: string[] = [];
	const driver = scriptedDriver((activation: Activation) => {
		const at = `${String(activation.tick)} ${activation.actor.slice("resident:".length)}`;
		for (const note of activation.inputs) if (note.source === "names") parts.push(`${at} ${note.kind} ${note.text}`);
		if (!activation.inputs.some((note) => note.source === "names" && note.kind === "status")) parts.push(`${at} status -`);
		return [];
	});
	const city = names({ ...story.names, reserved: [...Object.keys(story.cast), story.city] });
	const standIn = levelsStandIn((tick, resident) => levels.get(`${String(tick)} ${resident}`) ?? 1);
	const game = defineGame({ id: "names-oracle", seed: oracle.seed, residents: [...oracle.setup.residents], mechanics: [ledger(), channels(), city, standIn], scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } }, end: { ticks: oracle.setup.minutes } });
	const { events } = await play(game, { drivers: { resident: driver } });
	return { oracle, announcement: story.names.announcement.replace("{untilMinute}", String(story.names.untilMinute)), events, parts };
}

describe.each(["cityofkeys-act1-s7", "cityofkeys-act1-s11"])("oracle %s", (file) => {
	it("gives the file's names at the deadline, announces them, and shows them as the file does", async () => {
		const { oracle, announcement, events, parts } = await playFile(file);
		const fileRows = oracle.timeline.flatMap((entry) => (entry.k === "event" ? [entry] : []));
		expect(said(fileRows).filter((row) => row.startsWith("{"))).toHaveLength(6);
		expect(said(events)).toEqual(said(fileRows));
		const expected = fileParts(oracle, announcement);
		expect(expected.filter((part) => part.endsWith(announcement))).toHaveLength(10);
		expect(expected.filter((part) => part.includes(" status you are "))).toHaveLength(72);
		expect([...parts].sort()).toEqual([...expected].sort());
	});
});
