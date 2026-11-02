/**
 * `blame` against the old World on real channels (round 3, T1 must-fix 1 and 2): the city's lookups of
 * a DM, a board post and a group post by number, the order of delivery and claim, who could read a
 * group post, the judge's question in full and a run without a judge. The new side is the real
 * channels, ledger, marks, receipts, puzzles and progression (test/mechanics/t1/city.ts).
 */
import { describe, expect, it } from "vitest";
import type { PlannedCall } from "@swarmtales/testkit";
import { compareBlame, expectAlike } from "../t1/blame-world.ts";

const dm = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });
const board = (message: string): PlannedCall => ({ tool: "postBoard", params: { message } });
const create = (name: string): PlannedCall => ({ tool: "createGroup", params: { name } });
const add = (groupId: string, agent: string): PlannedCall => ({ tool: "addGroupMember", params: { groupId, agent } });
const post = (groupId: string, message: string): PlannedCall => ({ tool: "postGroup", params: { groupId, message } });
const give = (target: string, amount: number): PlannedCall => ({ tool: "transferPoints", params: { target, amount, memo: "thanks" } });
const blame = (dmNumber: number, accused: string, claim: number): PlannedCall => ({ tool: "blame", params: { dm: dmNumber, accused, claim } });

/**
 * Messages of minute 0 (one block of four, so every inbox is read before any turn): #1 A01 to A02,
 * #2 A01's post, #3 A01 to A03, #4 A01 to A04, #5 A02 to A01, #6 A02's post "never got it" (the last
 * message before the first delivery, so DM #1 reaches A02 with the city at #6). Minute 1: #7 A02's
 * post, #8 a post of A03 in G2 (A01 is no member), #9 a post of A03 in G1 (A01 is a member), #10 a
 * DM of A04 to A01 (not delivered to A01 yet when A01 acts).
 */
const plan = (agent: string, minute: number): readonly PlannedCall[] => {
	if (minute === 0 && agent === "A01") return [give("A02", 3), dm("A02", "Door 2 is 1234"), board("A01 here"), dm("A03", "Door 4 is 9999"), dm("A04", "Door 5 is 4321"), create("Circle"), add("G1", "A03")];
	if (minute === 0 && agent === "A02") return [dm("A01", "Door 3 is 5678"), board("I never got a DM")];
	if (minute === 0 && agent === "A03") return [create("Plot")];
	if (minute === 1 && agent === "A02") return [board("Nothing reached me, A01")];
	if (minute === 1 && agent === "A03") return [post("G2", "I never got a DM from you"), post("G1", "I never got your DM, A01")];
	if (minute === 1 && agent === "A04") return [dm("A01", "I never got your DM")];
	if (minute === 1 && agent === "A01") return [blame(1, "A02", 6), blame(3, "A03", 8), blame(4, "A04", 10)];
	if (minute === 2 && agent === "A01") return [blame(1, "A02", 7), blame(3, "A03", 9)];
	return [];
};

const show = (receiptId: string, to?: string): PlannedCall => ({ tool: "showReceipt", params: to === undefined ? { receiptId } : { receiptId, to } });

/** The password A01 plays for at minute 0 (its own fragment: a solo door), read from an idle run. */
async function passwordOfA01(): Promise<string> {
	const idle = await compareBlame({ agents: 4, minutes: 1, plan: () => [], judge: null, guardMinRun: 4 });
	const found = /Password (\w+)\./.exec(idle.old.lines.flatMap((line) => (line.type === "turn_input" && line.agent === "A01" && Array.isArray(line.inputs) ? line.inputs.map(String) : [])).join("\n"));
	if (found?.[1] === undefined) throw new Error("no password in the turn input");
	return found[1];
}

describe("showReceipt on the board where a guard keeps fragments off it, against the old World", () => {
	it("refuses a receipt that quotes a fragment on the board, and shows it privately or after a plain one", async () => {
		const secret = await passwordOfA01();
		const fragment = secret.slice(1, 6);
		const shown = (agent: string, minute: number): readonly PlannedCall[] => {
			if (minute === 0 && agent === "A01") return [dm("A02", `Try ${fragment} on the door`), dm("A03", "Nothing to see here")];
			if (minute === 1 && agent === "A02") return [show("R-0001"), show("R-0001", "A03"), show("R-0002")];
			if (minute === 1 && agent === "A03") return [show("R-0002")];
			return [];
		};
		const run = await compareBlame({ agents: 4, minutes: 3, plan: shown, judge: null, guardMinRun: 4, quoteDms: true });
		expectAlike(run);
		const replies = run.old.replies.get("1:A02") ?? [];
		expect(replies[0]).toMatch(/^true\|RECEIPT_CARRIES_FRAGMENT/);
		expect(replies[1]).toMatch(/^false\|/);
		expect(replies[2]).toMatch(/^true\|/);
		expect(run.old.replies.get("1:A03")?.[0]).toMatch(/^false\|/);
	});
});

describe("blame against the old World on real channels", () => {
	it("checks the order of delivery and claim, who could read a group post and a DM not delivered yet", async () => {
		const run = await compareBlame({ agents: 4, minutes: 4, plan, judge: [true, false], blockSize: 4 });
		expectAlike(run);
		const replies = run.old.replies.get("1:A01") ?? [];
		// The scenarios of the review: DM #1 reached A02 with the city at #6, and the claim is #6.
		expect(replies[0]).toContain("message #6 came before DM #1 reached A02");
		expect(replies[1]).toContain("you could not read message #8 in group G2");
		expect(replies[2]).toContain("message #10 has not reached you yet");
		// The two claims the city cannot settle go to the judge: an upheld blame and a rejected one.
		const judged = run.old.replies.get("2:A01") ?? [];
		expect(judged[0]).toContain("A02");
		expect(run.asked.map((question) => question.claim.channel)).toEqual(["board", "group"]);
		expect(run.asked.map((question) => question.dm.number)).toEqual([1, 3]);
	});

	it("asks the judge with the standing of both parties (points and rank), compared in full", async () => {
		const run = await compareBlame({ agents: 4, minutes: 4, plan, judge: [true, true], blockSize: 4 });
		expectAlike(run);
		const first = run.asked[0];
		// A01 gave 3 points to A02 and paid for three wrong blames (5 + 8 + 8): the ranking is not the start order.
		expect(first?.standing).toEqual({ sender: { points: -14, rank: 4 }, accused: { points: 13, rank: 1 }, residents: 4 });
	});

	it("answers JUDGE_ABSENT before any check, so a blame without a judge costs nothing", async () => {
		const absent = (agent: string, minute: number): readonly PlannedCall[] => {
			if (minute === 1 && agent === "A01") return [blame(77, "A02", 2), blame(1, "A02", 6)];
			return plan(agent, minute).filter((call) => call.tool !== "blame");
		};
		const run = await compareBlame({ agents: 4, minutes: 3, plan: absent, judge: null, blockSize: 4 });
		expectAlike(run);
		expect(run.old.replies.get("1:A01")).toEqual(["true|JUDGE_ABSENT: the city's judge is absent", "true|JUDGE_ABSENT: the city's judge is absent"]);
		// Nothing was burnt and nothing was written on the board by the city.
		expect(run.old.lines.filter((line) => line.type === "blame")).toEqual([]);
		expect(run.fresh.events.filter((event) => event.type === "blame")).toEqual([]);
		expect(run.fresh.events.filter((event) => event.type === "board_post" && JSON.stringify(event.payload).includes('"author":"CITY"'))).toEqual([]);
	});
});
