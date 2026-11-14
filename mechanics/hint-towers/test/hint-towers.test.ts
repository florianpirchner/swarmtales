// SPDX-License-Identifier: Apache-2.0
/** The hint-towers mechanic: a scripted match, the refusals, the move timer, the quiet tools and its conformance (offline). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { hintTowers } from "../src/index.ts";
import { actions, field, ofType, player, towerGame } from "./support.ts";

const players = { drivers: { resident: player } };

describe("a match", () => {
	it("plays two games, keeps the deal and the draws secret and scores every deal against the bot crew", async () => {
		const run = await play(towerGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "hint-towers.match" });
		expect(ofType(run.events, "game_started").map((event) => field(event, "first"))).toEqual(["A01", "A02"]);
		const ended = ofType(run.events, "game_ended");
		expect(ended).toHaveLength(2);
		for (const event of ended) expect(Number(field(event, "score")) + Number(field(event, "lost"))).toBeLessThanOrEqual(12);
		for (const type of ["deal_revealed", "card_drawn", "game_scored"]) expect(ofType(run.events, type).every((event) => event.audience?.join() === "human")).toBe(true);
		expect(ofType(run.events, "card_drawn").length).toBeGreaterThan(0);
		expect(actions(run.events).length).toBeGreaterThan(0);
		expect(actions(run.events).every((event) => field(event, "forfeit") === false)).toBe(true);
		const scores = ended.map((event) => field(event, "score"));
		expect(ofType(run.events, "match_ended").map((event) => event.payload)).toEqual([{ scores, baselines: ofType(run.events, "game_scored").map((event) => field(event, "baseline")) }]);
		expect(run.kernel.fact("hint-towers.scores")).toEqual(scores);
		expect(run.kernel.fact("hint-towers.actor")).toBeNull();
	});

	it("never shows a seat its own cards, only the others'", async () => {
		const test = testKernel(towerGame());
		const status = await test.call("A01", "viewTowers", {});
		const view = status.ok ? status.reply : "";
		const [deal] = ofType(test.kernel.log.all(), "deal_revealed");
		const dealt = deal === undefined ? undefined : field(deal, "hands");
		const handOf = (seat: string): string[] => {
			const hand: unknown = typeof dealt === "object" && dealt !== null ? Reflect.get(dealt, seat) : undefined;
			return Array.isArray(hand) ? hand.map(String) : [];
		};
		expect(handOf("A02")).toHaveLength(2);
		for (const card of handOf("A02")) expect(view).toContain(card);
		const own = view.split("The others' hands")[0] ?? "";
		expect(own).toMatch(/slot 1 \(oldest\): you know nothing; could be (\w+ \d, ){5}\w+ \d\.\n {2}slot 2: you know nothing; could be /);
		for (const card of handOf("A01")) expect(own.includes(`could be ${card}.`)).toBe(false);
		expect(test.fact("hint-towers.actor")).toBe("A01");
	});

	it("refuses out-of-turn actions, bad slots, bad signals and a discard at the cap, each in the tool's own run", async () => {
		const test = testKernel(towerGame());
		expect(await test.call("A02", "playSlot", { slot: 1 })).toEqual({ ok: false, code: "NOT_YOUR_TURN", detail: "It is A01's turn." });
		expect(await test.call("A01", "playSlot", { slot: 3 })).toEqual({ ok: false, code: "NO_SUCH_SLOT", detail: "You hold slots 1 to 2." });
		expect(await test.call("A01", "discardSlot", { slot: 1 })).toMatchObject({ ok: false, code: "SIGNALS_FULL" });
		expect(await test.call("A01", "giveSignal", { to: "A01", about: "Amber" })).toMatchObject({ ok: false, code: "SELF_SIGNAL" });
		expect(await test.call("A01", "giveSignal", { to: "A02", about: "Ember" })).toEqual({ ok: false, code: "UNKNOWN_SIGNAL", detail: "Name one suit (Amber, Cobalt, Moss) or one rank (1 to 4)." });
		// The old platform refused in `execute`; the oracle files hold that stage.
		expect(test.kernel.log.all().filter((event) => event.type === "tool_refused").map((event) => field(event, "stage"))).toEqual(["execute", "execute", "execute", "execute", "execute"]);
	});

	it("tells the seat that played what its slot was and who is next, and draws for it", async () => {
		const test = testKernel(towerGame());
		const played = await test.call("A01", "playSlot", { slot: 1 });
		expect(played.ok ? played.reply : "").toMatch(/^Slot 1 was \w+ \d: (lit\.|a misfire\. The card is lost; Strikes 1 of 2 \(the last one ends the game\)\.) You drew a new card into slot 2\. A02 is next\. End your turn\.$/);
		const [event] = ofType(test.kernel.log.all(), "card_played");
		expect(event?.payload).toMatchObject({ game: 1, turn: 1, seat: "A01", slot: 1, forfeit: false });
		// The card table holds the same hand: the played card left it and the drawn one came in.
		expect(test.fact("card-table.handSizes")).toEqual({ A01: 2, A02: 2, A03: 2, A04: 2 });
		expect(ofType(test.kernel.log.all(), "card_drawn").map((drawn) => field(drawn, "seat"))).toEqual(["A01"]);
	});
});

describe("the move timer", () => {
	it("acts for an idle seat with the bot's action, and ends the match as invalid after too many in a row", async () => {
		const run = await play(towerGame({ maxIdleMinutes: 1, maxConsecutiveForfeits: 5 }), { drivers: { resident: idleDriver } });
		expect(actions(run.events).map((event) => field(event, "forfeit"))).toEqual([true, true, true, true, true]);
		// One action at the end of each tick, each by the kernel's hand and not by a seat.
		expect(actions(run.events).map((event) => [event.tick, event.actor])).toEqual([0, 1, 2, 3, 4].map((tick) => [tick, "kernel"]));
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(run.end).toMatchObject({ reason: "limit", limit: "hint-towers.match" });
	});

	it("waits `maxIdleMinutes` whole ticks, and an accepted action ends a row of timer actions", async () => {
		const test = testKernel(towerGame({ maxIdleMinutes: 2, maxConsecutiveForfeits: 2 }));
		await test.playTicks(idleDriver, 2);
		expect(actions(test.kernel.log.all()).map((event) => [event.tick, field(event, "seat"), field(event, "forfeit")])).toEqual([[1, "A01", true]]);
		expect(await test.call("A02", "playSlot", { slot: 1 })).toMatchObject({ ok: true });
		await test.playTicks(idleDriver, 2);
		expect(ofType(test.kernel.log.all(), "match_ended")).toEqual([]);
		await test.playTicks(idleDriver, 2);
		expect(ofType(test.kernel.log.all(), "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
	});
});

describe("the quiet tools", () => {
	it("are closed for every seat while a game runs, also a tool of another mechanic, and open between games", async () => {
		const test = testKernel(towerGame({ games: 2, quietTools: ["viewHand"], strikes: 1 }));
		expect(await test.call("A03", "viewHand", {})).toEqual({ ok: false, code: "TOOL_LOCKED" });
		expect(test.kernel.log.all().filter((event) => event.type === "tool_refused").map((event) => field(event, "stage"))).toEqual(["lock"]);
		expect(test.openTools("A03")).not.toContain("viewHand");
		expect(await test.call("A03", "viewTowers", {})).toMatchObject({ ok: true });
		// Blind plays until the one strike ends game 1; the next game starts with the next tick.
		for (let turn = 0; turn < 12 && ofType(test.kernel.log.all(), "game_ended").length === 0; turn++) await test.call(String(test.fact("hint-towers.actor")), "playSlot", { slot: 1 });
		expect(ofType(test.kernel.log.all(), "game_ended").map((event) => field(event, "reason"))).toEqual(["strikes"]);
		expect(await test.call("A03", "viewHand", {})).toMatchObject({ ok: true });
		expect(test.openTools("A03")).toContain("viewHand");
		await test.playTicks(idleDriver, 2);
		expect(ofType(test.kernel.log.all(), "game_started")).toHaveLength(2);
		expect(await test.call("A03", "viewHand", {})).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
	});
});

describe("mechanic conformance", () => {
	it("fits its package, and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(hintTowers, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(hintTowers)).toEqual([]);
	});

	it("gives the fake driver an accepted call of every tool, and no call that is refused", async () => {
		// Only the towers' own tools: the fake driver takes the first open tool that samples, and `viewHand` always does.
		const test = testKernel(towerGame({ games: 3, strikePenalty: 1 }, { grants: ["viewTowers", "giveSignal", "playSlot", "discardSlot"] }));
		await test.playTicks(fakeDriver(test.kernel, 7), 60);
		const events = test.kernel.log.all();
		const accepted = new Set(events.filter((event) => event.type === "tool_result").map((event) => event.tool?.split("/").at(-1)));
		expect([...accepted].sort()).toEqual(["discardSlot", "giveSignal", "playSlot", "viewTowers"]);
		expect(events.filter((event) => event.type === "tool_refused")).toEqual([]);
		expect(ofType(events, "game_ended").length).toBeGreaterThan(0);
	});

	it("is deterministic, and a run resumed from a snapshot plays on as the whole run", async () => {
		expect(await checkDeterminism(towerGame(), () => player)).toEqual([]);
		// Between two games (a whole game fits into the eight passes of a tick), and with one pass a tick in the middle of a game.
		expect(await checkSnapshotRoundTrip(towerGame(), () => player, 1)).toEqual([]);
		for (const cut of [2, 5]) expect(await checkSnapshotRoundTrip(towerGame({}, { passes: 1 }), () => player, cut)).toEqual([]);
		// Silent seats: the cut falls between a tick's start and the timer action of the next.
		expect(await checkSnapshotRoundTrip(towerGame({ maxConsecutiveForfeits: 6 }), () => idleDriver, 3)).toEqual([]);
	});
});
