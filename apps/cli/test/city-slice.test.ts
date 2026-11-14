// SPDX-License-Identifier: Apache-2.0
/**
 * The city slice through the command line (specification of M3, done-when 2 and 3): `swt run --fake --hand
 * --snapshot-at`, `swt resume`, `swt log verify --previous`, and `replay` from the run folder. The resumed log
 * without its marker is the straight log, for seeds 7 and 11 and for the variant in which the human amends the
 * verdict after the snapshot.
 *
 * The residents are played by the fake driver itself: the resident tools of the slice have a `sample` (issue 32),
 * so a plain `--fake` run holds the story: talk, transfers, the votes of the session, a verdict, the exile and the
 * burns. Nothing of the command line is replaced. The Director takes its fallback. With seeds 7 and 11 the session
 * ends in a verdict, with seed 4 in a tie. The snapshot after tick 6 holds the open decision, the resumed part holds
 * the settling. The variant `amended` needs no script either: its amendment names A02, who stands and is not the
 * verdict of seed 7 (A03), and the test pins both.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { isGameFamily, parseTake } from "@swarmtales/sdk";
import { replay } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadGame } from "../src/load-game.ts";
import { RUN_RECORDS } from "../src/records.ts";
import { cli, eventsOf, withoutMarker, type Printed, type StoredEnvelope } from "./support.ts";

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

/** The burn of a banished resident's points: the bookings whose reason is the exile. */
const burns = (events: readonly StoredEnvelope[]): readonly unknown[] => told(events, "ledger_entry").filter((line) => JSON.stringify(line).includes('"reason":"exiled '));

/** The verdict of the straight fake run per seed: who is banished, and the points that burn with them. */
const VERDICTS = [
	{ seed: 7, exiled: "A03", tally: { A02: 1, A03: 3, A05: 2 }, burned: 35 },
	{ seed: 11, exiled: "A05", tally: { A01: 1, A04: 1, A05: 4 }, burned: 23 },
];

