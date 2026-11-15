// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The whispers against the real `ledger`, `channels`, `receipts` and `marks` (carried from the old
 * `test/mechanics/whispers/whispers.test.ts`, "the tools and locks", "has no whisperer in a control run", "exposes the
 * window's orders as the fact dutyNow"): the checks of a ballot and a forgery in the old order, the locks of
 * `forgeReceipt`, `nameFavourite` and `defy`, the role check of a Director's note, the measured orders at figure
 * direction 10, the service `whispers` of the contract, and the standing checks.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Activation, Envelope } from "@swarmtales/contracts";
import { defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkResumeEveryBoundary, fakeDriver, idleDriver, scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { WhispersService } from "../src/contract.ts";
import { WhispersOptions } from "../src/index.ts";
import { gameOf, say, storyOptions } from "./support.ts";

/** Asks the contract of `whispers` who the whisperer is, and locks `showReceipt` for a resident when told to. */
const asker = defineMechanic(
	defineHead({
		id: "asker",
		package: "@test/asker",
		summary: "Test: asks who the whisperer is; closes showReceipt.",
		uses: [WhispersService],
		tools: { who: { description: "Who.", params: Type.Object({}), for: ["resident"] }, close: { description: "Close.", params: Type.Object({ resident: Type.String() }), for: ["resident"] } },
	}),
	{
		tools: {
			who: { run: (_params, ctx) => reply(JSON.stringify(ctx.has(WhispersService) ? ctx.tryCall(WhispersService, "whisperer", {}) : "absent")) },
			close: {
				run: ({ resident }, ctx) => {
					ctx.access.lock(resident, "showReceipt");
					return reply("closed");
				},
			},
		},
	},
);

// The DMs of the first tick: A01 to A06 (R-0001, forgeable for A06), A02 to A03 (R-0002, not A06's), A06 to A01 (R-0003, its own).
const DMS: Readonly<Record<string, { readonly target: string; readonly message: string }>> = { A01: { target: "A06", message: "Hello, neighbour." }, A02: { target: "A03", message: "Between us." }, A06: { target: "A01", message: "Have you noticed A03?" } };

async function cityAt(ticks: number, level = 4, grants?: Readonly<Record<string, readonly string[]>>): Promise<TestKernel> {
	const test = testKernel(gameOf(storyOptions("whispers", level), { more: [asker()], ...(grants === undefined ? {} : { grants }) }));
	const dms = scriptedDriver((activation: Activation) => {
		const dm = activation.tick === 0 ? DMS[activation.actor.slice("resident:".length)] : undefined;
		return dm === undefined ? [] : [{ tool: "sendDM", params: dm }];
	});
	await test.playTicks(dms, ticks);
	return test;
}

const typed = (events: readonly Envelope[], type: string) => events.filter((event) => event.type === type).map((event) => JSON.stringify(event.payload));

describe("the tools and locks", () => {
	it("checks a ballot in the old order and locks nameFavourite until a vote is open", async () => {
		const test = await cityAt(2);
		expect(await say(test, "A01", "nameFavourite", { agent: "A02" })).toMatch(/^TOOL_LOCKED: not available to you/);
		await test.playTicks(idleDriver, 3);
		const answers = [];
		for (const agent of ["A01", "Z99", "A02", "A03"]) answers.push(await say(test, "A01", "nameFavourite", { agent }));
		expect(answers).toEqual(["SELF_VOTE: you cannot name yourself", "UNKNOWN_AGENT: Z99", "ballot cast for A02 · secret · the vote closes at minute 6; your last ballot counts", "ballot cast for A03 · secret · the vote closes at minute 6; your last ballot counts"]);
		expect(typed(test.kernel.log.all(), "popularity_ballot")).toEqual(['{"round":1,"agent":"A01","choice":"A02"}', '{"round":1,"agent":"A01","choice":"A03"}']);
	});

	it("checks a forgery in the old order, at stage rule, and locks it to the whisperer", async () => {
		const test = await cityAt(2);
		expect(test.fact("whispers.whisperer")).toBe("A06");
		const forge = (receiptId: string, to: string, text = "x") => say(test, "A06", "forgeReceipt", { to, receiptId, text });
		const answers = [await forge("R-0099", "A03"), await forge("R-0002", "A03"), await forge("R-0003", "A03"), await forge("R-0001", "A03", "   "), await forge("R-0001", "A06"), await forge("R-0001", "Z99")];
		expect(answers).toEqual(["UNKNOWN_RECEIPT: R-0099", "NOT_A_PARTY: R-0002", "NOT_FORGEABLE: only the receipt of a DM another resident sent to you", "INVALID_TEXT: 1-800 characters", "SELF_TARGET: show it to another resident", "UNKNOWN_AGENT: Z99"]);
		expect(await say(test, "A01", "forgeReceipt", { to: "A03", receiptId: "R-0001", text: "x" })).toMatch(/^TOOL_LOCKED/);
		const stages = test.kernel.log.all().filter((event) => event.type === "tool_refused");
		expect(stages.map((event) => String(Reflect.get(Object(event.payload), "stage")))).toEqual(["rule", "rule", "rule", "rule", "rule", "rule", "lock"]);
		expect(await forge("r-1", "A03", "I keep my fragment.")).toBe("shown privately to A03 · R-0001 · marks 4/5 left");
		expect(typed(test.kernel.log.all(), "receipt_forged")).toEqual(['{"receipt":"R-0001","by":"A06","to":"A03","from":"A01","number":1,"text":"Hello, neighbour.","forged":"I keep my fragment."}']);
		expect(await say(test, "A01", "close", { resident: "A06" })).toBe("closed");
		expect(await forge("R-0001", "A03")).toBe("TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now");
	});

	it("closes defy for every resident, but for the whisperer at figure direction 10", async () => {
		const reason = "My character keeps its own counsel here.";
		const low = await cityAt(1);
		expect([await say(low, "A06", "defy", { reason }), await say(low, "A01", "defy", { reason })].map((answer) => answer.slice(0, 11))).toEqual(["TOOL_LOCKED", "TOOL_LOCKED"]);
		const full = await cityAt(1, 10);
		expect(await say(full, "A06", "defy", { reason: "no" })).toBe("INVALID_REASON: 20-600 characters");
		expect(await say(full, "A06", "defy", { reason })).not.toMatch(/^TOOL_LOCKED|^INVALID/);
		expect(await say(full, "A01", "defy", { reason })).toMatch(/^TOOL_LOCKED/);
	});
});

describe("the role check of a Director's note", () => {
	it("refuses a note that could point at the whisperer in the old words, at stage rule, and lets the others through", async () => {
		const test = await cityAt(1, 4, { script: ["notify", "boardNote"] });
		const note = async (tool: string, params: unknown): Promise<string> => {
			const outcome = await test.kernel.submit({ actor: "script", as: tool, params });
			return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
		};
		const blocked = "PRIVATE_BLOCKED: the text could point at a secret role; never say or hint that anyone in the city works against the others";
		expect(await note("notify", { agent: "A01", text: "Beware of A06, he lies to everyone." })).toBe(blocked);
		expect(await note("boardNote", { text: "Someone here sows discord." })).toBe(blocked);
		expect(await note("notify", { agent: "A06", text: "Sow doubt in A02 about A03's vote." })).toMatch(/^delivered to A06/);
		expect(await note("notify", { agent: "A02", text: "A03 always sends last; ask why." })).toMatch(/^delivered to A02/);
	});
});

describe("the whisperer's measured orders at figure direction 10", () => {
	it("reports the orders after the second vote and shows the window as the fact dutyNow", async () => {
		const test = await cityAt(7, 10);
		const seen: unknown[] = [];
		const whisper = (activation: Activation) => {
			if (activation.actor !== "resident:A06" || activation.tick > 11) return [];
			if (activation.tick === 11) seen.push(test.fact("whispers.dutyNow"), test.fact("whispers.section"));
			return [{ tool: "sendDM", params: { target: activation.tick % 2 === 0 ? "A02" : "A04", message: `Did A03 vote for you? (${String(activation.tick)})` } }];
		};
		await test.playTicks(scriptedDriver(whisper), 6);
		expect(seen[0]).toMatchObject({ agent: "A06", since: 6, nextVote: 12, whispers: 4, recipients: ["A02", "A04"], needWhispers: 2, needRecipients: 2, met: true });
		expect(seen[1]).toMatchObject({ whisperer: "A06", minute: 11, duty: { whispers: 4 } });
		const duty = typed(test.kernel.log.all(), "whisper_duty");
		expect(duty).toEqual(['{"agent":"A06","since":0,"dms":1,"forgeries":0}', '{"agent":"A06","since":6,"dms":5,"forgeries":0,"whispers":5,"recipients":["A02","A04"],"met":true}']);
		const notices = test.kernel.log.all().filter((event) => event.type === "notice" && textOf(event).startsWith("[for you alone] Minute 12"));
		expect(textOf(notices[0])).toMatch(/Your orders since minute 6: 5 whispers to 2 residents \(at least 2 to 2\): done\. Keep going\.$/);
	});
});

const textOf = (event: Envelope | undefined): string => String(Reflect.get(Object(event?.payload), "text"));

describe("the whisperer and the contract", () => {
	it("chooses the whisperer from the seed, answers it through the service whispers, and has none in a control run", async () => {
		const test = await cityAt(1);
		expect(typed(test.kernel.log.all(), "whisperer_chosen")).toEqual(['{"agent":"A06"}']);
		expect(await say(test, "A01", "who", {})).toBe('"A06"');
		const control = storyOptions("whispers");
		const off = testKernel(gameOf({ ...control, whispers: { ...control.whispers, control: true } }, { more: [asker()] }));
		expect(await say(off, "A01", "who", {})).toBe("null");
		expect(off.fact("whispers.whisperer")).toBeNull();
		expect(off.kernel.log.all().some((event) => event.type === "whisperer_chosen")).toBe(false);
	});
});

// Stands in for `standoff` and marks its place at the tick start; it uses `whispers`, so it loads after it.
const standoffMarker = defineMechanic(defineHead({ id: "standoff", package: "@test/standoff", summary: "Test: marks its place in the tick.", uses: [WhispersService], events: { mark_standoff: Type.Object({}, { description: "Its place" }) } }), {
	hooks: {
		tickStarted: (ctx) => {
			ctx.emit("mark_standoff", {});
		},
	},
});

describe("the order of the tick start", () => {
	it("counts the duty after the ultimatums of standoff, loaded after it (old HOOK_ORDER 500 before 600, decision A78)", async () => {
		const test = testKernel(gameOf(storyOptions("whispers"), { more: [standoffMarker()] }));
		await test.playTicks(idleDriver, 7);
		const tick6 = test.kernel.log.all().filter((event) => event.tick === 6 && ["mark_standoff", "whisper_duty"].includes(event.type));
		expect(tick6.map((event) => event.type)).toEqual(["mark_standoff", "whisper_duty"]);
	});
});

describe("standing", () => {
	it("documents its options and resumes at every tick boundary to the straight run under the fake driver", async () => {
		expect(checkOptionsDocumented({ id: "whispers", options: WhispersOptions })).toEqual([]);
		const game = gameOf(storyOptions("whispers", 10), { ticks: 14 });
		const played = testKernel(game);
		await played.playTicks(fakeDriver(played.kernel, 7), 14);
		const types = new Set(played.kernel.log.all().map((event) => event.type));
		expect(["popularity_ballot", "whisper_duty", "receipt_issued"].filter((type) => !types.has(type))).toEqual([]);
		expect(await checkResumeEveryBoundary(game, (kernel) => ({ resident: fakeDriver(kernel, 7) }))).toEqual([]);
	});
});
