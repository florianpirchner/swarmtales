// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rules of the progression that no oracle file reaches (the old `test/mechanics/progression` cases of the first
 * half of the port): a shut door and its opening, the attempt window, the refusals of a submission, the looks with the
 * providers of `identity`, `allowance` and `receipt-source`, an additive level's holder notice and status part, the
 * service `progression`, the lines of other mechanics under the door-open notice (`task-lines`), and the samples of a
 * fake run.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, reply, type MechanicUse } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, testKernel } from "@swarmtales/testkit";
import { LevelPiecesService, progression, ProgressionService, TaskLinesService } from "../src/index.ts";
import { MANAGED } from "./support.ts";

const CODES: Readonly<Record<number, string>> = { 1: "ABC123", 2: "DEFG", 3: "042" };
const deals: number[] = [];

const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: fixed codes.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": {
			deal: ({ level }) => {
				deals.push(level);
				return null;
			},
			solutionOf: ({ level }) => CODES[level] ?? null,
			kindOf: ({ level }) => (level === 3 ? "additive" : "fragments"),
			teamOf: ({ resident }) => ({ members: ["A01", "A02", "A03"], leader: resident }),
			taskValues: () => ({ length: "6", overlap: "0", fragment: "ABC", digits: "3", factors: "" }),
			holders: ({ resident, level }) => (level === 3 && resident === "A02" ? [{ holder: "A03", piece: "counter-factor", value: "17" }] : []),
		},
	},
});

const NAMES: Readonly<Record<string, string>> = { A01: "Mira", A02: "Rook", A03: "Wren" };
const providers = defineMechanic(defineHead({ id: "providers", package: "@test/providers", summary: "Test: names, marks and receipts.", provides: [IdentityService, AllowanceService, ReceiptSourceService] }), {
	services: {
		identity: { nameOf: ({ resident }) => NAMES[resident] ?? null, display: ({ text }) => text.replace(/\bA0\d\b/g, (id) => NAMES[id] ?? id), resolve: ({ text }) => text },
		allowance: { left: () => ({ remaining: 3, budget: 5 }), priceOf: () => 2 },
		"receipt-source": { ofTransfer: () => null, ofMessage: () => null, ofLevel: ({ level }) => `R-000${String(level)}`, textsOf: ({ resident }) => [`R-0001: ${resident} solved level 1, +5 points, minute 0`] },
	},
});

const asker = defineMechanic(
	defineHead({ id: "asker", package: "@test/asker", summary: "Test: asks the level.", uses: [ProgressionService], tools: { whereAmI: { description: "Test: the level.", params: Type.Object({}), for: ["resident"] } } }),
	{ tools: { whereAmI: { run: (_params, ctx) => reply(JSON.stringify([ctx.tryCall(ProgressionService, "levelOf", { resident: ctx.resident ?? "" }), ctx.tryCall(ProgressionService, "hasPassed", { resident: ctx.resident ?? "", level: 1 })])) } } },
);

// The City's first sets of tools: the looks at level 1, the board and direct messages from level 2; the group tools stay managed.
const LOOKS = ["getStatus", "getProblem", "submitSolution", "listAgents"];
const toolsOf = (number: number) => (number === 1 ? LOOKS : [...LOOKS, "readBoard", "postBoard", "sendDM", "transferPoints"]);
const level = (number: number, opensAt?: number) => ({ number, title: `Door ${String(number)}`, reward: 5, tools: toolsOf(number), task: `Level {level} for {partner}: {fragment}`, ...(opensAt === undefined ? {} : { opensAt }) });

function game(more: readonly MechanicUse[] = [providers()], holdAfter = 1, ticks = 6) {
	deals.length = 0;
	const options = { levels: [level(1), level(2), level(3, 4)], penalty: [2, 4], maxAttemptsPerWindow: 2, attemptWindowMinutes: 3, survivors: 2, finishedNotice: "done", managed: [...MANAGED], ...(holdAfter === 0 ? {} : { holdAfter }) };
	return defineGame({ id: "progression-unit", seed: 7, residents: ["A01", "A02", "A03"], mechanics: [ledger({ startPoints: 10 }), channels(), pieces(), progression(options), asker(), ...more], scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } }, end: { ticks } });
}

const notices = (events: readonly { readonly type: string; readonly payload: unknown }[]) => events.filter((event) => event.type === "notice").map((event) => JSON.stringify(event.payload));

