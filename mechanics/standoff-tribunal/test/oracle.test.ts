// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of the tribunal: `whispers-holdout-s7.json` from its start to its end. The world of the file (its
 * level-ups, the dealt fragments, the direct messages that carry them, the door clock) is read into the stand-ins of
 * `progression` and `puzzles`, live as the old world was: what a resident did in its turn counts once its turn is
 * over. The real `channels` and `exile` play beside the tribunal, in the old arena's turn order; every resident casts
 * the file's ballots in its own turn, and the Director's calls are made at the file's tick after the turns. Compared
 * with the file: every event of the tribunal (the blocker, the call, the three votes with fifteen ballots, the city's
 * and the Director's announcements, the lot and the strike) and the banishment by `exile`, every post, notice and note
 * the tribunal made (the released fragment among them), the replies of the ballots, the holdout part of every status
 * line and the rule under every task.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation, ActorId } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame } from "@swarmtales/sdk";
import { readOracle, testKernel, type Oracle, type OracleCall } from "@swarmtales/testkit";
import { standoffTribunal, StandoffTribunalOptions } from "../src/index.ts";
import { cityOf, type Dm, type World } from "./support.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles/whispers");
const Story = Type.Object({ holdout: Type.Unknown(), levels: Type.Array(Type.Object({ number: Type.Integer(), opensAt: Type.Optional(Type.Integer()) })) }, { description: "The old story file" });
const Dealt = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Type.String(), fragment: Type.String() })) }, { description: "A deal" });
const Up = Type.Object({ agent: Type.String(), to: Type.Integer() }, { description: "A level-up" });
const Sent = Type.Object({ target: Type.String(), message: Type.String() }, { description: "A direct message" });
const Text = Type.Object({ text: Type.String() }, { description: "A post or notice" });
const CHANNELS = ["board_post", "notice", "gamemaker_note"];
const TOOLS = ["tribunalVote", "callTribunal", "drawLot", "announceTribunal", "permaDeath"];

type Entry = Oracle["timeline"][number];

interface Read {
	readonly ups: Map<string, [number, number][]>;
	readonly fragments: Map<number, Map<string, string>>;
	readonly dms: Dm[];
}

/** The file's tribunal calls by tick and caller, and the last turn of each tick. */
interface Script {
	readonly calls: Map<string, OracleCall[]>;
	readonly last: Map<number, string>;
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

// The world of the file, the tribunal's calls and the turn order, with the turns taken so far.
function worldOf(oracle: Oracle, story: { readonly levels: readonly { readonly number: number; readonly opensAt?: number | undefined }[] }, taken: ReadonlySet<string>): { readonly world: World; readonly script: Script } {
	const { ups, fragments, dms }: Read = { ups: new Map(), fragments: new Map(), dms: [] };
	const script: Script = { calls: new Map(), last: new Map() };
	let tick = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") tick = entry.minute;
		if (entry.k === "turn") script.last.set(tick, entry.resident);
		if (entry.k === "call" && TOOLS.includes(entry.tool)) {
			const key = `${String(tick)} ${entry.actor === "gamemaker" ? "gamemaker" : entry.actor.slice("resident:".length)}`;
			script.calls.set(key, [...(script.calls.get(key) ?? []), entry]);
		}
		readEntry({ ups, fragments, dms }, entry, tick);
	}
	const opensAt = (level: number): number => story.levels.find((entry) => entry.number === level)?.opensAt ?? 0;
	return { world: { residents: oracle.setup.residents, ups, fragments, dms, opensAt, lastLevel: 7, turnTaken: (resident, at) => taken.has(`${String(at)} ${resident}`) }, script };
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

// The file's rows of the tribunal and of the strike, and the holdout parts and rules of its turns.
function fileRows(oracle: Oracle, rule: string): { readonly rows: readonly string[]; readonly inputs: readonly string[] } {
	const events = oracle.timeline.flatMap((entry) => (entry.k === "event" ? [entry] : []));
	const announced = events.filter((entry) => entry.type === "holdout_announced").map((entry) => Value.Parse(Text, entry.payload).text);
	const rows: string[] = [];
	const inputs: string[] = [];
	let tick = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") tick = entry.minute;
		if (entry.k === "event" && (entry.source === "standoff-tribunal" || (entry.source === "exile" && entry.type === "exiled") || tribunalText(entry, announced))) rows.push(row(tick, entry.type, entry.payload));
		if (entry.k === "turn") inputs.push(...turnParts(entry, tick, rule));
	}
	return { rows, inputs: inputs.sort() };
}

