/**
 * The old-snapshot converter (packages/chronicle/src/snapshot/legacy-snapshot.ts): the Act I
 * checkpoint of the 6-agent base loads as a host snapshot with a version-0 slice per mechanic of
 * the carve plan, resumes a host whose mechanics migrate from version 0, and is written back in the
 * old shape byte for byte.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, LEGACY_WORLD_OWNERS, toLegacySnapshot } from "@swarmtales/chronicle";
import { HostSnapshotSchema } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, refuse } from "@swarmtales/kernel";
import { standIn, standInsFor } from "@swarmtales/testkit";

const PATH = resolve(import.meta.dirname, "../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
const TEXT = readFileSync(PATH, "utf8");

/** A carved mechanic with a tool the story locks at the start. */
const vault = defineMechanic({ id: "vault", summary: "A locked tool.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "vault/open": [] } }, (kit) => ({
	tools: [kit.tool({ name: "openVault", description: "vault/open", parameters: Type.Object({}), execute: () => refuse("EMPTY") })],
}));

describe("the old-snapshot converter", () => {
	const converted = convertLegacySnapshot(JSON.parse(TEXT), {}, PATH);

	it("gives a host snapshot with a version-0 slice per mechanic", () => {
		expect(Value.Check(HostSnapshotSchema, converted.host)).toBe(true);
		expect(converted.host).toMatchObject({ story: "nexus", seed: 7, minute: 9, seq: 1722 });
		expect(converted.host.residents.ids).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
		expect(Object.keys(converted.host.mechanics).sort()).toEqual(
			["arena", "cast", "channels", "cores", "goals", "ledger", "marks", "names", "petitions", "progression", "puzzles", "receipts", "script", "tribunal", "exile"].sort(),
		);
		expect(Object.values(converted.host.mechanics).every((slice) => slice.version === 0)).toBe(true);
		expect(converted.events).toHaveLength(1722);
		expect(Object.keys(converted.roles)).toEqual(["gamemaker", "interpreter"]);
		expect(new Set(Object.values(LEGACY_WORLD_OWNERS)).size).toBeGreaterThan(15);
	});

	it("writes the old file back byte for byte, also after a trip through JSON", () => {
		expect(`${JSON.stringify(toLegacySnapshot(converted))}\n`).toBe(TEXT);
		const stored: unknown = JSON.parse(JSON.stringify(converted));
		const again = convertLegacySnapshot(JSON.parse(JSON.stringify(toLegacySnapshot(converted))));
		expect(JSON.stringify(again)).toBe(JSON.stringify(stored));
	});

	it("resumes a host whose mechanics migrate their slices from version 0", () => {
		const ids = Object.keys(converted.host.mechanics);
		const story = defineCoreStory({ id: "nexus", seed: 7, minutes: 80, residents: converted.host.residents.ids, mechanics: ids.map((id) => standIn(id).with()), grants: {} });
		const host = createHost({ story, resume: { snapshot: converted.host, events: converted.events } });
		expect(host.minute).toBe(9);
		expect(host.log.length).toBe(1722);
		const snapshot = host.snapshot();
		expect(Object.values(snapshot.mechanics).every((slice) => slice.version === 1)).toBe(true);
		expect(snapshot.mechanics.ledger?.data).toEqual({ old: converted.host.mechanics.ledger?.data });
	});

	it("keeps the story's start locks when the old snapshot gives none (review problem 10)", async () => {
		expect(converted.host.locks).toBeUndefined();
		const story = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [vault.with(), ...standInsFor(converted.host, ["vault"])],
			grants: { resident: ["openVault"] },
			locked: ["openVault"],
		});
		const host = createHost({ story, resume: { snapshot: converted.host, events: converted.events } });
		expect(await host.call("resident:A01", "openVault", {})).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		const unlocked = convertLegacySnapshot(JSON.parse(TEXT), { locks: () => [] }, PATH);
		const opened = createHost({ story, resume: { snapshot: unlocked.host, events: unlocked.events } });
		expect(await opened.call("resident:A01", "openVault", {})).toMatchObject({ ok: false, code: "EMPTY" });
	});

	it("refuses a competitor field without an owner instead of dropping it (review problem 10)", () => {
		const raw: unknown = JSON.parse(TEXT);
		const edited: unknown = JSON.parse(TEXT.replace('"wrongAttempts":', '"mood":"glad","wrongAttempts":'));
		expect(() => convertLegacySnapshot(raw)).not.toThrow();
		expect(() => convertLegacySnapshot(edited)).toThrow(/competitor field "mood" has no owner/);
	});

	it("gives stand-ins only for the slices a partial carve does not load", () => {
		expect(standInsFor(converted.host, ["ledger", "names"]).map((use) => use.mechanic.id)).not.toContain("ledger");
		expect(standInsFor(converted.host, ["ledger"])).toHaveLength(Object.keys(converted.host.mechanics).length - 1);
		expect(standIn("marks").id).toBe("marks");
	});

	it("refuses a file that is not an old snapshot", () => {
		expect(() => convertLegacySnapshot({ format: "agent-arena-snapshot", version: 1 })).toThrow(/version 1/);
		expect(() => convertLegacySnapshot("nothing")).toThrow(/not a run snapshot/);
	});
});
