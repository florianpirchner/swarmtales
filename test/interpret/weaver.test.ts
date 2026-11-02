/** The weaver (`--weaver`): who residents become after the events that touch them. Offline, with scripted answers. */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import {
	AgentRunner,
	ChatWeaver,
	clip,
	INNER_VOICE_HEAD,
	MAX_HARD,
	MAX_SOFT,
	type Souffleur,
	toolsNotice,
	type Weave,
	Weaver,
	WEAVER_ID,
	WEAVER_REASON_MAX,
	WEAVER_TEXT_MAX,
	type WeaverAnswer,
	type WeaverCity,
	type WeaverModel,
	weaverPrompt,
	type WeaverQuestion,
} from "@swarmtales/roles";
import { DEFAULT_LIMITS } from "../../apps/cli/src/compose.ts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { MemorySink } from "@swarmtales/chronicle";
import { EventBus } from "@swarmtales/engine";

/** A step the provider's safeguards refused. */
const refused = (): FauxResponseStep => fauxAssistantMessage("", { stopReason: "error", errorMessage: "This request triggered cyber-related safeguards." });
import { act, say, ScriptedModelSource } from "@swarmtales/models";

const USAGE = { provider: "test", model: "weaver", input: 10, output: 2, cacheRead: 0, cacheWrite: 0, costUsd: 0.001 };

/** A model that answers from a list (the last answer repeats) and keeps every question. */
class ListedWeaver implements WeaverModel {
	readonly label = "test/weaver";
	readonly questions: WeaverQuestion[] = [];
	readonly #answers: readonly (Weave | "broken")[];

	constructor(answers: readonly (Weave | "broken")[]) {
		this.#answers = answers;
	}

	weave(question: WeaverQuestion): Promise<WeaverAnswer> {
		this.questions.push(question);
		const answer = this.#answers[Math.min(this.questions.length - 1, this.#answers.length - 1)] ?? "broken";
		return Promise.resolve(answer === "broken" ? { ok: false, error: "the weave call had invalid arguments", usage: [USAGE] } : { ok: true, weave: answer, usage: [USAGE] });
	}
}

interface TestCity extends WeaverCity {
	minute: number;
	currentAct: number;
	readonly exiled: Set<string>;
	readonly over: Set<number>;
}

function fixture(answers: readonly (Weave | "broken")[]) {
	const city: TestCity = {
		competitors: ["A01", "A02", "A03"],
		minute: 5,
		currentAct: 1,
		exiled: new Set(),
		over: new Set(),
		isExiled(agent) {
			return this.exiled.has(agent);
		},
		isActOver(fromLevel) {
			return this.over.has(fromLevel);
		},
		display: (text) => text.replaceAll("A02", "Maren"),
	};
	const log = new MemorySink();
	const bus = new EventBus([log], () => city.minute);
	const model = new ListedWeaver(answers);
	const rewrites: { agent: string; shift: string }[] = [];
	const weaver = new Weaver({
		model,
		bus,
		city,
		characterOf: (agent) => `${agent} is greedy above all.`,
		rewrite: (agent, shift) => rewrites.push({ agent, shift }),
		actTitle: (fromLevel) => (fromLevel === 1 ? "Act I" : undefined),
	});
	bus.subscribe(weaver);
	/** A blame that brands A02 a liar: a hard fact for A02. */
	const brand = (): number => {
		bus.emit({ type: "blame", caller: "A01", accused: "A02", dm: 4, claim: 9, outcome: "upheld", payer: "A02", penalty: 5, post: 12 });
		return bus.seq;
	};
	const shifts = () => log.ofType("fate_shift");
	return { city, log, bus, model, weaver, rewrites, brand, shifts };
}

const soft = (text = "Since A01 exposed you, you flinch when A01 writes."): Weave => ({ kind: "soft", text, reason: "branded a liar by A01" });
const hard = (text = "You trust no one in this city any more."): Weave => ({ kind: "hard", text, reason: "branded a liar after A01's blame" });
const none: Weave = { kind: "none", text: "", reason: "a slight" };

