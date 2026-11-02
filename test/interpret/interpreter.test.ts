import { fauxAssistantMessage, fauxThinking, fauxToolCall, type FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { MemorySink } from "@swarmtales/chronicle";
import { EventBus } from "@swarmtales/engine";
import {
	type Classification,
	classifierPrompt,
	CONTEXT_MESSAGES,
	Interpreter,
	MAX_BATCH_STATEMENTS,
	type StatementBatch,
	type StatementClassifier,
} from "@swarmtales/roles";
import { act, createFixture, say } from "../helpers/fixture.ts";

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
				A01: [
					fauxAssistantMessage([fauxThinking("I keep my fragment for now."), fauxToolCall("postBoard", { message: "A02, I will send you mine soon." })]),
					say(),
				],
				A02: [say("Fine."), say()],
			}),
			classifierScript: () => [
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
			classifierScript: () => [labeller([{ match: /A01 says to itself/, labels: ["hesitation"] }])],
		});
		await fixture.run();
		expect(fixture.events("interpretation").map((event) => [event.agent, event.source, event.labels])).toEqual([["A01", "aside", ["hesitation"]]]);
		const runEnd = fixture.events("run_end")[0]?.seq ?? 0;
		expect(fixture.events("interpretation_round")[0]?.seq).toBeLessThan(runEnd);
	});
});

class Recorder implements StatementClassifier {
	readonly label = "recorder";
	readonly batches: StatementBatch[] = [];

	classify(batch: StatementBatch): Promise<Classification> {
		this.batches.push(batch);
		return Promise.resolve({ verdicts: [], usage: [], errors: [] });
	}
}

