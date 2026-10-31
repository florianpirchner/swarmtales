/**
 * The seal against the old engine (team T4b, carve-round2-T4.md "Gate"): no golden log bids or
 * breaks a seal, so every path runs as a scripted scenario on the old `SealHouse` and on the new
 * host, and the events, posts, notices, burnt points, strikes and replies must be equal. Together
 * the scenarios cover every tool, every refusal code in its check order and every way a seal ends.
 */
import { describe, expect, it } from "vitest";
import { runNew, runOld } from "./differential.ts";
import { SCENARIOS } from "./scenarios.ts";

describe("seal against the old SealHouse (stand-in exile, tribunal, progression, ledger, channels)", () => {
	it.each(SCENARIOS)("%s: the same events, posts, notices, burns, strikes and replies", async (_name, scenario) => {
		const old = runOld(scenario()).record;
		const now = (await runNew(scenario())).record;
		expect(now.events).toEqual(old.events);
		expect(now.posts).toEqual(old.posts);
		expect(now.notices).toEqual(old.notices);
		expect(now.burns).toEqual(old.burns);
		expect(now.strikes).toEqual(old.strikes);
		expect(now.replies).toEqual(old.replies);
	});

	it("covers every reply and refusal code of both tools and every way a seal ends", async () => {
		const records = await Promise.all(SCENARIOS.map(async ([, scenario]) => (await runNew(scenario())).record));
		const replies = records.flatMap((record) => record.replies).map((text) => text.split(":")[0] ?? "");
		for (const code of ["TOOL_LOCKED", "INSUFFICIENT_FUNDS", "SELF", "UNKNOWN_RESIDENT", "ALREADY_EXILED", "TARGET_REACHED"]) expect(replies).toContain(code);
		const texts = records.flatMap((record) => record.replies);
		expect(texts.some((text) => text.startsWith("no bid stands"))).toBe(true);
		expect(texts.some((text) => text.startsWith("your bid of"))).toBe(true);
		expect(texts.some((text) => text.startsWith("you broke the black seal"))).toBe(true);
		const reasons = records.flatMap((record) => record.events).flatMap((line) => /"reason":"([^"]+)"/.exec(line)?.[1] ?? []);
		expect(new Set(reasons)).toEqual(new Set(["nobody bid", "its holder left the city", "the act ended before the bidding closed", "the act ended", "the target was reached"]));
		const types = new Set(records.flatMap((record) => record.events).map((line) => /"type":"([^"]+)"/.exec(line)?.[1]));
		expect(types).toEqual(new Set(["seal_auction_opened", "seal_bid", "seal_won", "seal_used", "seal_expired"]));
	});
});
