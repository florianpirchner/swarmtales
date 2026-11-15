// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A resident's direct message to a member through the router of `channels` (decision A72, the old `dmToCast`): the
 * cases of the old `test/mechanics/cast/cast.test.ts` that sent `sendDM` to STEWARD, with the real `channels` asking
 * the service `figures` of the cast; and the old order of `cast_dm`, the charge and `cast_collected`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineEvents, defineHead, defineMechanic } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, scriptedDriver, testKernel } from "@swarmtales/testkit";
import { drive, game, payloads, say } from "./support.ts";

const SENT = " · the city confirms delivery when it reaches them";
const start = { into: "feast", cast: "STEWARD", first: 2, untilMinute: 5, distinctSenders: true };

/** Stands in for `marks`, loaded first as in the City: its `after` handler charges a `sendDM` that went through. */
const price = defineMechanic(
	defineHead({ id: "price", package: "@test/price", summary: "Test: charges a direct message.", events: defineEvents("price", { charged: Type.Object({ agent: Type.String() }) }).events }),
	{
		pipeline: {
			after: (call, outcome, ctx) => {
				if (call.tool === "sendDM" && outcome.ok) ctx.emit("charged", { agent: call.resident ?? "" });
			},
		},
	},
);

describe("a direct message to a member (sendDM)", () => {
	it("records it with the number the city took, says so in the old words, and keeps it out of the residents' messages", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "sendDM", { target: "STEWARD", message: "  may I sit?  " })).toBe(`sent · DM #1 to STEWARD${SENT}`);
		expect(await say(test, "A01", "sendDM", { target: "STEWARD", message: "   " })).toBe("INVALID_TEXT: 1-800 characters");
		await say(test, "A02", "sendDM", { target: "A03", message: "and you?" });
		const events = test.kernel.log.all();
		expect(payloads(events, "cast_dm")).toEqual([{ from: "A01", cast: "STEWARD", text: "may I sit?", collections: [], number: 1 }]);
		expect(payloads(events, "dm_sent")).toEqual([{ from: "A02", to: "A03", text: "and you?", number: 2 }]);
		expect(payloads(events, "cast_collected")).toEqual([]);
	});

	it("collects the first messages of distinct senders and writes cast_collected for a new sender only", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", start);
		const sent = [["A01", "one"], ["A01", "again"], ["A02", "two"], ["A03", "late"]];
		for (const [who, message] of sent) await say(test, who ?? "", "sendDM", { target: "STEWARD", message });
		const events = test.kernel.log.all();
		expect(payloads(events, "cast_dm").map((event) => JSON.stringify(event))).toEqual([
			'{"from":"A01","cast":"STEWARD","text":"one","collections":["feast"],"number":1}',
			'{"from":"A01","cast":"STEWARD","text":"again","collections":[],"number":2}',
			'{"from":"A02","cast":"STEWARD","text":"two","collections":["feast"],"number":3}',
			'{"from":"A03","cast":"STEWARD","text":"late","collections":[],"number":4}',
		]);
		expect(payloads(events, "cast_collected")).toEqual([
			{ from: "A01", cast: "STEWARD", into: ["feast"] },
			{ from: "A02", cast: "STEWARD", into: ["feast"] },
		]);
		expect(test.fact("cast.collections")).toEqual({ feast: ["A01", "A02"] });
	});

	it("writes cast_collected after the charge of a mechanic loaded before channels, as the old dmToCast did after spend", async () => {
		const test = testKernel(game(undefined, 14, [price()]));
		await drive(test, "startCollection", start);
		await say(test, "A01", "sendDM", { target: "STEWARD", message: "one" });
		const types = test.kernel.log.all().map((event) => event.type).filter((type) => ["cast_dm", "charged", "cast_collected"].includes(type));
		expect(types).toEqual(["cast_dm", "charged", "cast_collected"]);
	});

	it("refuses a hidden and a retired member as an unknown resident, as before", async () => {
		const test = testKernel(game({ members: { STEWARD: { level: 10, hidden: true } } }));
		expect(await say(test, "A01", "sendDM", { target: "STEWARD", message: "hello" })).toBe("UNKNOWN_AGENT: STEWARD");
		await drive(test, "reveal", { cast: "STEWARD" });
		expect(await say(test, "A01", "sendDM", { target: "STEWARD", message: "hello" })).toBe(`sent · DM #1 to STEWARD${SENT}`);
		await drive(test, "retire", { cast: "STEWARD" });
		expect(await say(test, "A01", "sendDM", { target: "STEWARD", message: "hello" })).toBe("UNKNOWN_AGENT: STEWARD");
		expect(payloads(test.kernel.log.all(), "cast_dm")).toHaveLength(1);
	});

	it("replays and resumes at every boundary equal while messages to a member are collected", async () => {
		const resident = scriptedDriver((activation) => {
			if (activation.tick === 0 && activation.actor === "resident:A06") return [{ tool: "startCollection", params: { ...start, first: 3, untilMinute: 4 } }];
			return activation.tick < 4 && activation.actor !== "resident:A06" ? [{ tool: "sendDM", params: { target: "STEWARD", message: `at ${String(activation.tick)}` } }] : [];
		});
		const drivers = () => ({ resident });
		const played = testKernel(game(undefined, 5));
		await played.playTicks(resident, 5);
		expect(payloads(played.kernel.log.all(), "cast_collected")).toHaveLength(3);
		expect(await checkReplay(game(undefined, 5), drivers)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(undefined, 5), drivers)).toEqual([]);
	});
});
