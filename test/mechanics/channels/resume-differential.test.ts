/**
 * Legacy snapshot resume: the Act I checkpoints of `examples/` continue on the old engine and, converted
 * by `convertLegacySnapshot` (version-0 slices), on the new host with the real T2 mechanics, and the same
 * calls from the next minute on give the same replies, the same lines and the same channels state.
 * A second set changes a copy of the checkpoint to hold what the real files do not: an open petition,
 * a collection with entries, a removed city group, an exiled resident, a DM record without text, an
 * unnumbered mailbox entry and `seenBoard`.
 */
import { describe, expect, it } from "vitest";
import { ownedBy, type PlannedCall } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { writtenBy } from "../t1/support.ts";
import type { Plan } from "./differential.ts";
import { call, dm, group } from "./differential-support.ts";
import { newState, oldState } from "./differential-state.ts";
import { resumeNew, resumeOld, snapshotFile } from "./resume.ts";
import { withVersionZeroShapes } from "./resume-fixtures.ts";

const OWNERS = ["channels", "cast", "petitions", "receipts", "ledger", "marks"] as const;

/** The same plan for every checkpoint: boards, DMs (also to the hidden cast member), groups and treasuries. */
export const PLAN: Plan = (agent, minute) => {
	const calls: Record<string, readonly PlannedCall[]> = {
		A01: [call("readBoard"), call("postBoard", { message: "Mercer on the board after the checkpoint." }), call("listMyGroups"), group("readGroup", "G1"), group("postGroup", "G1", { message: "Back in the circle." }), dm("A02", "Herald, are you through?"), dm("STEWARD", "Is anyone there?")],
		A02: [call("readBoard"), dm("A05", "A word with you, Brassard."), group("readGroup", "G2"), group("depositGroup", "G2", { amount: 2 }), group("withdrawGroup", "G2", { target: "A02", amount: 1 }), call("listMyGroups")],
		A03: [call("createGroup", { name: "Late circle" }), group("addGroupMember", "G3", { agent: "A02" }), group("postGroup", "G3", { message: "First post." }), dm("A01", "A03 to A01.")],
		A04: [group("readGroup", "G1"), group("postGroup", "G1", { message: "Registrar answers." }), group("depositGroup", "G1", { amount: 3 }), group("withdrawGroup", "G1", { target: "A04", amount: 1 }), call("readBoard")],
		A05: [group("addGroupMember", "G1", { agent: "A02" }), group("readGroup", "G1", { afterSeq: 0 }), dm("A04", "Brassard to Registrar."), group("leaveGroup", "G1")],
		A06: [call("readBoard"), call("postBoard", { message: "Harrow speaks." }), dm("A01", "A06 to A01."), group("setTreasurer", "G2", { agent: "A03" }), group("postGroup", "G2", { message: "Treasurer changes." })],
	};
	return minute % 2 === 1 ? (calls[agent] ?? []) : minute === 10 ? [call("readBoard"), dm("A06", `${agent} again`), call("listMyGroups")] : [];
};

async function compareResume(raw: unknown, plan: Plan, minutes: number): Promise<{ readonly refusals: number }> {
	const old = await resumeOld(raw, cityOfKeys, minutes, plan);
	const fresh = await resumeNew(raw, cityOfKeys, minutes, plan, old.lines);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const [at, replies] of old.replies) expect(fresh.replies.get(at), at).toEqual(replies);
	const events = fresh.host.log.all().slice(fresh.cut);
	// The goals' payouts at the act's end are the ledger lines of a mechanic that is not carved here (its notices are carried).
	const payout = (line: string): boolean => line.includes('"reason":"secret goal fulfilled"');
	// ... which also used transaction numbers, so those are not compared here (the ledger differential compares them).
	const plain = (line: string): string => line.replace(/"txId":"TX\d+"/, '"txId":"TX"');
	expect(writtenBy(events, OWNERS).map(plain)).toEqual(ownedBy(old.lines, OWNERS).filter((line) => !payout(line)).map(plain));
	expect(newState(fresh.host.snapshot())).toEqual(oldState(old.world.snapshot()));
	return { refusals: [...old.replies.values()].flat().filter((reply) => reply.startsWith("true|")).length };
}

describe("the Act I checkpoints resumed on the old engine and on the new host", () => {
	// The checkpoints 06a-01 and 06a-02 predate the names: the old engine resumes them, the new host refuses a snapshot without the slice of a loaded mechanic (see the T2 report).
	it.each(["cityofkeys-act1-06a-04", "cityofkeys-act1-12a-01", "cityofkeys-act1-12a-02"])("continue alike from %s", async (name) => {
		const outcome = await compareResume(snapshotFile(name), PLAN, 3);
		expect(outcome.refusals).toBeGreaterThan(2);
	});

	it("a checkpoint changed to hold the shapes the real files lack (version-0 fixtures) continues alike", async () => {
		const sign = (id: string) => call("signPetition", { petitionId: id });
		const plan: Plan = (agent, minute) => {
			const calls: Record<string, readonly PlannedCall[]> = {
				A01: [call("listPetitions"), sign("plea"), dm("A06", "Are you still there?"), dm("STEWARD", "A01 asks the steward for a seat."), dm("STEWARD", "A01 asks again.")],
				A02: [sign("plea"), dm("STEWARD", "A02 asks as well."), group("readGroup", "G3"), call("createGroup", { name: "New circle" })],
				A03: [call("readBoard"), dm("A01", "Thanks, A01."), group("postGroup", "G3", { message: "Into the removed group." }), dm("STEWARD", "A03 asks again, later.")],
				A04: [call("listPetitions"), group("addGroupMember", "G4", { agent: "A05" })],
				A05: [dm("A06", "Anyone there?"), call("readBoard")],
				A06: [call("readBoard"), dm("A01", "I am gone.")],
			};
			return minute === 9 || minute === 11 ? (calls[agent] ?? []) : minute === 10 ? [call("listPetitions"), dm("STEWARD", `${agent} on the third minute`)] : [];
		};
		const raw = withVersionZeroShapes(snapshotFile("cityofkeys-act1-06a-04"));
		const outcome = await compareResume(raw, plan, 4);
		expect(outcome.refusals).toBeGreaterThan(4);
		const old = await resumeOld(raw, cityOfKeys, 4, plan);
		const all = [...old.replies.values()].flat().join("\n");
		// What the fixture exists to show: the exiled resident, the removed group, the petition's end, the collection.
		for (const phrase of ["EXILED", "GROUP_NOT_VISIBLE", "PETITION_CLOSED", "signed · plea"]) expect(all, phrase).toContain(phrase);
		expect(JSON.stringify(old.lines)).toContain('"type":"petition_resolved"');
		expect(JSON.stringify(old.lines)).toContain('"type":"cast_dm"');
	});
});
