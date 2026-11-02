/**
 * `blame` after a legacy resume, on real channels (round 3, T1 must-fix 2 and 6): the Act I checkpoint
 * of the 6-agent base continues on the old engine and, converted, on the new host, and the same
 * blames give the same replies, the same records on the board and the same questions to the judge.
 * A second set changes a copy of the checkpoint to hold what the real file does not: an old DM
 * record without its text (sent before the city numbered its messages), alone and with an old number
 * that clashes with a board post (R2-D14).
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { ownedBy, type PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { snapshotFile } from "../channels/resume.ts";
import { blameStory, resumeNew, resumeOld } from "../t1/blame-resume.ts";
import { writtenBy } from "../t1/support.ts";

const NAME = "cityofkeys-act1-06a-04";
const STORY = blameStory(cityOfKeys);
const OWNERS = ["receipts", "ledger", "marks"] as const;

const blame = (dm: number, accused: string, claim: number): PlannedCall => ({ tool: "blame", params: { dm, accused, claim } });

const Rec = Type.Record(Type.String(), Type.Unknown());
const List = Type.Array(Type.Unknown());
const rec = (value: unknown): Record<string, unknown> => Parse(Rec, JSON.parse(JSON.stringify(value)));
const list = (value: unknown): readonly unknown[] => Parse(List, JSON.parse(JSON.stringify(value)));

/** The checkpoint with its DM records changed by `change`. */
function withDms(change: (dms: readonly Record<string, unknown>[]) => readonly Record<string, unknown>[]): unknown {
	const file = rec(snapshotFile(NAME));
	const world = rec(file.world);
	return { ...file, world: { ...world, dms: change(list(world.dms).map(rec)) } };
}

/** A DM record as the engine kept it before the city numbered its messages: no text, no delivery. */
const old = (record: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(record).filter(([key]) => !["text", "deliveredMinute", "deliveredAfter"].includes(key)));

/**
 * A05 blames A02 over DM #18 (delivered at the city's #19): board #69 is A02's, #8 came before the
 * delivery, #45 is a post of A02 in G2 (A05 is no member), #19 is A01's; A05 blames A04 over DM #30
 * with A04's post #32 in G1 (A05 is a member); the first pair twice.
 */
const PLAN = (agent: string, minute: number): readonly PlannedCall[] =>
	agent === "A05" && minute === 9 ? [blame(18, "A02", 69), blame(18, "A02", 8), blame(18, "A02", 45), blame(18, "A02", 19), blame(30, "A04", 32), blame(18, "A02", 69), blame(99, "A02", 69)] : [];

async function compare(raw: unknown, answers: readonly boolean[]) {
	const before = await resumeOld(raw, STORY, 2, PLAN, answers);
	const after = await resumeNew(raw, STORY, 2, PLAN, answers, before.lines);
	return { before, after };
}

describe("blame after a legacy resume, on real channels", () => {
	it("answers every blame alike, writes the same records and asks the judge the same questions", async () => {
		const { before, after } = await compare(snapshotFile(NAME), [true, false]);
		const mine = before.replies.get("9:A05") ?? [];
		expect(mine).toHaveLength(7);
		expect(mine[1]).toContain("message #8 came before DM #18 reached Herald");
		expect(mine[2]).toContain("you could not read message #45 in group G2");
		expect(mine[3]).toContain("is not by Herald");
		expect(mine[5]).toContain("were blamed already");
		for (const [at, replies] of before.replies) expect(after.replies.get(at), at).toEqual(replies);
		const events = after.host.log.all().slice(after.cut);
		expect(writtenBy(events, OWNERS)).toEqual(ownedBy(before.lines, OWNERS));
		expect(after.asked).toHaveLength(before.questions.length);
		before.questions.forEach((question, index) => { expect(after.asked[index]).toEqual(JSON.parse(JSON.stringify(question))); });
		expect(before.questions.map((question) => question.claim.channel)).toEqual(["board", "group"]);
	});

	it("keeps the pairs a snapshot spent: a pair blamed before the cut is blamed already", async () => {
		const file = rec(snapshotFile(NAME));
		const world = rec(file.world);
		const raw = { ...file, world: { ...world, blames: { pairs: [{ dm: 18, claim: 69 }] } } };
		const { before, after } = await compare(raw, [false]);
		expect(before.replies.get("9:A05")?.[0]).toContain("were blamed already");
		for (const [at, replies] of before.replies) expect(after.replies.get(at), at).toEqual(replies);
	});

	// Real channels hands out a DM without text without one (round 3, request 1 of
	// docs/design/carve-requests-round3-T1.md, done by T2), so blame says "kept no delivery record" like the old engine.
	it("answers 'the city kept no delivery record' for an old DM without text", async () => {
		const raw = withDms((dms) => dms.map((record) => (record.id === 18 ? old(record) : record)));
		const { before, after } = await compare(raw, [true, false]);
		expect(before.replies.get("9:A05")?.[0]).toContain("the city kept no delivery record of DM #18 (it was sent before the city numbered its messages)");
		for (const [at, replies] of before.replies) expect(after.replies.get(at), at).toEqual(replies);
	});
});
