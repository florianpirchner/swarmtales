/**
 * The weaver as an overseer against the old `Weaver` (docs/design/overseer-api.md §1.5, step 18 wave
 * C1): the same events (with the same `seq`), the same scripted answers in the same order, so the same
 * dossiers (system and per question), the same `fate_shift` events, the same caps and the same act
 * ends. The new side is a real host with the overseer and a scripted runtime.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { clip, overseers, Weaver, weaverPrompt, weaverSystemPrompt, type Weave, type WeaverAnswer, type WeaverCity, type WeaverModel, type WeaverQuestion } from "@swarmtales/roles";
import { scriptedOverseer, type ScriptedAnswer } from "@swarmtales/testkit";
import { recordOf } from "../mechanics/t1/support.ts";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";
import { displayName, flat, legacyInputs, newHost, oldBus, playInputs, playNew, type Input, type NewSpec } from "./harness.ts";

const PEOPLE = ["A01", "A02", "A03", "A04"];
const at = (minute: number, type: string, fields: Input["fields"]): Input => ({ minute, type, fields });

const SCRIPT: readonly Input[] = [
	at(0, "act_started", { fromLevel: 1, residents: PEOPLE }),
	at(0, "group_created", { group: "G1", founder: "A01", name: "Circle" }),
	at(0, "group_membership", { group: "G1", agent: "A03", change: "added", by: "A01" }),
	at(0, "dm_sent", { from: "A01", to: "A04", text: "A02 is lying", number: 1 }),
	at(0, "board_post", { postSeq: 1, author: "A03", text: "A02 cheated!", kind: "player" }),
	// Minute 1: accusations. The DM's recipient reads it (A04), A02 does not; the board post reaches everyone.
	at(1, "interpretation", (seqs) => ({ ref: seqs[3], agent: "A01", source: "dm", labels: ["accusation"], targets: ["A04", "A02", "A01"], classifier: "test" })),
	at(1, "interpretation", (seqs) => ({ ref: seqs[4], agent: "A03", source: "board", labels: ["accusation", "threat"], targets: ["A02"], classifier: "test" })),
	at(1, "interpretation", (seqs) => ({ ref: seqs[4], agent: "A03", source: "thought", labels: ["accusation"], targets: ["A01"], classifier: "test" })),
	// Minute 2: blames (the loser is hit), twice for A02.
	at(2, "blame", { caller: "A01", accused: "A02", dm: 4, claim: 9, outcome: "upheld", payer: "A02", penalty: 5, post: 12 }),
	at(2, "blame", { caller: "A03", accused: "A04", dm: 5, claim: 10, outcome: "rejected", payer: "A03", penalty: 8, post: 13 }),
	at(2, "blame", { caller: "A01", accused: "A02", dm: 6, claim: 11, outcome: "upheld", payer: "A02", penalty: 8, post: 14 }),
	// Minute 3: tribunal, gate, ransom.
	at(3, "tribunal_opened", { tribunal: 1, accused: ["A02", "A04"], voters: ["A01", "A03"], until: 6 }),
	at(3, "exile_gate", { agent: "A04", until: 6, ransomable: true, voters: ["A01"], price: 3, selfPrice: 2 }),
	at(3, "ransomed", { agent: "A04", payers: ["A01", "A03"] }),
	// Minute 4: A01 is exiled (its ally A03 is hit), an ultimatum, a seized piece, and act I ends as act II begins.
	at(4, "exiled", { agent: "A01", by: "seal" }),
	at(4, "ultimatum_resolved", { number: 2, kept: ["A04"], released: [], paid: [{ agent: "A03", points: 4 }] }),
	at(4, "piece_kept", { agent: "A04", level: 3, piece: "x", needers: ["A02"], cause: "ultimatum" }),
	// A piece kept for another cause than an ultimatum touches nobody.
	at(4, "piece_kept", { agent: "A03", level: 3, piece: "y", needers: ["A02"], cause: "exile" }),
	at(4, "act_ended", { fromLevel: 1 }),
	at(4, "act_started", { fromLevel: 4, residents: PEOPLE }),
	// Minute 5: A01 is out of the city, so the gate that would hit it asks nobody; more hits in act II, for the caps.
	at(5, "exile_gate", { agent: "A01", until: 7, ransomable: false, voters: [], price: 3, selfPrice: 2 }),
	at(5, "blame", { caller: "A03", accused: "A04", dm: 7, claim: 12, outcome: "upheld", payer: "A04", penalty: 5, post: 15 }),
	at(6, "blame", { caller: "A03", accused: "A04", dm: 8, claim: 13, outcome: "upheld", payer: "A04", penalty: 5, post: 16 }),
	at(7, "blame", { caller: "A03", accused: "A04", dm: 9, claim: 14, outcome: "upheld", payer: "A04", penalty: 5, post: 17 }),
	at(8, "blame", { caller: "A03", accused: "A04", dm: 10, claim: 15, outcome: "upheld", payer: "A04", penalty: 5, post: 18 }),
];

const LONG = "A long and winding sentence about a trust that broke. ".repeat(14);

/** What the model says to the n-th question (both sides get the same list in the same order). */
const ANSWERS: readonly (Weave | "broken")[] = [
	{ kind: "soft", text: "Since A02 was exposed, you flinch when A02 writes.", reason: "branded by A01" },
	{ kind: "hard", text: "You trust no one in this city any more.", reason: "branded a liar" },
	{ kind: "none", text: "", reason: "a slight" },
	"broken",
	{ kind: "soft", text: "   ", reason: "empty text is not a change" },
	{ kind: "hard", text: LONG, reason: "x".repeat(300) },
	{ kind: "hard", text: "You hold your tongue now.", reason: "the gate" },
	{ kind: "hard", text: "A second rewrite.", reason: "again" },
	{ kind: "soft", text: "One more whisper.", reason: "again" },
];

