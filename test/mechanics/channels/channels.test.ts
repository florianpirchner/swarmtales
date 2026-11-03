/**
 * The channels mechanic on the new host. Providers of other teams are stand-ins (`stand-ins.ts`,
 * named in the tests that rely on them): ledger, marks, names, receipts and exile.
 */
import { describe, expect, it } from "vitest";
import { idleAgent } from "@swarmtales/testkit";
import { city, say } from "./city.ts";
import { payloads, textOf, turnsOf } from "./harness.ts";

describe("the board", () => {
	it("posts, numbers and reads without the reader's own posts", async () => {
		const host = city();
		expect(await say(host, "A01", "postBoard", { message: "  hello city  " })).toBe("posted · #1");
		expect(await say(host, "A02", "postBoard", { message: "second" })).toBe("posted · #2");
		expect(await say(host, "A01", "readBoard", {})).toBe("#2 A02: second");
		expect(await say(host, "A01", "readBoard", {})).toBe("no new posts");
		expect(await say(host, "A03", "readBoard", { afterSeq: 1, limit: 5 })).toBe("#2 A02: second");
		expect(payloads(host, "board_post")).toEqual([
			{ postSeq: 1, author: "A01", text: "hello city", kind: "player" },
			{ postSeq: 2, author: "A02", text: "second", kind: "player" },
		]);
	});

	it("refuses an empty text after trimming, in the old words", async () => {
		const host = city();
		expect(await say(host, "A01", "postBoard", { message: "   " })).toBe("INVALID_TEXT: 1-1200 characters");
		expect(await say(host, "A01", "postBoard", { message: "x".repeat(1201) })).toContain("INVALID_ARGUMENTS");
	});

	it("shows the price in marks after a post, and refuses a poor resident (marks stand-in)", async () => {
		const left = new Map([["A01", 1]]);
		const host = city({
			marks: {
				canAfford: (resident) => (left.get(resident) ?? 0) > 0,
				spend: (resident) => {
					const remaining = (left.get(resident) ?? 0) - 1;
					left.set(resident, remaining);
					return { remaining, budget: 1 };
				},
				left: () => null,
			},
		});
		expect(await say(host, "A01", "postBoard", { message: "one" })).toBe("posted · #1 · marks 0/1 left");
		expect(await say(host, "A01", "postBoard", { message: "two" })).toBe("NO_MARKS");
		expect(payloads(host, "board_post")).toHaveLength(1);
	});

	it("lets the city post through the API and keeps one number space", async () => {
		const host = city();
		await say(host, "A01", "postBoard", { message: "mine" });
		const posted = await host.call("gamemaker", "postBoard", { text: "COURIER: the city watches" });
		expect(textOf(posted)).toBe("posted as #2");
		expect(payloads(host, "board_post")[1]).toEqual({ postSeq: 2, author: "COURIER", text: "the city watches", kind: "city" });
		expect(await say(host, "A03", "readBoard", {})).toBe("#1 A01: mine\n#2 COURIER: the city watches");
	});
});

describe("direct messages", () => {
	it("sends, numbers and delivers at the recipient's next turn with a receipt for the sender (receipts stand-in)", async () => {
		const host = city({ names: new Map([["A02", "Moss"]]) });
		expect(await say(host, "A01", "sendDM", { target: "Moss", message: "  hi there  " })).toBe("sent · DM #1 to Moss · the city confirms delivery when it reaches them");
		expect(payloads(host, "dm_sent")).toEqual([{ from: "A01", to: "A02", text: "hi there", number: 1 }]);
		await host.playMinute(idleAgent);
		expect(payloads(host, "dm_delivered")).toEqual([{ number: 1, from: "A01", to: "A02" }]);
		expect(payloads(host, "notice")).toEqual([{ to: "A01", author: "CITY", text: 'DM #1 delivered to A02 at minute 0 (receipt R-0001): "hi there"' }]);
		const received = turnsOf(host).find((turn) => turn.resident === "A02");
		expect(received?.inputs.filter((input) => input.kind === "dm").map((input) => input.text)).toEqual(["[DM #1 from A01] hi there"]);
	});

	it("refuses in the old order: unknown, self, exiled, empty, marks, full mailbox", async () => {
		const host = city();
		expect(await say(host, "A01", "sendDM", { target: "A99", message: "x" })).toBe("UNKNOWN_AGENT: A99");
		expect(await say(host, "A01", "sendDM", { target: "A01", message: "x" })).toBe("SELF_DM");
		expect(await say(host, "A01", "sendDM", { target: "A02", message: "  " })).toBe("INVALID_TEXT: 1-800 characters");
		await say(host, "A01", "sendDM", { target: "A02", message: "first" });
		expect(await say(host, "A01", "sendDM", { target: "A02", message: "second" })).toBe("MAILBOX_SENDER_LIMIT");
	});

	it("tells that an exiled resident is beyond the wall, once exile says so (exile stand-in)", async () => {
		const host = city();
		await host.call("resident:A01", "exileNow", { agent: "A03" });
		expect(await say(host, "A02", "sendDM", { target: "A03", message: "are you there" })).toBe("EXILED: A03 was exiled; beyond the wall no message reaches them");
	});

	it("caps the DMs of a window, counting memo transfers (receipts stand-in), and shows the window", async () => {
		const host = city({ dmLimit: { windowMinutes: 4, perWindow: 2 }, memos: 1 });
		expect(await say(host, "A01", "sendDM", { target: "A02", message: "one" })).toContain("sent");
		expect(await say(host, "A01", "sendDM", { target: "A03", message: "two" })).toBe("DM_LIMIT: 2 DMs sent since minute 0; you can send again from minute 4");
		await host.playMinute(idleAgent);
		const status = turnsOf(host).find((turn) => turn.resident === "A01")?.inputs.filter((input) => input.kind === "status");
		expect(status?.map((input) => input.text)).toEqual(["DMs 2/2 sent since minute 0 (a new allowance at minute 4)"]);
	});
});

describe("notices and numbers", () => {
	it("delivers a gamemaker note with its number and the courier's name", async () => {
		const host = city();
		expect(textOf(await host.call("gamemaker", "notify", { agent: "A02", text: "hello" }))).toBe("delivered to A02 as #1");
		expect(payloads(host, "notice")).toEqual([{ to: "A02", author: "COURIER", text: "hello", number: 1 }]);
		expect(textOf(await host.call("gamemaker", "notify", { agent: "A99", text: "hello" }))).toBe("UNKNOWN_AGENT: A99");
	});
});
