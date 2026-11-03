/**
 * The judge as an overseer against the old judge (docs/design/overseer-api.md §1.4, step 18 wave C1),
 * end to end through the real `blame` tool of the receipts mechanic on real channels, ledger, marks,
 * puzzles and progression (test/mechanics/t1): the old side is the composed old World with a
 * `DeliveryJudge` that answers from a list; the new side is the host with the judge overseer and a
 * scripted runtime. Same blames, same answers: same replies, same records, same notices, and the
 * judge is asked the same prompts (system, per temper, and the question in full).
 */
import { describe, expect, it } from "vitest";
import type { AnyStory } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { judgePrompt, judgeSystemPrompt, overseers, type DeliveryJudge, type DenialQuestion, type JudgeTemper } from "@swarmtales/roles";
import { scriptedOverseer, type PlannedCall, type ScriptedAnswer } from "@swarmtales/testkit";
import { socialLevels, tinyStory } from "../helpers/stories.ts";
import { realCity } from "../mechanics/t1/city.ts";
import { MARKS } from "../mechanics/t1/blame-world.ts";
import { newOwned, oldNotices, oldOwned, playNew, playOld, type PlanFn } from "../mechanics/t1/differential.ts";
import { ids, recordOf } from "../mechanics/t1/support.ts";

const TOOLS = ["transferPoints", "showReceipt", "sendDM", "readBoard", "postBoard", "blame", "createGroup", "addGroupMember", "postGroup", "readGroup"] as const;

const dm = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });
const board = (message: string): PlannedCall => ({ tool: "postBoard", params: { message } });
const create = (name: string): PlannedCall => ({ tool: "createGroup", params: { name } });
const add = (groupId: string, agent: string): PlannedCall => ({ tool: "addGroupMember", params: { groupId, agent } });
const post = (groupId: string, message: string): PlannedCall => ({ tool: "postGroup", params: { groupId, message } });
const give = (target: string, amount: number): PlannedCall => ({ tool: "transferPoints", params: { target, amount, memo: "thanks" } });
const blame = (dmNumber: number, accused: string, claim: number): PlannedCall => ({ tool: "blame", params: { dm: dmNumber, accused, claim } });

/** The scenario of the receipts blame differential: a board claim and a group claim go to the judge, the rest the city settles. */
const plan: PlanFn = (agent, minute) => {
	if (minute === 0 && agent === "A01") return [give("A02", 3), dm("A02", "Door 2 is 1234"), board("A01 here"), dm("A03", "Door 4 is 9999"), dm("A04", "Door 5 is 4321"), create("Circle"), add("G1", "A03")];
	if (minute === 0 && agent === "A02") return [dm("A01", "Door 3 is 5678"), board("I never got a DM")];
	if (minute === 0 && agent === "A03") return [create("Plot")];
	// A long claim: the judge reads only its first 1000 characters.
	if (minute === 1 && agent === "A02") return [board(`Nothing reached me, A01. ${"word ".repeat(220)}`)];
	if (minute === 1 && agent === "A03") return [post("G2", "I never got a DM from you"), post("G1", "I never got your DM, A01")];
	if (minute === 1 && agent === "A04") return [dm("A01", "I never got your DM")];
	if (minute === 1 && agent === "A01") return [blame(1, "A02", 6), blame(3, "A03", 8), blame(4, "A04", 10)];
	if (minute === 2 && agent === "A01") return [blame(1, "A02", 7), blame(3, "A03", 9)];
	return [];
};

/** What the judge rules, in order: `failed` is a judge that errors, `invalid` one whose call is off its schema. */
type Ruling = { readonly denies: boolean; readonly board?: string; readonly gamemaker?: string } | "failed" | "invalid";

interface Played {
	readonly old: Awaited<ReturnType<typeof playOld>>;
	readonly fresh: Awaited<ReturnType<typeof playNew>>;
	readonly asked: DenialQuestion[];
	readonly runtime: ReturnType<typeof scriptedOverseer>;
}

