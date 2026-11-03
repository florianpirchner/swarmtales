/**
 * The classifier as an overseer against the old interpreter (docs/design/overseer-api.md §1.5, step 18
 * wave C1): the same events (with the same `seq`), the same scripted answers, so the same prompts
 * (system and per batch), the same `interpretation`, `interpretation_round` and `interpretation_error`
 * events, in the same order. The new side is a real host with the overseer and a scripted runtime.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { text } from "@swarmtales/prompts";
import { classifierPrompt, classifierSystemPrompt, Interpreter, overseers, type Classification, type StatementBatch, type StatementClassifier } from "@swarmtales/roles";
import { scriptedOverseer, type OverseerScript } from "@swarmtales/testkit";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";
import { bare, displayName, flat, legacyInputs, newHost, oldBus, playInputs, playNew, type Input, type NewSpec } from "./harness.ts";

const LABEL = "test/classifier";
const PEOPLE = ["A01", "A02", "A03", "A04"];

const at = (minute: number, type: string, fields: Record<string, unknown>): Input => ({ minute, type, fields });
const dm = (minute: number, from: string, to: string, message: string): Input => at(minute, "dm_sent", { from, to, text: message, number: minute });

/** Statement seqs of a prompt: the lines after the statements heading. */
function statementSeqs(prompt: string): readonly number[] {
	const tail = prompt.split(text("classifier/statements-heading"))[1] ?? "";
	return tail.split("\n").flatMap((line) => {
		const found = /^#(\d+) /.exec(line);
		return found?.[1] === undefined ? [] : [Number(found[1])];
	});
}

/** The rule both sides label by: every fourth seq stays unlabelled; names, unknown labels and unknown residents are in the mix. */
function itemsFor(seqs: readonly number[]): { ref: number; labels: string[]; targets?: string[] }[] {
	return [
		...seqs.flatMap((seq) =>
			seq % 4 === 0 ? [] : [{ ref: seq, labels: seq % 7 === 0 ? ["bogus"] : seq % 3 === 0 ? ["promise", "bogus"] : ["threat", "accusation"], targets: seq % 2 === 0 ? ["maren", "A01", "A99", "A03"] : ["A04"] }],
		),
		{ ref: 99_999, labels: ["lie"] },
	];
}

const many = (minute: number, count: number): Input[] =>
	Array.from({ length: count }, (_unused, index) => dm(minute, PEOPLE[index % 3] ?? "A01", PEOPLE[(index + 1) % 3] ?? "A02", `message ${String(index)} of minute ${String(minute)}`));

const SCRIPT: readonly Input[] = [
	at(0, "thinking", { agent: "A01", text: "I will hold my fragment back." }),
	at(0, "text", { agent: "A02", text: "an aside" }),
	dm(0, "A01", "A02", "Door 2 is 1234"),
	dm(0, "A02", "A01", "no"),
	at(0, "board_post", { postSeq: 1, author: "A03", text: "A02 cheated!", kind: "player" }),
	at(0, "board_post", { postSeq: 2, author: "A04", text: "The city speaks.", kind: "city" }),
	at(0, "group_post", { group: "G1", author: "A03", postSeq: 3, text: "Let us meet." }),
	at(0, "cast_dm", { from: "A01", cast: "C1", text: "Hello cast", collections: [] }),
	at(0, "thinking", { agent: "CITY", text: "not a resident" }),
	at(0, "text", { agent: "A04", text: "   " }),
	dm(1, "A01", "A02", "deal"),
	at(1, "group_post", { group: "G1", author: "A04", postSeq: 4, text: "Agreed." }),
	// Minute 2 is cut into batches of at most 60 (130 statements: 60, 60, 10), with context from earlier minutes.
	...many(2, 130),
	dm(3, "A02", "A01", "last words"),
];

function spec(extra: Partial<NewSpec> = {}): NewSpec {
	return { inputs: SCRIPT, minutes: 4, residents: 4, overseers: [overseers.classifierOverseer.as("classifier", { label: LABEL })], names: true, ...extra };
}

/** The old side: the interpreter with a classifier that answers by the same rule (or fails the chosen calls). */
async function playOld(seqs: readonly number[], failOn: readonly number[]) {
	const side = oldBus();
	const batches: StatementBatch[] = [];
	const classifier: StatementClassifier = {
		label: LABEL,
		classify(batch): Promise<Classification> {
			const n = batches.length;
			batches.push(batch);
			if (failOn.includes(n)) return Promise.resolve({ verdicts: [], usage: [], errors: ["boom"] });
			const items = itemsFor(batch.statements.map((statement) => statement.seq));
			return Promise.resolve({ verdicts: items.map((item) => ({ seq: item.ref, labels: item.labels, targets: item.targets ?? [] })), usage: [], errors: [] });
		},
	};
	const interpreter = new Interpreter({ classifier, bus: side.bus, competitors: PEOPLE, minute: () => side.minute, nameOf: (agent) => (agent === "A02" ? displayName(agent) : undefined) });
	const inputs = legacyInputs(spec(), seqs);
	for (let minute = 0; minute < 4; minute++) {
		side.minute = minute;
		for (const [index, input] of SCRIPT.entries()) {
			const event = inputs[index];
			if (input.minute === minute && event !== undefined) interpreter.record(event);
		}
		await interpreter.afterRound(minute + 1);
	}
	return { events: side.log.events.map(bare), prompts: batches.map((batch) => classifierPrompt(batch, 1_500)), sizes: batches.map((batch) => batch.statements.length) };
}