const answerOf = (n: number): Weave | "broken" => ANSWERS[n % ANSWERS.length] ?? "broken";

/** A run of events and the answers the model gives to its questions, in order. */
interface Scenario {
	readonly inputs: readonly Input[];
	readonly minutes: number;
	readonly answer: (n: number) => Weave | "broken";
}

const BASE: Scenario = { inputs: SCRIPT, minutes: 9, answer: answerOf };

/** One resident is hit every minute for twelve minutes and the model always rewrites it: two hard changes, six soft ones, then nothing. */
const CAPS: Scenario = {
	inputs: Array.from({ length: 12 }, (_unused, minute) => at(minute, "blame", { caller: "A01", accused: "A02", dm: minute + 1, claim: minute + 20, outcome: "upheld", payer: "A02", penalty: 5, post: minute + 40 })),
	minutes: 12,
	answer: (n) => ({ kind: "hard", text: `Rewrite number ${String(n)}.`, reason: "again" }),
};

function spec(scenario: Scenario = BASE, extra: Partial<NewSpec> = {}): NewSpec {
	return {
		inputs: scenario.inputs,
		minutes: scenario.minutes,
		residents: 4,
		names: true,
		overseers: [
			overseers.weaverOverseer.as("weaver", {
				characters: Object.fromEntries(PEOPLE.map((agent) => [agent, `${agent} is greedy above all.`])),
				acts: [{ fromLevel: 1, title: "Act I" }, { fromLevel: 4, title: "Act II" }],
			}),
		],
		...extra,
	};
}

function scripted(scenario: Scenario = BASE, from = 0) {
	let n = from;
	return scriptedOverseer({
		weaver: (): ScriptedAnswer => {
			const answer = scenario.answer(n++);
			return answer === "broken" ? { error: "the weave call had invalid arguments" } : { answer };
		},
	});
}

class ListedWeaver implements WeaverModel {
	readonly label = "test/weaver";
	readonly questions: WeaverQuestion[] = [];
	readonly #answer: Scenario["answer"];
	constructor(answer: Scenario["answer"]) {
		this.#answer = answer;
	}
	weave(question: WeaverQuestion): Promise<WeaverAnswer> {
		const answer = this.#answer(this.questions.length);
		this.questions.push(question);
		if (answer === "broken") return Promise.resolve({ ok: false, error: "the weave call had invalid arguments", usage: [] });
		// What `ChatWeaver` does with the model's call: the text and the reason are cut in code, not refused.
		return Promise.resolve({ ok: true, weave: { kind: answer.kind, text: clip(answer.text, 600), reason: clip(answer.reason, 200) }, usage: [] });
	}
}

async function playOld(scenario: Scenario, seqs: readonly number[]) {
	const side = oldBus();
	const exiled = new Set<string>();
	const over = new Set<number>();
	const city: WeaverCity & { minute: number; currentAct: number } = {
		competitors: PEOPLE,
		minute: 0,
		currentAct: 1,
		isExiled: (agent) => exiled.has(agent),
		isActOver: (fromLevel) => over.has(fromLevel),
		display: displayName,
	};
	const model = new ListedWeaver(scenario.answer);
	const weaver = new Weaver({
		model,
		bus: side.bus,
		city,
		characterOf: (agent) => `${agent} is greedy above all.`,
		rewrite: () => undefined,
		actTitle: (fromLevel) => (fromLevel === 1 ? "Act I" : fromLevel === 4 ? "Act II" : undefined),
	});
	const events = legacyInputs(spec(scenario), seqs);
	for (let minute = 0; minute < scenario.minutes; minute++) {
		side.minute = minute;
		city.minute = minute;
		for (const [index, input] of scenario.inputs.entries()) {
			if (input.minute !== minute) continue;
			const fromLevel = typeof input.fields === "object" && "fromLevel" in input.fields && typeof input.fields.fromLevel === "number" ? input.fields.fromLevel : 0;
			if (input.type === "act_ended") over.add(fromLevel);
			if (input.type === "act_started") city.currentAct = Math.max(city.currentAct, fromLevel);
			const event = events[index];
			if (event === undefined) continue;
			if (event.type === "exiled") exiled.add(event.agent);
			weaver.record(event);
		}
		// The old arena (arena.ts:206): no change and no look after the last round.
		if (minute + 1 < scenario.minutes) await weaver.afterRound();
	}
	const snapshot = weaver.snapshot();
	return { questions: model.questions, fateShifts: side.log.events.filter((event) => event.type === "fate_shift"), snapshot };
}

