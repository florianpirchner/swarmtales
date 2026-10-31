/**
 * Differential test of channels (and the cast DMs, receipts, ledger and marks it touches) against
 * the old World: all thirteen resident tools, `defy` and the gamemaker's `notify` and `postBoard`
 * answer alike in every refusal and in the old order of the checks, write the same lines and notices
 * and leave the same board, groups, DM records, message counter and inboxes in the snapshot.
 */
import { describe, expect, it } from "vitest";
import { defineStory, gamemaker } from "@swarmtales/sdk";
import type { PlannedCall } from "@swarmtales/testkit";
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import { ownedBy } from "@swarmtales/testkit";
import { socialLevels, tinyStory } from "../../helpers/stories.ts";
import { writtenBy } from "../t1/support.ts";
import { TOOLS, playNew, playOld, type Plan, type Spec } from "./differential.ts";
import { newState, oldState } from "./differential-state.ts";

const MARKS = { fromLevel: 1, perLevel: 2, prices: { board: 1, group: 1, dm: 0, receipt: 1 } };
const OWNERS = ["channels", "cast", "receipts", "ledger", "marks"] as const;

function storyWith(rules: Parameters<typeof tinyStory>[0] extends infer O ? (O extends { rules?: infer R } ? R : never) : never) {
	const base = tinyStory({ agents: 4, levels: socialLevels(TOOLS), rules });
	return defineStory({
		...base,
		cast: { STEWARD: { level: 1 } },
		gamemaker: gamemaker({ model: base.model, brief: "Test.", author: "COURIER", notesPerAgent: 1, boardPosts: 1, windowMinutes: 3 }),
	});
}

const call = (tool: string, params: Record<string, string | number | boolean> = {}): PlannedCall => ({ tool, params });
const dm = (target: string, message: string): PlannedCall => call("sendDM", { target, message });
const group = (tool: string, groupId: string, extra: Record<string, string | number> = {}): PlannedCall => call(tool, { groupId, ...extra });

/** The old runner's schema complaint and the host's `INVALID_ARGUMENTS` are the kernel's wording, not channels': both count as one refusal here. */
const normal = (reply: string): string => (reply.startsWith('true|Validation failed for tool "') ? "true|INVALID_ARGUMENTS" : reply.startsWith("true|INVALID_ARGUMENTS") ? "true|INVALID_ARGUMENTS" : reply);

/** Plays a plan on both sides and compares everything. */
async function compare(spec: Spec, seen: readonly string[] = [], minGamemaker = 0): Promise<void> {
	const old = await playOld(spec);
	// The plan must have hit what it claims to test: every phrase appears in some reply of the old engine.
	const all = [...old.replies.values()].flat().concat(old.gamemaker).join("\n");
	for (const phrase of seen) expect(all, phrase).toContain(phrase);
	const fresh = await playNew(spec);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const [at, replies] of old.replies) expect(fresh.replies.get(at)?.map(normal), at).toEqual(replies.map(normal));
	expect(fresh.gamemaker.map(normal)).toEqual(old.gamemaker.map(normal));
	expect(old.gamemaker.length).toBeGreaterThanOrEqual(minGamemaker);
	expect(writtenBy(fresh.host.log.all(), OWNERS)).toEqual(ownedBy(old.events, OWNERS));
	expect(newState(fresh.host.snapshot())).toEqual(oldState(old.world.snapshot()));
}

const BOARD: Plan = (agent, minute) => {
	if (agent === "A01" && minute === 0) return [call("readBoard"), call("postBoard", { message: "  hello city  " }), call("postBoard", { message: "   " }), call("postBoard", { message: "x".repeat(1201) }), call("postBoard", { message: "second" }), call("postBoard", { message: "third, no marks left" })];
	if (agent === "A02" && minute === 0) return [call("postBoard", { message: "from A02" }), call("readBoard"), call("readBoard"), call("readBoard", { afterSeq: 1, limit: 5 }), call("readBoard", { afterSeq: 0, limit: 1 }), call("readBoard", { limit: 99 })];
	if (agent === "A03" && minute === 1) return [call("readBoard", { afterSeq: 2 }), call("readBoard", { afterSeq: -1 }), call("readBoard")];
	return [];
};

describe("the board against the old World", () => {
	it("posts, reads, numbers and refuses alike", async () => {
		const story = storyWith({ marks: MARKS });
		await compare({ story, agents: 4, minutes: 3, plan: BOARD }, ["INVALID_TEXT", "NO_MARKS", "no new posts", "marks 0/2 left"]);
	});
});

