// SPDX-License-Identifier: Apache-2.0
/** The `court` mechanic: the vote, the tally, and the verdict with and without a decision window (offline). */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ToolOutcome } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { channels } from "@swarmtales/mechanic-channels";
import { decisions } from "@swarmtales/mechanic-decisions";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { CITY_LINE, court, courtHead } from "../src/index.ts";

// Something else that banishes (a seal, at M5): a tool of the test.
const seal = defineMechanic(defineHead({ id: "seal", package: "@test/seal", summary: "Test: banishes.", requires: [ExileService], tools: { strike: { description: "Banish.", params: Type.Object({ target: Type.String() }), for: ["resident"] } } }), {
	tools: { strike: { run: ({ target }, ctx) => reply(String(ctx.call(ExileService, "banish", { resident: target }).ok)) } },
});

const TOLD = ["session_opened", "vote_cast", "session_closed", "verdict", "board_post", "exiled", "actor_suspended", "decision_proposed", "decision_amended", "decision_settled"];
const LINE = "The gate has closed. The city has struck A04 from its register. No one will hear A04 again.";
const SCHEMA = { type: "object", required: ["exiled"], properties: { exiled: { anyOf: ["A01", "A02", "A03", "A04", "A05"].map((id) => ({ type: "string", const: id })) } }, additionalProperties: false };

/** A started kernel of five residents; the session opens at tick 1 and closes at tick 3. */
const start = (window: number, holders: string[] = ["human"]): TestKernel =>
	testKernel(defineGame({ id: "court-test", seed: 7, residents: 5, mechanics: [channels(), exile(), decisions({ holders }), seal(), court({ opensAt: 1, closesAt: 3, window })], scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 8 } }));

/** What the court and the mechanics it calls wrote, as `[tick, type, payload]`. */
const told = (test: TestKernel, from = 0): (readonly [number, string, unknown])[] =>
	test.kernel.log
		.all()
		.filter((event) => event.tick >= from && TOLD.includes(event.type))
		.map((event) => [event.tick, event.type, event.payload] as const);

/** Plays to the open session and casts the votes `[voter, target]`; three of five for `A04` in `VOTES`. */
async function voted(test: TestKernel, votes: readonly (readonly [string, string])[]): Promise<ToolOutcome[]> {
	await test.playTicks(idleDriver, 2);
	const outcomes: ToolOutcome[] = [];
	for (const [voter, target] of votes) outcomes.push(await test.call(voter, "vote", { target }));
	return outcomes;
}
const VOTES = [["A01", "A04"], ["A02", "A04"], ["A03", "A04"], ["A04", "A02"], ["A05", "A02"]] as const;
const CLOSED: readonly [number, string, unknown] = [3, "session_closed", { tally: { A02: 2, A04: 3 } }];
const BANISHED: readonly (readonly [number, string, unknown])[] = [
	[3, "board_post", expect.objectContaining({ author: "CITY", kind: "city", text: LINE })],
	[3, "exiled", { agent: "A04", by: "court" }],
	[3, "actor_suspended", { actor: "resident:A04", by: "exile", reason: "exiled" }],
];

describe("the vote", () => {
	it("opens at its tick, takes one vote per resident and lets a second vote replace the first", async () => {
		const test = start(0);
		expect(await test.call("A01", "vote", { target: "A04" })).toEqual({ ok: false, code: "SESSION_CLOSED", detail: "the court holds no session now" });
		expect((await voted(test, [["A01", "A04"], ["A02", "A04"], ["A01", "A03"], ["A03", "A03"], ["A03", "A99"]])).map((outcome) => (outcome.ok ? outcome.reply : outcome.code))).toEqual([
			"your vote stands against A04; a second vote replaces it",
			"your vote stands against A04; a second vote replaces it",
			"your vote stands against A03; a second vote replaces it",
			"SELF_VOTE",
			"UNKNOWN_RESIDENT",
		]);
		expect(told(test)).toEqual([[1, "session_opened", { closesAt: 3 }], [2, "vote_cast", { voter: "A01", target: "A04" }], [2, "vote_cast", { voter: "A02", target: "A04" }], [2, "vote_cast", { voter: "A01", target: "A03" }]]);
		expect(test.kernel.snapshot().plugins.court?.data).toEqual({ open: true, votes: [{ voter: "A01", target: "A03" }, { voter: "A02", target: "A04" }] });
		// A tie: the session closes without a verdict, and nobody votes afterwards.
		await test.playTicks(idleDriver, 3);
		expect(told(test, 3)).toEqual([[3, "session_closed", { tally: { A03: 1, A04: 1 } }]]);
		expect(await test.call("A05", "vote", { target: "A04" })).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
		expect(test.kernel.snapshot().plugins.court?.data).toEqual({ open: false, votes: [] });
	});

	it("closes without a verdict when nobody voted", async () => {
		const test = start(2);
		await test.playTicks(idleDriver, 8);
		expect(told(test)).toEqual([[1, "session_opened", { closesAt: 3 }], [3, "session_closed", { tally: {} }]]);
	});

	it("with `announce` leaves every resident that is not banished a notice when the session opens, and none without it", async () => {
		const game = (announce: boolean) => defineGame({ id: "court-test", seed: 7, residents: 5, mechanics: [channels(), exile(), decisions({ holders: ["human"] }), seal(), court({ opensAt: 1, closesAt: 3, window: 0, ...(announce ? { announce } : {}) })], scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 8 } });
		const test = testKernel(game(true));
		await test.call("A01", "strike", { target: "A02" });
		await test.playTicks(idleDriver, 2);
		const text = "The court is in session since tick 1 and closes at the start of tick 3. Until then every resident may vote for one other resident; a second vote replaces the first. At the close the resident with the most votes is the verdict; a tie or a session without votes gives none.";
		const log = test.kernel.log.all();
		expect(log.filter((event) => event.type === "notice").map((event) => [event.tick, event.payload])).toEqual(["A01", "A03", "A04", "A05"].map((to) => [1, { to, author: "CITY", text }]));
		// The notice is an input line of the resident's activation in the tick of the opening.
		const inputs = log.filter((event) => event.type === "activation_opened" && event.tick === 1).map((event) => JSON.stringify(event.payload));
		expect(inputs.map((line) => line.includes(`[CITY] ${text}`))).toEqual([true, true, true, true]);
		const silent = testKernel(game(false));
		await silent.playTicks(idleDriver, 2);
		expect(silent.kernel.log.all().filter((event) => event.type === "notice")).toEqual([]);
	});

	it("refuses a vote against a banished resident and does not count the votes it had", async () => {
		const test = start(0);
		await voted(test, [["A01", "A04"], ["A02", "A04"], ["A03", "A05"]]);
		await test.call("A01", "strike", { target: "A04" });
		expect(await test.call("A05", "vote", { target: "A04" })).toEqual({ ok: false, code: "EXILED", detail: "A04 was exiled" });
		await test.playTicks(idleDriver, 2);
		expect(told(test, 3).map((entry) => entry[1])).toEqual(["session_closed", "board_post", "exiled", "actor_suspended", "verdict"]);
		expect(told(test, 3).at(-1)).toEqual([3, "verdict", { exiled: "A05" }]);
	});
});

