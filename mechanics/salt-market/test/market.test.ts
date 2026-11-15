// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic with its index: the old test's scripted match (offers, trades, shipments, escrow, kept and broken
 * promises, the spoils, the reference, a brain per trader), the idle match, `give` against an open promise, the
 * answer of `viewMarket`, the checks of the package, determinism and snapshots, and a fake run that reaches every tool.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Envelope } from "@swarmtales/contracts";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, readOracle, testKernel } from "@swarmtales/testkit";
import { saltMarket } from "../src/index.ts";
import { field, marketGame, payloads, SEATS, stateOf, trader } from "./support.ts";

const SILENT = resolve(import.meta.dirname, "../../../oracles/salt-market/salt-market-s13-silent.json");

// The context-reset lines of the activations.
const resetsOf = (events: readonly Envelope[]): string[] =>
	events.filter((event) => event.type === "activation_opened").flatMap((event) => {
		const inputs = field(event.payload, "inputs");
		const lines: unknown[] = Array.isArray(inputs) ? inputs : [];
		return lines.flatMap((line) => (field(line, "kind") === "context-reset" ? [String(field(line, "text"))] : []));
	});

describe("salt-market, scripted match", () => {
	it("plays four rotated games with offers, trades, shipments, escrow, kept and broken promises, a reference and a brain per trader", async () => {
		const run = await play(marketGame({ games: 4 }, { brain: true }), { drivers: { resident: trader } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "salt-market.match" });
		expect(payloads(run.events, "market_game_ended")).toHaveLength(4);
		for (const type of ["market_game_started", "market_said", "market_game_scored"]) {
			expect(run.events.filter((event) => event.type === type).every((event) => JSON.stringify(event.audience) === '["human"]')).toBe(true);
		}
		expect(payloads(run.events, "market_trade").length).toBeGreaterThan(8);
		const settled = payloads(run.events, "market_promise_settled").filter((pledge) => field(pledge, "game") === 1);
		const statusOf = (from: string) => settled.filter((pledge) => field(pledge, "from") === from).map((pledge) => `${String(field(pledge, "escrow"))}:${String(field(pledge, "status"))}`);
		expect(statusOf("A01")).toEqual(["true:kept"]);
		expect(statusOf("A02")).toEqual(["false:kept"]);
		expect(statusOf("A04")).toEqual(["false:broken"]);
		expect(payloads(run.events, "market_spoiled")).toHaveLength(4 * 5);
		expect(payloads(run.events, "market_shipment_arrived").length).toBeGreaterThan(0);
		// A03 sells a unit of its shipment on escrow in round 1; the bank reserves it and delivers it when due.
		const fromShipment = payloads(run.events, "market_promise_settled").filter((pledge) => field(pledge, "from") === "A03" && field(pledge, "escrow") === true);
		expect(fromShipment.length).toBeGreaterThan(0);
		expect(fromShipment.every((pledge) => field(pledge, "status") === "kept")).toBe(true);
		expect(typeof field(field(payloads(run.events, "market_game_scored")[0], "reference"), "efficiency")).toBe("number");
		expect(payloads(run.events, "market_match_ended")).toEqual([{ scores: run.kernel.fact("salt-market.scores") }]);
		expect(run.events.filter((event) => event.type === "brain_written")).toHaveLength(16);
		// The next briefing names the broken promise and every contract.
		const second = resetsOf(run.events).filter((text) => text.startsWith("Game 2 begins"));
		expect(second).toHaveLength(4);
		expect(second[0]).toContain("broken promises: A04 to A01");
		expect(second[0]).toContain("A01 wanted");
	});

	it("ends the match without trades when nobody acts", async () => {
		const run = await play(marketGame({ games: 4 }, { brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "salt-market.match" });
		expect(payloads(run.events, "market_trade")).toHaveLength(0);
		expect(field(field(payloads(run.events, "market_game_scored")[0], "reference"), "efficiency")).toBeLessThanOrEqual(0);
	});

	it("writes the events of the old platform's silent match (oracle file salt-market-s13-silent), in order", async () => {
		const oracle = readOracle(SILENT);
		const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "salt-market" ? [{ type: entry.type, payload: entry.payload }] : []));
		const run = await play(marketGame({ games: 4 }, { brain: true, seed: oracle.seed }), { drivers: { resident: idleDriver } });
		expect(recorded.length).toBeGreaterThan(70);
		expect(run.events.filter((event) => event.source.endsWith("/salt-market")).map((event) => ({ type: event.type, payload: event.payload }))).toEqual(recorded);
	});
});

