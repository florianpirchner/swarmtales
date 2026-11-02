import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { AgentRunner, isSafeguardRefusal, LOST_INPUTS, rewriteProblem, type Souffleur } from "@swarmtales/roles";
import { DEFAULT_LIMITS } from "../../apps/cli/src/compose.ts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { EventBus } from "@swarmtales/engine";
import { say, ScriptedModelSource } from "@swarmtales/models";

const REFUSAL = "This request triggered cyber-related safeguards. To learn about the Cyber Verification Program ...";

function refused() {
	return fauxAssistantMessage("", { stopReason: "error", errorMessage: REFUSAL });
}

function fixture(responses: ReturnType<typeof say>[], souffleur?: Souffleur) {
	const events: RecordedEvent[] = [];
	const bus = new EventBus([{ record: (event) => events.push(event) }], () => 9);
	const runner = new AgentRunner({
		id: "A01",
		systemPrompt: "You play.",
		tools: [],
		binding: new ScriptedModelSource({ A01: responses }).bind("A01", DEFAULT_LIMITS),
		bus,
		thinking: "off",
		enabledTools: () => [],
		minute: () => 9,
		...(souffleur === undefined ? {} : { souffleur }),
	});
	const step = (...texts: string[]) => runner.step(texts.map((text) => ({ kind: "notice" as const, text })), { pass: 1, block: 1, turn: Promise.resolve() });
	const userTexts = () => runner.snapshot().flatMap((message) => (message.role === "user" && typeof message.content === "string" ? [message.content] : []));
	return { events, runner, step, userTexts };
}

const rewriting: Souffleur = {
	label: "test/rewrite",
	rewrite: (texts) => Promise.resolve({ ok: true, texts: texts.map((text) => `${text} (a game)`), usage: [] }),
};

describe("the souffleur (P44)", () => {
	it("recognises a refusal of the provider's safeguards", () => {
		expect(isSafeguardRefusal(REFUSAL)).toBe(true);
		expect(isSafeguardRefusal("timeout")).toBe(false);
		expect(isSafeguardRefusal(undefined)).toBe(false);
	});

	it("accepts a rewrite only with as many texts and every number of the original", () => {
		expect(rewriteProblem(["code 246877 for A03"], ["door number 246877 for A03"])).toBeUndefined();
		expect(rewriteProblem(["a", "b"], ["a"])).toMatch(/1 texts for 2/);
		expect(rewriteProblem(["send 246877 to A03"], ["send it to A03"])).toMatch(/lost the number 246877/);
	});

	it("tries a refused step again at once with its rewritten inputs, and the refused text leaves the context", async () => {
		const { events, step, userTexts } = fixture([refused(), say("I trade.")], rewriting);
		await step("Mercer, take 40 points from Maren.");
		const flow = events.map((event) => event.type).filter((type) => ["turn_input", "turn_error", "souffleur_rewrite"].includes(type));
		expect(flow).toEqual(["turn_input", "turn_error", "souffleur_rewrite", "turn_input"]);
		expect(events.find((event) => event.type === "souffleur_rewrite")).toMatchObject({ agent: "A01", inputs: ["Mercer, take 40 points from Maren. (a game)"] });
		expect(userTexts()).toEqual(["Mercer, take 40 points from Maren. (a game)"]);
	});

	it("sends a short note instead when the rewrite fails", async () => {
		const failing: Souffleur = { label: "test/fail", rewrite: () => Promise.resolve({ ok: false, error: "text 1 lost the number 7", usage: [] }) };
		const { events, step, userTexts } = fixture([refused(), say()], failing);
		await step("minute 7");
		expect(events.find((event) => event.type === "souffleur_rewrite")).toMatchObject({ inputs: [LOST_INPUTS], error: "text 1 lost the number 7" });
		expect(userTexts()).toEqual([LOST_INPUTS]);
	});

	it("without a souffleur still takes the refused step's inputs out of the context", async () => {
		const { events, step, userTexts } = fixture([refused(), say()]);
		await step("first");
		await step("second");
		expect(events.filter((event) => event.type === "turn_error")).toHaveLength(1);
		expect(userTexts()).toEqual(["second"]);
	});

	it("leaves other errors in the context", async () => {
		const { step, userTexts } = fixture([fauxAssistantMessage("", { stopReason: "error", errorMessage: "timeout" }), say()], rewriting);
		await step("first");
		expect(userTexts()).toEqual(["first"]);
	});
});
