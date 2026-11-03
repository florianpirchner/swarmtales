/**
 * The statement classifier on the host (step 18): a composed run with a scripted classifier
 * (`classifierScript`), and the classifier overseer's context and batches on a bare host
 * (test/overseers/harness.ts; the old `Interpreter` on the old event bus before).
 */
import { fauxAssistantMessage, fauxThinking, fauxToolCall, type FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import { text } from "@swarmtales/prompts";
import { CONTEXT_MESSAGES, MAX_BATCH_STATEMENTS, overseers } from "@swarmtales/roles";
import { scriptedOverseer, type OverseerScript } from "@swarmtales/testkit";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";
import { flat, playNew, type Input } from "../overseers/harness.ts";

/** Answers with labels for the statements whose prompt line matches. */
function labeller(rules: readonly { readonly match: RegExp; readonly labels: readonly string[]; readonly targets?: readonly string[] }[]): FauxResponseStep {
	return (context) => {
		const user = context.messages.find((message) => message.role === "user");
		const prompt = user !== undefined && typeof user.content === "string" ? user.content : "";
		const round = prompt.split("Statements of this round:")[1] ?? "";
		const items = rules.flatMap((rule) => {
			const line = round.split("\n").find((candidate) => rule.match.test(candidate));
			const ref = line === undefined ? undefined : Number(/^#(\d+)/.exec(line)?.[1]);
			return ref === undefined ? [] : [{ ref, labels: rule.labels, targets: rule.targets ?? [] }];
		});
		return act({ name: "label", args: { items: [...items, { ref: 99_999, labels: ["threat"] }] } });
	};
}

describe("statement classifier", () => {
	it("labels a round's statements and thoughts as separate interpretation events", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			level: 2,
			lastLevel: 3,
			script: () => ({
				A01: [fauxAssistantMessage([fauxThinking("I keep my fragment for now."), fauxToolCall("postBoard", { message: "A02, I will send you mine soon." })]), say()],
				A02: [say("Fine."), say()],
			}),
			classifierScript: [
				labeller([
					{ match: /A01 thinks/, labels: ["refusal", "bogus"], targets: ["A02", "A01", "A99"] },
					{ match: /A01 on the public board/, labels: ["promise"], targets: ["A02"] },
				]),
				say("No tool."),
			],
			gamemakerScript: () => [say("Watching.")],
		});
		await fixture.run();
		const thought = fixture.events("thinking")[0];
		const post = fixture.events("board_post").find((event) => event.author === "A01");
		expect(fixture.events("interpretation")).toEqual([
			expect.objectContaining({ ref: thought?.seq, agent: "A01", source: "thought", labels: ["refusal"], targets: ["A02"], classifier: "scripted/classifier" }),
			expect.objectContaining({ ref: post?.seq, agent: "A01", source: "board", labels: ["promise"], targets: ["A02"] }),
		]);
		// The original events stay as they were; labels come after them.
		for (const event of fixture.events("interpretation")) expect(event.seq).toBeGreaterThan(event.ref);
		expect(fixture.events("interpretation_round")).toEqual([expect.objectContaining({ round: 1, statements: 3, labeled: 2 })]);
		// The second round answers without the tool: logged, nothing labelled.
		expect(fixture.events("interpretation_error")).toEqual([expect.objectContaining({ round: 2, message: "the model answered without calling label" })]);
		expect(fixture.log.events.filter((event) => event.type === "usage" && event.agent === "CL")).toHaveLength(2);

		// The gamemaker reads the labels of the round, but never the thought itself.
		const report = fixture.events("gamemaker_turn")[0]?.input ?? "";
		expect(report).toContain("How residents came across (classifier labels of what they wrote):\n- A01: promise about A02 (board)");
		expect(report).toMatch(/Private reads [^\n]*\n- A01: refusal\n/);
		expect(report).not.toContain("keep my fragment");
		const roundEnd = fixture.events("round_end")[0]?.seq ?? 0;
		const turn = fixture.events("gamemaker_turn")[0]?.seq ?? 0;
		for (const event of fixture.events("interpretation")) expect(event.seq).toBeGreaterThan(roundEnd);
		for (const event of fixture.events("interpretation")) expect(event.seq).toBeLessThan(turn);
	});

	it("classifies the last round too, with no gamemaker look after it", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 1,
			script: () => ({ A01: [say("I am afraid of the penalty, so I wait.")], A02: [say()] }),
			classifierScript: [labeller([{ match: /A01 says to itself/, labels: ["hesitation"] }])],
		});
		await fixture.run();
		expect(fixture.events("interpretation").map((event) => [event.agent, event.source, event.labels])).toEqual([["A01", "aside", ["hesitation"]]]);
		const runEnd = fixture.events("run_end")[0]?.seq ?? 0;
		expect(fixture.events("interpretation_round")[0]?.seq).toBeLessThan(runEnd);
	});
});

