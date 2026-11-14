// SPDX-License-Identifier: Apache-2.0
/**
 * The oracle proof of the talk (specification of M3, section 2.5, projection 6). No City of Keys oracle can be
 * replayed whole, so the test walks the oracle's timeline: at every `turn` entry the named resident gets an
 * activation (which delivers its direct messages), and every `postBoard` and `sendDM` call of a resident is made.
 * The posts of residents, `dm_sent`, `dm_delivered` and the answers of the calls are then compared with the file's,
 * byte for byte after the registered mappings. The proof also runs against copies of the file changed by hand.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { idleDriver, OracleSchema, projectCalls, projectionDifference, projectionRest, projectLog, projectOracle, readOracle, renumbered, testKernel, timelineOf, type Oracle, type ProjectedEvent, type TestKernel } from "@swarmtales/testkit";
import { channels } from "../src/index.ts";

const pathOf = (file: string): string => resolve(import.meta.dirname, `../../../oracles/cityofkeys/${file}.json`);
// A copy of an oracle file with one text replaced by hand; the copy is still a valid oracle.
function changed(file: string, from: string, to: string): Oracle {
	const text = readFileSync(pathOf(file), "utf8");
	expect(text.split(from)).toHaveLength(2);
	return Value.Parse(OracleSchema, JSON.parse(text.replace(from, to)));
}

const TOOLS = ["postBoard", "sendDM"];
const TALK = [{ source: "channels", type: "board_post" }, { source: "channels", type: "dm_sent" }, { source: "channels", type: "dm_delivered" }] as const;
const NUMBERS = ["postSeq", "number"];
const CityPost = Type.Object({ kind: Type.Literal("city") });
const ByResident = Type.Object({ actor: Type.String({ pattern: "^resident:" }) });
const Named = Type.Object({ agent: Type.String(), name: Type.String() });

// A run of `channels` that follows the oracle's schedule: one tick is one turn of the file, and the stand-in
// `usher` names who is woken in it. With `shut`, the two tools are closed for everyone from the start.
function stage(oracle: Oracle, shut = false): { test: TestKernel; turn: { resident: string } } {
	const turn = { resident: "" };
	const usher = defineMechanic(defineHead({ id: "usher", package: "@test/usher", summary: "Test: wakes the resident whose turn it is in the oracle." }), { hooks: { toAct: () => [turn.resident] } });
	const game = defineGame({ id: "channels-oracle", seed: oracle.seed, residents: oracle.setup.residents, mechanics: [channels(), usher()], scheduler: { id: "turns", options: { activation: "toAct" } }, locked: shut ? ["postBoard", "sendDM"] : [], end: { ticks: 999 } });
	return { test: testKernel(game), turn };
}

// Walks the oracle and gives every call of a resident with its answer as the run wrote it. A call the oracle
// refused with `TOOL_LOCKED` goes to a second run with the tools locked: the lock is `progression`'s, which is not
// ported, and a mechanic cannot lock the tool of another one yet. A refused call changes nothing in the file.
async function replayed(oracle: Oracle): Promise<{ test: TestKernel; calls: readonly ProjectedEvent[] }> {
	const [open, shut] = [stage(oracle), stage(oracle, true)];
	const calls: ProjectedEvent[] = [];
	for (const entry of oracle.timeline) {
		if (entry.k === "turn") {
			open.turn.resident = entry.resident;
			await open.test.playTicks(idleDriver, 1);
		}
		if (entry.k !== "call" || !TOOLS.includes(entry.tool) || !Value.Check(ByResident, entry)) continue;
		const { test } = entry.code === "TOOL_LOCKED" ? shut : open;
		await test.call(entry.actor.slice("resident:".length), entry.tool, entry.params);
		calls.push(...projectCalls(timelineOf(test.kernel.log.all()), TOOLS).slice(-1));
	}
	return { test: open.test, calls };
}

type Lists = readonly [expected: readonly ProjectedEvent[], actual: readonly ProjectedEvent[]];
async function talk(oracle: Oracle): Promise<{ events: Lists; calls: Lists; rest: Readonly<Record<string, number>>; otherCalls: readonly string[] }> {
	const { test, calls } = await replayed(oracle);
	// Left out: the posts of the city (they are written by mechanics that are not in the slice).
	const kept = projectOracle(oracle.timeline, TALK).filter((event) => !Value.Check(CityPost, event.payload));
	const expected = renumbered(kept, NUMBERS);
	// Registered mappings of an answer's text: `names` and `marks` are not in the slice (a resident is shown by its
	// id, no line about marks), and the number of a message is its rank among the compared ones. The run counts
	// nothing else, so its own numbers are ranks already and are not mapped.
	const names = projectOracle(oracle.timeline, [{ source: "names", type: "name_chosen" }]).map((event) => Value.Parse(Named, event.payload));
	const mapping = (text: string): string =>
		names
			.reduce((mapped, { agent, name }) => mapped.replaceAll(name, agent), text)
			.replace(/ · marks \d+\/\d+ left$/, "")
			.replace(/#(\d+)/, (whole, number) => (expected.ranks.has(Number(number)) ? `#${String(expected.ranks.get(Number(number)))}` : whole));
	const all = projectCalls(oracle.timeline, [...TOOLS, "readBoard"], mapping);
	const compared = all.filter((call) => TOOLS.includes(call.type) && Value.Check(ByResident, call.payload));
	return {
		events: [expected.events, renumbered(projectLog(test.kernel.log.all(), TALK), NUMBERS).events],
		calls: [compared, calls],
		rest: projectionRest(oracle.timeline, ["channels"], kept),
		otherCalls: all.filter((call) => !compared.includes(call)).map((call) => call.type),
	};
}

describe("projection 6: every postBoard and sendDM call, the posts of residents, dm_sent and dm_delivered of act one", () => {
	it.each([
		["cityofkeys-act1-s7", { "channels.board_post": 19, "channels.notice": 38, "channels.gamemaker_note": 1 }],
		["cityofkeys-act1-s11", { "channels.board_post": 20, "channels.notice": 42, "channels.gamemaker_note": 1 }],
	] as const)("%s: the events and the answers are byte-equal after the mappings", async (file, leftOut) => {
		const { events, calls, rest, otherCalls } = await talk(readOracle(pathOf(file)));
		// 8 posts, 5 messages sent and 5 delivered; 9 calls to post (one refused) and 6 to send (one refused).
		expect([events[0].length, calls[0].length]).toEqual([18, 15]);
		expect(projectionDifference(...events)).toBeUndefined();
		expect(projectionDifference(...calls)).toBeUndefined();
		expect(calls[1].map((call) => JSON.stringify(call.payload)).filter((call) => call.includes('"ok":false'))).toEqual([
			expect.stringContaining('"ok":false,"code":"TOOL_LOCKED","stage":"lock","detail":"not available to you'),
			expect.stringContaining('"ok":false,"code":"TOOL_LOCKED","stage":"lock","detail":"not available to you'),
		]);
		expect(JSON.stringify(calls[1])).toContain('"reply":"sent · DM #3 to A0');
		// Printed for the record (`oracles/cityofkeys/README.md`).
		console.info(`${file}: channels events left out of projection 6: ${JSON.stringify(rest)}; calls left out: ${otherCalls.join(", ")}`);
		expect(rest).toEqual(leftOut);
		expect(otherCalls).toEqual(["readBoard", "readBoard", "readBoard", "postBoard"]);
	});

	it.each([
		["the number in the answer of a post", '"reply":"posted · #4"', '"reply":"posted · #5"', "calls", 1],
		["the receiver in the answer of a message", "sent · DM #12 to Moss-4196", "sent · DM #12 to Thorn-5938", "calls", 4],
		["a refusal at another stage", '"params":{"message":"A01 at minute 1: who has seen the next door?"},"ok":false,"code":"TOOL_LOCKED","stage":"lock"', '"params":{"message":"A01 at minute 1: who has seen the next door?"},"ok":false,"code":"TOOL_LOCKED","stage":"rule"', "calls", 2],
		["the text of a message sent", '"text":"A04 to you at minute 2: shall we share what we find?","number":12', '"text":"A04 to you at minute 2: shall we share what we found?","number":12', "events", 2],
		["a delivery to another resident", '{"number":12,"from":"A04","to":"A05"}', '{"number":12,"from":"A04","to":"A06"}', "events", 3],
		["the author of a post", '"author":"A05","text":"A05 at minute 5', '"author":"A03","text":"A05 at minute 5', "events", 5],
	] as const)("a copy of the oracle with %s changed is found", async (_what, from, to, list, index) => {
		const proof = await talk(changed("cityofkeys-act1-s7", from, to));
		expect(projectionDifference(...proof[list])?.index).toBe(index);
		expect(projectionDifference(...proof[list === "calls" ? "events" : "calls"])).toBeUndefined();
	});

	it("a message is delivered at the receiver's next activation and not before: without the turns nothing is delivered", async () => {
		const oracle = readOracle(pathOf("cityofkeys-act1-s7"));
		const { test } = await replayed({ ...oracle, timeline: oracle.timeline.filter((entry) => entry.k !== "turn") });
		const written = projectLog(test.kernel.log.all(), TALK).map((event) => event.type);
		expect(written.filter((type) => type === "dm_delivered")).toEqual([]);
		// The second message of a sender to a receiver that has not read the first is refused, so fewer are sent.
		expect(written.filter((type) => type === "dm_sent")).toHaveLength(2);
	});
});
