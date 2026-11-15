// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The cast, carried from the old `test/mechanics/cast/cast.test.ts`: hidden and retired members, the active list,
 * direct messages handed in, collection windows (distinct senders, shortening after a solve), publishing, the lottery,
 * escrow funding and payments; replay and resume. A driver stands in for the script and for the router of `channels`
 * (`test/support.ts`); the escrow receipt is `receipts`' (its own test).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkOptionsDocumented, checkPackage, checkReplay, checkResumeEveryBoundary, idleDriver, scriptedDriver, testKernel } from "@swarmtales/testkit";
import { cast } from "../src/index.ts";
import { drive, game, payloads, say } from "./support.ts";

const hidden = game({ members: { STEWARD: { level: 10, hidden: true } } });

describe("members", () => {
	it("hides a member until it is revealed, and retires it for good", async () => {
		const test = testKernel(hidden);
		const answers = [
			await drive(test, "isActive", { cast: "STEWARD" }),
			await say(test, "A01", "dmCast", { target: "STEWARD", message: "hello", number: 1 }),
			await drive(test, "reveal", { cast: "STEWARD" }),
			await drive(test, "reveal", { cast: "STEWARD" }),
			await drive(test, "reveal", { cast: "NOBODY" }),
			await drive(test, "setLevel", { cast: "STEWARD", level: 11 }),
			await drive(test, "setLevel", { cast: "NOBODY", level: 3 }),
		];
		expect(answers).toEqual(["false", "inactive", "true", "false", "false", "null", "null"]);
		expect(test.fact("cast.active")).toEqual([{ id: "STEWARD", level: 11 }]);
		expect([await drive(test, "retire", { cast: "STEWARD" }), await drive(test, "retire", { cast: "STEWARD" }), await drive(test, "reveal", { cast: "STEWARD" })]).toEqual(["true", "false", "false"]);
		const events = test.kernel.log.all();
		expect([payloads(events, "cast_revealed"), payloads(events, "cast_level_set"), payloads(events, "cast_retired")]).toEqual([[{ cast: "STEWARD" }], [{ cast: "STEWARD", level: 11, audit: "NPC_LEVEL_SET" }], [{ cast: "STEWARD" }]]);
	});

	it("lists the active members with their public level, in the game's order (cast-extras)", async () => {
		const test = testKernel(game({ members: { STEWARD: { level: 10, hidden: true }, HERALD: { level: 2 } } }));
		expect(await drive(test, "active")).toBe('[{"id":"HERALD","level":2}]');
		await drive(test, "reveal", { cast: "STEWARD" });
		expect(await drive(test, "active")).toBe('[{"id":"STEWARD","level":10},{"id":"HERALD","level":2}]');
		await drive(test, "retire", { cast: "HERALD" });
		expect(await drive(test, "active")).toBe(JSON.stringify(test.fact("cast.active")));
	});

	it("records a direct message handed in with its number", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "dmCast", { target: "STEWARD", message: "  may I sit?  ", number: 1 })).toBe('{"collections":[],"newSender":[]}');
		expect(payloads(test.kernel.log.all(), "cast_dm")).toEqual([{ from: "A01", cast: "STEWARD", text: "may I sit?", collections: [], number: 1 }]);
	});
});

const start = { into: "feast", cast: "STEWARD", first: 2, untilMinute: 5, distinctSenders: true };