const LABEL = "test/classifier";
const dm = (minute: number, from: string, to: string, message: string, number: number): Input => ({ minute, type: "dm_sent", fields: { from, to, text: message, number } });
const heading = (name: "statements" | "context"): string => text(name === "statements" ? "classifier/statements-heading" : "classifier/context-heading");
/** The statements part of a prompt (after its heading) and the context part (before it). */
const statementsOf = (prompt: string): string => prompt.split(heading("statements"))[1] ?? "";
const contextOf = (prompt: string): string => {
	const [before = ""] = prompt.split(heading("statements"));
	return before.includes(heading("context")) ? (before.split(heading("context"))[1] ?? "") : "";
};
const statementCount = (prompt: string): number => statementsOf(prompt).split("\n").filter((line) => /^#\d+ /.test(line)).length;

/** The classifier overseer on a bare host with the inputs, answering by `script` (empty labels by default). */
async function classify(inputs: readonly Input[], minutes: number, options: { readonly residents?: number; readonly names?: boolean; readonly script?: OverseerScript } = {}): Promise<{ readonly prompts: readonly string[]; readonly written: readonly Record<string, unknown>[]; readonly host: Host }> {
	const runtime = scriptedOverseer({ classifier: options.script ?? (() => ({ answer: { items: [] } })) });
	const played = await playNew({ inputs, minutes, residents: options.residents ?? 3, overseers: [overseers.classifierOverseer.as("classifier", { label: LABEL })], runtime, ...(options.names === undefined ? {} : { names: options.names }) });
	return { prompts: runtime.asked.map((entry) => entry.call.input), written: flat(played.events, "classifier"), host: played.host };
}

describe("the classifier's context (the old interpreter's)", () => {
	it("hands earlier messages of a conversation along with its replies, as context only", async () => {
		const { prompts } = await classify([dm(0, "A01", "A02", "Send me your fragment and I pay 5.", 1), dm(0, "A03", "A01", "Hi.", 2), dm(0, "COURIER", "A01", "The city watches.", 3), dm(1, "A02", "A01", "No.", 4)], 3);
		// Minute 2 has nothing to classify; the courier's DM is no resident's statement.
		expect(prompts).toHaveLength(2);
		const [first = "", second = ""] = prompts;
		expect(statementCount(first)).toBe(2);
		expect(statementsOf(first)).toContain("Send me your fragment and I pay 5.");
		expect(statementsOf(first)).toContain("Hi.");
		expect(first).not.toContain("The city watches.");
		expect(statementCount(second)).toBe(1);
		expect(statementsOf(second)).toContain('A02 DM to A01: "No."');
		expect(contextOf(second)).toContain("Send me your fragment and I pay 5.");
		expect(contextOf(second)).not.toContain("Hi.");
		expect(second.indexOf("context only")).toBeLessThan(second.indexOf(heading("statements")));
	});

	it("keeps only the last messages of a conversation", async () => {
		const earlier = Array.from({ length: CONTEXT_MESSAGES + 2 }, (_unused, index) => dm(0, "A01", "A02", `m${String(index)}`, index + 1));
		const { prompts } = await classify([...earlier, dm(1, "A02", "A01", "reply", 99)], 2, { residents: 2 });
		const context = contextOf(prompts[1] ?? "");
		expect(["m2", "m3", "m4", "m5"].map((message) => context.includes(`"${message}"`))).toEqual([true, true, true, true]);
		expect(["m0", "m1"].map((message) => context.includes(`"${message}"`))).toEqual([false, false]);
	});

	it("labels a large round in chunks, each with the context of its own conversations (v08, scale)", async () => {
		const round = Array.from({ length: MAX_BATCH_STATEMENTS }, (_unused, index) => dm(1, "A01", "A02", `m${String(index)}`, index + 2));
		const { prompts, written } = await classify([dm(0, "A02", "A03", "earlier", 1), ...round, dm(1, "A03", "A02", "reply", 999)], 2);
		expect(prompts.map(statementCount)).toEqual([1, MAX_BATCH_STATEMENTS, 1]);
		expect(contextOf(prompts[1] ?? "")).toBe("");
		expect(contextOf(prompts[2] ?? "")).toContain('"earlier"');
		expect(written.filter((event) => event.type === "interpretation_round").map((event) => event.statements)).toEqual([1, MAX_BATCH_STATEMENTS + 1]);
	});

	it("tells the classifier the names and maps targets given by name back to IDs (v08)", async () => {
		const script: OverseerScript = (call) => ({ answer: { items: [{ ref: Number(/^#(\d+) /m.exec(statementsOf(call.input).trim())?.[1] ?? 0), labels: ["accusation"], targets: ["maren", "A03"] }] } });
		const { prompts, written } = await classify([dm(0, "A01", "A03", "Maren lied to us.", 1)], 1, { names: true, script });
		expect(written.filter((event) => event.type === "interpretation")).toEqual([expect.objectContaining({ agent: "A01", labels: ["accusation"], targets: ["A02", "A03"] })]);
		expect(prompts[0]).toContain("Residents: A01, A02 (called Maren), A03.");
	});

	it("logs a classifier that fails and keeps going", async () => {
		const { written } = await classify([{ minute: 0, type: "thinking", fields: { agent: "A01", text: "Hmm." } }, { minute: 1, type: "thinking", fields: { agent: "A01", text: "Again." } }], 2, {
			script: (call) => (call.input.includes("Hmm.") ? { error: "offline" } : { answer: { items: [] } }),
		});
		expect(written.filter((event) => event.type === "interpretation_error")).toEqual([{ type: "interpretation_error", round: 1, message: "offline" }]);
		expect(written.filter((event) => event.type === "interpretation_round").map((event) => event.round)).toEqual([2]);
	});
});

describe("gamemaker report", () => {
	it("shows a lie as private and names nobody behind private labels", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			level: 2,
			lastLevel: 3,
			script: () => ({
				A01: [act({ name: "postBoard", args: { message: "A02, my piece is already on its way." } }), say()],
				A02: [say(), say()],
			}),
			classifierScript: [labeller([{ match: /A01 on the public board/, labels: ["lie", "promise"], targets: ["A02"] }]), say()],
			gamemakerScript: () => [say("Watching.")],
		});
		await fixture.run();
		const report = fixture.events("gamemaker_turn")[0]?.input ?? "";
		expect(report).toContain("- A01: promise about A02 (board)\n");
		expect(report).toMatch(/Private reads [^\n]*\n- A01: lie\n/);
	});
});

describe("budget", () => {
	it("skips the paid classifier call once the budget is spent", async () => {
		const cityOfKeys = (await import("../../stories/cityofkeys/story.ts")).default;
		// Each resident call costs 0.30 USD: the scripted provider reports no cost, so a sink books it as a second `usage` line (old `budgetSpent`).
		const charged: { host?: Host } = {};
		const fixture = createFixture({
			story: { ...cityOfKeys, run: { ...cityOfKeys.run, budgetUsd: 0.5 } },
			agents: 2,
			minutes: 3,
			only: 1,
			budget: true,
			script: () => ({ A01: [say("one"), say("two")], A02: [say("over"), say()] }),
			classifierScript: [say(), say(), say()],
			sinks: [
				{
					record: (event) => {
						if (event.type === "usage" && event.costUsd === 0 && event.agent.startsWith("A"))
							charged.host?.record(`resident:${event.agent}`, "usage", { agent: event.agent, provider: event.provider, model: event.model, input: event.input, output: event.output, cacheRead: event.cacheRead, cacheWrite: event.cacheWrite, costUsd: 0.3 });
					},
				},
			],
		});
		charged.host = fixture.host;
		await fixture.run();
		expect(fixture.events("run_end")[0]?.reason).toMatch(/^budget exceeded/);
		expect(fixture.events("interpretation_error")).toEqual([]);
		expect(fixture.log.events.filter((event) => event.type === "usage" && event.agent === "CL")).toEqual([]);
	});
});
