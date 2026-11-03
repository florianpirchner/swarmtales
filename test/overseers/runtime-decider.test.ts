/**
 * The decider runtime of the classifier overseer against the old DeciderStatementClassifier (step
 * 18, team R3, C1-7): the same batches, the same fake structured model, so the same requests (state
 * and one yes/no question per label), the same labels above the threshold, the same targets and the
 * same `usage` lines. The batches come from the real overseer (its call text); the runtime reads the
 * statements back from the host log. A request that failed fails the whole call.
 */
import { createModels, createProvider, envApiKeyAuth, type ClassifierContext, type ClassifierModel, type ClassifierResult } from "@earendil-works/pi-ai";
import { Type, type Static } from "typebox";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isStatementSource } from "@swarmtales/legacy-log";
import type { Statement } from "@swarmtales/roles";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";
import { DeciderStatementClassifier, Interpreter, overseers, type Classification, type StatementBatch, type StatementClassifier } from "@swarmtales/roles";
import type { OverseerRuntime } from "@swarmtales/contracts";
import { scriptedOverseer } from "@swarmtales/testkit";
import { displayName, legacyInputs, newHost, oldBus, playInputs, type Input, type NewSpec } from "./harness.ts";

const MODEL: ClassifierModel<"fake-decider"> = {
	type: "classifier",
	id: "decider",
	name: "Fake decider",
	api: "fake-decider",
	provider: "fake",
	baseUrl: "http://localhost",
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 10_000,
};

/** A fake decider: the probabilities by the statement's text, `error` for a request that fails. */
function fakeDecider() {
	const seen: ClassifierContext[] = [];
	const models = createModels();
	models.setProvider(
		createProvider({
			id: "fake",
			auth: { apiKey: envApiKeyAuth("fake key", ["ARENA_FAKE_DECIDER_KEY"]) },
			models: [MODEL],
			classifiers: {
				"fake-decider": {
					classify: (model, context): Promise<ClassifierResult> => {
						seen.push(context);
						const base = { api: model.api, provider: model.provider, model: model.id, timestamp: 0, usage: { input: 11, output: 3, cacheRead: 0, cacheWrite: 0, totalTokens: 14, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.001 } } };
						const text = typeof context.state.text === "string" ? context.state.text : "";
						if (text === "boom") return Promise.resolve({ ...base, answers: {}, stopReason: "error", errorMessage: "boom" });
						const probabilities: Record<string, number> = text === "No." ? { refusal: 0.9, lie: 0.2 } : text === "deal" ? { offer: 0.5, promise: 0.49 } : { hesitation: 0.7 };
						const answers: ClassifierResult["answers"] = {};
						for (const [label, probability] of Object.entries(probabilities)) answers[label] = { type: "bool", probability };
						return Promise.resolve({ ...base, answers, stopReason: "stop" });
					},
				},
			},
		}),
	);
	return { models, seen };
}

const at = (minute: number, type: string, fields: Record<string, unknown>): Input => ({ minute, type, fields });
const dm = (minute: number, from: string, to: string, message: string): Input => at(minute, "dm_sent", { from, to, text: message, number: minute });

const SCRIPT: readonly Input[] = [
	at(0, "thinking", { agent: "A02", text: "Too risky." }),
	dm(0, "A01", "A02", "Send me your fragment."),
	dm(0, "A02", "A01", "No."),
	at(0, "board_post", { postSeq: 1, author: "A01", text: "The city waits.", kind: "player" }),
	at(1, "thinking", { agent: "A01", text: "I doubt it." }),
	dm(1, "A01", "A02", "deal"),
	at(1, "group_post", { group: "G1", author: "A03", postSeq: 2, text: "Let us meet." }),
	at(1, "thinking", { agent: "A02", text: "Too risky." }),
];

const FAILING: readonly Input[] = [...SCRIPT, at(1, "board_post", { postSeq: 3, author: "A04", text: "boom", kind: "player" })];

function spec(inputs: readonly Input[], runtime: OverseerRuntime = scriptedOverseer({ classifier: () => ({ answer: { items: [] } }) })): NewSpec {
	return { inputs, minutes: 2, residents: 4, overseers: [overseers.classifierOverseer.as("classifier", { label: "fake/decider" })], names: true, appEvents: overseers.USAGE_APP_EVENTS, runtime };
}

const WireStatement = Type.Object({ seq: Type.Number(), minute: Type.Number(), agent: Type.String(), source: Type.String(), to: Type.Array(Type.String()), group: Type.Optional(Type.String()), text: Type.String() });
const WireBatches = Type.Array(Type.Object({ round: Type.Number(), minute: Type.Number(), agents: Type.Array(Type.String()), names: Type.Array(Type.Tuple([Type.String(), Type.String()])), statements: Type.Array(WireStatement), context: Type.Array(WireStatement) }));

function statementOf(wire: Static<typeof WireStatement>): Statement {
	if (!isStatementSource(wire.source)) throw new Error(`unknown statement source ${wire.source}`);
	return { seq: wire.seq, minute: wire.minute, agent: wire.agent, source: wire.source, to: wire.to, text: wire.text, ...(wire.group === undefined ? {} : { group: wire.group }) };
}

/** The old interpreter's batches, stored as plain data (the names as pairs). */
function batchesOf(wire: Static<typeof WireBatches>): StatementBatch[] {
	return wire.map((batch) => ({ round: batch.round, minute: batch.minute, agents: batch.agents, ...(batch.names.length === 0 ? {} : { names: new Map(batch.names) }), statements: batch.statements.map(statementOf), context: batch.context.map(statementOf) }));
}

