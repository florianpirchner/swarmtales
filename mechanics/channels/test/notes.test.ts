// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The note desk of the Directors: `notify`, `boardNote` and the service `notes`. Ported from the gamemaker cases of
 * the old `differential.test.ts` (unknown reader, text checks, budgets, windows) and `channels.test.ts` (the numbered
 * notice), with the old answers written out. The first test of issue M5-60 (row 14 of `12-m5-spec.md`): the note
 * cases that break two checks, among them the checks of game facts that moved to their owners (a stand-in here).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineGame, defineHead, defineMechanic, refuse, reply, type MechanicUse } from "@swarmtales/sdk";
import { scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { NotesService } from "../src/contract.ts";
import { channels } from "../src/index.ts";
import { nearlySame } from "../src/notes.ts";
import { ChannelsSlice, loadState, newState, saveState, withoutNotes } from "../src/state.ts";
import { payloads } from "./support.ts";

// Stands in for `puzzles`: the secret check of a Director's note as a `rule` handler on the note tools by bare name.
const secrets = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: refuses a note with the password." }), {
	pipeline: {
		rule: (call) => {
			const text = Value.Check(Type.Object({ text: Type.String() }), call.params) ? call.params.text : "";
			return (call.tool === "notify" || call.tool === "boardNote") && text.includes("OPEN-SESAME") ? refuse("LEAK_BLOCKED", "the text contains a password piece; never write codes") : undefined;
		},
	},
});

// Stands in for `standoff-tribunal`: the lines of a tribunal through the service.
const tribunal = defineMechanic(
	defineHead({
		id: "tribunal",
		package: "@test/tribunal",
		summary: "Test: speaks the lines of a tribunal.",
		requires: [NotesService],
		tools: {
			line: { description: "A line.", params: Type.Object({ text: Type.String() }), for: ["script"] },
			exile: { description: "Suspends a resident.", params: Type.Object({ resident: Type.String() }), for: ["script"] },
		},
	}),
	{
		tools: {
			exile: {
				run: (params, ctx) => {
					ctx.residents.suspend(params.resident, "exiled");
					return reply("ok");
				},
			},
			line: {
				run: (params, ctx) => {
					const checked = ctx.call(NotesService, "check", { text: params.text, to: "board", as: "tribunal" });
					if (!checked.ok) return refuse(checked.code, checked.detail);
					ctx.call(NotesService, "record", { to: "tribunal", text: checked.text, number: 9, shown: "board" });
					return reply(JSON.stringify(ctx.call(NotesService, "budget", { to: "tribunal" })));
				},
			},
		},
	},
);

function game(extra: readonly MechanicUse[] = []) {
	return defineGame({
		id: "channels-notes",
		seed: 7,
		residents: 3,
		mechanics: [channels(), ...extra],
		grants: { script: ["notify", "boardNote", ...extra.flatMap((use) => (use.mechanic.id === "tribunal" ? ["line", "exile"] : []))] },
		scheduler: { id: "turns", options: { order: "roster" } },
		end: { ticks: 8 },
	});
}

