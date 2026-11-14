// SPDX-License-Identifier: Apache-2.0
/**
 * The city slice through the command line (specification of M3, done-when 2 and 3): `swt run --fake --hand
 * --snapshot-at`, `swt resume`, `swt log verify --previous`, and `replay` from the run folder. The resumed log
 * without its marker is the straight log, for seeds 7 and 11 and for the variant in which the human amends the
 * verdict after the snapshot.
 *
 * No tool of the slice has a `sample`, so the residents of a plain `--fake` run call nothing: no vote, no verdict,
 * no exile. The first test proves the commands on that run as it is. For the other tests the fake driver of the
 * command line (and nothing else of it) is replaced by a script of the residents, so that the snapshot holds an
 * open decision and the resumed part holds the settling, the exile and the burns. The Director takes its fallback.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { nameOf, RunManifestSchema } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { isGameFamily } from "@swarmtales/sdk";
import { replay } from "@swarmtales/testkit";
import type * as Testkit from "@swarmtales/testkit";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadGame } from "../src/load-game.ts";
import { RUN_RECORDS } from "../src/records.ts";
import { cli, eventsOf, withoutMarker, type Printed, type StoredEnvelope } from "./support.ts";

const story = vi.hoisted(() => {
	const call = (tool: string, params: object): { readonly tool: string; readonly params: object } => ({ tool, params });
	const vote = (target: string): ReturnType<typeof call> => call("vote", { target });
	const pay = (target: string, amount: number): ReturnType<typeof call> => call("transferPoints", { target, amount });
	/** Tick to resident to calls: talk and two transfers, five votes (three against A04), and after the exile a transfer to A04. */
	const script: Readonly<Record<number, Readonly<Record<string, readonly ReturnType<typeof call>[]>>>> = {
		0: { A01: [call("postBoard", { message: "Who holds which fragment?" })], A04: [call("sendDM", { target: "A01", message: "Watch A02." })] },
		2: { A01: [pay("A04", 5)] },
		3: { A06: [pay("A02", 4)] },
		4: { A01: [vote("A04")], A02: [vote("A04")] },
		5: { A03: [vote("A04")], A04: [vote("A02")], A05: [vote("A02")] },
		9: { A01: [pay("A04", 3)], A03: [call("postBoard", { message: "The register is shorter now." })] },
	};
	return { on: false, script };
});
vi.mock("@swarmtales/testkit", async (original) => {
	const testkit = await original<typeof Testkit>();
	const scripted = testkit.scriptedDriver((activation) => story.script[activation.tick]?.[nameOf(activation.actor)] ?? []);
	return { ...testkit, fakeDriver: (...args: Parameters<typeof testkit.fakeDriver>) => (story.on ? scripted : testkit.fakeDriver(...args)) };
});

const CITY = fileURLToPath(new URL("../../../games/city-slice/game.ts", import.meta.url));
const PAUSE = [{ at: 7, tool: "pause", params: { reason: "the court has a verdict" } }, { at: 7, tool: "resume", params: {} }];
const AMEND = { at: 8, tool: "amendDecision", params: { decision: "D1", proposal: { exiled: "A02" }, reason: "A02 paid for its votes" } };
/** The variant `amended` takes its snapshot with a hand line while the run is paused; the other runs with `--snapshot-at 7`, after the resume. */
const HANDS = { straight: PAUSE, amended: [PAUSE[0], { at: 7, command: "snapshot" }, PAUSE[1], AMEND] };
const HOLDS = /^ok, \d+ lines, head [0-9a-f]{64}, continuity holds$/;

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-city-"));
	swt = cli(cwd);
	for (const [name, lines] of Object.entries(HANDS)) writeFileSync(join(cwd, `${name}.jsonl`), lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

interface Pair {
	readonly straight: readonly StoredEnvelope[];
	readonly resumed: readonly StoredEnvelope[];
	/** The index of the marker `run_resumed` in the resumed log. */
	readonly marker: number;
	readonly folders: readonly [straight: string, resumed: string];
}

/** Plays the slice with a hand file, resumes it from its snapshot `t7.json` with the same file, and reads both logs. */
async function pair(out: string, seed: number, hand: keyof typeof HANDS): Promise<Pair> {
	const flags = hand === "amended" ? [] : ["--snapshot-at", "7"];
	const first = await swt("run", CITY, "--fake", "--seed", String(seed), "--out", out, "--hand", `${hand}.jsonl`, ...flags);
	const folders = [`${out}/city-slice-001`, `${out}/city-slice-002`] as const;
	expect([first.code, first.out[1], readdirSync(join(cwd, folders[0], "snapshots"))]).toEqual([0, `city-slice seed ${String(seed)}: ended after 12 ticks (tick limit)`, ["t7.json"]]);
	const second = await swt("resume", folders[0], "--game", CITY, "--hand", `${hand}.jsonl`);
	expect([second.code, second.issue, second.out.at(-1)]).toEqual([0, undefined, `run: ${folders[1]}`]);
	const resumed = eventsOf(join(cwd, folders[1]));
	return { straight: eventsOf(join(cwd, folders[0])), resumed, marker: resumed.findIndex((event) => event.type === "run_resumed"), folders };
}

const Settled = Type.Object({ amendments: Type.Array(Type.Object({ seq: Type.Integer({ description: "The line of the amendment" }) }, { description: "One amendment" })) }, { description: "The payload of `decision_settled`, as far as it names lines of the log" });
/** `decision_settled` names the line of each amendment in its payload; in a resumed log that line is one further down when the marker lies before it. */
function amendmentsBack(events: readonly StoredEnvelope[], marker: number): readonly StoredEnvelope[] {
	return events.map((event) => (event.type === "decision_settled" && Check(Settled, event.payload) ? { ...event, payload: { ...event.payload, amendments: event.payload.amendments.map((entry) => ({ ...entry, seq: entry.seq > marker ? entry.seq - 1 : entry.seq })) } } : event));
}

/** Done-when 3 on a pair: one marker, the rest equal (`same` first takes back what the marker moved inside a payload), and the continuity of the two folders verifies. */
async function proven({ straight, resumed, marker, folders }: Pair, other: string, same: (events: readonly StoredEnvelope[]) => readonly StoredEnvelope[] = (events) => events): Promise<void> {
	expect(resumed[marker]).toMatchObject({ tick: 7, source: RUN_RECORDS.id, actor: "script", payload: { from: "city-slice-001", tick: 7 } });
	expect(resumed.filter((event) => event.type === "run_resumed")).toHaveLength(1);
	expect(resumed.length).toBe(straight.length + 1);
	expect(same(withoutMarker(resumed))).toEqual(straight);
	expect((await swt("log", "verify", folders[1], "--previous", folders[0])).out).toEqual([expect.stringMatching(HOLDS)]);
	expect(await swt("log", "verify", folders[1], "--previous", other)).toMatchObject({ code: 1, issue: "SWT-L007" });
	const manifest = Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, folders[1], "manifest.json"), "utf8")));
	expect([manifest.human, manifest.resumedFrom?.snapshotHash]).toEqual([true, Reflect.get(Object(resumed[marker]?.payload), "snapshotHash")]);
}