describe("collections", () => {
	it("collects the first messages of distinct senders into a window, and tells who is new", async () => {
		const test = testKernel(game());
		expect([await drive(test, "startCollection", start), await drive(test, "startCollection", start), await drive(test, "startCollection", { ...start, into: "other", cast: "NOBODY" })]).toEqual(["true", "false", "false"]);
		const sent = [["A01", "one"], ["A01", "again"], ["A02", "two"], ["A03", "late"]];
		for (const [index, [who, message]] of sent.entries()) await say(test, who ?? "", "dmCast", { target: "STEWARD", message, number: index + 1 });
		const events = test.kernel.log.all();
		expect(payloads(events, "collection_started")).toEqual([{ into: "feast", cast: "STEWARD", first: 2, untilMinute: 5 }]);
		expect(payloads(events, "cast_dm").map((event) => JSON.stringify(event))).toEqual([
			'{"from":"A01","cast":"STEWARD","text":"one","collections":["feast"],"number":1}',
			'{"from":"A01","cast":"STEWARD","text":"again","collections":[],"number":2}',
			'{"from":"A02","cast":"STEWARD","text":"two","collections":["feast"],"number":3}',
			'{"from":"A03","cast":"STEWARD","text":"late","collections":[],"number":4}',
		]);
		expect(payloads(events, "cast_collected")).toEqual([{ from: "A01", cast: "STEWARD", into: ["feast"] }, { from: "A02", cast: "STEWARD", into: ["feast"] }]);
		expect(test.fact("cast.collections")).toEqual({ feast: ["A01", "A02"] });
		expect([await drive(test, "collection", { into: "feast" }), await drive(test, "collection", { into: "nobody" })]).toEqual(['{"first":2,"untilMinute":5,"entries":2}', "null"]);
	});

	it("keeps repeated messages of one sender unless senders must be distinct", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", { ...start, distinctSenders: false, first: 3 });
		for (const number of [1, 2]) await say(test, "A01", "dmCast", { target: "STEWARD", message: "one", number });
		expect(test.fact("cast.collections")).toEqual({ feast: ["A01", "A01"] });
	});

	it("stops collecting when the window ends, and shortens it only earlier and never before now", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", { ...start, first: 5, untilMinute: 6 });
		await drive(test, "shortenCollection", { into: "feast", untilMinute: 9 });
		await drive(test, "shortenCollection", { into: "nobody", untilMinute: 1 });
		expect(payloads(test.kernel.log.all(), "collection_shortened")).toEqual([]);
		await test.playTicks(idleDriver, 2);
		await drive(test, "shortenCollection", { into: "feast", untilMinute: 0 });
		expect(payloads(test.kernel.log.all(), "collection_shortened")).toEqual([{ into: "feast", untilMinute: 2 }]);
		await say(test, "A01", "dmCast", { target: "STEWARD", message: "too late", number: 1 });
		expect(test.fact("cast.collections")).toEqual({ feast: [] });
	});

	it("ends a window some ticks after the first solve of a level, read from the progression's submission", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", { ...start, first: 5, untilMinute: 20, afterSolve: { level: 10, minutes: 3 } });
		await test.playTicks(idleDriver, 4);
		await say(test, "A02", "solve", { level: 9 });
		await say(test, "A01", "solve", { level: 10 });
		await test.playTicks(idleDriver, 1);
		await say(test, "A03", "solve", { level: 10 });
		expect(payloads(test.kernel.log.all(), "collection_shortened")).toEqual([{ into: "feast", untilMinute: 7 }]);
		await test.playTicks(idleDriver, 2);
		expect(payloads(test.kernel.log.all(), "collection_shortened")).toHaveLength(1);
	});

	it("publishes a collection verbatim as the cast member, numbered, with an optional header", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", { ...start, first: 5, untilMinute: 9 });
		await say(test, "A02", "dmCast", { target: "STEWARD", message: "second guest", number: 1 });
		await test.playTicks(idleDriver, 1);
		await say(test, "A01", "dmCast", { target: "STEWARD", message: "first guest", number: 2 });
		expect(await drive(test, "revealCollection", { into: "feast", header: "The table:" })).toBe('{"ok":true}');
		const text = "The table:\n1. A02 (minute 0): second guest\n2. A01 (minute 1): first guest";
		const events = test.kernel.log.all();
		expect(payloads(events, "board_post")).toEqual([{ postSeq: 1, author: "STEWARD", text, kind: "city" }]);
		expect(payloads(events, "collection_revealed")).toEqual([{ into: "feast", cast: "STEWARD", entries: 2, postSeq: 1, audit: "DIRECTOR_PRIVACY_BREACH" }]);
		expect(await drive(test, "revealCollection", { into: "nobody" })).toBe('{"ok":false,"code":"UNKNOWN_COLLECTION","detail":"nobody"}');
	});

	it("publishes an empty collection as no messages", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", start);
		await drive(test, "revealCollection", { into: "feast" });
		expect(payloads(test.kernel.log.all(), "board_post")).toEqual([{ postSeq: 1, author: "STEWARD", text: "(no messages)", kind: "city" }]);
	});

	it("draws a lottery among distinct senders from the old stream, and none from an empty window", async () => {
		const test = testKernel(game());
		await drive(test, "startCollection", { ...start, first: 5, distinctSenders: false });
		expect(await drive(test, "drawLottery", { into: "feast", salt: "a" })).toBe("null");
		for (const [number, who] of ["A03", "A01", "A03", "A02"].entries()) await say(test, who, "dmCast", { target: "STEWARD", message: `from ${who}`, number });
		const winner = await say(test, "A06", "pick", { labels: ["lottery", "feast", "a", 0], items: ["A01", "A02", "A03"] });
		expect(await drive(test, "drawLottery", { into: "feast", salt: "a" })).toBe(JSON.stringify(winner));
		expect(payloads(test.kernel.log.all(), "lottery_drawn")).toEqual([{ into: "feast", candidates: ["A01", "A02", "A03"], winner }]);
		expect(await drive(test, "drawLottery", { into: "nobody", salt: "a" })).toBe("null");
	});
});

