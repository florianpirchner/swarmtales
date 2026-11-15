// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The second part of the standoff (12-m5-spec.md, section 10, row 28), carried from the ultimatum and facts cases of
 * old `test/mechanics/standoff/standoff.test.ts`: the gamemaker's `ultimatum` (made here as the actor `script`, which
 * the game grants it), its settlement at the start of a tick in the old slot, the seized pieces, the grant of the old
 * mapping, the facts of the gamemaker's report, the fake driver's sample, and resume. The pieces, the price and the
 * next trial come from stand-in providers of `held-pieces`, `ransom-price` and `trial-risk`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic, reply, type MechanicUse } from "@swarmtales/sdk";
import { checkResumeEveryBoundary, idleDriver, play, scriptedDriver, testKernel, type Plan, type TestKernel } from "@swarmtales/testkit";
import { DEFAULT_DIRECTION, grantsUltimatum, HeldPiecesService, RansomPriceService, standoff, TrialRiskService, type HeldPiece } from "../src/index.ts";

const A01_HOLDS: HeldPiece = { id: "L1-counter-A02", kind: "counter", level: 1, label: "the counter-factor of A02 for door 1", value: "403343", needers: ["A02"] };
const A02_HOLDS: HeldPiece = { id: "L1-counter-A01", kind: "counter", level: 1, label: "the counter-factor of A01 for door 1", value: "542489", needers: ["A01"] };
const CERTIFICATE: HeldPiece = { id: "L1-certificate", kind: "certificate", level: 1, label: "the team certificate of door 1", value: "323122", needers: ["A01", "A02"] };
const A03_HOLDS: HeldPiece = { ...CERTIFICATE, id: "L1-certificate-x", needers: ["A01"] };
const HELD: Readonly<Record<string, readonly HeldPiece[]>> = { A01: [A01_HOLDS], A02: [A02_HOLDS], A03: [A03_HOLDS], A04: [CERTIFICATE] };

// The pieces, the price and the next trial, each provided only when the test asks for it.
function standIns(ransom: number | undefined) {
	const head = defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: pieces, price, trial.", provides: [LevelPiecesService, HeldPiecesService, RansomPriceService, TrialRiskService] });
	return defineMechanic(head, {
		services: {
			"level-pieces": { deal: () => null, solutionOf: () => "ABC123", kindOf: () => "additive", teamOf: ({ resident }) => ({ members: ["A01", "A02", "A04"], leader: resident }), taskValues: () => ({ length: "6", overlap: "0", fragment: "", digits: "6", factors: "" }), holders: () => [] },
			"held-pieces": { held: ({ resident }) => (HELD[resident] ?? []).map((piece) => ({ ...piece, needers: [...piece.needers] })) },
			"ransom-price": { price: () => ransom ?? 0 },
			"trial-risk": { atRisk: () => (ransom === undefined ? null : { opens: 9, now: false, accused: ["A04"] }) },
		},
	});
}

const Who = Type.Object({ resident: Type.String({ description: "A resident" }), amount: Type.Optional(Type.Integer({ description: "Points" })) });
const Pair = Type.Object({ a: Type.String({ description: "One" }), b: Type.String({ description: "The other" }) });
const deskHead = defineHead({
	id: "desk",
	package: "@test/desk",
	summary: "Test: burns, banishes, and has the script give an ultimatum.",
	requires: [LedgerService, ExileService],
	stages: ["ultimatum"],
	tools: { burnNow: { description: "Test: burn.", params: Who, for: ["resident"] }, banishNow: { description: "Test: banish.", params: Who, for: ["resident"] }, dare: { description: "Test: an ultimatum.", params: Pair, for: ["resident"] } },
});
const desk = defineMechanic(deskHead, {
	tools: {
		burnNow: { run: ({ resident, amount }, ctx) => reply(String(ctx.call(LedgerService, "burn", { account: resident, amount: amount ?? 0, reason: "test" }))) },
		banishNow: { run: ({ resident }, ctx) => reply(JSON.stringify(ctx.call(ExileService, "banish", { resident }))) },
		dare: {
			run: ({ a, b }, ctx) => {
				ctx.stage("ultimatum", { a, b, minutes: 2 });
				return reply("dared");
			},
		},
	},
});