const Kind = Type.Union([Type.Literal("soft"), Type.Literal("hard")]);
const OldSide = Type.Object({
	questions: Type.Array(
		Type.Object({
			resident: Type.String(),
			minute: Type.Number(),
			character: Type.String(),
			shift: Type.Optional(Type.String()),
			patches: Type.Array(Type.Object({ minute: Type.Number(), kind: Kind, text: Type.String() })),
			events: Type.Array(Type.Object({ seq: Type.Number(), text: Type.String() })),
			actEnd: Type.Optional(Type.Object({ title: Type.String() })),
			hardLeft: Type.Number(),
		}),
	),
	fateShifts: Type.Array(Type.Record(Type.String(), Type.Unknown())),
	snapshot: Type.Object({ pending: Type.Unknown(), patches: Type.Unknown(), shifts: Type.Unknown(), voices: Type.Unknown(), closed: Type.Unknown() }),
});

/** The fate shifts as flat lines; an act end's evidence (the act's earlier shifts) is named by the order the shifts were written in. */
function shifts(lines: readonly Record<string, unknown>[], seqOfShift: readonly number[]): readonly Record<string, unknown>[] {
	return lines
		.filter((line) => line.type === "fate_shift")
		.map((line) => (line.kind === "act" && Array.isArray(line.evidence) ? { ...line, evidence: line.evidence.map((seq) => `shift#${String(seqOfShift.indexOf(Number(seq)))}`) } : line));
}

/** Data as plain records, the way a JSON snapshot reads. */
const recordsOf = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const withoutSeq = (entry: unknown): unknown => (typeof entry === "object" && entry !== null ? Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "seq")) : entry);

async function compare(scenario: Scenario = BASE) {
	const runtime = scripted(scenario);
	const fresh = await playNew(spec(scenario, { runtime }));
	const answers = Array.from({ length: 40 }, (_unused, index) => scenario.answer(index));
	const old = await oldRunAsync({ inputs: scenario.inputs, minutes: scenario.minutes, answers, seqs: fresh.seqs }, OldSide, () => playOld(scenario, fresh.seqs));
	const newLines = flat(fresh.events, "weaver");
	const newSeqs = fresh.events.filter((event) => event.source === "weaver").map((event) => event.seq);
	const oldEvents = old.fateShifts;
	const oldLines = oldEvents.map((event) => Object.fromEntries(Object.entries(event).filter(([key]) => key !== "seq" && key !== "minute")));
	return { fresh, runtime, old, newShifts: shifts(newLines, newSeqs), oldShifts: shifts(oldLines, oldEvents.map((event) => Number(event.seq))) };
}