describe("the weaver", () => {
	it("makes no request in a quiet minute, nor for events that touch nobody", async () => {
		const { bus, model, weaver, log } = fixture([soft()]);
		await weaver.afterRound();
		bus.emit({ type: "board_post", postSeq: 1, author: "A01", text: "A02 cheated!", kind: "player" });
		await weaver.afterRound();
		expect(model.questions).toHaveLength(0);
		expect(log.events.map((event) => event.type)).toEqual(["board_post"]);
	});

	it("asks once per touched resident with a dossier: the events with #seq, its character and the act's earlier changes", async () => {
		const { model, weaver, brand } = fixture([soft(), soft("You hold your tongue now.")]);
		const first = brand();
		const second = brand();
		await weaver.afterRound();
		expect(model.questions).toHaveLength(1);
		const [question] = model.questions;
		expect(question).toMatchObject({ resident: "Maren", character: "Maren is greedy above all.", patches: [], hardLeft: MAX_HARD });
		expect(question?.events.map((event) => event.seq)).toEqual([first, second]);
		expect(question?.events[0]?.text).toContain("Maren was branded a liar");
		const third = brand();
		await weaver.afterRound();
		expect(model.questions[1]?.patches).toEqual([{ minute: 5, kind: "soft", text: "Since A01 exposed you, you flinch when A01 writes." }]);
		const prompt = weaverPrompt(model.questions[1] ?? question ?? { resident: "", minute: 0, character: "", patches: [], events: [], hardLeft: 0 });
		expect(prompt).toContain(`- #${String(third)} `);
		expect(prompt).toContain("Its earlier changes in this act:\n- minute 5, inner voice:");
	});

	it("turns a soft answer into an inner voice, heard once at the end of the resident's next step", async () => {
		const { weaver, brand, shifts, log } = fixture([soft()]);
		const seq = brand();
		await weaver.afterRound();
		expect(shifts()).toMatchObject([{ agent: "A02", kind: "soft", text: "Since A01 exposed you, you flinch when A01 writes.", reason: "branded a liar by A01", evidence: [seq], triggers: ["blame"] }]);
		expect(log.ofType("usage")).toMatchObject([{ agent: WEAVER_ID, costUsd: 0.001 }]);
		const voices = weaver.takeVoices("A02");
		expect(voices).toEqual([`${INNER_VOICE_HEAD}Since A01 exposed you, you flinch when A01 writes.`]);
		expect(weaver.takeVoices("A02")).toEqual([]);
		// A step that lost its inputs gives the voice back; it comes first again.
		weaver.returnVoices("A02", voices);
		expect(weaver.takeVoices("A02")).toEqual(voices);
		expect(weaver.shiftOf("A02")).toBeUndefined();
	});

	it("turns a hard answer into a rewrite of the resident's character", async () => {
		const { weaver, brand, rewrites, shifts } = fixture([hard()]);
		brand();
		await weaver.afterRound();
		expect(rewrites).toEqual([{ agent: "A02", shift: "You trust no one in this city any more." }]);
		expect(weaver.shiftOf("A02")).toBe("You trust no one in this city any more.");
		expect(shifts().map((event) => event.kind)).toEqual(["hard"]);
		expect(weaver.takeVoices("A02")).toEqual([]);
	});

	it("treats none, an empty text and a malformed answer as no change", async () => {
		const { weaver, brand, shifts, rewrites, log } = fixture([none, { kind: "hard", text: "  ", reason: "x" }, "broken"]);
		for (let minute = 0; minute < 3; minute++) {
			brand();
			await weaver.afterRound();
		}
		expect(shifts()).toHaveLength(0);
		expect(rewrites).toHaveLength(0);
		// Every request is paid, also one whose answer is thrown away.
		expect(log.ofType("usage")).toHaveLength(3);
	});

	it("caps each act at two hard and six soft changes per resident: a third hard one becomes soft, then everything is dropped", async () => {
		const { weaver, brand, shifts, model } = fixture([hard()]);
		for (let minute = 0; minute < MAX_HARD + MAX_SOFT + 2; minute++) {
			brand();
			await weaver.afterRound();
		}
		expect(shifts().map((event) => event.kind)).toEqual([...Array.from({ length: MAX_HARD }, () => "hard"), ...Array.from({ length: MAX_SOFT }, () => "soft")]);
		expect(model.questions.at(-1)?.hardLeft).toBe(0);
		expect(weaver.takeVoices("A02")).toHaveLength(MAX_SOFT);
	});

	it("leaves residents beyond the wall alone", async () => {
		const { city, weaver, brand, model } = fixture([soft()]);
		brand();
		city.exiled.add("A02");
		await weaver.afterRound();
		expect(model.questions).toHaveLength(0);
	});

	it("writes one text for the next act per resident that changed in an ended act, and drops the act's inner voices", async () => {
		const { city, weaver, brand, shifts, rewrites, model } = fixture([soft(), hard(), hard("You judge for yourself now.")]);
		for (let minute = 0; minute < 3; minute++) {
			brand();
			await weaver.afterRound();
		}
		const patches = shifts().map((event) => event.seq);
		expect(shifts().map((event) => event.kind)).toEqual(["soft", "hard", "hard"]);
		// The act ends; a quiet minute after it still writes the act's end.
		city.over.add(1);
		city.currentAct = 8;
		city.minute = 9;
		await weaver.afterRound();
		const end = shifts().at(-1);
		expect(end).toMatchObject({ agent: "A02", kind: "act", text: "You judge for yourself now.", evidence: patches });
		expect(model.questions.at(-1)).toMatchObject({ actEnd: { title: "Act I" }, events: [] });
		expect(model.questions.at(-1)?.patches.map((patch) => patch.kind)).toEqual(["soft", "hard", "hard"]);
		expect(rewrites.at(-1)).toEqual({ agent: "A02", shift: "You judge for yourself now." });
		// The act's voices are gone, and the new act starts with its full budget.
		expect(weaver.takeVoices("A02")).toEqual([]);
		brand();
		await weaver.afterRound();
		expect(model.questions.at(-1)).toMatchObject({ hardLeft: MAX_HARD, patches: [], shift: "You judge for yourself now." });
		// An act's end is written once.
		await weaver.afterRound();
		expect(shifts().filter((event) => event.kind === "act")).toHaveLength(1);
	});

	it("keeps the resident as it is when the act's end answers none", async () => {
		const { city, weaver, brand, shifts } = fixture([hard(), none]);
		brand();
		await weaver.afterRound();
		city.over.add(1);
		await weaver.afterRound();
		expect(shifts().map((event) => event.kind)).toEqual(["hard"]);
		expect(weaver.shiftOf("A02")).toBe("You trust no one in this city any more.");
	});

	it("carries its changes, voices and untouched hits through a snapshot, and rewrites the prompts again on restore", async () => {
		const first = fixture([hard(), soft()]);
		first.brand();
		await first.weaver.afterRound();
		first.brand();
		await first.weaver.afterRound();
		first.bus.emit({ type: "group_created", group: "G1", founder: "A01", name: "circle" });
		first.bus.emit({ type: "group_membership", group: "G1", agent: "A03", change: "added", by: "A01" });
		const pending = first.brand();
		const state: unknown = JSON.parse(JSON.stringify(first.weaver.snapshot()));
		const second = fixture([soft()]);
		second.weaver.restore(first.weaver.snapshot(), first.log.events);
		expect(state).toEqual(second.weaver.snapshot());
		expect(second.rewrites).toEqual([{ agent: "A02", shift: "You trust no one in this city any more." }]);
		expect(second.weaver.shiftOf("A02")).toBe("You trust no one in this city any more.");
		// The alliances come back from the prefix: A01's exile touches A03.
		second.bus.emit({ type: "exiled", agent: "A01" });
		await second.weaver.afterRound();
		expect(second.model.questions.map((question) => question.resident)).toEqual(["Maren", "A03"]);
		expect(second.model.questions[0]?.events.map((event) => event.seq)).toEqual([pending]);
		expect(second.model.questions[0]?.patches.map((patch) => patch.kind)).toEqual(["hard", "soft"]);
		expect(second.weaver.takeVoices("A02")).toHaveLength(2);
	});
});

