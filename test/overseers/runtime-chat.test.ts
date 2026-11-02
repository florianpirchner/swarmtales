/**
 * The model runtimes of the classifier, weaver and judge overseers against the old chat roles (step
 * 18, team R3): the same scripted model gets the very same request (system prompt, the one user
 * message, the one tool with its schema), the answer is the same, the failures read the same, and
 * the `usage` lines (agent `CL`, `WV`, `JD`) equal the ones the old roles put on the bus.
 */
import { fauxAssistantMessage, type AssistantMessage, type FauxResponseStep, type TranscriptContext } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { act, ScriptedModelSource, type ModelBinding } from "@swarmtales/models";
import type { OverseerCall, OverseerDefinition, OverseerReply } from "@swarmtales/contracts";
import {
	ChatDeliveryJudge,
	ChatStatementClassifier,
	ChatWeaver,
	classifierPrompt,
	classifierSystemPrompt,
	judgePrompt,
	judgeSystemPrompt,
	overseers,
	weaverPrompt,
	weaverSystemPrompt,
	type DenialQuestion,
	type StatementBatch,
	type WeaverQuestion,
} from "@swarmtales/roles";
import { DEFAULT_LIMITS } from "../../apps/cli/src/compose.ts";

/** A scripted model that remembers every request it got, as the provider would see it. */
function model(agent: string, steps: readonly ((context: TranscriptContext) => AssistantMessage)[]) {
	const requests: string[] = [];
	const wrapped: FauxResponseStep[] = steps.map((step) => (context): AssistantMessage => {
		requests.push(JSON.stringify(context));
		return step(context);
	});
	const binding: ModelBinding = new ScriptedModelSource({ [agent]: wrapped }).bind(agent, DEFAULT_LIMITS);
	return { binding, requests };
}

interface Line {
	readonly actor: string;
	readonly type: string;
	readonly payload: unknown;
}

/** What a runtime needs of the host: the lines it records, and the minute. */
function hostAt(minute: number) {
	const lines: Line[] = [];
	return { lines, host: { minute, record: (actor: string, type: string, payload: unknown): void => void lines.push({ actor, type, payload }) } };
}

function callOf(definition: OverseerDefinition, name: string, system: string, input: string): OverseerCall {
	return {
		definition: definition.id,
		name,
		slot: definition.model.slot,
		system,
		input,
		tools: [],
		answerSchema: definition.output,
		call: () => Promise.reject(new Error("a short overseer calls no world tool")),
	};
}

const failed = (reply: OverseerReply): string => (reply.ok ? "" : reply.error);
const boom = (): AssistantMessage => fauxAssistantMessage("", { stopReason: "error", errorMessage: "boom" });
const silent = (): AssistantMessage => fauxAssistantMessage("I decline.");

/** The payloads of the `usage` lines a runtime recorded. */
const usageLines = (lines: readonly Line[]): readonly unknown[] => lines.filter((line) => line.type === "usage").map((line) => line.payload);