describe("the weaver overseer against the old weaver", () => {
	it("asks with the old dossiers: the system prompt and, per touched resident, the same question text", async () => {
		const { runtime, old } = await compare();
		expect(runtime.asked.map((entry) => entry.call.system)).toEqual(runtime.asked.map(() => weaverSystemPrompt()));
		expect(runtime.asked.map((entry) => entry.call.input)).toEqual(old.questions.map(weaverPrompt));
		expect(old.questions.length).toBeGreaterThan(12);
		expect(runtime.asked.every((entry) => entry.call.slot === "weaver")).toBe(true);
		// A name shows as the city shows it, and an act-end question is among them.
		expect(runtime.asked.some((entry) => entry.call.input.includes("Maren"))).toBe(true);
		expect(old.questions.some((question) => question.actEnd !== undefined)).toBe(true);
	});

	it("writes the old fate shifts: kinds, texts, reasons, evidence, triggers; the caps; the act ends", async () => {
		const { newShifts, oldShifts } = await compare();
		expect(newShifts).toEqual(oldShifts);
		const kinds = newShifts.map((line) => line.kind);
		expect(kinds).toContain("soft");
		expect(kinds).toContain("hard");
		expect(kinds).toContain("act");
		// The long text and reason were cut, not refused.
		expect(newShifts.some((line) => typeof line.text === "string" && line.text.endsWith(" ..."))).toBe(true);
	});

	it("reads hits like the old triggers: a DM only for its reader, a thought for nobody, allies of the exiled", async () => {
		const { old } = await compare();
		const hit = (agent: string, minute: number) =>
			old.questions.filter((question) => question.resident === displayName(agent) && question.minute === minute).flatMap((question) => question.events.map((event) => event.text));
		// Minute 1: the DM accusation hits A04 (its reader) and not A02; the board accusation hits A02; the thought hits nobody.
		expect(hit("A04", 1)).toHaveLength(1);
		expect(hit("A02", 1)).toHaveLength(1);
		expect(hit("A01", 1)).toEqual([]);
		// Minute 4: A01 was struck, so its ally A03 is hit (and pays the ultimatum); A04 has a piece seized.
		expect(hit("A03", 4)).toHaveLength(2);
		expect(hit("A04", 4)).toHaveLength(1);
	});

	it("keeps the old caps per resident and act: two hard changes, six soft ones, the rest dropped", async () => {
		const { newShifts, oldShifts, runtime } = await compare(CAPS);
		expect(newShifts).toEqual(oldShifts);
		expect(newShifts.map((line) => line.kind)).toEqual(["hard", "hard", "soft", "soft", "soft", "soft", "soft", "soft"]);
		// Every minute but the last the resident was asked, also when the answer could change nothing more.
		expect(runtime.asked).toHaveLength(11);
	});

	it("keeps the old state: hard texts, inner voices not heard yet, the acts closed and the changes of the running act", async () => {
		for (const scenario of [BASE, CAPS]) {
			const { fresh, old } = await compare(scenario);
			const slice = recordOf(JSON.stringify(fresh.host.snapshot().overseers?.weaver?.slice?.data));
			const legacy = old.snapshot;
			expect(slice.shifts).toEqual(recordsOf(legacy.shifts));
			expect(slice.voices).toEqual(recordsOf(legacy.voices));
			expect(slice.closed).toEqual(legacy.closed);
			expect(slice.pending).toEqual(recordsOf(legacy.pending));
			expect(list(slice.patches).map(withoutSeq)).toEqual(list(recordsOf(legacy.patches)).map(withoutSeq));
		}
	});

	it("asks nobody in a quiet run and makes no call without a hit", async () => {
		const runtime = scripted();
		const quiet: Scenario = { inputs: [at(0, "board_post", { postSeq: 1, author: "A03", text: "hello", kind: "player" })], minutes: 3, answer: answerOf };
		const fresh = await playNew(spec(quiet, { runtime }));
		expect(runtime.asked).toEqual([]);
		expect(flat(fresh.events, "weaver")).toEqual([]);
	});

	it("changes nothing without a runtime (the weaver fails open: none)", async () => {
		const fresh = await playNew(spec());
		expect(flat(fresh.events, "weaver")).toEqual([]);
		expect(fresh.events.filter((event) => event.type === "overseer_answered").length).toBeGreaterThan(5);
	});

	it("resumes from a snapshot: pending hits, caps, shifts and the act it had closed", async () => {
		const whole = await playNew(spec(BASE, { runtime: scripted() }));
		const runtime = scripted();
		const partial = spec(BASE, { runtime });
		const host = newHost(partial);
		host.start();
		const seqs: number[] = [];
		await playInputs(host, partial, 0, 5, seqs);
		const snapshot: unknown = JSON.parse(JSON.stringify(host.snapshot()));
		const prefix = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		// The resumed run's script continues where the first left off: the same n-th answers.
		let n = runtime.asked.length;
		const second = scriptedOverseer({
			weaver: (): ScriptedAnswer => {
				const answer = answerOf(n++);
				return answer === "broken" ? { error: "the weave call had invalid arguments" } : { answer };
			},
		});
		const resumedSpec = spec(BASE, { runtime: second });
		const resumed = newHost(resumedSpec, { snapshot, events: prefix });
		await playInputs(resumed, resumedSpec, 5, 9, seqs);
		expect(JSON.stringify(flat(resumed.log.all(), "weaver"))).toBe(JSON.stringify(flat(whole.events, "weaver")));
	});
});

describe("the weaver overseer's head", () => {
	it("runs after the classifier and before the gamemaker, the acts first", () => {
		const orders = overseers.weaverOverseer.triggers.map((trigger) => ("order" in trigger ? trigger.order : undefined) ?? 0);
		expect(orders).toEqual([overseers.OVERSEER_ORDER.weaver, overseers.OVERSEER_ORDER.weaver + 1]);
		expect(Math.min(...orders)).toBeGreaterThan(overseers.OVERSEER_ORDER.classifier);
		expect(Math.max(...orders)).toBeLessThan(overseers.OVERSEER_ORDER.gamemaker);
		expect(overseers.weaverOverseer.lifetime).toBe("short");
	});
});
