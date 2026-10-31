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
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";

const PATH = resolve(import.meta.dirname, "../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
const TEXT = readFileSync(PATH, "utf8");

/** A stand-in for a wave 3 mechanic: its slice is version 1, migrated from the converter's version 0. */
function standIn(id: string) {
	return defineMechanic({ id, summary: `Stand-in for ${id}.`, options: Type.Object({}), state: (): { data: unknown } => ({ data: null }), events: {} }, (kit) => ({
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ old: Type.Unknown() }),
			save: (state) => ({ old: state.data }),
			load: (data) => ({ data: data.old }),
			migrations: { 0: (old) => ({ old }) },
		}),
	}));
}

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

	it("refuses a file that is not an old snapshot", () => {
		expect(() => convertLegacySnapshot({ format: "agent-arena-snapshot", version: 1 })).toThrow(/version 1/);
		expect(() => convertLegacySnapshot("nothing")).toThrow(/not a run snapshot/);
	});
});