describe("interpreter context", () => {
	it("hands earlier messages of a conversation along with its replies, as context only", async () => {
		let minute = 0;
		const sink = new MemorySink();
		const bus = new EventBus([sink], () => minute);
		const classifier = new Recorder();
		const interpreter = new Interpreter({ classifier, bus, competitors: ["A01", "A02", "A03"], minute: () => minute });
		bus.subscribe(interpreter);

		bus.emit({ type: "dm_sent", from: "A01", to: "A02", text: "Send me your fragment and I pay 5." });
		bus.emit({ type: "dm_sent", from: "A03", to: "A01", text: "Hi." });
		bus.emit({ type: "dm_sent", from: "COURIER", to: "A01", text: "The city watches." });
		await interpreter.afterRound(1);
		minute = 1;
		bus.emit({ type: "dm_sent", from: "A02", to: "A01", text: "No." });
		await interpreter.afterRound(2);
		await interpreter.afterRound(3);

		expect(classifier.batches).toHaveLength(2);
		expect(classifier.batches[0]?.statements.map((statement) => statement.text)).toEqual(["Send me your fragment and I pay 5.", "Hi."]);
		const second = classifier.batches[1];
		expect(second?.statements.map((statement) => statement.text)).toEqual(["No."]);
		expect(second?.context.map((statement) => statement.text)).toEqual(["Send me your fragment and I pay 5."]);
		const prompt = second === undefined ? "" : classifierPrompt(second, 200);
		expect(prompt.indexOf("context only")).toBeLessThan(prompt.indexOf("Statements of this round:"));
		expect(prompt).toContain('A02 DM to A01: "No."');
	});

	it("keeps only the last messages of a conversation", async () => {
		const bus = new EventBus([], () => 0);
		const classifier = new Recorder();
		const interpreter = new Interpreter({ classifier, bus, competitors: ["A01", "A02"], minute: () => 0 });
		bus.subscribe(interpreter);
		for (let index = 0; index < CONTEXT_MESSAGES + 2; index++) bus.emit({ type: "dm_sent", from: "A01", to: "A02", text: `m${index}` });
		await interpreter.afterRound(1);
		bus.emit({ type: "dm_sent", from: "A02", to: "A01", text: "reply" });
		await interpreter.afterRound(2);
		expect(classifier.batches[1]?.context.map((statement) => statement.text)).toEqual(["m2", "m3", "m4", "m5"]);
	});

	it("labels a large round in chunks, each with the context of its own conversations (v08, scale)", async () => {
		const sink = new MemorySink();
		const bus = new EventBus([sink], () => 0);
		const classifier = new Recorder();
		const interpreter = new Interpreter({ classifier, bus, competitors: ["A01", "A02", "A03"], minute: () => 0 });
		bus.subscribe(interpreter);
		bus.emit({ type: "dm_sent", from: "A02", to: "A03", text: "earlier" });
		await interpreter.afterRound(1);
		for (let index = 0; index < MAX_BATCH_STATEMENTS; index++) bus.emit({ type: "dm_sent", from: "A01", to: "A02", text: `m${index}` });
		bus.emit({ type: "dm_sent", from: "A03", to: "A02", text: "reply" });
		await interpreter.afterRound(2);
		expect(classifier.batches.map((batch) => batch.statements.length)).toEqual([1, MAX_BATCH_STATEMENTS, 1]);
		expect(classifier.batches[1]?.context).toEqual([]);
		expect(classifier.batches[2]?.context.map((statement) => statement.text)).toEqual(["earlier"]);
		expect(sink.ofType("interpretation_round").map((event) => event.statements)).toEqual([1, MAX_BATCH_STATEMENTS + 1]);
	});

	it("tells the classifier the names and maps targets given by name back to IDs (v08)", async () => {
		const sink = new MemorySink();
		const bus = new EventBus([sink], () => 0);
		const batches: StatementBatch[] = [];
		const classifier: StatementClassifier = {
			label: "names",
			classify: (batch) => {
				batches.push(batch);
				return Promise.resolve({ verdicts: [{ seq: batch.statements[0]?.seq ?? 0, labels: ["accusation"], targets: ["mira", "A03"] }], usage: [], errors: [] });
			},
		};
		const interpreter = new Interpreter({ classifier, bus, competitors: ["A01", "A02", "A03"], minute: () => 0, nameOf: (agent) => (agent === "A01" ? "Mira" : undefined) });
		bus.subscribe(interpreter);
		bus.emit({ type: "dm_sent", from: "A02", to: "A03", text: "Mira lied to us." });
		await interpreter.afterRound(1);
		expect(sink.ofType("interpretation")).toEqual([expect.objectContaining({ agent: "A02", labels: ["accusation"], targets: ["A01", "A03"] })]);
		const prompt = batches[0] === undefined ? "" : classifierPrompt(batches[0], 200);
		expect(prompt).toContain("Residents: A01 (called Mira), A02, A03.");
	});

	it("logs a classifier that throws and keeps going", async () => {
		const sink = new MemorySink();
		const bus = new EventBus([sink], () => 0);
		const classifier: StatementClassifier = { label: "broken", classify: () => Promise.reject(new Error("offline")) };
		const interpreter = new Interpreter({ classifier, bus, competitors: ["A01"], minute: () => 0 });
		bus.subscribe(interpreter);
		bus.emit({ type: "thinking", agent: "A01", text: "Hmm." });
		await interpreter.afterRound(1);
		expect(sink.ofType("interpretation_error")).toEqual([expect.objectContaining({ round: 1, message: "offline" })]);
	});

	it("labels a partial batch but marks the round classified only when it is clean", async () => {
		const sink = new MemorySink();
		const bus = new EventBus([sink], () => 0);
		const classifier: StatementClassifier = {
			label: "partial",
			classify: (batch) => Promise.resolve({ verdicts: [{ seq: batch.statements[0]?.seq ?? 0, labels: ["offer"], targets: [] }], usage: [], errors: ["#9: timeout"] }),
		};
		const interpreter = new Interpreter({ classifier, bus, competitors: ["A01", "A02"], minute: () => 0 });
		bus.subscribe(interpreter);
		bus.emit({ type: "dm_sent", from: "A01", to: "A02", text: "5 points for your piece?" });
		await interpreter.afterRound(1);
		expect(sink.ofType("interpretation").map((event) => event.labels)).toEqual([["offer"]]);
		expect(sink.ofType("interpretation_error")).toHaveLength(1);
		expect(sink.ofType("interpretation_round")).toEqual([]);
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
			classifierScript: () => [labeller([{ match: /A01 on the public board/, labels: ["lie", "promise"], targets: ["A02"] }]), say()],
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
		let spent = 0;
		const fixture = createFixture({
			story: { ...cityOfKeys, run: { ...cityOfKeys.run, budgetUsd: 0.5 } },
			agents: 2,
			minutes: 3,
			only: 1,
			budgetSpent: () => spent,
			script: () => ({ A01: [say("one"), say("two")], A02: [say("over"), say()] }),
			classifierScript: () => [say(), say(), say()],
			sinks: [{ record: (event) => { if (event.type === "usage") spent += 0.3; } }],
		});
		await fixture.run();
		expect(fixture.events("run_end")[0]?.reason).toMatch(/^budget exceeded/);
		expect(fixture.events("interpretation_error")).toEqual([]);
		expect(fixture.log.events.filter((event) => event.type === "usage" && event.agent === "CL")).toEqual([]);
	});
});
