// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The quarry mechanic: a scripted match, the timer, the refusals of `pick` and its conformance (offline). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { draftRounds } from "../src/index.ts";
import { draftGame, field, ofType, packOf, player, SEATS } from "./support.ts";

const players = { drivers: { resident: player } };

describe("a match", () => {
	it("plays three games with sealed picks, burns and a reference score, and ends the run", async () => {
		const run = await play(draftGame({ burns: true }), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "quarry.match" });
		expect(ofType(run.events, "draft_game_ended")).toHaveLength(3);
		for (const type of ["draft_game_started", "draft_card_picked", "draft_game_scored"]) {
			expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		const picks = ofType(run.events, "draft_card_picked");
		const burned = picks.filter((event) => field(event, "burned") !== undefined);
		// 48 cards a game; every burn takes one card out of the picks.
		expect(burned.length).toBeGreaterThan(0);
		expect(picks).toHaveLength(3 * 48 - burned.length);
		expect(picks.every((event) => field(event, "missed") === false)).toBe(true);
		const scores = run.kernel.fact("quarry.scores");
		expect(ofType(run.events, "draft_match_ended").map((event) => event.payload)).toEqual([{ scores }]);
		expect(JSON.stringify(scores)).toMatch(/^\{"A01":\d+,"A02":\d+,"A03":\d+,"A04":\d+\}$/);
	});

	it("takes the first card of the pack for a seat that misses the deadline", async () => {
		const run = await play(draftGame({ games: 1, brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "quarry.match" });
		const picks = ofType(run.events, "draft_card_picked");
		expect(picks).toHaveLength(48);
		expect(picks.every((event) => field(event, "missed") === true)).toBe(true);
		// Twelve picks: the first opens at tick 0, each next one at the end of the second tick of the one before (deadline 2).
		expect(ofType(run.events, "draft_pick_opened").map((event) => event.tick)).toEqual([0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]);
	});
});

describe("pick", () => {
	it("is open for a seat that owes a pick, refuses bad cards and burns, and closes after the pick", async () => {
		const test = testKernel(draftGame({ brain: false, burns: true }));
		const view = await test.call("A01", "viewTable", {});
		const cards = packOf(view.ok ? view.reply : "");
		expect(cards).toHaveLength(6);
		const [first, second, third] = cards.map((card) => card.id);
		expect(test.openTools("A01")).toContain("pick");
		expect(await test.call("A01", "pick", { card: "Z9" })).toMatchObject({ ok: false, code: "NOT_IN_PACK", detail: `Z9 is not in your pack. Your pack: ${cards.map((card) => `${card.id} ${card.kind}`).join(", ")}.` });
		expect(await test.call("A01", "pick", { card: first, burn: first })).toMatchObject({ ok: false, code: "BURN_IS_PICK" });
		expect(await test.call("A01", "pick", { card: first, burn: "Z9" })).toMatchObject({ ok: false, code: "NOT_IN_PACK" });
		const done = await test.call("A01", "pick", { card: ` ${String(first).toLowerCase()} `, burn: second });
		expect(done).toMatchObject({ ok: true });
		expect(done.ok ? done.reply : "").toMatch(new RegExp(`^Kept ${String(first)} \\w+, burned ${String(second)}\\. Your quarry: .*\\. Wait for the next pack\\.$`));
		expect(test.openTools("A01")).not.toContain("pick");
		expect(await test.call("A01", "pick", { card: third })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(ofType(test.kernel.log.all(), "draft_card_picked").map((event) => event.payload)).toMatchObject([{ resident: "A01", card: { id: first }, burned: { id: second }, packSize: 6, returnable: true, missed: false }]);
	});

	it("passes the packs once every seat picked, and tells who passed", async () => {
		const test = testKernel(draftGame({ brain: false }));
		for (const seat of SEATS) {
			const view = await test.call(seat, "viewTable", {});
			expect(view.ok ? view.reply : "").toContain("pick 1 (a fresh pack)");
			expect(await test.call(seat, "pick", { card: packOf(view.ok ? view.reply : "")[0]?.id, burn: "A1" })).toMatchObject({ ok: false, code: "NO_BURNS_LEFT" });
			expect(await test.call(seat, "pick", { card: packOf(view.ok ? view.reply : "")[0]?.id })).toMatchObject({ ok: true });
		}
		const next = await test.call("A02", "viewTable", {});
		expect(next.ok ? next.reply : "").toContain("pick 2 (passed to you by A01)");
		expect(packOf(next.ok ? next.reply : "")).toHaveLength(5);
		expect(ofType(test.kernel.log.all(), "draft_pick_opened").map((event) => field(event, "step"))).toEqual([1, 2]);
	});
});

describe("open quarries", () => {
	const NONE = "amber 0, basalt 0, cobalt 0, jade 0, lodestone 0";
	// The `Quarries:` line `viewTable` shows to a seat, as a record by seat.
	const quarries = async (test: ReturnType<typeof testKernel>, seat: string): Promise<Readonly<Record<string, string>>> => {
		const view = await test.call(seat, "viewTable", {});
		const line = /Quarries: (.+)\.$/m.exec(view.ok ? view.reply : "")?.[1] ?? "";
		return Object.fromEntries(line.split("; ").map((entry) => [entry.slice(0, 3), entry.slice(4)]));
	};
	const keepFirst = async (test: ReturnType<typeof testKernel>, seat: string): Promise<void> => {
		const view = await test.call(seat, "viewTable", {});
		expect(await test.call(seat, "pick", { card: packOf(view.ok ? view.reply : "")[0]?.id })).toMatchObject({ ok: true });
	};

	it("are the live state by default: a seat sees a pick of the same step (LH18)", async () => {
		const test = testKernel(draftGame({ brain: false, openHands: true }));
		await keepFirst(test, "A01");
		expect((await quarries(test, "A02")).A01).not.toBe(NONE);
	});

	it("are those at the start of the pick with frozenHands, the reader's own quarry excepted, until the packs pass", async () => {
		const test = testKernel(draftGame({ brain: false, openHands: true, frozenHands: true }));
		await keepFirst(test, "A01");
		await keepFirst(test, "A03");
		expect(await quarries(test, "A02")).toEqual({ A01: NONE, A02: NONE, A03: NONE, A04: NONE });
		const own = await quarries(test, "A01");
		expect(own.A01).not.toBe(NONE);
		expect(own.A03).toBe(NONE);
		await keepFirst(test, "A02");
		await keepFirst(test, "A04");
		// The packs passed: the picks of the finished step are shown to every seat.
		expect(Object.values(await quarries(test, "A02")).filter((line) => line === NONE)).toEqual([]);
		await keepFirst(test, "A04");
		expect((await quarries(test, "A02")).A04).toBe((await quarries(test, "A01")).A04);
		expect((await quarries(test, "A04")).A04).not.toBe((await quarries(test, "A02")).A04);
	});
});

describe("mechanic conformance", () => {
	it("fits its package, and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(draftRounds, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(draftRounds)).toEqual([]);
	});

	it("is deterministic, and a run resumed from a snapshot plays on as the whole run", async () => {
		expect(await checkDeterminism(draftGame({ burns: true }), () => player)).toEqual([]);
		for (const cut of [1, 3, 6]) expect(await checkSnapshotRoundTrip(draftGame({ burns: true }), () => player, cut)).toEqual([]);
		expect(await checkSnapshotRoundTrip(draftGame({ games: 1, openHands: true, frozenHands: true }), () => player, 3)).toEqual([]);
		// Silent seats: the cut falls between a pick's opening and its deadline.
		expect(await checkSnapshotRoundTrip(draftGame({ brain: false }), () => idleDriver, 9)).toEqual([]);
	});
});