const told = (events: readonly StoredEnvelope[], ...types: readonly string[]): readonly unknown[] => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.payload]);

describe("the city slice through the command line", () => {
	it("a plain fake run (the residents call nothing): the resumed log without its marker is the straight log, and continuity verifies", async () => {
		const run = await pair("plain", 7, "straight");
		expect(told(run.straight, "vote_cast", "decision_proposed", "exiled")).toEqual([]);
		// The snapshot of `--snapshot-at 7` lies after the two calls of the human: the resumed run drops both lines of the hand file.
		expect(run.resumed.slice(run.marker).filter((event) => event.actor === "human")).toEqual([]);
		await proven(run, run.folders[0].replace("001", "002"));
	});

	it.each([{ seed: 7 }, { seed: 11 }])("the scripted slice, seed $seed: stopped at the snapshot after tick 6 and resumed, it settles the verdict and banishes A04 as the straight run does", async ({ seed }) => {
		story.on = true;
		const run = await pair(`seed-${String(seed)}`, seed, "straight").finally(() => (story.on = false));
		const [before, after] = [run.resumed.slice(0, run.marker), run.resumed.slice(run.marker)];
		// Before the snapshot: the verdict is proposed and the Director posts (its fallback). After it: the deadline, the exile, the burns, the refusal.
		expect(told(before, "decision_proposed", "resumed", "answered")).toMatchObject([[6, "decision_proposed", { decision: "D1", proposal: { exiled: "A04" }, deadline: 8 }], [6, "answered", { fallback: true }], [7, "resumed", {}]]);
		expect(told(after, "decision_settled", "exiled", "ledger_entry", "factor_burned", "tool_refused")).toMatchObject([[8, "decision_settled", { changed: false }], [8, "exiled", { agent: "A04", by: "court" }], [8, "ledger_entry", { debit: "A04", amount: 35 }], [8, "factor_burned", { agent: "A04" }], [9, "tool_refused", { as: "transferPoints", code: "EXILED" }]]);
		expect(after.length).toBeGreaterThan(80);
		await proven(run, "plain/city-slice-001");
	});

	it("the variant amended: the snapshot is taken while the run is paused; the resumed run resumes, the human amends the verdict to A02, and A02 is banished", async () => {
		story.on = true;
		const run = await pair("amended", 7, "amended").finally(() => (story.on = false));
		const after = run.resumed.slice(run.marker);
		expect(run.resumed.slice(0, run.marker).filter((event) => event.actor === "human").map((event) => event.type)).toEqual(["tool_called", "paused", "tool_result"]);
		expect(told(after, "resumed", "decision_amended", "decision_settled", "exiled")).toMatchObject([[7, "resumed", {}], [8, "decision_amended", { by: "human", proposal: { exiled: "A02" } }], [8, "decision_settled", { changed: true, proposal: { exiled: "A02" } }], [8, "exiled", { agent: "A02", by: "court" }]]);
		// The one difference the marker leaves: `decision_settled` holds the line of the amendment, which lies after the marker.
		const plain = withoutMarker(run.resumed);
		const differing = plain.flatMap((event, index) => (JSON.stringify(event) === JSON.stringify(run.straight[index]) ? [] : [event.type]));
		expect(differing).toEqual(["decision_settled"]);
		await proven(run, "seed-7/city-slice-001", (events) => amendmentsBack(events, run.marker));
	});

	it("done-when 2 from run folders: replay writes the straight and the resumed log again from the game file and events.jsonl", async () => {
		const { game } = await loadGame(CITY, cwd);
		if (isGameFamily(game)) throw new RangeError("the city slice is one game, not a family");
		for (const folder of ["seed-7/city-slice-001", "seed-11/city-slice-002", "amended/city-slice-002", "plain/city-slice-002"]) {
			const log = eventsOf(join(cwd, folder));
			const again = await replay({ game, log, records: [DIRECTOR_RECORDS, RUN_RECORDS] });
			expect([folder, again.firstDifference, again.equal, again.log.length]).toEqual([folder, undefined, true, log.length]);
		}
	});
});
