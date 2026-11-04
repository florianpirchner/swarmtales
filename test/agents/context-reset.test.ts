/**
 * The context reset (docs/design/context-reset.md): a turn note of kind `context-reset` makes the
 * resident runner drop the conversation before the turn's inputs enter it. Scripted model, offline.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ToolSpec, Turn, TurnNote } from "@swarmtales/contracts";
import { ScriptedModelSource, say } from "@swarmtales/models";
import { CONTEXT_RESET_KIND, HostResidentRunner, toolsNotice } from "@swarmtales/roles";
import { RESIDENT_LIMITS } from "../../apps/cli/src/host/residents.ts";

const SPECS: readonly ToolSpec[] = [{ name: "getStatus", description: "Your status.", parameters: Type.Object({}) }];
const OPEN = ["getStatus"];

function turn(minute: number, inputs: readonly TurnNote[]): Turn {
	return { resident: "A01", minute, pass: 1, block: 1, inputs, tools: SPECS, ready: Promise.resolve(), call: () => Promise.resolve({ ok: true, reply: "ok" }), record: () => Promise.resolve() };
}

const plain = (text: string): TurnNote => ({ source: "test", text });
const reset = (text: string): TurnNote => ({ source: "test", kind: CONTEXT_RESET_KIND, text });

function runnerOf(answers: number): { readonly runner: HostResidentRunner; readonly events: { readonly type: string; readonly payload: unknown }[] } {
	const events: { readonly type: string; readonly payload: unknown }[] = [];
	const runner = new HostResidentRunner({
		id: "A01",
		systemPrompt: "You play.",
		tools: SPECS,
		binding: new ScriptedModelSource({ A01: Array.from({ length: answers }, () => say("ok")) }).bind("A01", RESIDENT_LIMITS),
		thinking: "off",
		record: (type, payload) => {
			events.push({ type, payload });
		},
		openTools: () => OPEN,
	});
	return { runner, events };
}

function userTexts(runner: HostResidentRunner): readonly string[] {
	return runner.snapshot().flatMap((message) => (message.role === "user" && typeof message.content === "string" ? [message.content] : []));
}

describe("context reset", () => {
	it("makes no request for a turn without input (P76: the context ends with the resident's own answer)", async () => {
		const { runner, events } = runnerOf(2);
		await runner.step(turn(0, [plain("game 1, move 1")]), []);
		const before = events.filter((event) => event.type === "request").length;
		await runner.step(turn(1, []), []);
		expect(events.filter((event) => event.type === "request").length).toBe(before);
		expect(runner.snapshot().at(-1)?.role).toBe("assistant");
	});

	it("keeps appending without a reset line", async () => {
		const { runner } = runnerOf(2);
		await runner.step(turn(0, [plain("game 1, move 1")]), []);
		await runner.step(turn(1, [plain("game 1, move 2")]), []);
		expect(userTexts(runner)).toEqual(["game 1, move 1", toolsNotice(OPEN), "game 1, move 2"]);
		expect(runner.contextResets).toBe(0);
	});

	it("drops the conversation and replaces it by the briefing, announcing the open tools again", async () => {
		const { runner, events } = runnerOf(3);
		await runner.step(turn(0, [plain("game 1, move 1")]), []);
		await runner.step(turn(1, [plain("game 1, move 2")]), []);
		const before = runner.contextSize;
		await runner.step(turn(2, [reset("Briefing for game 2."), plain("Your move.")]), []);
		expect(runner.contextResets).toBe(1);
		expect(runner.contextSize).toBeLessThan(before);
		const texts = userTexts(runner);
		expect(texts).toEqual(["Briefing for game 2.", "Your move.", toolsNotice(OPEN)]);
		expect(texts.join("\n")).not.toContain("game 1");
		expect(runner.systemPrompt).toBe("You play.");
		// The log still shows what the resident was told on the reset turn.
		const last = events.filter((event) => event.type === "turn_input").at(-1);
		expect(last?.payload).toMatchObject({ inputs: ["Briefing for game 2.", "Your move.", toolsNotice(OPEN)] });
	});

	it("is reflected in a snapshot, and a fresh runner continues from the reset context", async () => {
		const { runner } = runnerOf(3);
		await runner.step(turn(0, [plain("old")]), []);
		await runner.step(turn(1, [reset("Fresh briefing.")]), []);
		const saved = runner.snapshot();
		expect(JSON.stringify(saved)).not.toContain("old");
		const { runner: resumed } = runnerOf(1);
		resumed.restore(saved);
		await resumed.step(turn(2, [plain("next")]), []);
		expect(userTexts(resumed)).toEqual(["Fresh briefing.", toolsNotice(OPEN), "next"]);
	});
});