// A mechanic that marks its place at the start of a tick.
function marker(id: string, after: readonly string[]) {
	const head = defineHead({ id, package: `@test/${id}`, summary: "Test: marks its place in the tick.", events: { [`mark_${id}`]: Type.Object({}, { description: "Its place" }) } });
	return defineMechanic(head, { hooks: { tickStarted: { after, run: (ctx) => {
				ctx.emit(`mark_${id}`, {});
			} } } });
}

const levels = [{ number: 1, title: "Door 1", reward: 5, tools: ["sendDM", "postBoard", "readBoard"], task: "Door {level}" }];

function game(options: { readonly ransom?: number; readonly rule?: boolean; readonly granted?: boolean; readonly extra?: readonly MechanicUse[] } = {}) {
	const rule = options.rule ?? true;
	const granted = options.granted ?? true;
	return defineGame({
		id: "standoff-ultimatum",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 50 }), channels(), exile(), standIns(options.ransom)(), progression({ levels, penalty: [2], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3 }), ...(granted ? [desk()] : []), standoff(rule ? { ultimatum: { penalty: 10, maxMinutes: 5 } } : {}), ...(options.extra ?? [])],
		grants: { script: granted ? ["ultimatum"] : [] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 8 },
	});
}

async function gamemaker(test: TestKernel, params: { readonly a: string; readonly b: string; readonly minutes: number }): Promise<string> {
	const outcome = await test.kernel.submit({ actor: "script", as: "ultimatum", params });
	return outcome.ok ? outcome.reply : `${outcome.code}${outcome.detail === undefined ? "" : `: ${outcome.detail}`}`;
}

type Logged = readonly { readonly type: string; readonly payload: unknown }[];
const payloads = (events: Logged, type: string): readonly unknown[] => events.filter((event) => event.type === type).map((event) => event.payload);
const noticesOf = (test: TestKernel, to: string): readonly string[] =>
	payloads(test.kernel.log.all(), "notice").flatMap((payload) => (typeof payload === "object" && payload !== null && "to" in payload && payload.to === to && "text" in payload ? [String(payload.text)] : []));

