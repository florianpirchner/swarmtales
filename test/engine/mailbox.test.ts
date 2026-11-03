import { describe, expect, it } from "vitest";
import { Mailbox } from "@swarmtales/mechanic-channels";

const entry = (text: string, from = "A01") => ({ from, text, minute: 0 });

describe("Mailbox", () => {
	it("rejects deliveries beyond its capacity", () => {
		const mailbox = new Mailbox("A09", 2);
		expect(mailbox.deliver(entry("one", "A01"))).toBeUndefined();
		expect(mailbox.deliver(entry("two", "A02"))).toBeUndefined();
		expect(mailbox.deliver(entry("three", "A03"))).toBe("MAILBOX_FULL");
		expect(mailbox.size).toBe(2);
	});

	it("holds at most one unread message per sender", () => {
		const mailbox = new Mailbox("A09");
		mailbox.deliver(entry("one", "A01"));
		expect(mailbox.deliver(entry("two", "A01"))).toBe("MAILBOX_SENDER_LIMIT");
		expect(mailbox.deliver(entry("from someone else", "A02"))).toBeUndefined();
		expect(mailbox.size).toBe(2);
	});

	it("drains oldest first and frees capacity", () => {
		const mailbox = new Mailbox("A09", 1);
		mailbox.deliver(entry("one"));
		expect(mailbox.drain().map((item) => item.text)).toEqual(["one"]);
		expect(mailbox.size).toBe(0);
		expect(mailbox.deliver(entry("two"))).toBeUndefined();
	});

	it("defaults to a capacity of five", () => {
		const mailbox = new Mailbox("A09");
		for (let index = 1; index <= 5; index++) expect(mailbox.deliver(entry("x", `A0${index}`))).toBeUndefined();
		expect(mailbox.deliver(entry("x", "A06"))).toBe("MAILBOX_FULL");
	});
});