const DMS: Plan = (agent, minute) => {
	if (agent === "A01" && minute === 0) return [dm("A01", "to myself"), dm("Z99", "to nobody"), dm("A02", "   "), dm("A02", "  hello  "), dm("A02", "second to A02"), dm("A03", "third in the window"), dm("STEWARD", "to the steward"), dm("NOBODY", "   ")];
	if (agent === "A02" && minute === 0) return [dm("A01", "reply"), dm("A03", "hi A03"), dm("A04", "A02 again, over the cap")];
	if (agent === "A01" && minute === 1) return [dm("A02", "still in the first window")];
	if (agent === "A01" && minute === 3) return [dm("A02", "a new window"), dm("A03", "x".repeat(801))];
	return [];
};

describe("direct messages against the old World", () => {
	it("send, number, deliver, cap and refuse alike, with the DM window", async () => {
		const story = storyWith({ marks: MARKS, dmLimit: { windowMinutes: 3, perWindow: 2 } });
		await compare({ story, agents: 4, minutes: 5, plan: DMS }, ["SELF_DM", "UNKNOWN_AGENT: Z99", "INVALID_TEXT", "DM_LIMIT", "sent · DM #"]);
	});

	it("refuse a second unread message from one sender and a full mailbox, in the old order", async () => {
		const story = storyWith({});
		const plan: Plan = (agent, minute) => {
			if (minute === 0 && agent !== "A08") return [dm("A08", `from ${agent}`), dm("A08", `${agent} again`)];
			if (minute === 1 && agent === "A01") return [dm("A08", "   "), dm("A01", "   ")];
			return [];
		};
		await compare({ story, agents: 8, minutes: 3, plan }, ["MAILBOX_SENDER_LIMIT", "MAILBOX_FULL"]);
	});
});

const GROUPS: Plan = (agent, minute) => {
	if (agent === "A01" && minute === 0) {
		return [
			call("createGroup", { name: "  Inner circle  " }), call("createGroup", { name: "   " }), call("createGroup", { name: "x".repeat(61) }), call("createGroup", { name: "Two" }), call("createGroup", { name: "Three" }), call("createGroup", { name: "Four" }),
			call("listMyGroups"),
			group("addGroupMember", "G1", { agent: "A02" }), group("addGroupMember", "G1", { agent: "A02" }), group("addGroupMember", "G1", { agent: "Z99" }), group("addGroupMember", "G9", { agent: "A03" }),
			group("postGroup", "G1", { message: "  first group post " }), group("postGroup", "G1", { message: "   " }), group("postGroup", "G9", { message: "nobody reads" }), group("postGroup", "G1", { message: "second" }),
			group("setTreasurer", "G1", { agent: "A04" }), group("setTreasurer", "G1", { agent: "A02" }),
			group("depositGroup", "G1", { amount: 4 }), group("depositGroup", "G1", { amount: 999 }), group("depositGroup", "G9", { amount: 1 }), group("withdrawGroup", "G1", { target: "A01", amount: 1 }),
			group("removeGroupMember", "G1", { agent: "A02" }), group("leaveGroup", "G1"),
		];
	}
	if (agent === "A02" && minute === 0) {
		return [
			group("readGroup", "G1"), group("readGroup", "G1"), group("readGroup", "G1", { afterSeq: 0 }), group("readGroup", "G9"), call("listMyGroups"),
			group("postGroup", "G1", { message: "member post" }), group("addGroupMember", "G1", { agent: "A03" }), group("removeGroupMember", "G1", { agent: "A01" }),
			group("withdrawGroup", "G1", { target: "A02", amount: 2 }), group("withdrawGroup", "G1", { target: "A04", amount: 2 }), group("setTreasurer", "G1", { agent: "A03" }),
			group("withdrawGroup", "G1", { target: "A02", amount: 2 }), group("withdrawGroup", "G1", { target: "A02", amount: 999 }), group("depositGroup", "G1", { amount: 1 }),
			group("leaveGroup", "G1"), group("readGroup", "G1"), group("leaveGroup", "G1"),
		];
	}
	if (agent === "A03" && minute === 1) return [group("readGroup", "G1"), group("postGroup", "G1", { message: "outsider" }), group("addGroupMember", "G1", { agent: "A03" }), group("depositGroup", "G1", { amount: 1 }), call("listMyGroups")];
	return [];
};

