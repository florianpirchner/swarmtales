/** Module conformance (docs/ideas/monorepo.md §3e item 8) of the proof mechanics, with the testkit's checks. */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineMechanic } from "@swarmtales/kernel";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules } from "@swarmtales/testkit";
import { channels } from "./proof/channels.ts";
import { ledger } from "./proof/ledger.ts";
import { proofAgent, proofOptions } from "./proof/story.ts";

const MECHANIC_SOURCES = ["test/host/proof/ledger.ts", "test/host/proof/channels.ts"];

describe("module conformance of the proof mechanics", () => {
	it("documents every option", () => {
		expect([ledger, channels].flatMap((definition) => checkOptionsDocumented(definition))).toEqual([]);
	});

	it("gives the same events for the same seed and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(proofOptions(), () => proofAgent())).toEqual([]);
		expect(await checkSnapshotRoundTrip(proofOptions(), () => proofAgent(), 3)).toEqual([]);
	});

	it("imports nothing forbidden and takes randomness and time only from the host", () => {
		expect(checkSourceRules(MECHANIC_SOURCES.map((path) => ({ path, text: readFileSync(path, "utf8") })))).toEqual([]);
	});
});

describe("the conformance checks themselves", () => {
	it("find undocumented options at any depth", () => {
		const loose = defineMechanic(
			{
				id: "loose",
				summary: "Undocumented options.",
				options: Type.Object({ a: Type.Integer(), b: Type.Object({ c: Type.String() }, { description: "documented" }) }),
				state: () => undefined,
				events: {},
			},
			() => ({}),
		);
		expect(checkOptionsDocumented(loose)).toEqual(['loose: option "a" has no description', 'loose: option "b.c" has no description']);
	});

	it("find forbidden imports and globals", () => {
		const text = ['import { readFileSync } from "node:fs";', 'import { World } from "@swarmtales/engine";', "const roll = Math.random();", "const now = Date.now();"].join("\n");
		expect(checkSourceRules([{ path: "bad.ts", text }])).toEqual(["bad.ts: imports node:fs", "bad.ts: imports @swarmtales/engine", "bad.ts: uses Math.random", "bad.ts: uses Date.now"]);
	});
});
