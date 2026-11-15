// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of part 1: `whispers-holdout-s7.json` from its start to the first ballot. The world of the file
 * (its level-ups, the dealt fragments, the direct messages that carry them, the door clock) is read into the
 * stand-ins of `progression` and `puzzles`; the real `channels` and `exile` play beside the tribunal, and the
 * Director's `callTribunal` is made at the file's tick after the turns. Compared with the file: every event of the
 * tribunal (the blocker at tick 15, the call, the first vote, the city's announcement of the failed grace), every
 * post, notice and note the tribunal made, the holdout part of every status line and the rule under every task.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame } from "@swarmtales/sdk";
import { readOracle, testKernel, type Oracle } from "@swarmtales/testkit";
import { standoffTribunal, StandoffTribunalOptions } from "../src/index.ts";
import { cityOf, type Dm, type World } from "./support.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles/whispers");
const Story = Type.Object({ holdout: Type.Unknown(), levels: Type.Array(Type.Object({ number: Type.Integer(), opensAt: Type.Optional(Type.Integer()) })) }, { description: "The old story file" });
const Dealt = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Type.String(), fragment: Type.String() })) }, { description: "A deal" });
const Up = Type.Object({ agent: Type.String(), to: Type.Integer() }, { description: "A level-up" });
const Sent = Type.Object({ target: Type.String(), message: Type.String() }, { description: "A direct message" });
const Text = Type.Object({ text: Type.String() }, { description: "A post or notice" });
const CHANNELS = ["board_post", "notice", "gamemaker_note"];
/** The tick of the first ballot: the inputs are compared before it. */
const LAST = 19;

type Entry = Oracle["timeline"][number];

interface Read {
	readonly ups: Map<string, [number, number][]>;
	readonly fragments: Map<number, Map<string, string>>;
	readonly dms: Dm[];
}

// One entry of the file into the world: a level-up, a deal, or a direct message sent.
function readEntry(world: Read, entry: Entry, tick: number): void {
	if (entry.k === "event" && entry.type === "level_up") {
		const { agent, to } = Value.Parse(Up, entry.payload);
		world.ups.set(agent, [...(world.ups.get(agent) ?? []), [tick, to]]);
	} else if (entry.k === "event" && entry.type === "fragments_dealt") {
		const { level, holdings } = Value.Parse(Dealt, entry.payload);
		world.fragments.set(level, new Map(holdings.map(({ agent, fragment }) => [agent, fragment])));
	} else if (entry.k === "call" && entry.tool === "sendDM" && entry.ok) {
		const { target, message } = Value.Parse(Sent, entry.params);
		world.dms.push({ tick, from: entry.actor.slice("resident:".length), to: target, text: message });
	}
}

// The world of the file and the tick of each entry.
function worldOf(oracle: Oracle, story: { readonly levels: readonly { readonly number: number; readonly opensAt?: number | undefined }[] }): World {
	const { ups, fragments, dms }: Read = { ups: new Map(), fragments: new Map(), dms: [] };
	let tick = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") tick = entry.minute;
		readEntry({ ups, fragments, dms }, entry, tick);
	}
	return { residents: oracle.setup.residents, ups, fragments, dms, opensAt: (level) => story.levels.find((entry) => entry.number === level)?.opensAt ?? 0, lastLevel: 7 };
}

// `tick type payload` without the message numbers, which count the posts of mechanics this test does not load.
const row = (tick: number, type: string, payload: unknown): string => `${String(tick)} ${type} ${JSON.stringify(payload, (key, value: unknown) => (key === "postSeq" || key === "number" ? undefined : value))}`;

// Whether a post or notice of the file is the tribunal's: the Director's, a text of the tribunal, or an announcement.
function tribunalText(entry: Extract<Entry, { k: "event" }>, announced: readonly string[]): boolean {
	if (entry.source !== "channels" || !CHANNELS.includes(entry.type)) return false;
	const { text } = Value.Parse(Text, entry.payload);
	return entry.actor === "gamemaker" || text.startsWith("THE TRIBUNAL") || announced.includes(text);
}