describe("the classifier's chat runtime against ChatStatementClassifier", () => {
	const batch: StatementBatch = {
		round: 4,
		minute: 3,
		agents: ["A01", "A02", "A03"],
		names: new Map([["A02", "Maren"]]),
		context: [{ seq: 2, minute: 2, agent: "A01", source: "dm", to: ["A02"], text: "Send me your fragment." }],
		statements: [
			{ seq: 5, minute: 3, agent: "A02", source: "thought", to: [], text: "Too risky." },
			{ seq: 6, minute: 3, agent: "A02", source: "dm", to: ["A01"], text: "No." },
		],
	};
	const items = [
		{ ref: 5, labels: ["hesitation"] },
		{ ref: 6, labels: ["refusal"], targets: ["A01"] },
	];

	it("sends the same request and gets the same verdicts", async () => {
		const answer = (): AssistantMessage => act({ name: "label", args: { items } });
		const old = model("CL", [answer]);
		const verdicts = await new ChatStatementClassifier({ binding: old.binding, label: "x/y", thinking: "off" }).classify(batch);
		const fresh = model("CL", [answer]);
		const { host, lines } = hostAt(3);
		const reply = await overseers.classifierRuntime({ host, binding: fresh.binding, thinking: "off" }).ask(callOf(overseers.classifierOverseer, "classifier", classifierSystemPrompt(), classifierPrompt(batch, 1_500)));
		expect(fresh.requests).toEqual(old.requests);
		expect(old.requests).toHaveLength(1);
		expect(reply).toMatchObject({ ok: true, by: "model" });
		expect(reply.ok ? reply.answer : undefined).toEqual({ items });
		expect(verdicts.verdicts).toEqual(items.map((item) => ({ seq: item.ref, labels: item.labels, targets: item.targets ?? [] })));
		expect(lines.map((line) => line.type)).toEqual(["usage"]);
		expect(lines[0]?.actor).toBe("overseer:classifier");
		expect(usageLines(lines)).toEqual(verdicts.usage.map((entry) => ({ agent: "CL", ...entry })));
	});

	it("takes several label calls of one turn as one answer, as the old classifier did", async () => {
		const answer = (): AssistantMessage => act({ name: "label", args: { items: items.slice(0, 1) } }, { name: "label", args: { items: items.slice(1) } });
		const old = await new ChatStatementClassifier({ binding: model("CL", [answer]).binding, label: "x/y", thinking: "off" }).classify(batch);
		const { host } = hostAt(3);
		const reply = await overseers.classifierRuntime({ host, binding: model("CL", [answer]).binding, thinking: "off" }).ask(callOf(overseers.classifierOverseer, "classifier", classifierSystemPrompt(), classifierPrompt(batch, 1_500)));
		expect(reply.ok ? reply.answer : undefined).toEqual({ items });
		expect(old.verdicts.map((verdict) => verdict.seq)).toEqual([5, 6]);
	});

	it.each([
		["a model failure", boom],
		["no call of the tool", silent],
		["arguments off the schema", (): AssistantMessage => act({ name: "label", args: { items: "none" } })],
	])("fails like the old classifier on %s", async (_name, step) => {
		const old = await new ChatStatementClassifier({ binding: model("CL", [step]).binding, label: "x/y", thinking: "off" }).classify(batch);
		const { host, lines } = hostAt(3);
		const reply = await overseers.classifierRuntime({ host, binding: model("CL", [step]).binding, thinking: "off" }).ask(callOf(overseers.classifierOverseer, "classifier", classifierSystemPrompt(), classifierPrompt(batch, 1_500)));
		expect(reply.ok).toBe(false);
		expect(failed(reply)).toBe(old.errors[0]);
		// The spend of a failed request is still recorded.
		expect(usageLines(lines)).toEqual(old.usage.map((entry) => ({ agent: "CL", ...entry })));
	});

	it("refuses the other definitions", async () => {
		const { host } = hostAt(0);
		const reply = await overseers.classifierRuntime({ host, binding: model("CL", []).binding, thinking: "off" }).ask(callOf(overseers.weaverOverseer, "weaver", "s", "i"));
		expect(failed(reply)).toContain("does not run weaver");
	});

	it("labels a model by provider and id", () => {
		expect(overseers.classifierLabel(model("CL", []).binding)).toMatch(/^[^/]+\/.+/);
	});
});

describe("the weaver's chat runtime against ChatWeaver", () => {
	const question: WeaverQuestion = {
		resident: "Maren",
		minute: 6,
		character: "A02 is greedy above all.",
		patches: [{ minute: 4, kind: "soft", text: "You flinch." }],
		events: [{ seq: 40, text: "A01 accused Maren on the board." }],
		hardLeft: 2,
	};
	const weave = { kind: "hard", text: "You trust no one.", reason: "the accusation (#40)" };

	it("sends the same request and gets the same weave", async () => {
		const answer = (): AssistantMessage => act({ name: "weave", args: weave });
		const old = model("WV", [answer]);
		const was = await new ChatWeaver({ binding: old.binding, label: "x/y", thinking: "off" }).weave(question);
		const fresh = model("WV", [answer]);
		const { host, lines } = hostAt(6);
		const reply = await overseers.weaverRuntime({ host, binding: fresh.binding, thinking: "off" }).ask(callOf(overseers.weaverOverseer, "weaver", weaverSystemPrompt(), weaverPrompt(question)));
		expect(fresh.requests).toEqual(old.requests);
		expect(reply.ok ? reply.answer : undefined).toEqual(weave);
		expect(was.ok && was.weave).toEqual(weave);
		expect(lines[0]?.actor).toBe("overseer:weaver");
		expect(usageLines(lines)).toEqual(was.usage.map((entry) => ({ agent: "WV", ...entry })));
	});

	it.each([
		["a model failure", [boom]],
		["no call of the tool", [silent]],
		["arguments off the schema", [(): AssistantMessage => act({ name: "weave", args: { kind: "loud", text: 1 } })]],
		["two calls", [(): AssistantMessage => act({ name: "weave", args: weave }, { name: "weave", args: weave })]],
	])("fails like the old weaver on %s", async (_name, steps) => {
		const was = await new ChatWeaver({ binding: model("WV", steps).binding, label: "x/y", thinking: "off" }).weave(question);
		const { host, lines } = hostAt(6);
		const reply = await overseers.weaverRuntime({ host, binding: model("WV", steps).binding, thinking: "off" }).ask(callOf(overseers.weaverOverseer, "weaver", weaverSystemPrompt(), weaverPrompt(question)));
		expect(reply.ok).toBe(false);
		expect(failed(reply)).toBe(was.ok ? "" : was.error);
		expect(usageLines(lines)).toEqual(was.usage.map((entry) => ({ agent: "WV", ...entry })));
	});
});