describe("the weaver's chat model", () => {
	const question: WeaverQuestion = { resident: "Maren", minute: 5, character: "You are greedy.", patches: [], events: [{ seq: 41, text: "Maren was branded a liar." }], hardLeft: 2 };
	const ask = (step: FauxResponseStep): Promise<WeaverAnswer> =>
		new ChatWeaver({ binding: new ScriptedModelSource({ [WEAVER_ID]: [step] }).bind(WEAVER_ID, DEFAULT_LIMITS), label: "scripted/weaver", thinking: "off" }).weave(question);

	it("reads one weave call, checked with typebox", async () => {
		const answer = await ask(act({ name: "weave", args: { kind: "soft", text: "You flinch.", reason: "branded a liar (#41)" } }));
		expect(answer).toMatchObject({ ok: true, weave: { kind: "soft", text: "You flinch.", reason: "branded a liar (#41)" } });
		expect(answer.usage).toHaveLength(1);
	});

	it("refuses a malformed answer, which the weaver treats as none", async () => {
		expect(await ask(act({ name: "weave", args: { kind: "maybe", text: "You flinch.", reason: "x" } }))).toMatchObject({ ok: false });
		expect(await ask(act({ name: "weave", args: { kind: "soft" } }))).toMatchObject({ ok: false });
		expect(await ask(say("Maren changes."))).toMatchObject({ ok: false, error: "the weaver answered without calling weave" });
	});

	it("cuts a text or reason that is too long instead of throwing the answer away", async () => {
		const answer = await ask(act({ name: "weave", args: { kind: "hard", text: "word ".repeat(400), reason: "why ".repeat(100) } }));
		expect(answer.ok).toBe(true);
		if (!answer.ok) return;
		expect(answer.weave.text.length).toBeLessThanOrEqual(WEAVER_TEXT_MAX);
		expect(answer.weave.text.endsWith("word ...")).toBe(true);
		expect(answer.weave.reason.length).toBeLessThanOrEqual(WEAVER_REASON_MAX);
		expect(clip("  short  ", 10)).toBe("short");
	});

	it("shows the act's end as a request for one text for the next act", () => {
		const text = weaverPrompt({ ...question, events: [], actEnd: { title: "Act I" }, shift: "You trust no one." });
		expect(text).toContain("What the story has made of it so far:\nYou trust no one.");
		expect(text).toContain('Act I is over. Write who Maren is as the next act begins (kind "hard"), or "none".');
		expect(text).not.toContain("What happened to Maren");
	});
});

