/**
 * The standoff's strict golden gate (carve-round2-T4.md must-fix 2) on the two cityofkeys logs. The
 * golden run is replayed into the standoff: the deals (`factors_dealt`, `fragments_dealt`) through the
 * stand-in puzzles, every resident's level as the golden `level_up` lines left it before each turn,
 * every golden DM through `StandoffApi.noteText` (as channels does), and the golden calls of the
 * standoff's tools. Then its lines (`goldenDiff`, none in the goldens), its replies (`compareReplies`)
 * and its `held` status part in every golden turn input (`inputPart`, the golden names read back as
 * ids) must equal the golden run's.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Host, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { legacyTurns, StandoffApi } from "@swarmtales/mechanic-shared";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { standoff } from "@swarmtales/mechanic-standoff";
import { compareReplies, dropJustified, goldenCalls, goldenDiff, inputPart, ownedBy, type LegacyLine, type Reply } from "@swarmtales/testkit";
import { goldenLog, minutesOf, type GoldenName } from "../puzzles/harness.ts";
import { legacyLines, storyOptions } from "./support/host.ts";
import { probe, runProbe } from "./support/probe.ts";
import { standoffSection } from "./support/standoffs.ts";
import { channelsStandIn, ledgerStandIn, progressionStandIn, puzzlesStandIn, TestWorld } from "./support/world.ts";

const LOGS = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const;
const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const STANDOFF_TOOLS = new Set(["claimPiece", "ultimatum"]);
const HELD = "you hold for others";

const Id = Type.String();
const FragmentsDeal = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), fragment: Type.String() })) });
const FactorsDeal = Type.Object({
	level: Type.Integer(),
	digits: Type.Integer(),
	cityFactor: Type.String(),
	teams: Type.Array(Type.Object({ team: Type.Integer(), certificate: Type.String(), certificateHolder: Id })),
	holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), salt: Type.String(), counterFactor: Type.String(), counterHolder: Id, code: Type.String() })),
});

const seqOf = (line: LegacyLine): number => Number(line.seq);
/** A golden line's payload: without the log's own fields. */
const payloadOf = (line: LegacyLine): unknown => Object.fromEntries(Object.entries(line).filter(([key]) => !["type", "seq", "minute", "at"].includes(key)));

interface Played {
	readonly host: Host;
	readonly parts: ReadonlyMap<string, readonly string[]>;
	readonly replies: readonly Reply[];
	/** After each minute (where the old gamemaker looked): the facts and the levels. */
	readonly ends: ReadonlyMap<number, { readonly facts: Readonly<Record<string, unknown>>; readonly levels: ReadonlyMap<string, number> }>;
}

function replyText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

async function play(golden: readonly LegacyLine[], minutes: number): Promise<Played> {
	const world = new TestWorld(RESIDENTS);
	const levelUps = golden.filter((line) => line.type === "level_up");
	const inputs = golden.filter((line) => line.type === "turn_input");
	/** Levels as the golden run left them before the line `seq`. */
	const levelsBefore = (seq: number) => {
		for (const id of RESIDENTS) world.levels.set(id, 1);
		for (const line of levelUps) if (seqOf(line) < seq) world.levels.set(String(line.agent), Number(line.to));
	};
	levelsBefore(seqOf(inputs[0] ?? { type: "none", seq: 0 }));
	const deals = {
		fragments: golden.filter((line) => line.type === "fragments_dealt").map((line) => Parse(FragmentsDeal, payloadOf(line))),
		factors: golden.filter((line) => line.type === "factors_dealt").map((line) => Parse(FactorsDeal, payloadOf(line))),
	};
	const test = {
		residents: RESIDENTS,
		minutes,
		mechanics: [
			standoff.with({ ultimatum: { penalty: 10, maxMinutes: 5 } }),
			probe.with(),
			channelsStandIn(world).with(),
			ledgerStandIn(world).with(),
			progressionStandIn(world).with(),
			puzzlesStandIn(world, deals).with(),
		],
		residentTools: ["claimPiece"],
		gamemakerTools: ["ultimatum"],
	};
	// The old arena's turn order, so each turn sees the levels its golden turn saw.
	const story = defineCoreStory({
		id: "t4-test",
		seed: 7,
		minutes,
		residents: RESIDENTS,
		mechanics: test.mechanics,
		grants: { resident: ["claimPiece"], gamemaker: ["ultimatum"], script: ["probe"] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	const host = createHost({ ...storyOptions(test), story });
	host.start();
	const dms = golden.filter((line) => line.type === "dm_sent");
	const { kept } = dropJustified(goldenCalls(golden), (call) => !STANDOFF_TOOLS.has(call.tool), "calls of other mechanics' tools; the standoff answers claimPiece and ultimatum");
	const parts = new Map<string, readonly string[]>();
	const replies: Reply[] = [];
	const agent: TurnTaker = async (turn) => {
		parts.set(`${String(turn.minute)}:${turn.resident}`, turn.inputs.filter((note) => note.source === "standoff").map((note) => note.text));
		const index = inputs.findIndex((line) => line.minute === turn.minute && line.agent === turn.resident);
		const turnInput = inputs[index];
		const next = inputs[index + 1];
		const from = turnInput === undefined ? Infinity : seqOf(turnInput);
		const until = next === undefined ? Infinity : seqOf(next);
		for (const line of dms.filter((dm) => seqOf(dm) > from && seqOf(dm) < until)) {
			await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: String(line.from), readers: [String(line.to)], text: String(line.text) }));
		}
		for (const call of kept.filter((entry) => entry.minute === turn.minute && entry.agent === turn.resident)) {
			const outcome = await host.call(`resident:${call.agent}`, call.tool, call.args);
			replies.push({ minute: call.minute, agent: call.agent, tool: call.tool, isError: !outcome.ok, text: replyText(outcome) });
		}
		// The levels the next turn's inputs see: every golden level-up before it.
		levelsBefore(until);
	};
	const ends = new Map<number, { readonly facts: Readonly<Record<string, unknown>>; readonly levels: ReadonlyMap<string, number> }>();
	while (host.ended === undefined) {
		const minute = host.minute;
		await host.playMinute(agent);
		ends.set(minute, { facts: host.facts(), levels: new Map(world.levels) });
	}
	return { host, parts, replies, ends };
}

