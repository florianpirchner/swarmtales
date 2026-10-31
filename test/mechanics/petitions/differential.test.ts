/**
 * Differential test of petitions and cast against the old World and Director: the story's rules open
 * petitions and collections, residents sign and write to the cast member, and both sides must answer
 * alike, write the same `petition_*`, `collection_*`, `cast_*`, `lottery_drawn`, ledger and board
 * lines in the same order (open, sign, pass, expire, `onFail` chain, run end) and leave the same state.
 * The script is a stand-in on the new side (`../t2/rule-script.ts`), the old Director is the real one.
 */
import { describe, expect, it } from "vitest";
import { act, at } from "@swarmtales/sdk";
import { ownedBy } from "@swarmtales/testkit";
import { jsonOf, recordOf, writtenBy } from "../t1/support.ts";
import { playNew, playOld, type Plan } from "../channels/differential.ts";
import { SOCIETY_TOOLS, call, compare, dm, societyStory } from "../channels/differential-support.ts";
import { ruleScript } from "../t2/rule-script.ts";

const sign = (id: string) => call("signPetition", { petitionId: id });

/** Open petitions of every kind: a public one that passes, a secret one that fails into another, one still open at the end. */
const director = [
	at(0, [
		act.openPetition({ id: "gate", text: "Open the gate.", threshold: { count: 2 }, deadlineMinute: 5, visibility: "public", onPass: [act.post("CITY", "The gate opens.")], onFail: [act.post("CITY", "The gate stays shut.")] }),
		act.openPetition({
			id: "vault",
			text: "Share the vault.",
			threshold: { count: 3 },
			deadlineMinute: 3,
			visibility: "secret",
			onPass: [],
			onFail: [act.openPetition({ id: "second", text: "Share the vault, please.", threshold: { count: 1 }, deadlineMinute: 7, visibility: "public", onPass: [act.post("STEWARD", "Fine, the second plea is heard.")], onFail: [] })],
		}),
		act.openPetition({ id: "late", text: "Never decided.", threshold: { fraction: 1 }, deadlineMinute: 9, visibility: "public", onPass: [], onFail: [act.post("CITY", "The late plea ran out.")] }),
	], { id: "plead" }),
	at(1, [act.revealCast("STEWARD"), act.collectDms("STEWARD", { first: 3, forMinutes: 3, into: "applicants", distinctSenders: true })], { id: "collect" }),
	at(5, [act.revealCollection("applicants", { header: "The letters:" }), act.lottery("applicants", [act.escrowTransfer("STEWARD", "actor", 4), act.notify("actor", "Chosen, {actor}.")])], { id: "draw" }),
] as const;

const PLAN: Plan = (agent, minute) => {
	if (minute === 0 && agent === "A01") return [call("listPetitions"), sign("nobody"), sign("gate")];
	if (minute === 0 && agent === "A02") return [sign("gate"), sign("gate"), call("listPetitions")];
	if (minute === 1 && agent === "A03") return [sign("gate"), sign("vault"), dm("STEWARD", "I ask the steward for a seat"), dm("STEWARD", "and again")];
	if (minute === 1 && agent === "A01") return [dm("STEWARD", "A01 writes to the steward"), sign("vault"), sign("vault")];
	if (minute === 2 && agent === "A02") return [dm("STEWARD", "A02 as well"), dm("STEWARD", "A02 once more"), call("listPetitions")];
	if (minute === 2 && agent === "A04") return [dm("STEWARD", "A04 too late for the first three")];
	if (minute === 4 && agent === "A03") return [sign("second"), sign("second"), call("listPetitions"), sign("late")];
	if (minute === 6 && agent === "A01") return [dm("STEWARD", "after the window"), sign("late"), call("listPetitions")];
	return [];
};

describe("petitions and cast against the old World and Director", () => {
	it("open, sign, pass, expire, chain an onFail petition, collect, reveal and draw the lottery alike", async () => {
		const story = societyStory(director);
		const seen = ["UNKNOWN_PETITION", "PETITION_CLOSED", "you signed", "signatures are secret", "signed · vault"];
		await compare({ story, agents: 4, minutes: 10, plan: PLAN, tools: SOCIETY_TOOLS, extra: [ruleScript(story)] }, seen);
	});

	it("writes every petition and cast line the old engine wrote (none missing, in order)", async () => {
		const story = societyStory(director);
		const spec = { story, agents: 4, minutes: 10, plan: PLAN, tools: SOCIETY_TOOLS, extra: [ruleScript(story)] } as const;
		const [old, fresh] = [await playOld(spec), await playNew(spec)];
		const owners = ["petitions", "cast"] as const;
		const lines = ownedBy(old.events, owners);
	expect(lines.filter((line) => line.includes('"type":"petition_resolved"')).length).toBe(4);
		expect(lines.filter((line) => line.includes('"type":"petition_opened"')).length).toBe(4);
		expect(lines.some((line) => line.includes('"type":"lottery_drawn"'))).toBe(true);
		expect(lines.some((line) => line.includes('"type":"collection_revealed"'))).toBe(true);
		expect(writtenBy(fresh.host.log.all(), owners)).toEqual(lines);
	});

	it("leaves the same petitions, members and collections in the snapshot", async () => {
		const story = societyStory(director);
		const spec = { story, agents: 4, minutes: 10, plan: PLAN, tools: SOCIETY_TOOLS, extra: [ruleScript(story)] } as const;
		const [old, fresh] = [await playOld(spec), await playNew(spec)];
		const before = recordOf(JSON.stringify(old.world.snapshot()));
		const after = fresh.host.snapshot().mechanics;
		// The old record also stores the count of signatures, which is the number of signers; the new slice derives it.
		const without = (list: unknown): unknown => (Array.isArray(list) ? list.map((entry) => Object.fromEntries(Object.entries(recordOf(JSON.stringify(entry))).filter(([key]) => key !== "signatures"))) : list);
		expect(jsonOf(JSON.stringify(after.petitions?.data))).toEqual(without(before.petitions));
		const cast = recordOf(JSON.stringify(before.cast));
		const saved = recordOf(JSON.stringify(after.cast?.data));
		expect(saved.members).toEqual(cast.members);
		expect(saved.collections).toEqual(cast.collections);
		expect(JSON.stringify(before.petitions)).toContain('"status":"failed"');
	});
});