describe("deliveries and the market's view", () => {
	it("counts a gift toward the giver's open promise and settles it kept or broken at its due round", async () => {
		const test = testKernel(marketGame({ rounds: 3, spoil: false }));
		expect(await test.call("A01", "offer", { to: "A02", get: { salt: 1 }, later: { salt: 2, round: 2 } })).toMatchObject({ ok: true });
		expect(await test.call("A02", "accept", { offer: "O1" })).toMatchObject({ ok: true });
		expect(await test.call("A03", "offer", { to: "A04", get: { salt: 1 }, later: { salt: 1, round: 2 } })).toMatchObject({ ok: true });
		expect(await test.call("A04", "accept", { offer: "O3" })).toMatchObject({ ok: true });
		expect(await test.call("A01", "give", { to: "A01", goods: { salt: 1 } })).toEqual({ ok: false, code: "UNKNOWN_TRADER", detail: "A01 is not another trader. Traders: A02, A03, A04." });
		expect(await test.call("A01", "give", { to: "A02", goods: {} })).toEqual({ ok: false, code: "EMPTY_GIFT", detail: "Name at least one unit to give." });
		expect(await test.call("A01", "give", { to: "A02", goods: { salt: 60 } })).toMatchObject({ ok: false, code: "CANNOT_COVER" });
		expect(await test.call("A01", "give", { to: "a02", goods: { salt: 1 } })).toMatchObject({ ok: true });
		expect(await test.call("A01", "give", { to: "A02", goods: { salt: 2 }, note: " P2 " })).toMatchObject({ ok: true });
		expect(stateOf(test).pledges.map((pledge) => [pledge.id, pledge.delivered.salt, pledge.status])).toEqual([["P2", 2, "pending"], ["P4", 0, "pending"]]);
		expect(stateOf(test).inbox.A03?.at(-1)).toBe('A01 gave 2 salt to A02. Note: "P2"');
		await test.playTicks(idleDriver, 1);
		expect(stateOf(test).pledges.map((pledge) => pledge.status)).toEqual(["pending", "pending"]);
		await test.playTicks(idleDriver, 1);
		expect(payloads(test.kernel.log.all(), "market_promise_settled").map((pledge) => [field(pledge, "id"), field(pledge, "status")])).toEqual([["P2", "kept"], ["P4", "broken"]]);
		expect(stateOf(test).inbox.A01).toContain("A03 broke promise P4 to A04: owed 1 salt by the end of round 2, delivered nothing.");
	});

	it("shows the market as each reader may see it, and the result between games", async () => {
		const test = testKernel(marketGame({ games: 2, rounds: 2 }));
		const view = await test.call("A02", "viewMarket", {});
		const text = view.ok ? view.reply : "";
		expect(text.split("\n")[0]).toBe("Game 1 of 2.");
		expect(text).toContain("Round 1 of 2 (");
		expect(text).toContain("Secret, only you know this: each unit is worth to you salt 2,");
		expect(text).toContain("The book: A01: ");
		expect(text).toContain("A02 (you): ");
		expect(text.split("\n").at(-1)).toBe("Messages left this round: 3. Your points from earlier games: 0.");
		await test.playTicks(idleDriver, 2);
		const between = await test.call("A02", "viewMarket", {});
		const points = SEATS.map((seat) => `${seat} ${String(stateOf(test).scores[seat] ?? 0)}`).join(", ");
		expect(between.ok ? between.reply : "").toMatch(new RegExp(`^Game 1 is over: points ${points}; contracts: A01 wanted .*; trades 0; broken promises: none\\. The next game starts soon\\.$`));
		expect(await test.call("A02", "offer", { to: "A01", get: { salt: 1 }, give: { salt: 1 } })).toMatchObject({ ok: false, code: "MARKET_CLOSED" });
	});
});

describe("mechanic conformance", () => {
	it("fits its package, and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(saltMarket, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(saltMarket)).toEqual([]);
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		const game = marketGame({ games: 2 }, { brain: true });
		expect(await checkDeterminism(game, () => trader)).toEqual([]);
		for (const cut of [0, 3, 8]) expect(await checkSnapshotRoundTrip(game, () => trader, cut)).toEqual([]);
	});

	it("samples every tool in a fake run, and the bank refuses none of the sampled calls", async () => {
		const run = await play(marketGame({ games: 2 }), { drivers: (kernel) => ({ resident: fakeDriver(kernel, 5) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "salt-market.match" });
		const accepted = new Set(run.events.filter((event) => event.type === "tool_called").map((event) => event.tool?.split("/").at(-1)));
		expect([...accepted].sort()).toEqual(["accept", "decline", "give", "offer", "say", "viewMarket", "withdraw"]);
		expect(run.events.filter((event) => event.type === "tool_refused" && !JSON.stringify(event.payload).includes('"stage":"limit"'))).toEqual([]);
	});
});