describe("the weaver in a resident's steps", () => {
	function runner(steps: FauxResponseStep[], voices: string[][], souffleur?: Souffleur) {
		const events: RecordedEvent[] = [];
		const bus = new EventBus([{ record: (event) => events.push(event) }], () => 3);
		const resident = new AgentRunner({
			id: "A01",
			systemPrompt: "You play.",
			tools: [],
			binding: new ScriptedModelSource({ A01: steps }).bind("A01", DEFAULT_LIMITS),
			bus,
			thinking: "off",
			enabledTools: () => ["getStatus"],
			minute: () => 3,
			innerVoice: {
				take: () => voices.shift() ?? [],
				giveBack: (back) => {
					voices.unshift([...back]);
				},
			},
			...(souffleur === undefined ? {} : { souffleur }),
		});
		const step = (...texts: string[]) => resident.step(texts.map((text) => ({ kind: "notice" as const, text })), { pass: 1, block: 1, turn: Promise.resolve() });
		const inputs = () => events.flatMap((event: RecordedEvent) => (event.type === "turn_input" ? [event.inputs] : []));
		return { resident, step, inputs };
	}

	it("puts the inner voice at the very end of the step's inputs, after the tools notice, once", async () => {
		const { step, inputs } = runner([say(), say()], [[`${INNER_VOICE_HEAD}You flinch.`]]);
		await step("[status] minute 3");
		await step("[status] minute 3");
		expect(inputs()).toEqual([["[status] minute 3", toolsNotice(["getStatus"]), `${INNER_VOICE_HEAD}You flinch.`], ["[status] minute 3"]]);
	});

	it("hears an inner voice again with the next step when a refused step lost it, with or without a souffleur that fails", async () => {
		const voice = `${INNER_VOICE_HEAD}You flinch.`;
		const plain = runner([refused(), say()], [[voice]]);
		await plain.step("one");
		await plain.step("two");
		expect(plain.inputs().at(-1)).toEqual(["two", voice]);
		const failing: Souffleur = { label: "test/fail", rewrite: () => Promise.resolve({ ok: false, error: "no", usage: [] }) };
		const lost = runner([refused(), say(), say()], [[voice]], failing);
		await lost.step("one");
		await lost.step("two");
		expect(lost.inputs().at(-1)).toEqual(["two", toolsNotice(["getStatus"]), voice]);
		// A rewrite that goes through keeps the voice (rewritten) in the context: it is not heard twice.
		const rewriting: Souffleur = { label: "test/rewrite", rewrite: (texts) => Promise.resolve({ ok: true, texts: texts.map((text) => `${text} (a game)`), usage: [] }) };
		const kept = runner([refused(), say(), say()], [[voice]], rewriting);
		await kept.step("one");
		await kept.step("two");
		expect(kept.inputs().at(-1)).toEqual(["two"]);
	});

	it("sends the rewritten character in the leading system message of the next request", async () => {
		const prompts: string[] = [];
		const seen: FauxResponseStep = (context) => {
			const first = context.messages[0];
			prompts.push(first?.role === "system" && typeof first.content === "string" ? first.content : "");
			return fauxAssistantMessage("ok");
		};
		const { resident, step } = runner([seen, seen], []);
		await step("one");
		resident.rewriteSystemPrompt("You play, and you trust no one.");
		await step("two");
		expect(prompts).toEqual(["You play.", "You play, and you trust no one."]);
		expect(resident.systemPrompt).toBe("You play, and you trust no one.");
		// The rewrite changes the prompt only: the context keeps every message.
		expect(resident.snapshot().filter((message) => message.role === "user")).toHaveLength(3);
	});
});
