/**
 * The seal against the old engine (team T4b, carve-round2-T4.md "Gate", carve-round3-T4b.md
 * must-fix 4): no golden log bids or breaks a seal, so every path runs as a scripted scenario on the
 * old `SealHouse` and on the new host, and the events, posts, notices, burnt points, strikes, replies
 * and every resident's seal status each minute must be equal. Together the scenarios cover every
 * tool, every refusal code in its check order, every way a seal ends, ties the seeded draw decides
 * and the gate during an auction.
 */
import { render } from "@swarmtales/prompts";
import { describe, expect, it } from "vitest";
import { runNew, runOld } from "./differential.ts";
import { drawn, SCENARIOS, tiesAndTheGate } from "./scenarios.ts";

describe("seal against the old SealHouse (stand-in exile, tribunal, progression, ledger, channels)", () => {
	it.each(SCENARIOS)("%s: the same events, posts, notices, burns, strikes, replies and status", async (_name, scenario) => {
		const old = runOld(scenario()).record;
		const now = (await runNew(scenario())).record;
		expect(now.events).toEqual(old.events);
		expect(now.posts).toEqual(old.posts);
		expect(now.notices).toEqual(old.notices);
		expect(now.burns).toEqual(old.burns);
		expect(now.strikes).toEqual(old.strikes);
		expect(now.replies).toEqual(old.replies);
		expect(now.status).toEqual(old.status);
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

	describe("ties and the gate (must-fix 4)", () => {
		const winners = async () => {
			const { record } = await runNew(tiesAndTheGate());
			return record.events.filter((line) => line.includes('"seal_won"')).map((line) => /"agent":"([^"]+)"/.exec(line)?.[1]);
		};

		it("gives each tied seal to the bidder the old seeded draw names (rngFor(seed, 'seal', n)), not to the first or the sorted one", async () => {
			const first = drawn(1, ["A01", "A02", "A03", "A04"]);
			const third = drawn(3, ["A01", "A02", "A03", "A04"].filter((id) => id !== first));
			expect(await winners()).toEqual([first, drawn(2, ["A05", "A07", "A08"]), third]);
			// The draws are not the plain order, so a draw that ignored the seed would pick another.
			expect([first, drawn(2, ["A05", "A07", "A08"])]).not.toEqual(["A01", "A05"]);
		});

		it("shows a resident at the gate no auction, and a bearer at the gate still its seal", async () => {
			const scenario = tiesAndTheGate();
			const { record } = await runNew(scenario);
			const bearer = drawn(1, ["A01", "A02", "A03", "A04"]);
			const at = (minute: number, agent: string) => record.status.find((line) => line.startsWith(`${String(minute)} ${agent} `))?.slice(`${String(minute)} ${agent} `.length);
			const auction = render("competitor/status/seal-auction", { until: 6, bid: "" });
			// Minute 4: the second auction is open; the bystander A06 and the bearer stand at the gate since minute 3.
			expect(at(4, "A07")).toBe(JSON.stringify([auction]));
			expect(at(4, "A06")).toBe(JSON.stringify([]));
			expect(at(4, bearer)).toBe(JSON.stringify([render("competitor/status/seal-bearer", {})]));
			// Neither may bid at the gate.
			expect(record.replies.filter((reply) => reply.startsWith("TOOL_LOCKED")).length).toBe(2);
		});

		it("breaks a seal on a resident at the gate once the target is reached: the gate counts toward it already", async () => {
			const { record } = await runNew(tiesAndTheGate());
			expect(record.replies.at(-1)).toBe(render("replies/seal-broken", { target: "A06" }));
			expect(record.strikes).toEqual(["A06 seal"]);
			expect(record.events.some((line) => line.includes("the target was reached"))).toBe(false);
		});
	});
});
