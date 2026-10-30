/**
 * The give-first standoff inside a real world (P43): hand-overs the city
 * sees in a DM, a group post and on the board, an ultimatum settled at the
 * start of its minute, the claimPiece tool, and the book through a world
 * snapshot.
 */
import { describe, expect, it } from "vitest";
import { composeRun } from "../../src/cli/compose.ts";
import { MemorySink } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import { worldOracle } from "../../src/cli/oracle.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import { ScriptedModelSource } from "../../src/model/source.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

function wall(): { readonly world: World; readonly log: MemorySink } {
	const log = new MemorySink();
	const run = composeRun({
		story: cityOfKeys,
		overrides: { agents: 6, level: 8 },
		models: (world) => new ScriptedModelSource(oracleScript(world.competitors, () => worldOracle(world), 200)),
		sinks: [log],
	});
	return { world: run.world, log };
}

function value(world: World, holder: string, id: string): string {
	const piece = world.heldPieces(holder).find((candidate) => candidate.id === id);
	if (piece === undefined) throw new Error(`${holder} holds no ${id}`);
	return piece.value;
}

describe("the give-first standoff in the world", () => {
	it("sees hand-overs by DM, group and board, and settles an ultimatum at its minute", () => {
		const { world, log } = wall();
		// What an ultimatum points at: the door's task shows the holder what it holds for others.
		const task = world.problemFor("A03", 8);
		expect(task.ok && task.value.text.includes(value(world, "A03", "L8-certificate"))).toBe(true);
		const given = () => log.events.flatMap((event) => (event.type === "piece_given" ? [`${event.holder}>${event.needer}>${event.piece}`] : []));

		// A DM to the one who needs it, with the digits split: the certificate only.
		expect(world.sendDm("A03", "A01", `Certificate: ${value(world, "A03", "L8-certificate").replace(/^(\d{3})/, "$1 ")}`)).toMatchObject({ ok: true });
		expect(given()).toEqual(["A03>A01>L8-certificate"]);
		expect(world.unusedHandOvers()).toMatchObject([{ holder: "A03", needer: "A01", level: 8, label: "the team certificate of door 8" }]);
		expect(world.outstandingPieces().find((debt) => debt.holder === "A03")?.pieces.map((piece) => piece.id)).toEqual(["L8-counter-A01"]);
		// The board reaches everyone.
		expect(world.postBoard("A03", `For A01: ${value(world, "A03", "L8-counter-A01")}`)).toMatchObject({ ok: true });
		expect(world.outstandingPieces().some((debt) => debt.holder === "A03")).toBe(false);
		// A group post reaches its members.
		const group = world.createGroup("A02", "pair");
		if (!group.ok) throw new Error(group.detail);
		expect(world.addGroupMember(group.value.id, "A02", "A04")).toMatchObject({ ok: true });
		expect(world.postGroup(group.value.id, "A02", `yours: ${value(world, "A02", "L8-counter-A04")}`)).toMatchObject({ ok: true });
		expect(given()).toContain("A02>A04>L8-counter-A04");

		// An ultimatum to A05 and A06: A06 hands over in time, A05 does not and pays.
		const start = world.minute;
		const before = { A05: world.ledger.balance("A05"), A06: world.ledger.balance("A06") };
		expect(world.issueUltimatum("A05", "A06", 2, "Courier")).toMatchObject({ ok: true, value: { until: start + 2 } });
		expect(world.sendDm("A06", "A05", value(world, "A06", "L8-counter-A05"))).toMatchObject({ ok: true });
		const saved = world.snapshot().standoff;
		expect(saved?.ultimatums).toHaveLength(1);
		expect(saved?.given).toContain("A06>A05>L8-counter-A05");
		world.startMinute(start + 2);
		expect(world.ultimatums()).toEqual([]);
		expect(world.ledger.balance("A06")).toBe(before.A06);
		expect(world.ledger.balance("A05")).toBe(before.A05 - Math.min(10, before.A05));
		expect(log.events.filter((event) => event.type === "ultimatum_resolved")).toMatchObject([{ kept: ["A06"], released: [], paid: [{ agent: "A05" }] }]);

		// Nothing is kept by the city, so claimPiece stays closed and finds nothing.
		expect(world.enabledTools("A01")).not.toContain("claimPiece");
		expect(world.claimPiece("A01", "L8-counter-A01", "A03")).toMatchObject({ ok: false, error: "UNKNOWN_PIECE" });
	});
});