async function playFile() {
	const oracle = readOracle(resolve(ORACLES, "whispers-holdout-s7.json"));
	const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, "setup/whispers.story.json"), "utf8")));
	const options = Value.Parse(StandoffTribunalOptions, { author: "COURIER", ...Value.Parse(Type.Object({}, { additionalProperties: true }), story.holdout) });
	const taken = new Set<string>();
	const { world, script } = worldOf(oracle, story, taken);
	const game = defineGame({
		id: "holdout-oracle",
		seed: oracle.seed,
		residents: [...oracle.setup.residents],
		mechanics: [...cityOf(world), channels(), exile(), standoffTribunal(options)],
		grants: { script: TOOLS.slice(1) },
		scheduler: { id: "turns", options: { passes: 1, blockSize: 1, activation: "always", order: "arena" } },
		end: { ticks: oracle.setup.minutes },
	});
	const { kernel } = testKernel(game);
	const inputs: string[] = [];
	const replies: string[] = [];
	const play = async (tick: number, who: string, actor: ActorId): Promise<void> => {
		for (const call of script.calls.get(`${String(tick)} ${who}`) ?? []) {
			const outcome = await kernel.submit({ actor, as: call.tool, params: call.params });
			expect([call.tool, outcome.ok]).toEqual([call.tool, true]);
			if (outcome.ok && call.reply !== undefined) replies.push(`${String(tick)} ${who} ${outcome.reply}`);
		}
	};
	const driver = async (activation: Activation): Promise<void> => {
		const resident = activation.actor.slice("resident:".length);
		const lines = activation.inputs.filter((note) => note.source.endsWith("standoff-tribunal"));
		inputs.push(`${String(activation.tick)} ${resident} ${lines.find((note) => note.kind === "status")?.text ?? "-"}`);
		if (lines.some((note) => note.kind === "task" && note.text === options.texts.rule)) inputs.push(`${String(activation.tick)} ${resident} rule`);
		await play(activation.tick, resident, activation.actor);
		taken.add(`${String(activation.tick)} ${resident}`);
		// The Director looks after the turns of its tick: in the activation of the tick's last resident.
		if (script.last.get(activation.tick) === resident) await play(activation.tick, "gamemaker", "script");
	};
	await kernel.run({ resident: driver }, { ticks: oracle.setup.minutes });
	const voted = [...script.calls.entries()].flatMap(([key, calls]) => calls.flatMap((call) => (call.reply === undefined ? [] : [`${key} ${call.reply}`])));
	return { oracle, options, events: kernel.log.all(), inputs: inputs.sort(), replies, voted };
}

describe("oracle whispers-holdout-s7, the whole trial", () => {
	it("finds the blocker, calls the tribunal, holds three votes, draws the lot and strikes as the file did", async () => {
		const { oracle, options, events, inputs, replies, voted } = await playFile();
		const expected = fileRows(oracle, options.texts.rule);
		const played = events.flatMap((event) =>
			event.source.endsWith("/standoff-tribunal") || (event.source.endsWith("/channels") && CHANNELS.includes(event.type)) || (event.source.endsWith("/exile") && event.type === "exiled") ? [row(event.tick, event.type, event.payload)] : [],
		);
		expect(expected.rows.length).toBeGreaterThan(50);
		expect(played).toEqual(expected.rows);
		// Each note names the number of the Director's own post, also when the city posts the strike after it.
		const Numbered = Type.Object({ text: Type.String(), number: Type.Optional(Type.Integer()), postSeq: Type.Optional(Type.Integer()) }, { description: "A numbered text" });
		const numbered = events.flatMap((event) => (event.type === "gamemaker_note" || (event.type === "board_post" && event.actor === "script") ? [Value.Parse(Numbered, event.payload)] : []));
		const notes = numbered.filter((entry) => entry.number !== undefined);
		expect(notes.map((note) => note.number)).toEqual(notes.map((note) => numbered.find((post) => post.postSeq !== undefined && post.text.startsWith(note.text))?.postSeq));
		expect(notes.length).toBe(3);
		expect(replies).toEqual(voted);
		expect(replies.length).toBe(15);
		const reply = events.find((event) => event.type === "tool_result");
		expect(reply?.payload).toMatchObject({ reply: "tribunal called on A03 for door 3: grace until minute 18; its fragment is still missing for A02" });
		expect(expected.inputs.filter((line) => !line.endsWith(" -")).length).toBeGreaterThan(40);
		expect(inputs).toEqual(expected.inputs);
	});
});
