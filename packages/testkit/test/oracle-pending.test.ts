// SPDX-License-Identifier: Apache-2.0
/**
 * The pending answer of a live replay in `runOracle` (erratum E62; specification of M2, section 7.2): the driver of
 * a file with `source.kind: "live-replay"` is pending after an activation with a call, so `turns` wakes the resident
 * again without news; the driver of a scripted file never is. The two files here are written by hand.
 */
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { describe, expect, it } from "vitest";
import type { Oracle, OracleEntry } from "../src/oracle/format.ts";
import { countsOf } from "../src/oracle/read.ts";
import { runOracle } from "../src/oracle/run.ts";

// A bell that a resident rings once: it has news until it rang, and nothing after.
const State = Type.Object({ rung: Type.Boolean() });
const head = defineHead({
	id: "bell",
	package: "@test/bell",
	summary: "A bell is rung once.",
	options: Type.Object({}, { description: "No options." }),
	state: State,
	start: (): Static<typeof State> => ({ rung: false }),
	tools: { ring: { description: "Rings the bell.", params: Type.Object({}), for: ["resident"] } },
});
const bell = defineMechanic(head, {
	tools: {
		ring: {
			run(_params, ctx) {
				ctx.state.rung = true;
				return reply("It rang.");
			},
		},
	},
	hooks: { news: (_resident, ctx) => !ctx.state.rung },
});
const game = defineGame({ id: "bell", residents: 1, mechanics: [bell({})], scheduler: { id: "turns", options: { passes: 2, activation: "onNews" } }, end: { ticks: 1 } });

const rung: OracleEntry[] = [
	{ k: "minute", minute: 0 },
	{ k: "turn", resident: "A01", pass: 1, block: 1, inputs: [] },
	{ k: "call", actor: "resident:A01", tool: "ring", params: {}, ok: true, reply: "It rang." },
];
// Pass 2 of the recorded run: the model reads the answer of its call. Pass 2 of a script: nothing to read.
const answer: OracleEntry = { k: "turn", resident: "A01", pass: 2, block: 1, inputs: [] };
const skip: OracleEntry = { k: "skip", resident: "A01", pass: 2, block: 1 };

const fileOf = (kind: "live-replay" | "scripted", last: OracleEntry): Oracle => ({
	format: "swarmtales.oracle",
	version: 1,
	game: "bell",
	variant: "bell",
	seed: 7,
	runtimeRevision: 3,
	source: { kind, from: "packages/testkit/test/oracle-pending.test.ts" },
	setup: { story: "bell", seed: 7, minutes: 1, residents: ["A01"], mechanics: [{ id: "bell", options: {} }], residentTools: ["ring"], locked: [], turns: { passes: 2, blockSize: 1, activation: "onNews", order: "seeded" } },
	end: { reason: "minutes", minute: 1 },
	counts: countsOf([...rung, last]),
	timeline: [...rung, last],
});
const found = async (oracle: Oracle): Promise<readonly string[]> => (await runOracle(oracle, game)).map((mismatch) => `${String(mismatch.level)} ${mismatch.at} ${String(mismatch.index)}`);

describe("runOracle, the pending answer", () => {
	it("wakes the resident of a live replay again after a turn with a call, without news", async () => {
		expect(await found(fileOf("live-replay", answer))).toEqual([]);
		expect(await found(fileOf("live-replay", skip))).toEqual(["2 inputs 4", "3 turn 3"]);
	});

	it("never wakes the resident of a scripted file for an answer", async () => {
		expect(await found(fileOf("scripted", skip))).toEqual([]);
		expect(await found(fileOf("scripted", answer))).toEqual(["2 inputs 3", "3 turn 3"]);
	});
});