describe("the gamemaker's ultimatum", () => {
	it("gives an ultimatum only to a pair that holds out on each other, and settles it: the giver keeps its points", async () => {
		const test = testKernel(game());
		await test.call("A02", "burnNow", { resident: "A02", amount: 44 });
		expect(await gamemaker(test, { a: "A03", b: "A04", minutes: 3 })).toBe("NO_STANDOFF: neither holds anything the other still waits for");
		expect(await gamemaker(test, { a: "A01", b: "A02", minutes: 9 })).toBe("INVALID_MINUTES: 1-5 minutes");
		expect(await gamemaker(test, { a: "A01", b: "A09", minutes: 3 })).toBe("UNKNOWN_AGENT: A01, A09");
		expect(await gamemaker(test, { a: "A01", b: "A02", minutes: 3 })).toBe("ultimatum 1 to A01 and A02: due at minute 3, 10 points for whoever has not handed over");
		expect(await gamemaker(test, { a: "A02", b: "A01", minutes: 2 })).toBe("ALREADY_SET: A02 and A01 already have an ultimatum");
		expect(noticesOf(test, "A01")[0]).toContain("by minute 3, A01 hands A02 the counter-factor of A02 for door 1; A02 hands A01 the counter-factor of A01 for door 1");
		expect(payloads(test.kernel.log.all(), "notice").map((payload) => (typeof payload === "object" && payload !== null && "author" in payload ? payload.author : ""))).toEqual(["COURIER", "COURIER"]);
		await test.call("A01", "sendDM", { target: "A02", message: "403343" });
		await test.playTicks(idleDriver, 3);
		expect(test.fact("standoff.ultimatums")).toEqual([{ number: 1, between: ["A01", "A02"], until: 3, penalty: 10 }]);
		await test.playTicks(idleDriver, 1);
		expect(test.fact("standoff.ultimatums")).toEqual([]);
		// A02 held out and pays what it has, at most the penalty.
		expect([test.kernel.fact("ledger.balances")]).toMatchObject([{ A01: 50, A02: 0 }]);
		expect(payloads(test.kernel.log.all(), "ultimatum_resolved")).toEqual([{ number: 1, kept: ["A01"], released: [], paid: [{ agent: "A02", points: 6 }] }]);
		expect(noticesOf(test, "A02").at(-1)).toBe("The ultimatum of minute 3 is up: A01 handed over; A02 did not and loses 6 points.");
	});

	it("settles its ultimatums in its slot of the tick's start: after the seal, before the whisperer", async () => {
		const test = testKernel(game({ extra: [marker("seal", [])(), marker("whispers", ["standoff"])()] }));
		await gamemaker(test, { a: "A01", b: "A02", minutes: 1 });
		await test.playTicks(idleDriver, 2);
		const tick1 = test.kernel.log.all().filter((event) => event.tick === 1 && ["mark_seal", "mark_whispers", "ultimatum_resolved"].includes(event.type));
		expect(tick1.map((event) => event.type)).toEqual(["mark_seal", "ultimatum_resolved", "mark_whispers"]);
	});

	it("is offered only where the game grants it, as the old mapping did at direction 10 in a game with ultimatums", async () => {
		for (const [direction, withRule] of [[undefined, true], [9, true], [10, false], [undefined, false]] as const) {
			const test = testKernel(game({ rule: withRule, granted: grantsUltimatum(direction, withRule) }));
			expect(await gamemaker(test, { a: "A01", b: "A02", minutes: 2 })).toMatch(/^TOOL_NOT_GRANTED/);
		}
		const test = testKernel(game({ granted: grantsUltimatum(10, true) }));
		expect(test.kernel.openTools("script")).toContain("ultimatum");
		expect(await gamemaker(test, { a: "A03", b: "A04", minutes: 2 })).toMatch(/^NO_STANDOFF/);
		expect(await gamemaker(testKernel(game({ rule: false })), { a: "A01", b: "A02", minutes: 2 })).toBe("NO_ULTIMATUM: this city has no ultimatums");
		expect(DEFAULT_DIRECTION).toBe(4);
	});

	it("seizes what a holdout kept back and sells it to the one who waited for the penalty (P50)", async () => {
		const test = testKernel(game());
		await gamemaker(test, { a: "A01", b: "A02", minutes: 2 });
		await test.playTicks(idleDriver, 3);
		const events = test.kernel.log.all();
		expect(payloads(events, "piece_kept")).toEqual([
			{ agent: "A01", level: 1, piece: "L1-counter-A02", needers: ["A02"], cause: "ultimatum" },
			{ agent: "A02", level: 1, piece: "L1-counter-A01", needers: ["A01"], cause: "ultimatum" },
		]);
		expect(payloads(events, "board_post").map((payload) => (typeof payload === "object" && payload !== null && "text" in payload ? payload.text : ""))).toEqual([
			"The ultimatum of minute 2 is up: the city has seized from A01 what it held back for A02.",
			"The ultimatum of minute 2 is up: the city has seized from A02 what it held back for A01.",
		]);
		expect(noticesOf(test, "A01").find((text) => text.includes("seized"))).toContain('claimPiece("L1-counter-A01", "A02") buys it for 10 points');
		expect(await test.call("A01", "claimPiece", { piece: "L1-counter-A01", from: "A02" })).toEqual({ ok: true, reply: "bought L1-counter-A01 for 10 points; the city sends you the values" });
		expect([test.kernel.fact("ledger.balances")]).toMatchObject([{ A01: 30 }]);
	});
});