describe("escrow", () => {
	it("funds the account from the system account at the start of the run, and opens it without escrow", async () => {
		const funded = testKernel(game());
		expect(payloads(funded.kernel.log.all(), "ledger_entry").at(-1)).toMatchObject({ debit: "SYSTEM_MINT_BURN", credit: "ESCROW:STEWARD", amount: 10, reason: "escrow STEWARD" });
		const empty = testKernel(hidden);
		expect(payloads(empty.kernel.log.all(), "ledger_entry").filter((entry) => JSON.stringify(entry).includes("ESCROW"))).toEqual([]);
		expect(await drive(empty, "escrow", { cast: "STEWARD", to: "A01", amount: 1 })).toBe('{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"0 left"}');
	});

	it("pays a resident and writes escrow_paid with the booking, or refuses in the old words", async () => {
		const test = testKernel(game());
		const refused = [
			await drive(test, "escrow", { cast: "NOBODY", to: "A01", amount: 1 }),
			await drive(test, "escrow", { cast: "STEWARD", to: "A99", amount: 1 }),
			await drive(test, "escrow", { cast: "STEWARD", to: "A01", amount: 11 }),
			await drive(test, "escrow", { cast: "STEWARD", to: "A01", amount: 1.5 }),
		];
		expect(refused).toEqual([
			'{"ok":false,"code":"UNKNOWN_CAST","detail":"NOBODY"}',
			'{"ok":false,"code":"UNKNOWN_AGENT","detail":"A99"}',
			'{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"10 left"}',
			'{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"10 left"}',
		]);
		expect(await drive(test, "escrow", { cast: "STEWARD", to: "A01", amount: 4 })).toBe('{"ok":true}');
		const events = test.kernel.log.all();
		const booking = payloads(events, "ledger_entry").at(-1);
		expect(booking).toMatchObject({ debit: "ESCROW:STEWARD", credit: "A01", amount: 4, reason: "escrow STEWARD" });
		expect(payloads(events, "escrow_paid")).toEqual([{ cast: "STEWARD", to: "A01", amount: 4, txId: /"txId":"(TX\d+)"/.exec(JSON.stringify(booking))?.[1] }]);
		expect(await drive(test, "escrow", { cast: "STEWARD", to: "A02", amount: 7 })).toBe('{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"6 left"}');
	});
});

describe("conformance and the snapshot", () => {
	it("documents its options and matches its package", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(cast, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(cast)).toEqual([]);
	});

	it("replays and resumes at every boundary equal while messages are collected and a window ends after a solve", async () => {
		const resident = scriptedDriver((activation) => {
			if (activation.tick === 0 && activation.actor === "resident:A06") return [{ tool: "startCollection", params: { ...start, first: 3, untilMinute: 9, afterSolve: { level: 2, minutes: 2 } } }];
			if (activation.tick === 2 && activation.actor === "resident:A05") return [{ tool: "solve", params: { level: 2 } }];
			return activation.tick < 4 && activation.actor !== "resident:A06" ? [{ tool: "dmCast", params: { target: "STEWARD", message: `at ${String(activation.tick)}`, number: activation.tick } }] : [];
		});
		const drivers = () => ({ resident });
		const played = testKernel(game(undefined, 6));
		await played.playTicks(resident, 6);
		expect(payloads(played.kernel.log.all(), "collection_shortened")).toEqual([{ into: "feast", untilMinute: 4 }]);
		expect(await checkReplay(game(undefined, 6), drivers)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(undefined, 6), drivers)).toEqual([]);
	});
});