// A Director's call (made as the actor `script`) and what it reads.
async function director(test: TestKernel, tool: string, params: unknown): Promise<string> {
	const outcome = await test.kernel.submit({ actor: "script", as: tool, params });
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

const stages = (test: TestKernel): readonly unknown[] => test.kernel.log.all().filter((event) => event.type === "tool_refused").map((event) => Value.Parse(Type.Object({ stage: Type.String(), code: Type.String() }), event.payload)).map(({ stage, code }) => ({ stage, code }));
const BUDGET_NOTES = "BUDGET: 1 note(s) per resident per 3 minutes";
const BUDGET_POSTS = "BUDGET: 1 board post(s) per 3 minutes";
const INVALID = "INVALID_TEXT: 1-400 characters";
const LEAK = "LEAK_BLOCKED: the text contains a password piece; never write codes";
const REPEATED = "REPEATED: you wrote nearly the same to A02 at minute 0; say something new or nothing";

describe("first test of M5-60: the note cases that break two checks", () => {
	it("answers the carried cases as the old desk did: a repeat before the budget, the length before the budget", async () => {
		const test = testKernel(game());
		expect(await director(test, "notify", { agent: "A02", text: "A02, the city keeps count of every point." })).toBe("delivered to A02 as #1");
		expect(await director(test, "boardNote", { text: "COURIER: the market opens." })).toBe("posted as #2");
		await test.playTicks(scriptedDriver(() => []), 1);
		// Both budgets are spent within the window; the old answers are the text checks.
		expect(await director(test, "notify", { agent: "A02", text: "A02, the city keeps count of every point!" })).toBe(REPEATED);
		expect(await director(test, "boardNote", { text: "   " })).toBe(INVALID);
		expect(stages(test)).toEqual([
			{ stage: "rule", code: "REPEATED" },
			{ stage: "rule", code: "INVALID_TEXT" },
		]);
	});

	it("keeps the old answer where a game fact and the budget, the length or the reader break, and registers the repeat", async () => {
		const test = testKernel(game([secrets()]));
		expect(await director(test, "notify", { agent: "A02", text: "A02, the door by the old well waits for you tonight." })).toBe("delivered to A02 as #1");
		// A secret with the budget spent: the secret, as before (the budget is checked last, in `execute`).
		expect(await director(test, "notify", { agent: "A02", text: "A02, try OPEN-SESAME." })).toBe(LEAK);
		// A secret in a long text, or to an unknown reader: the length and the reader, as before.
		expect(await director(test, "notify", { agent: "A03", text: `OPEN-SESAME ${"x".repeat(400)}` })).toBe(INVALID);
		expect(await director(test, "notify", { agent: "Z99", text: "OPEN-SESAME" })).toBe("UNKNOWN_AGENT: Z99");
		// Registered change (erratum of M5-60): a secret in a repeat. The old desk answered LEAK_BLOCKED (secret before
		// repeat); the repeat is the tool's own rule now and runs before the rules of the owners of game facts.
		await test.playTicks(scriptedDriver(() => []), 3);
		expect(await director(test, "notify", { agent: "A02", text: "A02, the door by the old well waits for you tonight. OPEN-SESAME" })).toBe(REPEATED);
		expect(await director(test, "boardNote", { text: "OPEN-SESAME" })).toBe(LEAK);
	});
});

describe("notify and boardNote", () => {
	it("answer the old gamemaker's calls: the reader, the text checks, the budgets and their windows", async () => {
		const test = testKernel(game());
		const answers = [
			await director(test, "notify", { agent: "A02", text: "A02, the city keeps count of every point." }),
			await director(test, "notify", { agent: "Z99", text: "to nobody" }),
			await director(test, "notify", { agent: "A02", text: "A02, again within the window." }),
			await director(test, "notify", { agent: "A03", text: "   " }),
			await director(test, "boardNote", { text: "COURIER: the market opens." }),
			await director(test, "boardNote", { text: "a second post in the window" }),
		];
		expect(answers).toEqual(["delivered to A02 as #1", "UNKNOWN_AGENT: Z99", BUDGET_NOTES, INVALID, "posted as #2", BUDGET_POSTS]);
		const seen: string[] = [];
		await test.playTicks(
			scriptedDriver((activation) => {
				seen.push(...activation.inputs.map((line) => `${activation.actor} ${line.text}`));
				return [];
			}),
			4,
		);
		expect(seen).toEqual(["resident:A02 [COURIER #1] A02, the city keeps count of every point."]);
		expect(await director(test, "notify", { agent: "A02", text: "A02, a later window brings a new note." })).toBe("delivered to A02 as #3");
		expect(await director(test, "boardNote", { text: "The wall stands." })).toBe("posted as #4");
		const log = test.kernel.log.all();
		expect(payloads(log, "notice")[0]).toEqual({ to: "A02", author: "COURIER", text: "A02, the city keeps count of every point.", number: 1 });
		expect(payloads(log, "board_post")[0]).toEqual({ postSeq: 2, author: "COURIER", text: "the market opens.", kind: "city" });
		expect(payloads(log, "gamemaker_note").map((note) => JSON.stringify(note))).toEqual([
			'{"to":"A02","author":"COURIER","text":"A02, the city keeps count of every point.","number":1}',
			'{"to":"board","author":"COURIER","text":"the market opens.","number":2}',
			'{"to":"A02","author":"COURIER","text":"A02, a later window brings a new note.","number":3}',
			'{"to":"board","author":"COURIER","text":"The wall stands.","number":4}',
		]);
	});

	it("refuses a note to an exiled resident in the old words", async () => {
		const test = testKernel(game([tribunal()]));
		expect(await director(test, "exile", { resident: "A03" })).toBe("ok");
		expect(await director(test, "notify", { agent: "A03", text: "hello" })).toBe("EXILED: A03 was exiled; nothing reaches them beyond the wall");
	});

	it("give the fake driver a note and a post while the budgets hold", () => {
		const test = testKernel(game());
		const pick = <T>(items: readonly T[]): T => {
			const item = items[0];
			if (item === undefined) throw new RangeError("an empty draw");
			return item;
		};
		const random = { next: () => 0, int: (_min: number, max: number) => max, pick, shuffle: <T>(items: readonly T[]) => [...items] };
		expect([test.kernel.sample("script", "notify", random), test.kernel.sample("script", "boardNote", random)]).toEqual([
			{ agent: "A01", text: "Note 1." },
			{ text: "Note 1." },
		]);
	});
});

describe("the service notes", () => {
	it("checks the lines of a tribunal as new while their numbers change, and counts them under their own reader", async () => {
		const test = testKernel(game([tribunal()]));
		expect(await director(test, "line", { text: "Vote 1 of 3: A02 stands accused." })).toBe('{"used":1,"limit":1}');
		expect(await director(test, "line", { text: "Vote 2 of 3: A02 stands accused." })).toBe('{"used":2,"limit":1}');
		expect(await director(test, "line", { text: "Vote 2 of 3: A02 stands accused!" })).toBe("REPEATED: you wrote nearly the same to tribunal at minute 0; say something new or nothing");
		expect(payloads(test.kernel.log.all(), "gamemaker_note")[0]).toEqual({ to: "board", author: "COURIER", text: "Vote 1 of 3: A02 stands accused.", number: 9 });
	});

	it("says two notes are the same above four in five shared words", () => {
		expect([nearlySame("a b c d e", "a b c d f"), nearlySame("a b c d e f", "a b c d e g"), nearlySame("", "")]).toEqual([false, true, true]);
	});
});

describe("the notes in the slice", () => {
	it("keeps the notes and a numbered notice, and reads a slice of version 3 as one without notes", () => {
		const state = newState(["A01"]);
		state.notes.push({ tick: 2, to: "board", text: "The wall stands." });
		state.inboxes.get("A01")?.notices.push({ author: "COURIER", text: "hello", number: 4 });
		const slice = saveState(state);
		expect(Value.Check(ChannelsSlice, slice)).toBe(true);
		expect(saveState(loadState(slice, ["A01"]))).toEqual(slice);
		expect(withoutNotes({ messages: 3 })).toEqual({ messages: 3, notes: [] });
	});
});
