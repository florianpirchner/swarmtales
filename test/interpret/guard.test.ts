import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS } from "../../src/cli/compose.ts";
import { ChatGuardJudge, guardPrompt, type GuardQuestion } from "../../src/interpret/guard.ts";
import { act } from "../../src/model/scripted.ts";
import { ScriptedModelSource } from "../../src/model/source.ts";

const QUESTION: GuardQuestion = { agent: "A01", tool: "transferPoints", rule: "No fragments.", text: "for the gate", secrets: [{ label: "your fragment of door 1", value: "AB3K" }] };

function judgeWith(responses: ReturnType<typeof act>[]): ChatGuardJudge {
	return new ChatGuardJudge({ binding: new ScriptedModelSource({ GD: responses }).bind("GD", DEFAULT_LIMITS), label: "scripted/guard", thinking: "off" });
}

describe("the guard's judge", () => {
	it("answers through its verdict tool, and names memos and group names to the model", async () => {
		const answer = await judgeWith([act({ name: "verdict", args: { allowed: false, reason: "it carries a fragment" } })]).judge(QUESTION);
		expect(answer).toMatchObject({ ok: true, allowed: false, reason: "it carries a fragment" });
		expect(answer.usage).toHaveLength(1);
		expect(guardPrompt(QUESTION)).toContain("the memo of a points transfer");
		expect(guardPrompt({ ...QUESTION, tool: "createGroup" })).toContain("the name of a new group");
	});

	it("fails without throwing, and keeps the usage of a failed call", async () => {
		const failed = await judgeWith([fauxAssistantMessage("", { stopReason: "error", errorMessage: "overloaded" })]).judge(QUESTION);
		expect(failed).toMatchObject({ ok: false });
		expect(failed.usage).toHaveLength(1);
		const binding = new ScriptedModelSource({ GD: [] }).bind("GD", DEFAULT_LIMITS);
		const throwing = new ChatGuardJudge({
			binding: {
				...binding,
				streamFn: () => {
					throw new Error("connection reset");
				},
			},
			label: "scripted/guard",
			thinking: "off",
		});
		await expect(throwing.judge(QUESTION)).resolves.toMatchObject({ ok: false });
	});
});