const OldSide = Type.Object({ events: Type.Array(Type.Record(Type.String(), Type.Unknown())), prompts: Type.Array(Type.String()), sizes: Type.Array(Type.Number()) });

function runtimeFor(failOn: readonly number[]) {
	let n = 0;
	const script: OverseerScript = (call) => {
		const index = n++;
		return failOn.includes(index) ? { error: "boom" } : { answer: { items: itemsFor(statementSeqs(call.input)) } };
	};
	return scriptedOverseer({ classifier: script });
}

async function compare(failOn: readonly number[]) {
	const runtime = runtimeFor(failOn);
	const fresh = await playNew(spec({ runtime }));
	const old = await oldRunAsync({ failOn, seqs: fresh.seqs, script: SCRIPT }, OldSide, () => playOld(fresh.seqs, failOn));
	return { fresh, runtime, ...old };
}

describe("the classifier overseer against the old interpreter", () => {
	it("asks with the old prompts: the system prompt, and per batch the round, the context and the statements", async () => {
		const { runtime, prompts, sizes } = await compare([]);
		expect(runtime.asked.map((entry) => entry.call.system)).toEqual(runtime.asked.map(() => classifierSystemPrompt()));
		expect(runtime.asked.map((entry) => entry.call.input)).toEqual(prompts);
		// Minute 0: seven statements in one batch; minute 1: two; minute 2: 130 statements in three; minute 3: one.
		expect(sizes).toEqual([7, 2, 60, 60, 10, 1]);
		expect(runtime.asked.map((entry) => entry.call.slot)).toEqual(runtime.asked.map(() => "classifier"));
		// Names and context reached the prompt.
		expect(runtime.asked[0]?.call.input).toContain("A02 (called Maren)");
		expect(runtime.asked[1]?.call.input).toContain(text("classifier/context-heading"));
	});

	it("writes the old events in the old order: interpretations of a round, then the round", async () => {
		const { fresh, events } = await compare([]);
		const written = flat(fresh.events, "classifier");
		expect(written).toEqual(events);
		expect(written.filter((event) => event.type === "interpretation").length).toBeGreaterThan(80);
		expect(written.filter((event) => event.type === "interpretation_round")).toHaveLength(4);
		// Unknown labels, unknown residents and the model's own name for a resident were handled alike.
		expect(written.find((event) => event.type === "interpretation" && Array.isArray(event.targets) && event.targets.includes("A02"))).toBeDefined();
		expect(written.some((event) => JSON.stringify(event).includes("bogus") || JSON.stringify(event).includes("A99"))).toBe(false);
	});

	it("writes an error for a failed batch, no round for it, and labels the others", async () => {
		const { fresh, events } = await compare([3]);
		const written = flat(fresh.events, "classifier");
		expect(written).toEqual(events);
		const errors = written.filter((event) => event.type === "interpretation_error");
		expect(errors).toEqual([{ type: "interpretation_error", round: 3, message: "boom" }]);
		// Round 3 (minute 2) is not marked as classified, the others are.
		expect(written.filter((event) => event.type === "interpretation_round").map((event) => event.round)).toEqual([1, 2, 4]);
	});

	it("writes nothing without a runtime (no classifier, no labels) and does not fail the run", async () => {
		const fresh = await playNew(spec({}));
		expect(flat(fresh.events, "classifier")).toEqual([]);
		expect(fresh.host.log.all().some((event) => event.type === "overseer_answered")).toBe(true);
	});

	it("keeps its place in the log: after the minute's turns, one call per batch", async () => {
		const { fresh } = await compare([]);
		const called = fresh.events.filter((event) => event.type === "overseer_called");
		expect(called).toHaveLength(6);
		expect(called.map((event) => (typeof event.payload === "object" && event.payload !== null && "trigger" in event.payload ? event.payload.trigger : ""))).toEqual(Array(6).fill("hook:between"));
	});

	it("resumes from a snapshot with the context of its conversations and the same cursor", async () => {
		const whole = await playNew(spec({ runtime: runtimeFor([]) }));
		const partial = spec({ runtime: runtimeFor([]) });
		const host = newHost(partial);
		host.start();
		const seqs: number[] = [];
		await playInputs(host, partial, 0, 2, seqs);
		const snapshot: unknown = JSON.parse(JSON.stringify(host.snapshot()));
		const prefix = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const runtime = runtimeFor([]);
		const resumedSpec = spec({ runtime });
		const resumed = newHost(resumedSpec, { snapshot, events: prefix });
		await playInputs(resumed, resumedSpec, 2, 4, seqs);
		expect(JSON.stringify(flat(resumed.log.all(), "classifier"))).toBe(JSON.stringify(flat(whole.events, "classifier")));
	});
});

describe("the classifier overseer's head", () => {
	it("is a short overseer in the between slot with an input prompt that ends with the standing orders", () => {
		const head = overseers.classifierOverseer;
		expect(head.id).toBe("classifier");
		expect(head.lifetime).toBe("short");
		expect(head.triggers).toEqual([{ hook: "between", order: overseers.OVERSEER_ORDER.classifier }]);
		expect(overseers.OVERSEER_ORDER.classifier).toBeLessThan(overseers.OVERSEER_ORDER.weaver);
		expect(overseers.OVERSEER_ORDER.weaver).toBeLessThan(overseers.OVERSEER_ORDER.gamemaker);
	});
});