describe("the city slice through the command line", () => {
	it.each(VERDICTS)("a plain fake run, seed $seed: no SWT-C010, the residents talk, pay and vote, $exiled is banished, its points and its piece burn", async ({ seed, exiled, tally, burned }) => {
		const out = `plain-${String(seed)}`;
		const run = await swt("run", CITY, "--fake", "--seed", String(seed), "--out", out);
		expect([run.code, run.err, run.out[1]]).toEqual([0, "", `city-slice seed ${String(seed)}: ended after 12 ticks (tick limit)`]);
		const events = eventsOf(join(cwd, out, "city-slice-001"));
		for (const type of ["transfer", "board_post", "dm_sent", "dm_delivered"]) expect(events.filter((event) => event.type === type).length, type).toBeGreaterThan(2);
		expect(events.filter((event) => event.type === "tool_called" && Reflect.get(Object(event.payload), "as") === "readBoard").length).toBeGreaterThan(0);
		expect(events.filter((event) => event.type === "vote_cast").map((event) => event.tick)).toEqual([4, 4, 4, 4, 4, 4]);
		expect(told(events, "session_closed", "decision_proposed", "answered", "decision_settled", "exiled", "verdict", "factor_burned")).toMatchObject([
			[6, "session_closed", { tally }],
			[6, "decision_proposed", { decision: "D1", proposal: { exiled }, deadline: 8 }],
			[6, "answered", { fallback: true }],
			[8, "decision_settled", { changed: false }],
			[8, "exiled", { agent: exiled, by: "court" }],
			[8, "verdict", { exiled, decision: "D1" }],
			[8, "factor_burned", { agent: exiled }],
		]);
		expect(burns(events)).toMatchObject([[8, "ledger_entry", { debit: exiled, amount: burned, reason: `exiled ${exiled}` }]]);
		// The banished resident is not activated again, and the samples leave it alone: nobody pays or writes to it.
		const later = events.filter((event) => event.tick > 8);
		expect(later.filter((event) => event.actor === `resident:${exiled}` || ["target", "to"].some((key) => Reflect.get(Object(event.payload), key) === exiled))).toEqual([]);
	});

	it("a plain fake run, seed 4: the session ends in a tie, so no verdict is proposed and nobody is banished", async () => {
		const run = await swt("run", CITY, "--fake", "--seed", "4", "--out", "tie");
		expect([run.code, run.err]).toEqual([0, ""]);
		const events = eventsOf(join(cwd, "tie/city-slice-001"));
		expect(told(events, "session_closed", "decision_proposed", "asked", "exiled", "verdict")).toEqual([[6, "session_closed", { tally: { A01: 1, A02: 2, A03: 1, A06: 2 } }]]);
	});

	it.each(VERDICTS)("the fake slice with the hand, seed $seed: stopped at the snapshot after tick 6 and resumed, it settles the verdict and banishes $exiled as the straight run does", async ({ seed, exiled }) => {
		const run = await pair(`seed-${String(seed)}`, seed, "straight");
		const [before, after] = [run.resumed.slice(0, run.marker), run.resumed.slice(run.marker)];
		// Before the snapshot: the verdict is proposed, the Director posts (its fallback), the human pauses and resumes. After it: the deadline, the exile, the burns.
		expect(told(before, "decision_proposed", "resumed", "answered")).toMatchObject([[6, "decision_proposed", { decision: "D1", proposal: { exiled }, deadline: 8 }], [6, "answered", { fallback: true }], [7, "resumed", {}]]);
		expect(told(after, "decision_settled", "exiled", "verdict", "factor_burned")).toMatchObject([[8, "decision_settled", { changed: false }], [8, "exiled", { agent: exiled, by: "court" }], [8, "verdict", { exiled }], [8, "factor_burned", { agent: exiled }]]);
		expect(burns(run.resumed)).toMatchObject([[8, "ledger_entry", { debit: exiled, reason: `exiled ${exiled}` }]]);
		// The snapshot of `--snapshot-at 7` lies after the two calls of the human: the resumed run drops both lines of the hand file, and the residents go on calling.
		expect(after.filter((event) => event.actor === "human")).toEqual([]);
		expect(after.filter((event) => event.type === "tool_called").length).toBeGreaterThan(10);
		await proven(run, `plain-${String(seed)}/city-slice-001`);
	});

	it("the variant amended: the snapshot is taken while the run is paused; the resumed run resumes, the human amends the verdict from A03 to A02, and A02 is banished", async () => {
		const run = await pair("amended", 7, "amended");
		const [before, after] = [run.resumed.slice(0, run.marker), run.resumed.slice(run.marker)];
		expect(before.filter((event) => event.actor === "human").map((event) => event.type)).toEqual(["tool_called", "paused", "tool_result"]);
		expect(told(before, "decision_proposed")).toMatchObject([[6, "decision_proposed", { decision: "D1", proposal: { exiled: "A03" } }]]);
		expect(told(after, "resumed", "decision_amended", "decision_settled", "exiled")).toMatchObject([[7, "resumed", {}], [8, "decision_amended", { by: "human", proposal: { exiled: "A02" } }], [8, "decision_settled", { changed: true, proposal: { exiled: "A02" } }], [8, "exiled", { agent: "A02", by: "court" }]]);
		// The one difference the marker leaves: `decision_settled` holds the line of the amendment, which lies after the marker.
		const plain = withoutMarker(run.resumed);
		const differing = plain.flatMap((event, index) => (JSON.stringify(event) === JSON.stringify(run.straight[index]) ? [] : [event.type]));
		expect(differing).toEqual(["decision_settled"]);
		await proven(run, "seed-7/city-slice-001", (events) => amendmentsBack(events, run.marker));
	});

	// Decision A27 and open point P3 of the errata. A cure (no log position in a payload, or a marker that takes no position) must change this test.
	it("a snapshot before the Director is asked (--snapshot-at 6): the resumed log differs from the straight one in exactly the two lines of the warden that hold the log position of its firing", async () => {
		expect((await swt("run", CITY, "--fake", "--seed", "7", "--out", "early", "--snapshot-at", "6")).code).toBe(0);
		expect((await swt("resume", "early/city-slice-001", "--game", CITY)).code).toBe(0);
		const [straight, resumed] = [eventsOf(join(cwd, "early/city-slice-001")), eventsOf(join(cwd, "early/city-slice-002"))];
		const plain = withoutMarker(resumed);
		const differing = plain.flatMap((event, index) => (JSON.stringify(event) === JSON.stringify(straight[index]) ? [] : [index]));
		// Line 1: the reply of the Director's `take`, a JSON text with `firings[].seq`. Line 2: the record `asked` with `firings`. `withoutMarker` reaches neither.
		expect(differing.map((index) => [plain[index]?.tick, plain[index]?.actor, plain[index]?.type])).toEqual([[6, "director:warden", "tool_result"], [6, "director:warden", "asked"]]);
		const positions = (events: readonly StoredEnvelope[]): readonly unknown[] => {
			const [taken, asked] = differing.map((index): unknown => events[index]?.payload);
			return [parseTake(String(Reflect.get(Object(taken), "reply")))?.firings.map((firing) => firing.seq), Reflect.get(Object(asked), "firings")];
		};
		// The firing is the verdict's proposal. The marker lies before it, so the resumed run counts it one line further down, and says so to the Director.
		const proposed = straight.find((event) => event.type === "decision_proposed")?.seq ?? 0;
		expect(resumed.find((event) => event.type === "run_resumed")?.seq).toBeLessThan(proposed);
		expect([positions(straight), positions(plain)]).toEqual([[[proposed], [proposed]], [[proposed + 1], [proposed + 1]]]);
		expect((await swt("log", "verify", "early/city-slice-002", "--previous", "early/city-slice-001")).out).toEqual([expect.stringMatching(HOLDS)]);
	});

	it("done-when 2 from run folders: replay writes the straight and the resumed log again from the game file and events.jsonl", async () => {
		const { game } = await loadGame(CITY, cwd);
		if (isGameFamily(game)) throw new RangeError("the city slice is one game, not a family");
		for (const folder of ["seed-7/city-slice-001", "seed-11/city-slice-002", "amended/city-slice-002", "plain-7/city-slice-001", "tie/city-slice-001"]) {
			const log = eventsOf(join(cwd, folder));
			const again = await replay({ game, log, records: [DIRECTOR_RECORDS, RUN_RECORDS] });
			expect([folder, again.firstDifference, again.equal, again.log.length]).toEqual([folder, undefined, true, log.length]);
		}
	});
});