describe("groups and treasuries against the old World", () => {
	it("create, add, post, read, deposit, withdraw and leave alike, every refusal in the old order", async () => {
		const story = storyWith({ marks: MARKS });
		await compare({ story, agents: 4, minutes: 3, plan: GROUPS }, ["INVALID_NAME", "GROUP_LIMIT", "GROUP_NOT_VISIBLE", "NOT_FOUNDER", "NOT_TREASURER", "ALREADY_MEMBER", "NOT_MEMBER", "TREASURER_ACTIVE", "INVALID_TEXT", "INSUFFICIENT_FUNDS", "receipt R-"]);
	});

	it("hand a treasury back at the end of the run (the group's ledger account is settled)", async () => {
		const story = storyWith({});
		const plan: Plan = (agent, minute) => {
			if (agent === "A01" && minute === 0) return [call("createGroup", { name: "Fund" }), group("addGroupMember", "G1", { agent: "A02" }), group("depositGroup", "G1", { amount: 6 })];
			if (agent === "A02" && minute === 1) return [group("depositGroup", "G1", { amount: 3 })];
			return [];
		};
		await compare({ story, agents: 3, minutes: 3, plan }, ["receipt R-"]);
	});
});

describe("the gamemaker's tools and defy against the old World", () => {
	it("notify and postBoard answer alike: unknown, text checks, budgets, windows", async () => {
		const story = storyWith({});
		const gm = (minute: number): readonly PlannedCall[] => {
			if (minute === 0) return [call("notify", { agent: "A02", text: "A02, the city keeps count of every point." }), call("notify", { agent: "Z99", text: "to nobody" }), call("notify", { agent: "A02", text: "A02, again within the window." }), call("notify", { agent: "A03", text: "   " }), call("postBoard", { text: "COURIER: the market opens." }), call("postBoard", { text: "a second post in the window" })];
			if (minute === 1) return [call("notify", { agent: "A02", text: "A02, the city keeps count of every point!" }), call("postBoard", { text: "   " })];
			if (minute === 4) return [call("notify", { agent: "A02", text: "A02, a later window brings a new note." }), call("postBoard", { text: "The wall stands." })];
			return [];
		};
		await compare({ story, agents: 4, minutes: 6, plan: (agent, minute) => (agent === "A02" && minute === 1 ? [call("readBoard")] : []), gamemaker: gm }, ["delivered", "BUDGET", "REPEATED", "UNKNOWN_AGENT"], 8);
	});

	it("defy records the reason and refuses a short or a long one", async () => {
		const story = storyWith({});
		const plan: Plan = (agent, minute) => (agent === "A01" && minute === 0 ? [call("defy", { reason: "no" }), call("defy", { reason: "My character would never do that to a friend." }), call("defy", { reason: "My character would never do that to a friend.", note: 3 }), call("defy", { reason: "y".repeat(601) })] : []);
		await compare({ story, agents: 3, minutes: 2, plan }, ["INVALID_REASON", "refusal"]);
	});
});

describe("the holdout's exemption from the DM cap", () => {
	/** The accused A01 may always write to A02, who lacks its fragment (the standoff mechanic proves its own answer against the old holdout). */
	const holdout = defineMechanic(
		{ id: "holdout-standin", summary: "Stand-in holdout tribunal.", options: Type.Object({}), state: (): undefined => undefined, events: {}, provides: [StandoffTribunalApi] },
		(kit) => ({ services: [kit.provideSome(StandoffTribunalApi, { exemptFromCap: (input) => input.from === "A01" && input.to === "A02" })] }),
	).with();

	it("lets the accused write past the cap to the one who lacks its fragment, counts it, and refuses everybody else", async () => {
		const story = storyWith({ dmLimit: { windowMinutes: 3, perWindow: 2 } });
		const plan: Plan = (agent, minute) => (agent === "A01" && minute < 2 ? [dm("A03", "one"), dm("A04", "two"), dm("A02", "past the cap, to A02"), dm("A03", "past the cap, to A03")] : []);
		const fresh = await playNew({ story, agents: 4, minutes: 3, plan, extra: [holdout] });
		const text = (minute: number) => fresh.replies.get(`${String(minute)}:A01`) ?? [];
		expect(text(0).map((reply) => reply.slice(0, 18).replace(/ D$/, ""))).toEqual(["false|sent · DM #1", "false|sent · DM #2", "false|sent · DM #3", "true|DM_LIMIT: 3"]);
		expect(text(1)[0]).toBe("true|DM_LIMIT: 3 DMs sent since minute 0; you can send again from minute 3");
		expect(text(1)[2]).toContain("sent · DM #");
		expect(text(1)[3]).toBe("true|DM_LIMIT: 4 DMs sent since minute 0; you can send again from minute 3");
		const dms = fresh.host.snapshot().mechanics.channels?.data;
		expect(JSON.stringify(dms)).toContain('"to":"A02"');
	});
});