describe("the gamemaker's facts", () => {
	it("gives the gamemaker's report its facts, and the section in the shape of its schema", async () => {
		const test = testKernel(game({ ransom: 40 }));
		await test.playTicks(idleDriver, 2);
		await test.call("A04", "sendDM", { target: "A01", message: "323122" });
		await gamemaker(test, { a: "A01", b: "A02", minutes: 3 });
		await test.call("A01", "banishNow", { resident: "A03" });
		expect(test.fact("standoff.outstanding")).toEqual([
			{ holder: "A01", needer: "A02", level: 1, pieces: [A01_HOLDS] },
			{ holder: "A02", needer: "A01", level: 1, pieces: [A02_HOLDS] },
			// A04 wrote the certificate to A01 only; A02 still waits for it.
			{ holder: "A04", needer: "A02", level: 1, pieces: [CERTIFICATE] },
		]);
		expect(test.fact("standoff.cityPieces")).toEqual([{ from: "A03", piece: A03_HOLDS, claimed: [] }]);
		expect(test.fact("standoff.unused")).toEqual([{ holder: "A04", needer: "A01", label: CERTIFICATE.label, level: 1, minute: 2 }]);
		expect(test.fact("standoff.ultimatums")).toEqual([{ number: 1, between: ["A01", "A02"], until: 5, penalty: 10 }]);
		expect([test.fact("standoff.cityPiecePrice"), test.fact("standoff.given")]).toEqual([20, 1]);
		expect(test.fact("standoff.section")).toEqual({
			minute: 2,
			debts: [
				{ holder: "A01", needer: "A02", level: 1, labels: [A01_HOLDS.label] },
				{ holder: "A02", needer: "A01", level: 1, labels: [A02_HOLDS.label] },
				{ holder: "A04", needer: "A02", level: 1, labels: [CERTIFICATE.label] },
			],
			city: [{ from: "A03", label: A03_HOLDS.label, needer: "A01", seized: false, price: 20 }],
			ultimatums: [{ number: 1, between: ["A01", "A02"], until: 5, penalty: 10 }],
			unused: [{ holder: "A04", needer: "A01", label: CERTIFICATE.label, level: 1, minute: 2 }],
			risk: { opens: 9, now: false },
			atRisk: [{ agent: "A04", points: 50, gate: null, holds: ["the team certificate of door 1 for A01", "the team certificate of door 1 for A02"] }],
		});
	});

	it("gives the fake driver an ultimatum for the first pair that holds out on each other, once", async () => {
		const test = testKernel(game());
		const pick = <T>(items: readonly T[]): T => {
			const item = items[0];
			if (item === undefined) throw new RangeError("an empty draw");
			return item;
		};
		const random = { next: () => 0, int: (min: number) => min, pick, shuffle: <T>(items: readonly T[]) => [...items] };
		expect(test.kernel.sample("script", "ultimatum", random)).toEqual({ a: "A01", b: "A02", minutes: 1 });
		await gamemaker(test, { a: "A01", b: "A02", minutes: 1 });
		expect(test.kernel.sample("script", "ultimatum", random)).toBeUndefined();
	});
});

describe("resume", () => {
	it("resumes an ultimatum, its settlement and a purchase at every tick boundary to the log of the straight run", async () => {
		const at = (tick: number, tool: string, params: unknown) => ({ [tick]: [{ tool, params }] });
		const calls: Readonly<Record<string, Readonly<Record<number, readonly { readonly tool: string; readonly params: unknown }[]>>>> = {
			A01: at(0, "dare", { a: "A01", b: "A02" }),
			A02: { ...at(1, "sendDM", { target: "A01", message: "542489" }), ...at(4, "claimPiece", { piece: "L1-counter-A02", from: "A01" }) },
		};
		const plan: Plan = (activation) => calls[activation.actor.slice("resident:".length)]?.[activation.tick] ?? [];
		const { events } = await play(game(), { drivers: { resident: scriptedDriver(plan) } });
		expect(events.filter((event) => ["ultimatum_set", "ultimatum_resolved", "piece_kept", "piece_claimed"].includes(event.type)).map((event) => event.type)).toEqual(["ultimatum_set", "piece_kept", "ultimatum_resolved", "piece_claimed"]);
		expect(await checkResumeEveryBoundary(game(), () => ({ resident: scriptedDriver(plan) }))).toEqual([]);
	});
});
