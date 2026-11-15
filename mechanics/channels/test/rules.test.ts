// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The cap on direct messages with the memos of the real ledger, `defy`, and the line of unread posts. Ported from
 * the window case of the old `channels.test.ts`, the order of the refusals of the old `checkTransfer`, the old
 * `defy.test.ts` (who may defy; the whisperer stands in) and the digest of the old `turn-inputs.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, refuse, type MechanicUse } from "@swarmtales/sdk";
import { checkSnapshotRoundTrip, scriptedDriver, testKernel, type PlannedCall, type TestKernel } from "@swarmtales/testkit";
import { channels } from "../src/index.ts";
import { withoutMemos } from "../src/state.ts";
import { payloads, say } from "./support.ts";

type Options = Parameters<typeof channels>[0];

function game(options: Options, extra: readonly MechanicUse[] = []) {
	return defineGame({
		id: "channels-rules",
		seed: 7,
		residents: 3,
		mechanics: [ledger({ startPoints: 10 }), channels(options), ...extra],
		scheduler: { id: "turns", options: { order: "roster" } },
		end: { ticks: 8 },
	});
}

const LOCKED = "TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now";
const REASON = "My character would never do that to a friend.";

// The input lines of one tick, `resident kind|text`, without the points of the ledger.
async function lines(test: TestKernel): Promise<readonly string[]> {
	const seen: string[] = [];
	await test.playTicks(
		scriptedDriver((activation) => {
			seen.push(...activation.inputs.filter((line) => !line.text.endsWith(" points")).map((line) => `${activation.actor.slice(9)} ${line.kind ?? ""}|${line.text}`));
			return [];
		}),
		1,
	);
	return seen;
}

describe("the cap on direct messages", () => {
	const capped = { dmLimit: { windowMinutes: 4, perWindow: 2 } };

	it("counts the messages and the memos of a window, refuses past it in the old words and shows the window", async () => {
		const test = testKernel(game(capped));
		expect(await say(test, "A01", "transferPoints", { target: "A02", amount: 1, memo: "thanks" })).toContain("ok · 1 points to A02");
		expect(await say(test, "A01", "sendDM", { target: "A02", message: "one" })).toBe("sent · DM #1 to A02 · the city confirms delivery when it reaches them");
		expect(await say(test, "A01", "sendDM", { target: "A03", message: "two" })).toBe("DM_LIMIT: 2 DMs sent since minute 0; you can send again from minute 4");
		// The ledger's own refusals come first, a transfer without a memo is no message.
		expect(await say(test, "A01", "transferPoints", { target: "A03", amount: 50, memo: "all" })).toBe("INSUFFICIENT_FUNDS");
		expect(await say(test, "A01", "transferPoints", { target: "A03", amount: 1, memo: "late" })).toBe("DM_LIMIT: 2 DMs and memos sent since minute 0; send a memo again from minute 4, or transfer without one");
		expect(await say(test, "A01", "transferPoints", { target: "A03", amount: 1 })).toContain("ok · 1 points to A03");
		expect((await lines(test)).filter((line) => line.includes("status|"))).toEqual([
			"A01 status|DMs 2/2 sent since minute 0 (a new allowance at minute 4)",
			"A02 status|DMs 0/2 sent since minute 0 (a new allowance at minute 4)",
			"A03 status|DMs 0/2 sent since minute 0 (a new allowance at minute 4)",
		]);
		await test.playTicks(scriptedDriver(() => []), 3);
		expect(await say(test, "A01", "sendDM", { target: "A03", message: "a new window" })).toContain("sent · DM #2 to A03");
	});

	it("keeps the memos in the slice: a run cut at any tick plays on equal", async () => {
		const plan = (turn: { tick: number; actor: string }): readonly PlannedCall[] =>
			turn.actor === "resident:A01" ? [{ tool: "transferPoints", params: { target: "A02", amount: 1, memo: `tick ${String(turn.tick)}` } }, { tool: "sendDM", params: { target: "A03", message: "hi" } }] : [];
		for (const cut of [1, 3, 5]) expect(await checkSnapshotRoundTrip(game(capped), () => scriptedDriver(plan), cut)).toEqual([]);
	});

	it("reads a slice of version 2 as one without memos", () => {
		expect(withoutMemos({ messages: 3 })).toEqual({ messages: 3, memos: [] });
		expect(withoutMemos(null)).toBeNull();
	});

	it("writes no status part and refuses nothing without a cap", async () => {
		const test = testKernel(game({}));
		for (const message of ["one", "two", "three"]) await say(test, "A01", "sendDM", { target: message === "two" ? "A03" : "A02", message });
		expect((await lines(test)).filter((line) => line.includes("status|"))).toEqual([]);
	});
});

describe("defy", () => {
	// Stands in for the whispers mechanic of Whispers: the game opens `defy`, and it closes it for all but its whisperer.
	const whisperer = defineMechanic(defineHead({ id: "whispers", package: "@test/whispers", summary: "Test: only A02 may defy." }), {
		pipeline: { lock: (call) => (call.tool === "defy" && call.resident !== "A02" ? refuse("TOOL_LOCKED", LOCKED.slice("TOOL_LOCKED: ".length)) : undefined) },
	});
	const answers = async (test: TestKernel): Promise<readonly string[]> => Promise.all(["A01", "A02", "A03"].map((id) => say(test, id, "defy", { reason: REASON })));

	it("is closed to everyone unless the game opens it, and records the reason", async () => {
		expect(await answers(testKernel(game({})))).toEqual([LOCKED, LOCKED, LOCKED]);
		const open = testKernel(game({ defiance: true }));
		expect(await answers(open)).toEqual(Array.from({ length: 3 }, () => "the gamemaker has your refusal"));
		expect(await say(open, "A01", "defy", { reason: "   too short   ", note: 3 })).toBe("INVALID_REASON: 20-600 characters");
		expect(await say(open, "A01", "defy", { reason: ` ${REASON} `, note: 3 })).toBe("the gamemaker has your refusal");
		expect(payloads(open.kernel.log.all(), "gamemaker_defied").slice(-1)).toEqual([{ agent: "A01", reason: REASON, note: 3 }]);
	});

	it("is open to one resident only when a game mechanic closes it for the others", async () => {
		expect(await answers(testKernel(game({ defiance: true }, [whisperer()])))).toEqual([LOCKED, "the gamemaker has your refusal", LOCKED]);
	});
});

describe("the line of unread posts", () => {
	it("ends the inputs with the unread posts of others on the board and in groups, or says nothing is unread", async () => {
		const test = testKernel(game({ digest: true }));
		expect((await lines(test)).filter((line) => line.startsWith("A01"))).toEqual(["A01 digest|[unread] nothing"]);
		await say(test, "A02", "postBoard", { message: "news" });
		await say(test, "A01", "createGroup", { name: "Lanterns" });
		await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A02" });
		await say(test, "A02", "postGroup", { groupId: "G1", message: "inside" });
		await say(test, "A02", "sendDM", { target: "A01", message: "psst" });
		expect((await lines(test)).filter((line) => line.startsWith("A01"))).toEqual(["A01 dm|[DM #3 from A02] psst", "A01 digest|[unread] board 1 · group G1 1"]);
		await say(test, "A01", "readBoard", {});
		expect((await lines(test)).filter((line) => line.startsWith("A01"))).toEqual(["A01 digest|[unread] group G1 1"]);
	});
});