/** The new side's calls, and the old side's batches of the same events. */
async function played(inputs: readonly Input[]) {
	const scripted = scriptedOverseer({ classifier: () => ({ answer: { items: [] } }) });
	const newSpec = spec(inputs, scripted);
	const host = newHost(newSpec);
	host.start();
	const seqs: number[] = [];
	await playInputs(host, newSpec, 0, 2, seqs);
	const calls = scripted.asked.map((entry) => entry.call);

	const playOldBatches = async (): Promise<unknown> => {
	const side = oldBus();
	const batches: StatementBatch[] = [];
	const classifier: StatementClassifier = {
		label: "fake/decider",
		classify(batch): Promise<Classification> {
			batches.push(batch);
			return Promise.resolve({ verdicts: [], usage: [], errors: [] });
		},
	};
	const interpreter = new Interpreter({ classifier, bus: side.bus, competitors: ["A01", "A02", "A03", "A04"], minute: () => side.minute, nameOf: (agent) => (agent === "A02" ? displayName(agent) : undefined) });
	const events = legacyInputs(newSpec, seqs);
	for (let minute = 0; minute < 2; minute++) {
		side.minute = minute;
		for (const [index, input] of inputs.entries()) {
			const event = events[index];
			if (input.minute === minute && event !== undefined) interpreter.record(event);
		}
		await interpreter.afterRound(minute + 1);
	}
	return batches.map((batch) => ({ ...batch, names: [...(batch.names ?? [])] }));
	};
	const batches = batchesOf(await oldRunAsync({ inputs, seqs }, WireBatches, playOldBatches));
	return { host, calls, batches };
}

const sorted = (contexts: readonly ClassifierContext[]): readonly string[] => contexts.map((context) => JSON.stringify(context)).sort();

describe("the decider runtime against the old decider classifier", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("asks the same questions and answers with the same labels and targets", async () => {
		vi.stubEnv("ARENA_FAKE_DECIDER_KEY", "test");
		const { host, calls, batches } = await played(SCRIPT);
		expect(calls).toHaveLength(batches.length);
		expect(batches.length).toBe(2);
		const old = fakeDecider();
		const fresh = fakeDecider();
		const lines: { type: string; payload: unknown }[] = [];
		const runtime = overseers.deciderRuntime({ host: { record: (_actor, type, payload) => void lines.push({ type, payload }), minute: 1, log: host.log, residents: host.residents }, models: fresh.models, model: MODEL });
		for (const [index, batch] of batches.entries()) {
			const was = await new DeciderStatementClassifier({ models: old.models, model: MODEL, label: "fake/decider" }).classify(batch);
			const call = calls[index];
			if (call === undefined) throw new Error("no call");
			lines.length = 0;
			const reply = await runtime.ask(call);
			expect(reply.ok).toBe(true);
			expect(reply.ok ? reply.answer : undefined).toEqual({ items: was.verdicts.map((verdict) => ({ ref: verdict.seq, labels: verdict.labels, targets: verdict.targets })) });
			expect(lines.map((line) => line.payload)).toEqual(was.usage.map((entry) => ({ agent: "CL", ...entry })));
			expect(was.verdicts.length).toBeGreaterThan(0);
		}
		// The very same requests: the state of every statement and the questions.
		expect(sorted(fresh.seen)).toEqual(sorted(old.seen));
		expect(old.seen.length).toBe(8);
		// The statement with a recipient shows its conversation, the thought its speaker's own thoughts.
		const deal = fresh.seen.find((context) => context.state.text === "deal");
		expect(deal?.state.earlierMessagesOfThisConversation).toEqual(["A01: Send me your fragment.", "A02: No."]);
		// A probability under the threshold counts as no.
		expect(Object.keys(deal?.questions ?? {})).toHaveLength(9);
	});

	it("fails the whole call when any request failed (the round is tried again), with the old failure text", async () => {
		vi.stubEnv("ARENA_FAKE_DECIDER_KEY", "test");
		const { host, calls, batches } = await played(FAILING);
		const old = fakeDecider();
		const fresh = fakeDecider();
		const lines: { type: string; payload: unknown }[] = [];
		const runtime = overseers.deciderRuntime({ host: { record: (_actor, type, payload) => void lines.push({ type, payload }), minute: 1, log: host.log, residents: host.residents }, models: fresh.models, model: MODEL });
		const last = batches.at(-1);
		const call = calls.at(-1);
		if (last === undefined || call === undefined) throw new Error("no batch");
		const was = await new DeciderStatementClassifier({ models: old.models, model: MODEL, label: "fake/decider" }).classify(last);
		expect(was.errors).toHaveLength(1);
		const reply = await runtime.ask(call);
		expect(reply).toMatchObject({ ok: false, error: was.errors.join("; ") });
		// What was spent is recorded all the same.
		expect(lines).toHaveLength(was.usage.length);
		expect(reply.costUsd).toBeCloseTo(was.usage.reduce((total, entry) => total + entry.costUsd, 0), 10);
	});

	it("refuses a call without a statements heading and the other definitions", async () => {
		const { host } = await played(SCRIPT);
		const runtime = overseers.deciderRuntime({ host: { record: () => undefined, minute: 1, log: host.log, residents: host.residents }, models: fakeDecider().models, model: MODEL });
		const base = { name: "classifier", slot: "classifier", system: "", tools: [], answerSchema: overseers.classifierOverseer.output, call: () => Promise.reject(new Error("no")) };
		expect(await runtime.ask({ ...base, definition: "classifier", input: "nothing here" })).toMatchObject({ ok: false });
		expect(await runtime.ask({ ...base, definition: "weaver", input: "x" })).toMatchObject({ ok: false });
	});
});
