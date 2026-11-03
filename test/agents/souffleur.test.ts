import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { Turn } from "@swarmtales/contracts";
import { isSafeguardRefusal, HostResidentRunner, LOST_INPUTS, rewriteProblem, type Souffleur } from "@swarmtales/roles";
import { say, ScriptedModelSource } from "@swarmtales/models";
import { RESIDENT_LIMITS } from "../../apps/cli/src/host/residents.ts";

const REFUSAL = "This request triggered cyber-related safeguards. To learn about the Cyber Verification Program ...";

function refused() {
	return fauxAssistantMessage("", { stopReason: "error", errorMessage: REFUSAL });
}

interface Line {
	readonly type: string;
	readonly [field: string]: unknown;
}

function fixture(responses: ReturnType<typeof say>[], souffleur?: Souffleur) {
	const events: Line[] = [];
	const record = (type: string, payload: unknown): void => {
		events.push({ type, ...(typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {}) });
	};
	const runner = new HostResidentRunner({
		id: "A01",
		systemPrompt: "You play.",
		tools: [],
		binding: new ScriptedModelSource({ A01: responses }).bind("A01", RESIDENT_LIMITS),
		thinking: "off",
		record,
		openTools: () => [],
		...(souffleur === undefined ? {} : { souffleur }),
	});
	const step = (...texts: string[]) => {
		const turn: Turn = {
			resident: "A01",
			minute: 9,
			pass: 1,
			block: 1,
			inputs: texts.map((text) => ({ source: "test", text })),
			tools: [],
			ready: Promise.resolve(),
			call: () => Promise.reject(new Error("no tool is called here")),
			record: (type, payload) => {
				record(type, payload);
				return Promise.resolve();
			},
		};
		return runner.step(turn, []);
	};
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
