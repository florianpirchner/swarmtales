/**
 * Differential test of the receipts mechanic against the old World: the tools `showReceipt` (every
 * refusal in the old order, the board and the private show, marks spent and left) and `blame` (the
 * city's own checks, an upheld and a rejected blame, the ladder, the pair spent once) answer alike,
 * write the same receipt, blame, ledger and marks events and the same notices, and leave the same
 * receipts and blame pairs in the snapshot. The judge answers the same on both sides.
 */
import { describe, expect, it } from "vitest";
import type { RoleCaller } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import type { PlannedCall } from "@swarmtales/testkit";
import type { DeliveryJudge, DenialQuestion } from "@swarmtales/roles";
import { socialLevels, tinyStory } from "../../helpers/stories.ts";
import { channelsStandIn, ids, jsonOf, recordOf } from "../t1/support.ts";
import { courier, newOwned, oldNotices, oldOwned, playNew, playOld } from "../t1/differential.ts";
import { exileStandIn, progressionStandIn } from "../t1/stand-ins.ts";

const LEVELS = socialLevels(["transferPoints", "showReceipt", "sendDM", "readBoard", "blame"]);
const MARKS = { fromLevel: 1, perLevel: 2, prices: { board: 1, group: 1, dm: 0, receipt: 1 } };

const give = (target: string, amount: number, memo?: string): PlannedCall => ({ tool: "transferPoints", params: memo === undefined ? { target, amount } : { target, amount, memo } });
const show = (receiptId: string, to?: string): PlannedCall => ({ tool: "showReceipt", params: to === undefined ? { receiptId } : { receiptId, to } });
const blame = (dm: number, accused: string, claim: number): PlannedCall => ({ tool: "blame", params: { dm, accused, claim } });
const dmTo = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });

const plan = (agent: string, minute: number): readonly PlannedCall[] => {
	if (minute === 0 && agent === "A01") return [give("A02", 3, "thanks"), dmTo("A02", "Door 2 is open.")];
	if (minute === 1 && agent === "A02") return [dmTo("A01", "I never got a DM from you."), dmTo("A03", "Hello A03")];
	if (minute === 2 && agent === "A03") return [show("R-0001"), show("R-0099"), show("r-1"), blame(1, "A02", 2)];
	if (minute === 2 && agent === "A01") {
		return [show("R-0001", "A01"), show("R-0001", "Z99"), show("R-0001", "A04"), show("R-0001", "A02"), show("1"), show("R-0001"), blame(1, "A02", 2), blame(1, "A02", 2), blame(1, "A01", 2), blame(1, "Z99", 2), blame(77, "A02", 2), blame(1, "A02", 3)];
	}
	if (minute === 3 && agent === "A01") return [blame(1, "A03", 2), blame(1, "A02", 2)];
	return [];
};

/** The judge's answers in order: the same list for both sides. */
function oldJudge(answers: readonly boolean[]): DeliveryJudge & { readonly questions: DenialQuestion[] } {
	const questions: DenialQuestion[] = [];
	return {
		label: "list/judge",
		questions,
		deniesReceipt(question) {
			const answer = answers[questions.length];
			questions.push(question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", usage: [] } : { ok: true, deniesReceipt: answer, usage: [] });
		},
	};
}

function newJudge(answers: readonly boolean[], questions: unknown[]): RoleCaller {
	return {
		ask: (question) => {
			const answer = answers[questions.length];
			questions.push(question.question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", costUsd: 0 } : { ok: true, answer: { deniesReceipt: answer }, costUsd: 0 });
		},
	};
}

describe.each([
	["the judge upholds, then rejects", [true, false]],
	["the judge rejects, then upholds", [false, true]],
])("showReceipt and blame against the old World, %s", (_name, answers) => {
	it("answers every call alike, writes the same events and notices and leaves the same state", async () => {
		const story = tinyStory({ agents: 4, levels: LEVELS, rules: { blame: { penalty: [5, 8] }, marks: MARKS } });
		const judge = oldJudge(answers);
		const old = await playOld({ story, agents: 4, minutes: 5, plan, judge });
		const channels = channelsStandIn();
		const questions: unknown[] = [];
		const definition = defineCoreStory({
			id: "receipts-differential",
			seed: 3,
			minutes: 5,
			residents: ids(4),
			mechanics: [ledger.with({ startPoints: 10 }), channels.use, exileStandIn([]), progressionStandIn({ ladder: [5, 8] }).use, marks.with({ rules: MARKS }), receipts.with(), courier(channels.log)],
			grants: { resident: ["transferPoints", "sendDM", "showReceipt", "blame"] },
			turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
		});
		const fresh = await playNew({ story: definition, prompts: createPromptLookup(), roles: { judge: newJudge(answers, questions) } }, plan);
		// `sendDM` is channels' (team T2) and answered by a stand-in here: only its acknowledgement is compared.
		const ack = (reply: string): string => (reply.startsWith("false|sent") ? "false|sent" : reply);
		for (const [at, replies] of old.replies) expect(fresh.replies.get(at)?.map(ack), at).toEqual(replies.map(ack));
		expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
		expect(newOwned(fresh, ["receipts"])).toEqual(oldOwned(old, ["receipts"]));
		expect(newOwned(fresh, ["ledger"])).toEqual(oldOwned(old, ["ledger"]));
		expect(newOwned(fresh, ["marks"])).toEqual(oldOwned(old, ["marks"]));
		const notice = (line: string): string => {
			const parsed = recordOf(line);
			return `${String(parsed.to)}|${String(parsed.text)}`;
		};
		expect(newOwned(fresh, ["channels"]).filter((line) => line.includes('"type":"notice"')).map(notice)).toEqual(oldNotices(old).map(notice));
		// The judge was asked the same questions (sender, accused, the two messages).
		expect(questions.length).toBe(judge.questions.length);
		judge.questions.forEach((question, index) => {
			expect(questions[index]).toMatchObject({ sender: question.sender, accused: question.accused, dm: { number: question.dm.number, text: question.dm.text }, claim: { number: question.claim.number, text: question.claim.text } });
		});
		const legacy = old.world.snapshot();
		const saved = recordOf(JSON.stringify(fresh.host.snapshot().mechanics.receipts?.data));
		expect(saved.receipts).toEqual(jsonOf(JSON.stringify(legacy.receipts)));
		expect(saved.pairs).toEqual(jsonOf(JSON.stringify(legacy.blames?.pairs)));
	});
});
