// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The ledger listens to `exile.exiled`: the burn entry in the old shape (old `onExiled`: the whole balance, reason
 * `exiled <id>`, nothing for a balance of 0), and the test of `after:`: a test mechanic in the place of `puzzles`
 * listens to the same event with `after: ["ledger"]` and runs after the ledger wherever the game lists it.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineEvents, defineGame, defineHead, defineMechanic, refuse, reply, type Game } from "@swarmtales/sdk";
import { testKernel, type TestKernel } from "@swarmtales/testkit";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { SYSTEM_ACCOUNT } from "../src/contract.ts";
import { ledger } from "../src/index.ts";
import { total } from "./support.ts";

// The stand-in of a court: a tool that banishes.
const judge = defineMechanic(
	defineHead({
		id: "judge",
		package: "@test/judge",
		summary: "Test: banishes through the exile service.",
		requires: [ExileService],
		tools: { strike: { description: "judge/strike", params: Type.Object({ target: Type.String({ description: "The resident to banish." }) }), for: ["resident"] } },
	}),
	{
		tools: {
			strike: {
				run: ({ target }, ctx) => {
					const done = ctx.call(ExileService, "banish", { resident: target });
					return done.ok ? reply("banished") : refuse(done.code ?? "REFUSED");
				},
			},
		},
	},
);

const PiecesEvents = defineEvents("pieces", { pieces_burned: Type.Object({ agent: Type.String({ description: "The banished resident." }) }, { description: "Test: the pieces of a banished resident are gone." }) });
const piecesHead = defineHead({ id: "pieces", package: "@test/pieces", summary: "Test: stands in the place of `puzzles`.", events: PiecesEvents.events });
// The stand-in of `puzzles`: it clears away after the ledger, or, without `after`, in load order.
const pieces = (after: boolean) =>
	defineMechanic(piecesHead, {
		listeners: (kit) => [kit.listen(ExileEvents, "exiled", ({ agent }, ctx) => { ctx.emit("pieces_burned", { agent }); }, after ? { after: ["ledger"] } : {})],
	})();

type Order = "before" | "after";
function game(order: Order, after = true): Game {
	const book = ledger({ startPoints: 10 });
	const rest = [exile(), judge()];
	return defineGame({ id: "ledger-exile-test", seed: 7, residents: ["A01", "A02", "A03", "A04"], mechanics: order === "before" ? [pieces(after), ...rest, book] : [book, ...rest, pieces(after)], end: { ticks: 10 } });
}
const start = (order: Order, after = true): TestKernel => testKernel(game(order, after), { prompts: { render: (_owner, id) => id } });

// What the exile, the kernel's suspension and the two listeners wrote from the event `exiled` on, as `[type, payload]`.
const WATCHED = ["exiled", "actor_suspended", "ledger_entry", "pieces_burned"];
function sinceExile(test: TestKernel): readonly (readonly [string, unknown])[] {
	const events = test.kernel.log.all();
	return events.slice(events.findIndex((event) => event.type === "exiled")).filter((event) => WATCHED.includes(event.type)).map((event) => [event.type, event.payload]);
}

const burn = ["ledger_entry", { txId: "TX6", debit: "A04", credit: SYSTEM_ACCOUNT, amount: 15, reason: "exiled A04" }] as const;
const exiled = ["exiled", { agent: "A04", by: "judge" }] as const;
const suspended = ["actor_suspended", { actor: "resident:A04", by: "exile", reason: "exiled" }] as const;
const piecesBurned = ["pieces_burned", { agent: "A04" }] as const;

async function banished(test: TestKernel): Promise<TestKernel> {
	expect(await test.call("A01", "transferPoints", { target: "A04", amount: 5 })).toMatchObject({ ok: true });
	expect(await test.call("A01", "strike", { target: "A04" })).toMatchObject({ ok: true });
	return test;
}

describe("the ledger listens to exile.exiled", () => {
	it("burns the whole balance of the banished resident with the old entry", async () => {
		const test = await banished(start("after"));
		expect(SYSTEM_ACCOUNT).toBe("SYSTEM_MINT_BURN");
		expect(sinceExile(test)).toContainEqual(burn);
		expect(test.fact("ledger.balances")).toEqual({ A01: 5, A02: 10, A03: 10, A04: 0 });
		expect(test.fact("ledger.entries")).toBe(6);
		expect(total(test.kernel)).toBe(0);
		// The banished resident cannot be paid any more, and a second verdict burns nothing.
		expect(await test.call("A02", "transferPoints", { target: "A04", amount: 1 })).toMatchObject({ ok: false, code: "EXILED" });
		expect(await test.call("A02", "strike", { target: "A04" })).toMatchObject({ ok: false, code: "ALREADY_EXILED" });
		expect(test.fact("ledger.entries")).toBe(6);
	});

	it.each(["before", "after"] as const)("runs before a listener that declares after: [ledger], listed %s the ledger", async (order) => {
		const test = await banished(start(order));
		expect(sinceExile(test)).toEqual([exiled, suspended, burn, piecesBurned]);
	});

	it("runs in load order when the other listener declares no after", async () => {
		const types = async (order: Order) => sinceExile(await banished(start(order, false))).map(([type]) => type).filter((type) => type === "ledger_entry" || type === "pieces_burned");
		expect(await types("before")).toEqual(["pieces_burned", "ledger_entry"]);
		expect(await types("after")).toEqual(["ledger_entry", "pieces_burned"]);
	});

	it("writes nothing for a balance of 0", async () => {
		const test = start("after");
		expect(await test.call("A04", "transferPoints", { target: "A01", amount: 10 })).toMatchObject({ ok: true });
		expect(await test.call("A01", "strike", { target: "A04" })).toMatchObject({ ok: true });
		expect(sinceExile(test)).toEqual([exiled, suspended, piecesBurned]);
		expect(test.fact("ledger.entries")).toBe(5);
		expect(test.fact("ledger.balances")).toEqual({ A01: 20, A02: 10, A03: 10, A04: 0 });
		expect(total(test.kernel)).toBe(0);
	});
});
