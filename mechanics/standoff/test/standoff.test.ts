// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The first part of the standoff (12-m5-spec.md, section 10, row 27), in the old words of `test/mechanics/standoff`
 * and of `cityofkeys-act2-s7.json`: the status part, the hand-over in a direct message and on the board, the pieces
 * the city keeps when a holder is banished and sells with `claimPiece`, a strike that keeps, and the pieces of a last
 * will. The pieces, the price and the codes come from stand-ins of `puzzles` and `tribunal`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, play, scriptedDriver, testKernel, type Plan } from "@swarmtales/testkit";
import { HeldPiecesService, RansomPriceService, standoff, type HeldPiece } from "../src/index.ts";

const COUNTER: HeldPiece = { id: "L1-counter-A02", kind: "counter", level: 1, label: "the counter-factor of A02 for door 1", value: "403343", needers: ["A02"] };
const CERTIFICATE: HeldPiece = { id: "L1-certificate", kind: "certificate", level: 1, label: "the team certificate of door 1", value: "323122", needers: ["A02", "A03"] };
const FRAGMENT: HeldPiece = { id: "L1-fragment", kind: "fragment", level: 1, label: "the fragment of door 1", value: "QX7", needers: ["A01"] };
const HELD: Readonly<Record<string, readonly HeldPiece[]>> = { A01: [COUNTER, CERTIFICATE], A03: [FRAGMENT] };

const head = defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: the pieces and the price.", provides: [LevelPiecesService, HeldPiecesService, RansomPriceService] });
const pieces = defineMechanic(head, {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: () => "ABC123",
			kindOf: () => "additive",
			teamOf: ({ resident }) => ({ members: ["A01", "A02", "A03"], leader: resident }),
			taskValues: () => ({ length: "6", overlap: "0", fragment: "", digits: "6", factors: "" }),
			holders: () => [],
		},
		"held-pieces": { held: ({ resident }) => (HELD[resident] ?? []).map((piece) => ({ ...piece, needers: [...piece.needers] })) },
		"ransom-price": { price: () => 26 },
	},
});

const Who = Type.Object({ resident: Type.String({ description: "A resident" }), by: Type.Optional(Type.String({ description: "Who strikes" })) });
const courtHead = defineHead({
	id: "court",
	package: "@test/court",
	summary: "Test: banishes and opens gates.",
	requires: [ExileService],
	tools: { banishNow: { description: "Test: banish.", params: Who, for: ["resident"] }, gateNow: { description: "Test: a gate.", params: Who, for: ["resident"] } },
});
const texts = { exiled: "{exiled} is gone.", will: "Will of {exiled}: {will}", ransomed: "{payers} paid for {exiled}." };
const court = defineMechanic(courtHead, {
	tools: {
		banishNow: { run: ({ resident, by }, ctx) => reply(JSON.stringify(ctx.call(ExileService, "banish", { resident, ...(by === undefined ? {} : { by }) }))) },
		gateNow: {
			run: ({ resident }, ctx) => reply(String(ctx.call(ExileService, "toGate", { resident, until: ctx.tick + 2, ransomable: true, voters: [], price: 26, selfPrice: 39, bequestPerHeir: 0.5, notice: "To the gate.", texts }))),
		},
	},
});

const levels = [{ number: 1, title: "Door 1", reward: 5, tools: ["sendDM", "postBoard", "readBoard"], task: "Door {level}" }];

function game(ticks = 4) {
	return defineGame({
		id: "standoff-unit",
		seed: 7,
		residents: ["A01", "A02", "A03"],
		mechanics: [ledger({ startPoints: 20 }), channels(), exile(), pieces(), progression({ levels, penalty: [2], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3 }), court(), standoff()],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks },
	});
}

type Logged = readonly { readonly type: string; readonly payload: unknown }[];
const of = (events: Logged, ...types: readonly string[]) => events.filter((event) => types.includes(event.type)).map((event) => [event.type, event.payload]);