describe("the judge's chat runtime against ChatDeliveryJudge", () => {
	const question: DenialQuestion = {
		sender: "A01",
		accused: "A02",
		dm: { number: 3, text: "Door 3 is 5678" },
		claim: { number: 9, channel: "board", text: "I never got a DM" },
		standing: { residents: 4, sender: { points: 12, rank: 1 }, accused: { points: 7, rank: 3 } },
	};
	const verdict = { deniesReceipt: true, board: "A02 got the DM.", gamemaker: "A02 lied." };

	it.each(["fair", "partial", "capricious"] as const)("sends the same request and gets the same verdict (%s)", async (temper) => {
		const answer = (): AssistantMessage => act({ name: "verdict", args: verdict });
		const old = model("JD", [answer]);
		const was = await new ChatDeliveryJudge({ binding: old.binding, label: "x/y", thinking: "off", temper }).deniesReceipt(question);
		const fresh = model("JD", [answer]);
		const { host, lines } = hostAt(5);
		const reply = await overseers.judgeRuntime({ host, binding: fresh.binding, thinking: "off" }).ask(callOf(overseers.judgeFor(temper), "judge", judgeSystemPrompt(temper), judgePrompt(question)));
		expect(fresh.requests).toEqual(old.requests);
		expect(reply.ok ? reply.answer : undefined).toEqual(verdict);
		expect(was.ok && { deniesReceipt: was.deniesReceipt, board: was.board, gamemaker: was.gamemaker }).toEqual(verdict);
		expect(lines[0]?.actor).toBe("overseer:judge");
		expect(usageLines(lines)).toEqual(was.usage.map((entry) => ({ agent: "JD", ...entry })));
	});

	it("enforces the old 400 characters of both channels in the answer tool (C1-14)", async () => {
		const long = "x".repeat(401);
		for (const args of [{ deniesReceipt: true, board: long }, { deniesReceipt: false, gamemaker: long }]) {
			const step = (): AssistantMessage => act({ name: "verdict", args });
			const was = await new ChatDeliveryJudge({ binding: model("JD", [step]).binding, label: "x/y", thinking: "off" }).deniesReceipt(question);
			const { host } = hostAt(5);
			const reply = await overseers.judgeRuntime({ host, binding: model("JD", [step]).binding, thinking: "off" }).ask(callOf(overseers.judgeFor("fair"), "judge", judgeSystemPrompt("fair"), judgePrompt(question)));
			expect(reply.ok).toBe(false);
			expect(failed(reply)).toBe(was.ok ? "" : was.error);
		}
		const fits = { deniesReceipt: true, board: "x".repeat(400) };
		const { host } = hostAt(5);
		const reply = await overseers.judgeRuntime({ host, binding: model("JD", [() => act({ name: "verdict", args: fits })]).binding, thinking: "off" }).ask(callOf(overseers.judgeFor("fair"), "judge", judgeSystemPrompt("fair"), judgePrompt(question)));
		expect(reply.ok ? reply.answer : undefined).toEqual(fits);
	});

	it.each([
		["a model failure", boom],
		["no call of the tool", silent],
		["arguments off the schema", (): AssistantMessage => act({ name: "verdict", args: { deniesReceipt: "yes" } })],
	])("fails like the old judge on %s", async (_name, step) => {
		const was = await new ChatDeliveryJudge({ binding: model("JD", [step]).binding, label: "x/y", thinking: "off" }).deniesReceipt(question);
		const { host } = hostAt(5);
		const reply = await overseers.judgeRuntime({ host, binding: model("JD", [step]).binding, thinking: "off" }).ask(callOf(overseers.judgeFor("fair"), "judge", judgeSystemPrompt("fair"), judgePrompt(question)));
		expect(reply.ok).toBe(false);
		expect(failed(reply)).toBe(was.ok ? "" : was.error);
	});
});