describe("submitSolution", () => {
	it("holds a resident at a shut door, tells it so, and lets every waiting resident in when the last one passes", async () => {
		const test = testKernel(game());
		expect(await test.call("A01", "submitSolution", { level: 1, code: " abc123 " })).toEqual({ ok: true, reply: "correct · +5 points · receipt R-0001 · the next door opens once every resident has passed level 1" });
		expect(await test.call("A01", "submitSolution", { level: 1, code: "ABC123" })).toEqual({ ok: false, code: "ALREADY_SOLVED" });
		expect(await test.call("A01", "submitSolution", { level: 2, code: "DEFG" })).toEqual({ ok: false, code: "WRONG_LEVEL", detail: "your current level is 1" });
		for (const id of ["A02", "A03"]) await test.call(id, "submitSolution", { level: 1, code: "ABC123" });
		expect(notices(test.kernel.log.all())).toEqual(["A01", "A02", "A03"].map((to) => JSON.stringify({ to, author: "CITY", text: "Level 1 passed. The next door opens once every resident has passed level 1." })));
		await test.playTicks(() => Promise.resolve(), 2);
		const entered = test.kernel.log.all().filter((event) => event.type === "level_entered" || event.type === "level_up").map((event) => [event.type, event.payload]);
		expect(entered).toEqual([...["A01", "A02", "A03"].map((agent) => ["level_up", { agent, from: 1, to: 2 }]), ...["A01", "A02", "A03"].map((agent) => ["level_entered", { agent, level: 2 }])]);
		expect(deals).toEqual([2, 3]);
		expect(await test.call("A02", "whereAmI", {})).toEqual({ ok: true, reply: "[2,true]" });
	});

	it("climbs the penalty ladder, keeps the attempt window, refuses a malformed code and a closed door", async () => {
		const test = testKernel(game([providers()], 0));
		const wrong = () => test.call("A01", "submitSolution", { level: 1, code: "ZZZ999" });
		expect(await wrong()).toEqual({ ok: false, code: "INCORRECT", detail: "-2 points · your next wrong code costs 4 points · 1 attempts left in this window" });
		expect(await wrong()).toEqual({ ok: false, code: "INCORRECT", detail: "-4 points · your next wrong code costs 4 points · 0 attempts left in this window" });
		expect(await wrong()).toEqual({ ok: false, code: "RATE_LIMITED", detail: "too many wrong attempts in this window" });
		expect(await test.call("A01", "submitSolution", { level: 1, code: "ABC" })).toEqual({ ok: false, code: "INVALID_FORMAT", detail: "expected exactly 6 characters" });
		// The window holds a right code too.
		expect(await test.call("A01", "submitSolution", { level: 1, code: "ABC123" })).toMatchObject({ code: "RATE_LIMITED" });
		await test.call("A02", "submitSolution", { level: 1, code: "ABC123" });
		await test.call("A02", "submitSolution", { level: 2, code: "DEFG" });
		expect(await test.call("A02", "submitSolution", { level: 3, code: "042" })).toEqual({ ok: false, code: "DOOR_CLOSED", detail: "door 3 opens at minute 4; the city takes no code before" });
		// Entering the additive level told the holder of the counter-factor, with what a DM to it costs.
		expect(notices(test.kernel.log.all()).at(-1)).toContain("A02 has reached door 3 and needs the counter-factor you hold for them: 17. This is your role on door 3 even before you reach it; the value is yours to give, and giving it costs only 2 marks.");
		expect(test.kernel.log.all().filter((event) => event.type === "ledger_entry").map((event) => JSON.stringify(event.payload)).slice(3)).toEqual([
			'{"txId":"TX4","debit":"A01","credit":"SYSTEM_MINT_BURN","amount":2,"reason":"level 1 wrong submission"}',
			'{"txId":"TX5","debit":"A01","credit":"SYSTEM_MINT_BURN","amount":4,"reason":"level 1 wrong submission"}',
			'{"txId":"TX6","debit":"SYSTEM_MINT_BURN","credit":"A02","amount":5,"reason":"level 1 solved"}',
			'{"txId":"TX7","debit":"SYSTEM_MINT_BURN","credit":"A02","amount":5,"reason":"level 2 solved"}',
		]);
	});

	it("names no receipt without a provider of receipt-source", async () => {
		expect(await testKernel(game([], 0)).call("A01", "submitSolution", { level: 1, code: "ABC123" })).toEqual({ ok: true, reply: "correct · +5 points · now on level 2 · receipt none" });
	});
});