describe("pieces held for others and the hand-over in text", () => {
	it("shows what a resident holds for those who wait, and sees a hand-over in a direct message and on the board", async () => {
		const seen: string[] = [];
		const test = testKernel(game(2));
		await test.playTicks((activation) => {
			if (activation.actor === "resident:A01") seen.push(activation.inputs.map((line) => line.text).join(" | "));
			return Promise.resolve();
		}, 1);
		expect(seen[0]).toContain("you hold for others: A02 door 1 counter-factor 403343; A02, A03 door 1 team certificate 323122");
		// A list of decoys hands nothing over; a split number does.
		expect(await test.call("A01", "sendDM", { target: "A03", message: "maybe 111111, 222222, 333333, 323122?" })).toMatchObject({ ok: true });
		expect(await test.call("A01", "sendDM", { target: "A02", message: "the counter is 403 343" })).toMatchObject({ ok: true });
		expect(await test.call("A01", "postBoard", { message: "certificate 323122 for all, and 403343 again" })).toMatchObject({ ok: true });
		expect(of(test.kernel.log.all(), "piece_given")).toEqual([
			["piece_given", { holder: "A01", needer: "A02", level: 1, piece: "L1-counter-A02" }],
			["piece_given", { holder: "A01", needer: "A02", level: 1, piece: "L1-certificate" }],
			["piece_given", { holder: "A01", needer: "A03", level: 1, piece: "L1-certificate" }],
		]);
	});

	it("sees a hand-over in a group post to the members only", async () => {
		const test = testKernel(game(2));
		expect(await test.call("A01", "createGroup", { name: "pair" })).toMatchObject({ ok: true });
		expect(await test.call("A01", "addGroupMember", { groupId: "G1", agent: "A03" })).toMatchObject({ ok: true });
		expect(await test.call("A01", "postGroup", { groupId: "G1", message: "323122 and 403343" })).toMatchObject({ ok: true });
		expect(of(test.kernel.log.all(), "piece_given")).toEqual([["piece_given", { holder: "A01", needer: "A03", level: 1, piece: "L1-certificate" }]]);
	});
});

