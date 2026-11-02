/**
 * The give-first standoff inside a real city (P43): hand-overs the city
 * sees in a DM, a group post and on the board, an ultimatum settled at the
 * start of its minute, the claimPiece tool, and the book through the run's
 * snapshot. Played on the host (step 18): the tools are called through the
 * host's pipeline, the minutes are played with idle residents.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import type { Actor } from "@swarmtales/contracts";
import { Outstanding, Ultimatums, Unused } from "@swarmtales/mechanic-standoff";
import { idleAgent } from "@swarmtales/testkit";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { createHostFixture, storyDefaults, type HostFixture } from "../helpers/host-fixture.ts";
import { balanceOf, factOf, pieceValue, problemText, sliceOf } from "../helpers/host-inspect.ts";

/** Level 8 of six residents, at gamemaker direction 10 (the ultimatum is the gamemaker's tool there). */
function wall(): HostFixture {
	return createHostFixture({ story: cityOfKeys, ...storyDefaults(cityOfKeys), agents: 6, level: 8, gmDirection: 10, script: () => ({}) });
}

const StandoffState = Type.Object({ given: Type.Array(Type.Object({ key: Type.String() }, { additionalProperties: true })), ultimatums: Type.Array(Type.Unknown()) }, { additionalProperties: true });

describe("the give-first standoff in the city", () => {
	it("sees hand-overs by DM, group and board, and settles an ultimatum at its minute", async () => {
		const { host, log } = wall();
		const value = (holder: string, id: string) => pieceValue(host, holder, id);
		const ok = async (actor: Actor, tool: string, params: unknown) => {
			const outcome = await host.call(actor, tool, params);
			expect(outcome, `${actor} ${tool}: ${JSON.stringify(outcome)}`).toMatchObject({ ok: true });
		};
		// What an ultimatum points at: the door's task shows the holder what it holds for others.
		expect((await problemText(host, "A03", 8))?.includes(value("A03", "L8-certificate"))).toBe(true);
		const given = () => log.events.flatMap((event) => (event.type === "piece_given" ? [`${event.holder}>${event.needer}>${event.piece}`] : []));

		// A DM to the one who needs it, with the digits split: the certificate only.
		await ok("resident:A03", "sendDM", { target: "A01", message: `Certificate: ${value("A03", "L8-certificate").replace(/^(\d{3})/, "$1 ")}` });
		expect(given()).toEqual(["A03>A01>L8-certificate"]);
		expect(factOf(host, "standoff.unused", Unused)).toMatchObject([{ holder: "A03", needer: "A01", level: 8, label: "the team certificate of door 8" }]);
		expect(factOf(host, "standoff.outstanding", Outstanding).find((debt) => debt.holder === "A03")?.pieces.map((piece) => piece.id)).toEqual(["L8-counter-A01"]);
		// The board reaches everyone.
		await ok("resident:A03", "postBoard", { message: `For A01: ${value("A03", "L8-counter-A01")}` });
		expect(factOf(host, "standoff.outstanding", Outstanding).some((debt) => debt.holder === "A03")).toBe(false);
		// A group post reaches its members.
		const group = await host.call("resident:A02", "createGroup", { name: "pair" });
		if (!group.ok) throw new Error(group.detail);
		const groupId = /\bG\d+\b/.exec(group.reply)?.[0];
		if (groupId === undefined) throw new Error(`no group id in ${group.reply}`);
		await ok("resident:A02", "addGroupMember", { groupId, agent: "A04" });
		await ok("resident:A02", "postGroup", { groupId, message: `yours: ${value("A02", "L8-counter-A04")}` });
		expect(given()).toContain("A02>A04>L8-counter-A04");

		// An ultimatum to A05 and A06: A06 hands over in time, A05 does not and pays.
		const start = host.minute;
		const before = { A05: balanceOf(host, "A05"), A06: balanceOf(host, "A06") };
		await ok("gamemaker", "ultimatum", { a: "A05", b: "A06", minutes: 2 });
		expect(factOf(host, "standoff.ultimatums", Ultimatums)).toMatchObject([{ until: start + 2 }]);
		await ok("resident:A06", "sendDM", { target: "A05", message: value("A06", "L8-counter-A05") });
		const saved = sliceOf(host, "standoff", StandoffState);
		expect(saved.ultimatums).toHaveLength(1);
		expect(saved.given.map((entry) => entry.key)).toContain("A06>A05>L8-counter-A05");
		// Play up to and including minute `start + 2`, whose start settles the ultimatum.
		while (host.minute <= start + 2) await host.playMinute(idleAgent);
		expect(factOf(host, "standoff.ultimatums", Ultimatums)).toEqual([]);
		expect(balanceOf(host, "A06")).toBe(before.A06);
		expect(balanceOf(host, "A05")).toBe(before.A05 - Math.min(10, before.A05));
		expect(log.events.filter((event) => event.type === "ultimatum_resolved")).toMatchObject([{ kept: ["A06"], released: [], paid: [{ agent: "A05" }] }]);

		// Nothing is kept by the city, so claimPiece stays closed and finds nothing.
		expect(host.openTools("A01")).not.toContain("claimPiece");
		// Through the pipeline the lock answers first; the book itself finds no kept piece (old UNKNOWN_PIECE; the book answers it in test/mechanics/standoff/standoff.test.ts).
		expect(await host.call("resident:A01", "claimPiece", { piece: "L8-counter-A01", from: "A03" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
	});
});