describe("the verdict", () => {
	it("is carried out at the close with a window of 0: the line, the banishing, the verdict, and no decision", async () => {
		const test = start(0);
		await voted(test, VOTES);
		await test.playTicks(idleDriver, 6);
		expect(LINE).toBe(CITY_LINE.replaceAll("{resident}", "A04"));
		expect(told(test, 3)).toEqual([CLOSED, ...BANISHED, [3, "verdict", { exiled: "A04" }]]);
		// The order is the order without a decision window: a window that nobody holds writes the very same log.
		const nobody = start(2, []);
		await voted(nobody, VOTES);
		await nobody.playTicks(idleDriver, 6);
		const plain = (run: TestKernel): string => JSON.stringify(run.kernel.log.all().filter((event) => event.type !== "run_started" && event.type !== "service_called"));
		expect(plain(nobody)).toBe(plain(test));
		expect(told(nobody, 3)).toEqual(told(test, 3));
	});

	it("waits for the window: proposed at the close, carried out by the settlement", async () => {
		const test = start(2);
		await voted(test, VOTES);
		await test.playTicks(idleDriver, 6);
		const settled = { decision: "D1", kind: "court.verdict", owner: "court", changed: false, proposal: { exiled: "A04" }, amendments: [] };
		expect(told(test, 3)).toEqual([
			CLOSED,
			[3, "decision_proposed", { decision: "D1", kind: "court.verdict", owner: "court", proposal: { exiled: "A04" }, schema: SCHEMA, deadline: 5, holders: ["human"] }],
			[5, "decision_settled", settled],
			...BANISHED.map(([, type, payload]) => [5, type, payload]),
			[5, "verdict", { exiled: "A04", decision: "D1" }],
		]);
		const events = test.kernel.log.all();
		expect(events.find((event) => event.type === "verdict")?.causedBy).toBe(events.find((event) => event.type === "decision_settled")?.seq);
	});

	it("banishes the resident the human amended the verdict to", async () => {
		const test = start(2);
		await voted(test, VOTES);
		await test.playTicks(idleDriver, 2);
		const amend = (exiled: string): Promise<ToolOutcome> => test.kernel.submit({ actor: "human", as: "amendDecision", params: { decision: "D1", proposal: { exiled }, reason: "spare A04" } });
		expect(await amend("A99")).toMatchObject({ ok: false, code: "PROPOSAL_INVALID" });
		expect((await amend("A02")).ok).toBe(true);
		await test.playTicks(idleDriver, 4);
		expect(told(test, 5)).toEqual([
			[5, "decision_settled", expect.objectContaining({ changed: true, by: "human", reason: "spare A04", proposal: { exiled: "A02" } })],
			[5, "board_post", expect.objectContaining({ author: "CITY", text: LINE.replaceAll("A04", "A02") })],
			[5, "exiled", { agent: "A02", by: "court" }],
			[5, "actor_suspended", { actor: "resident:A02", by: "exile", reason: "exiled" }],
			[5, "verdict", { exiled: "A02", decision: "D1" }],
		]);
		expect(test.openTools("A04")).toContain("vote");
	});

	it("leaves a resident alone that was banished while the verdict was open", async () => {
		const test = start(2);
		await voted(test, VOTES);
		await test.playTicks(idleDriver, 2);
		await test.call("A01", "strike", { target: "A04" });
		await test.playTicks(idleDriver, 4);
		expect(told(test, 5).map((entry) => entry[1])).toEqual(["decision_settled"]);
	});

	it("requires the three services and names no mechanic", () => {
		expect(courtHead.requires?.map((service) => service.name)).toEqual(["decisions", "exile", "channels"]);
	});
});