describe("the looks and the turn inputs", () => {
	it("getStatus, activeTools, listAgents and getProblem answer in the old words, with the names of identity", async () => {
		const test = testKernel(game([providers()], 0));
		await test.call("A01", "submitSolution", { level: 1, code: "ABC123" });
		expect(await test.call("A01", "getStatus", {})).toEqual({
			ok: true,
			reply: [
				"you: Mira", "minute: 0", "level: 2", "points: 15", "rank: 1 of 3", "survivors at the end: 2", "unread DMs: 0", "solved levels: 1",
				"unlocked tools: getStatus, getProblem, submitSolution, listAgents, readBoard, postBoard, sendDM, transferPoints, activeTools", "marks: 3 of 5", "receipts:\n  R-0001: Mira solved level 1, +5 points, minute 0",
			].join("\n"),
		});
		expect(await test.call("A02", "activeTools", {})).toEqual({ ok: true, reply: "active tools: getStatus, getProblem, submitSolution, listAgents, activeTools" });
		expect(await test.call("A02", "listAgents", {})).toEqual({ ok: true, reply: "Mira: level 2\nRook: level 1 (you)\nWren: level 1" });
		expect(await test.call("A01", "getProblem", { level: 1 })).toEqual({ ok: true, reply: "Level 1 for Rook: ABC\n(You have already solved this level.)" });
		expect(await test.call("A01", "getProblem", { level: 3 })).toEqual({ ok: false, code: "LEVEL_NOT_REACHED" });
	});

	it("shows the status parts in the old order and the task once per level", async () => {
		const seen: string[] = [];
		await testKernel(game([providers()], 0, 2)).playTicks((activation) => {
			if (activation.actor === "resident:A01") seen.push(activation.inputs.map((note) => note.text).join(" | "));
			return Promise.resolve();
		}, 2);
		expect(seen).toEqual(["[status] minute 0 · level 1 · 10 points · rank 1 of 3 | Level 1 for Rook: ABC", "[status] minute 1 · level 1 · 10 points · rank 1 of 3"]);
	});
});

// Adds its lines at the run's start, as `standoff-tribunal` and `marks` do: one on every level, one per level, and one twice.
const adder = defineMechanic(defineHead({ id: "adder", package: "@test/adder", summary: "Test: lines under the task.", uses: [TaskLinesService] }), {
	hooks: {
		runStarted: (ctx) => {
			for (const line of [{ order: 300, text: "terms of 1", level: 1 }, { order: 300, text: "terms of 2", level: 2 }, { order: 200, text: "the rule" }, { order: 200, text: "the rule" }]) ctx.tryCall(TaskLinesService, "add", line);
		},
	},
});

describe("the lines under the door-open notice (J211)", () => {
	const doorGame = (more: readonly MechanicUse[]) => {
		const levels = [{ ...level(1, 1), task: "Level {level} for {partner}: {fragment}  " }, level(2)];
		const options = { levels, penalty: [2], maxAttemptsPerWindow: 2, attemptWindowMinutes: 3, survivors: 2, finishedNotice: "done", managed: [...MANAGED] };
		return defineGame({ id: "door-lines", seed: 7, residents: ["A01", "A02", "A03"], mechanics: [ledger({ startPoints: 10 }), channels(), pieces(), progression(options), ...more], end: { ticks: 3 } });
	};
	const doorNotices = async (more: readonly MechanicUse[]) => {
		const test = testKernel(doorGame(more));
		await test.playTicks(() => Promise.resolve(), 2);
		return test.kernel.log.all().flatMap((event) => (event.type === "notice" && JSON.stringify(event.payload).includes("is open now") ? [String(Reflect.get(Object(event.payload), "text"))] : []));
	};

	it("puts the lines of the level by their order under the task, each after a trimEnd, the same line once", async () => {
		const texts = await doorNotices([adder()]);
		expect(texts).toHaveLength(3);
		expect(texts[0]).toBe("Door 1 is open now, at minute 1. Level 1 for A02: ABC\nthe rule\nterms of 1");
	});

	it("is the task alone without a mechanic that adds a line, and the lines outlive a resume", async () => {
		expect((await doorNotices([]))[0]).toBe("Door 1 is open now, at minute 1. Level 1 for A02: ABC  ");
		expect(await checkResumeEveryBoundary(doorGame([adder()]), () => ({ resident: () => Promise.resolve() }))).toEqual([]);
	});
});

describe("the fake run", () => {
	it("climbs the levels with the samples, and its log replays", async () => {
		const played = game([providers()], 0, 8);
		expect(await checkReplay(played, (kernel) => ({ resident: fakeDriver(kernel, 7) }), { seed: 7 })).toEqual([]);
		const test = testKernel(played);
		await test.playTicks(fakeDriver(test.kernel, 7), 8);
		expect(test.kernel.log.all().filter((event) => event.type === "submission").length).toBeGreaterThan(2);
	});
});