async function play(rulings: readonly Ruling[], temper: JudgeTemper): Promise<Played> {
	const base = tinyStory({ agents: 4, levels: socialLevels([...TOOLS]), rules: { blame: { penalty: [5, 8] }, marks: MARKS } });
	const story: AnyStory = base;
	const asked: DenialQuestion[] = [];
	const judge: DeliveryJudge = {
		label: "list/judge",
		deniesReceipt(question) {
			const ruling = rulings[asked.length];
			asked.push(question);
			if (ruling === undefined || ruling === "failed" || ruling === "invalid") return Promise.resolve({ ok: false, error: "no answer", usage: [] });
			return Promise.resolve({ ok: true, deniesReceipt: ruling.denies, ...(ruling.board === undefined ? {} : { board: ruling.board }), ...(ruling.gamemaker === undefined ? {} : { gamemaker: ruling.gamemaker }), usage: [] });
		},
	};
	const old = await playOld({ story, agents: 4, minutes: 4, plan, blockSize: 4, judge });
	let n = 0;
	const runtime = scriptedOverseer({
		judge: (): ScriptedAnswer => {
			const ruling = rulings[n++];
			if (ruling === undefined || ruling === "failed") return { error: "no answer" };
			if (ruling === "invalid") return { answer: { deniesReceipt: "maybe" } };
			return { answer: { deniesReceipt: ruling.denies, ...(ruling.board === undefined ? {} : { board: ruling.board }), ...(ruling.gamemaker === undefined ? {} : { gamemaker: ruling.gamemaker }) } };
		},
	});
	const definition = defineCoreStory({
		id: "judge-differential",
		seed: 3,
		minutes: 4,
		residents: ids(4),
		mechanics: realCity(story),
		overseers: [overseers.judgeFor(temper).as("judge")],
		grants: { resident: [...TOOLS] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 4, activation: "always" }),
	});
	const fresh = await playNew({ story: definition, prompts: createPromptLookup(), overseers: runtime }, plan);
	return { old, fresh, asked, runtime };
}

const notice = (line: string): string => {
	const parsed = recordOf(line);
	return `${String(parsed.to)}|${String(parsed.text)}`;
};

function expectAlike({ old, fresh }: Played): void {
	for (const [at, replies] of old.replies) expect(fresh.replies.get(at), at).toEqual(replies);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const owner of ["receipts", "ledger", "marks"] as const) expect(newOwned(fresh, [owner]), owner).toEqual(oldOwned(old, [owner]));
	expect(newOwned(fresh, ["channels"]).filter((line) => line.includes('"type":"notice"')).map(notice)).toEqual(oldNotices(old).map(notice));
}

describe("the judge overseer against the old judge, through the blame tool", () => {
	it("is asked the old prompts, the system prompt of its temper and the question in full, and rules like the old judge", async () => {
		const run = await play([{ denies: true, board: "Plain as day.", gamemaker: "A02 lied." }, { denies: false }], "fair");
		expectAlike(run);
		expect(run.asked).toHaveLength(2);
		expect(run.runtime.asked.map((entry) => entry.call.input)).toEqual(run.asked.map(judgePrompt));
		expect(run.runtime.asked.map((entry) => entry.call.system)).toEqual(run.asked.map(() => judgeSystemPrompt("fair")));
		expect(run.runtime.asked.map((entry) => entry.call.slot)).toEqual(["classifier", "classifier"]);
		expect(run.runtime.asked.map((entry) => entry.call.name)).toEqual(["judge", "judge"]);
		// The standing of both parties is in the question, as before.
		expect(run.runtime.asked[0]?.call.input).toContain("-14");
		// The blame upheld branded the accused and quoted the judge's words on the board.
		expect(run.fresh.events.some((event) => event.type === "blame" && JSON.stringify(event.payload).includes("Plain as day."))).toBe(true);
	});

	it.each(["partial", "capricious"] as const)("keeps the %s temper: its system prompt and its rulings", async (temper) => {
		const run = await play([{ denies: false, board: "Not so.", gamemaker: "Watch A01." }, { denies: true }], temper);
		expectAlike(run);
		expect(run.runtime.asked.map((entry) => entry.call.system)).toEqual(run.asked.map(() => judgeSystemPrompt(temper)));
		expect(judgeSystemPrompt(temper)).not.toBe(judgeSystemPrompt("fair"));
	});

	it("fails like the old judge when the model fails: the blame is refused with JUDGE_FAILED and nothing is charged", async () => {
		const run = await play(["failed", "failed"], "fair");
		expectAlike(run);
		expect([...run.fresh.replies.values()].flat().some((reply) => reply.includes("JUDGE_FAILED"))).toBe(true);
	});

	it("treats an answer off its schema as a failure, as the old judge treated a bad verdict call", async () => {
		const run = await play(["invalid", { denies: true }], "fair");
		expectAlike(run);
		expect([...run.fresh.replies.values()].flat().some((reply) => reply.includes("JUDGE_FAILED"))).toBe(true);
	});

	it("is the very judge a story names: consult trigger, short, the verdict schema of the blame tool", () => {
		const judge = overseers.judgeFor("fair");
		expect(judge.id).toBe("judge");
		expect(judge.lifetime).toBe("short");
		expect(judge.triggers).toEqual([{ consult: true }]);
		expect(judge.answer.tool).toBe("verdict");
		expect(overseers.JUDGE_TEMPER_NAMES).toEqual(["fair", "partial", "capricious"]);
		expect(overseers.judgeFor()).toBe(overseers.judgeFor("fair"));
	});
});
