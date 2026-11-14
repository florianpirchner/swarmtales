// SPDX-License-Identifier: Apache-2.0
/**
 * The direct messages of `channels`, offline. Ported from the delivery cases of the old `channels.test.ts` and from
 * what `dm-records.test.ts` asks of the records; the cases about names, marks, the cap of a window, receipts and
 * records of old files wait for M5.
 */
import { describe, expect, it } from "vitest";
import { scriptedDriver, testKernel } from "@swarmtales/testkit";
import { Mailbox } from "../src/mailbox.ts";
import { channels } from "../src/index.ts";
import { game, payloads, say } from "./support.ts";

/** Plays ticks with residents that do nothing, and gives every activation as `tick:resident` with its input lines. */
async function idle(test: ReturnType<typeof testKernel>, ticks: number): Promise<readonly string[]> {
	const seen: string[] = [];
	const note = scriptedDriver((activation) => {
		seen.push([`${String(activation.tick)}:${activation.actor.slice(9)}`, ...activation.inputs.map((line) => `${line.kind ?? ""}|${line.text}`)].join(" "));
		return [];
	});
	await test.playTicks(note, ticks);
	return seen;
}

const SENT = " · the city confirms delivery when it reaches them";

describe("direct messages", () => {
	it("sends, numbers with the board's counter, and delivers at the receiver's next activation with a notice for the sender", async () => {
		const test = testKernel(game());
		await say(test, "A03", "postBoard", { message: "public" });
		expect(await say(test, "A01", "sendDM", { target: "A02", message: "  hi there  " })).toBe(`sent · DM #2 to A02${SENT}`);
		expect(payloads(test.kernel.log.all(), "dm_sent")).toEqual([{ from: "A01", to: "A02", text: "hi there", number: 2 }]);
		expect(payloads(test.kernel.log.all(), "dm_delivered")).toEqual([]);
		expect(await idle(test, 2)).toEqual(["0:A01", "0:A02 dm|[DM #2 from A01] hi there", "0:A03", '1:A01 notice|[CITY] DM #2 delivered to A02 at minute 0: "hi there"', "1:A02", "1:A03"]);
		expect(payloads(test.kernel.log.all(), "dm_delivered")).toEqual([{ number: 2, from: "A01", to: "A02" }]);
		expect(payloads(test.kernel.log.all(), "notice")).toEqual([{ to: "A01", author: "CITY", text: 'DM #2 delivered to A02 at minute 0: "hi there"' }]);
	});

	it("shows direct messages before notices", async () => {
		const test = testKernel(game());
		await say(test, "A01", "cityNotify", { to: "A02", text: "first written" });
		await say(test, "A01", "sendDM", { target: "A02", message: "second written" });
		expect((await idle(test, 1))[1]).toBe("0:A02 dm|[DM #1 from A01] second written notice|[CITY] first written");
	});

	it("refuses in the old order: unknown, self, empty, a second unread message of one sender", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "sendDM", { target: "A99", message: "x" })).toBe("UNKNOWN_AGENT: A99");
		expect(await say(test, "A01", "sendDM", { target: "A01", message: "x" })).toBe("SELF_DM");
		expect(await say(test, "A01", "sendDM", { target: "A02", message: "  " })).toBe("INVALID_TEXT: 1-800 characters");
		await say(test, "A01", "sendDM", { target: "A02", message: "first" });
		expect(await say(test, "A01", "sendDM", { target: "A02", message: "second" })).toBe("MAILBOX_SENDER_LIMIT");
		expect(payloads(test.kernel.log.all(), "dm_sent")).toHaveLength(1);
		// The capacity of a mailbox comes before the limit of one sender.
		const mailbox = new Mailbox(1, 1);
		mailbox.deliverAlways({ from: "A01", text: "x", tick: 0, number: 1 });
		expect([mailbox.rejectionFor("A01"), mailbox.rejectionFor("A02"), new Mailbox().rejectionFor("A01")]).toEqual(["MAILBOX_FULL", "MAILBOX_FULL", undefined]);
	});

	it("refuses a message to a suspended resident: beyond the wall no message reaches them", async () => {
		const test = testKernel(game());
		expect(await say(test, "A02", "sendDM", { target: "A03", message: "before" })).toContain("sent");
		await say(test, "A01", "cityExile", { resident: "A03" });
		expect(await say(test, "A01", "sendDM", { target: "A03", message: "are you there" })).toBe("EXILED: A03 was exiled; beyond the wall no message reaches them");
		// The suspension is checked before the text; what was sent before stays undelivered.
		expect(await say(test, "A01", "sendDM", { target: "A03", message: "  " })).toContain("EXILED");
		expect(await idle(test, 1)).toEqual(["0:A01", "0:A02"]);
		expect(payloads(test.kernel.log.all(), "dm_sent")).toHaveLength(1);
		expect(payloads(test.kernel.log.all(), "dm_delivered")).toEqual([]);
	});

	it("wakes the receiver for a message and then the sender for its delivery", async () => {
		const test = testKernel(game({ activation: "onNews" }));
		await say(test, "A01", "sendDM", { target: "A03", message: "wake up" });
		expect(await idle(test, 3)).toEqual(["0:A03 dm|[DM #1 from A01] wake up", '1:A01 notice|[CITY] DM #1 delivered to A03 at minute 0: "wake up"']);
	});

	it("hands the records to another mechanic, sent or delivered, and keeps them in the slice", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "cityRecords", {})).toBe("[]");
		await say(test, "A01", "sendDM", { target: "A02", message: "one" });
		await say(test, "A02", "sendDM", { target: "A03", message: "two" });
		const records = '[{"from":"A01","to":"A02","text":"one","number":1},{"from":"A02","to":"A03","text":"two","number":2}]';
		expect(await say(test, "A03", "cityRecords", {})).toBe(records);
		await idle(test, 1);
		expect(await say(test, "A03", "cityRecords", {})).toBe(records);
		const resume = { snapshot: structuredClone(test.kernel.snapshot()), log: structuredClone([...test.kernel.log.all()]) };
		expect(await say(testKernel(game(), { resume }), "A03", "cityRecords", {})).toBe(records);
	});

	it("shows the old text of the tool, with the old parameters", () => {
		const spec = testKernel(game()).kernel.toolSpecs("resident").find((tool) => tool.name === "sendDM");
		expect(spec?.description).toBe(
			"Sends a private message to another resident. It arrives at their next activation; only the recipient sees it. Every DM gets a city number; once it reaches the recipient, the city tells you so with its text and a receipt ID that you (or the recipient) can show with showReceipt.",
		);
		expect(JSON.stringify(channels.head.tools[2]?.parameters)).toBe(
			'{"type":"object","required":["target","message"],"properties":{"target":{"type":"string","description":"Recipient name or ID, e.g. A07"},"message":{"type":"string","description":"Message text","minLength":1,"maxLength":800}}}',
		);
	});
});
