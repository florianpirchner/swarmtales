/**
 * `blame` over an old DM record without text (round 3, T1 must-fix 6, R2-D14): a DM sent before the
 * city numbered its messages has no text and no delivery. The old engine answers "the city kept no
 * delivery record" for it as the blamed DM, and does not read it as the claim when its number
 * clashes with a board post (the claim falls through to the post). The records come from a changed
 * copy of the checkpoint, behind a stand-in channels that keeps the text absent (real channels reads
 * it as empty until team T2 lands request 1); the old side resumes the same copy.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { RoleCaller } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { receipts } from "@swarmtales/mechanic-receipts";
import { createPromptLookup } from "@swarmtales/prompts";
import type { PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { snapshotFile } from "../channels/resume.ts";
import { blameStory, resumeOld } from "../t1/blame-resume.ts";
import { recordsChannels } from "../t1/records.ts";
import { replyText } from "../t1/differential.ts";

const STORY = blameStory(cityOfKeys);
const Rec = Type.Record(Type.String(), Type.Unknown());
const List = Type.Array(Type.Unknown());
const rec = (value: unknown): Record<string, unknown> => Parse(Rec, JSON.parse(JSON.stringify(value)));
const list = (value: unknown): readonly unknown[] => Parse(List, JSON.parse(JSON.stringify(value)));

const blame = (dm: number, accused: string, claim: number): PlannedCall => ({ tool: "blame", params: { dm, accused, claim } });
const NAMES = new Map([["Herald", "A02"], ["Brassard", "A05"], ["Harrow", "A06"], ["Registrar", "A04"], ["Mercer", "A01"], ["Maren", "A03"]]);

/** A DM as the engine kept it before the city numbered its messages: no text, no delivery. */
const withoutText = (record: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(record).filter(([key]) => !["text", "deliveredMinute", "deliveredAfter"].includes(key)));

/** The checkpoint with its DM records changed by `change`. */
function withDms(change: (dms: readonly Record<string, unknown>[]) => readonly Record<string, unknown>[]): unknown {
	const file = rec(snapshotFile("cityofkeys-act1-06a-04"));
	const world = rec(file.world);
	return { ...file, world: { ...world, dms: change(list(world.dms).map(rec)) } };
}

/** What both sides can agree on: names as ids, and the number of the city's record left out. */
const plain = (reply: string): string => [...NAMES].reduce((text, [name, id]) => text.replaceAll(name, id), reply).replace(/ · the city's record is on the board as #\d+/, "");

async function bothSides(raw: unknown, calls: readonly PlannedCall[], answers: readonly boolean[]) {
	const old = await resumeOld(raw, STORY, 1, (agent, minute) => (agent === "A05" && minute === 9 ? calls : []), answers);
	const questions: unknown[] = [];
	const judge: RoleCaller = {
		ask: (question) => {
			const answer = answers[questions.length];
			questions.push(question.question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", costUsd: 0 } : { ok: true, answer: { deniesReceipt: answer }, costUsd: 0 });
		},
	};
	const story = defineCoreStory({ id: "records", seed: 7, minutes: 20, residents: ["A01", "A02", "A03", "A04", "A05", "A06"], mechanics: [ledger.with({ startPoints: 80 }), receipts.with(), recordsChannels(raw)], grants: { resident: ["blame"] } });
	const host = createHost({ story, prompts: createPromptLookup(), roles: { judge } });
	host.start();
	const fresh: string[] = [];
	for (const call of calls) fresh.push(replyText(await host.call("resident:A05", call.tool, call.params)));
	return { old: old.replies.get("9:A05") ?? [], fresh, asked: old.questions, questions };
}

describe("blame over an old DM record without text", () => {
	it("answers 'the city kept no delivery record' for the blamed DM", async () => {
		const raw = withDms((dms) => dms.map((record) => (record.id === 18 ? withoutText(record) : record)));
		const run = await bothSides(raw, [blame(18, "A02", 69), blame(99, "A02", 69)], []);
		expect(run.old[0]).toContain("the city kept no delivery record of DM #18 (it was sent before the city numbered its messages)");
		expect(run.fresh.map(plain)).toEqual(run.old.map(plain));
		expect(run.questions).toEqual([]);
	});

	it("reads a DM without text, whose number clashes with a board post, as the post", async () => {
		// DM #69 (A02 to A05) has no text; board #69 is A02's post: the claim falls through to the post and goes to the judge.
		const raw = withDms((dms) => [...dms, { id: 69, from: "A02", to: "A05", minute: 1, answered: false }]);
		const run = await bothSides(raw, [blame(18, "A02", 69)], [false]);
		expect(run.old[0]).toContain("the city's judge finds that board #69 by Herald does not deny receiving DM #18");
		expect(run.fresh.map(plain)).toEqual(run.old.map(plain));
		expect(run.questions).toHaveLength(1);
		// The standing is the ranking of the progression mechanic, which this city does not load (blame-resume.test.ts compares it).
		const asked = run.asked[0];
		expect(run.questions[0]).toMatchObject({ sender: asked?.sender, accused: asked?.accused, dm: asked?.dm, claim: asked?.claim });
	});
});