describe.each(LOGS)("standoff golden gate: %s (stand-in puzzles with the golden deals, progression, ledger, channels)", (name: GoldenName) => {
	const golden = goldenLog(name);
	const names = new Map(golden.filter((line) => line.type === "name_chosen").map((line) => [String(line.name), String(line.agent)]));
	const asIds = (text: string): string => [...names].reduce((out, [label, id]) => out.split(label).join(id), text);

	it("writes exactly the golden standoff lines (goldenDiff; none: no golden DM hands a piece over)", async () => {
		const { host } = await play(golden, minutesOf(name));
		expect(goldenDiff(ownedBy(golden, ["standoff"]), ownedBy(legacyLines(host.log.all()), ["standoff"]))).toEqual([]);
	});

	it("answers every golden call of a standoff tool as the old engine did (compareReplies)", async () => {
		const { replies } = await play(golden, minutesOf(name));
		const { kept } = dropJustified(goldenCalls(golden), (call) => !STANDOFF_TOOLS.has(call.tool), "calls of other mechanics' tools");
		expect(compareReplies(kept, replies)).toEqual([]);
	});

	it("shows the golden held part in every golden turn input", async () => {
		const { parts } = await play(golden, minutesOf(name));
		const inputs = golden.filter((line) => line.type === "turn_input");
		const expected = inputs.map((line) => {
			const status = inputPart({ minute: Number(line.minute), agent: String(line.agent), inputs: Array.isArray(line.inputs) ? line.inputs.map(String) : [] }, "[status] ") ?? "";
			return `${String(line.minute)}:${String(line.agent)} ${JSON.stringify(status.slice("[status] ".length).split(" · ").filter((part) => part.startsWith(HELD)).map(asIds))}`;
		});
		const actual = inputs.map((line) => `${String(line.minute)}:${String(line.agent)} ${JSON.stringify(parts.get(`${String(line.minute)}:${String(line.agent)}`) ?? [])}`);
		expect(actual).toEqual(expected);
		// Whispers deals fragments only, which the status line never shows.
		const shown = expected.filter((line) => line.includes(HELD)).length;
		if (name.startsWith("whispers")) expect(shown).toBe(0);
		else expect(shown).toBeGreaterThan(5);
	});

	it("renders the golden gamemaker's Standoffs section from the facts in every golden gamemaker turn (must-fix 6)", async () => {
		const { ends } = await play(golden, minutesOf(name));
		const levelUps = golden.filter((line) => line.type === "level_up");
		const turns = golden.filter((line) => line.type === "gamemaker_turn");
		const sectionOf = (input: string): string => {
			const start = input.indexOf("Standoffs (");
			return start < 0 ? "" : input.slice(start, input.indexOf("\n\n", start));
		};
		const expected = turns.map((line) => `${String(line.seq)} ${asIds(sectionOf(String(line.input)))}`);
		const actual = turns.map((line) => {
			const minute = Number(line.minute);
			const end = ends.get(minute);
			if (end === undefined) return `${String(line.seq)} no minute ${String(minute)}`;
			const since = (agent: string) => levelUps.filter((up) => up.agent === agent && seqOf(up) < seqOf(line)).reduce((last, up) => Number(up.minute), 0);
			// Nobody leaves the city in the golden runs (no exile line), and no piece goes to the city.
			const section = standoffSection(end.facts, { minute, levelSince: since, levelOf: (agent) => end.levels.get(agent) ?? 1, hasPassed: () => false, isAlive: () => true });
			return `${String(line.seq)} ${section.slice(0, -1).join("\n")}`;
		});
		expect(actual).toEqual(expected);
		const shown = turns.filter((line) => sectionOf(String(line.input)) !== "").map((line) => seqOf(line));
		if (name === "cityofkeys-f10g10") expect(shown).toEqual([554, 633, 704, 766]);
	});
});