// The holdout part of a turn's status line, and whether its task carries the rule.
function turnParts(entry: Extract<Entry, { k: "turn" }>, tick: number, rule: string): readonly string[] {
	const status = entry.inputs.find((note) => note.kind === "status")?.text ?? "";
	const part = `${String(tick)} ${entry.resident} ${/ · (holdout tribunal .*)$/.exec(status)?.[1] ?? "-"}`;
	return entry.inputs.some((note) => note.kind === "task" && note.text.includes(`\n${rule}\n`)) ? [part, `${String(tick)} ${entry.resident} rule`] : [part];
}

// The file's rows of the tribunal up to the first ballot, and the holdout parts and rules of its turns before it.
function fileRows(oracle: Oracle, rule: string): { readonly rows: readonly string[]; readonly inputs: readonly string[] } {
	const events = oracle.timeline.flatMap((entry) => (entry.k === "event" ? [entry] : []));
	const announced = events.filter((entry) => entry.type === "holdout_announced").map((entry) => Value.Parse(Text, entry.payload).text);
	const rows: string[] = [];
	const inputs: string[] = [];
	let tick = 0;
	let ballot = false;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") tick = entry.minute;
		if (entry.k === "event") {
			ballot ||= entry.type === "holdout_ballot";
			if (!ballot && (entry.source === "standoff-tribunal" || tribunalText(entry, announced))) rows.push(row(tick, entry.type, entry.payload));
		}
		if (entry.k === "turn" && tick < LAST) inputs.push(...turnParts(entry, tick, rule));
	}
	return { rows, inputs: inputs.sort() };
}

async function playFile() {
	const oracle = readOracle(resolve(ORACLES, "whispers-holdout-s7.json"));
	const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, "setup/whispers.story.json"), "utf8")));
	const options = Value.Parse(StandoffTribunalOptions, { author: "COURIER", ...Value.Parse(Type.Object({}, { additionalProperties: true }), story.holdout) });
	const game = defineGame({
		id: "holdout-oracle",
		seed: oracle.seed,
		residents: [...oracle.setup.residents],
		mechanics: [...cityOf(worldOf(oracle, story)), channels(), exile(), standoffTribunal(options)],
		grants: { script: ["callTribunal"] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: oracle.setup.minutes },
	});
	const { kernel } = testKernel(game);
	const inputs: string[] = [];
	const call = oracle.timeline.find((entry) => entry.k === "call" && entry.tool === "callTribunal");
	// The Director calls after the turns of its tick: in the activation of the last resident of the roster.
	const driver = async (activation: Activation): Promise<void> => {
		const resident = activation.actor.slice("resident:".length);
		const lines = activation.inputs.filter((note) => note.source.endsWith("standoff-tribunal"));
		inputs.push(`${String(activation.tick)} ${resident} ${lines.find((note) => note.kind === "status")?.text ?? "-"}`);
		if (lines.some((note) => note.kind === "task" && note.text === options.texts.rule)) inputs.push(`${String(activation.tick)} ${resident} rule`);
		if (activation.tick === 15 && resident === "A06" && call?.k === "call") expect(await kernel.submit({ actor: "script", as: "callTribunal", params: call.params })).toMatchObject({ ok: true });
	};
	await kernel.run({ resident: driver }, { ticks: LAST + 1 });
	return { kernel, oracle, options, events: kernel.log.all(), inputs: inputs.filter((line) => Number(line.split(" ")[0]) < LAST).sort() };
}

describe("oracle whispers-holdout-s7, to the first ballot", () => {
	it("finds the blocker, calls the tribunal, runs the grace and opens the first vote as the file did", async () => {
		const { oracle, options, events, inputs } = await playFile();
		const expected = fileRows(oracle, options.texts.rule);
		const played = events.flatMap((event) => (event.source.endsWith("/standoff-tribunal") || (event.source.endsWith("/channels") && CHANNELS.includes(event.type)) ? [row(event.tick, event.type, event.payload)] : []));
		expect(expected.rows.length).toBe(19);
		expect(played).toEqual(expected.rows);
		const reply = events.find((event) => event.type === "tool_result");
		expect(reply?.payload).toMatchObject({ reply: "tribunal called on A03 for door 3: grace until minute 18; its fragment is still missing for A02" });
		expect(expected.inputs.filter((line) => !line.endsWith(" -")).length).toBeGreaterThan(20);
		expect(inputs).toEqual(expected.inputs);
	});
});