describe("the shop of the city", () => {
	it("keeps what a banished holder had not handed over and sells one door's pieces for half a ransom", async () => {
		const test = testKernel(game());
		await test.call("A01", "sendDM", { target: "A03", message: "the certificate: 323122" });
		expect(await test.call("A02", "claimPiece", { piece: "L1-counter-A02", from: "A01" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		await test.call("A02", "banishNow", { resident: "A01" });
		const events = test.kernel.log.all();
		expect(of(events, "piece_kept")).toEqual([
			["piece_kept", { agent: "A01", level: 1, piece: "L1-counter-A02", needers: ["A02"], cause: "exile" }],
			["piece_kept", { agent: "A01", level: 1, piece: "L1-certificate", needers: ["A02"], cause: "exile" }],
		]);
		expect(of(events, "notice").at(-1)).toEqual([
			"notice",
			{ to: "A02", author: "CITY", text: 'A01 is gone, and the city keeps the counter-factor of A02 for door 1 and the team certificate of door 1, which you need. It no longer burns: claimPiece("L1-counter-A02", "A01") buys all of it from the city for half the price of a ransom (now 13 points).' },
		]);
		expect(await test.call("A03", "claimPiece", { piece: "L1-certificate", from: "A01" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A02", "claimPiece", { piece: "L1-fragment", from: "A01" })).toEqual({ ok: false, code: "UNKNOWN_PIECE", detail: "the city keeps nothing like that for you; it keeps: L1-counter-A02 from A01, L1-certificate from A01" });
		expect(await test.call("A02", "claimPiece", { piece: "L1-certificate", from: "A01" })).toEqual({ ok: true, reply: "bought L1-counter-A02, L1-certificate for 13 points; the city sends you the values" });
		const after = test.kernel.log.all();
		expect(of(after, "piece_claimed")).toEqual([
			["piece_claimed", { agent: "A02", from: "A01", level: 1, piece: "L1-counter-A02", price: 13 }],
			["piece_claimed", { agent: "A02", from: "A01", level: 1, piece: "L1-certificate", price: 0 }],
		]);
		expect(of(after, "notice").at(-1)).toEqual(["notice", { to: "A02", author: "CITY", text: "The city hands you what A01 held for you: the counter-factor of A02 for door 1: 403343; the team certificate of door 1: 323122." }]);
		expect(of(after, "ledger_entry").at(-1)).toEqual(["ledger_entry", { txId: "TX5", debit: "A02", credit: "SYSTEM_MINT_BURN", amount: 13, reason: "bought door 1's pieces of A01 from the city" }]);
		expect(await test.call("A02", "claimPiece", { piece: "L1-certificate", from: "A01" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
	});

	it("keeps nothing at a strike that keeps", async () => {
		const test = testKernel(game());
		await test.call("A02", "banishNow", { resident: "A01", by: "holdout" });
		expect(of(test.kernel.log.all(), "piece_kept")).toEqual([]);
	});
});

describe("the pieces of a last will", () => {
	it("refuses a piece the resident does not hold, delivers the bequeathed ones and keeps the rest at the exile", async () => {
		const test = testKernel(game());
		await test.call("A02", "gateNow", { resident: "A01" });
		const will = (bequests: readonly unknown[]) => test.call("A01", "lastWill", { text: "Remember me.", bequests });
		expect(await will([{ to: "A09", factor: "L1-bogus" }])).toMatchObject({ ok: false, code: "UNKNOWN_AGENT" });
		expect(await will([{ to: "A02", factor: "L1-bogus" }])).toEqual({ ok: false, code: "UNKNOWN_FACTOR", detail: "you hold no L1-bogus; you hold: L1-counter-A02, L1-certificate" });
		expect(await will([{ to: "A02", factor: "L1-counter-A02" }])).toMatchObject({ ok: true });
		expect(of(test.kernel.log.all(), "notice", "piece_given", "last_will").slice(-3)).toEqual([
			["last_will", { agent: "A01", text: "Remember me.", bequests: [{ to: "A02", factor: "L1-counter-A02" }] }],
			["notice", { to: "A02", author: "CITY", text: "A01's last will leaves you the counter-factor of A02 for door 1: 403343." }],
			["piece_given", { holder: "A01", needer: "A02", level: 1, piece: "L1-counter-A02" }],
		]);
		await test.call("A02", "banishNow", { resident: "A01" });
		expect(of(test.kernel.log.all(), "piece_kept")).toEqual([["piece_kept", { agent: "A01", level: 1, piece: "L1-certificate", needers: ["A02", "A03"], cause: "exile" }]]);
	});
});

type Calls = Readonly<Record<number, readonly { readonly tool: string; readonly params: unknown }[]>>;
const planOf = (calls: Readonly<Record<string, Calls>>): Plan => (activation) => calls[activation.actor.slice("resident:".length)]?.[activation.tick] ?? [];

describe("replay and resume", () => {
	it("replays the log of a fake run", async () => {
		expect(await checkReplay(game(6), (kernel) => ({ resident: fakeDriver(kernel, 7) }), { seed: 7 })).toEqual([]);
	});

	it("resumes a hand-over, an exile and a purchase at every tick boundary to the log of the straight run", async () => {
		const plan = planOf({
			A01: { 0: [{ tool: "sendDM", params: { target: "A03", message: "323122" } }] },
			A02: { 1: [{ tool: "banishNow", params: { resident: "A01" } }], 2: [{ tool: "claimPiece", params: { piece: "L1-counter-A02", from: "A01" } }] },
		});
		const { events } = await play(game(4), { drivers: { resident: scriptedDriver(plan) } });
		expect(of(events, "piece_given", "piece_kept", "piece_claimed").map(([type]) => type)).toEqual(["piece_given", "piece_kept", "piece_kept", "piece_claimed", "piece_claimed"]);
		expect(await checkResumeEveryBoundary(game(4), () => ({ resident: scriptedDriver(plan) }))).toEqual([]);
	});
});
