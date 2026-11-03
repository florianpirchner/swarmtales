/**
 * The weaver's chat model and the weaver's inner voices in a resident's steps. Offline, with scripted answers.
 * The old `Weaver` class is gone; the weaver overseer is tested in test/overseers/weaver.test.ts
 * (against the recorded old side).
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Turn } from "@swarmtales/contracts";
import { act, say, ScriptedModelSource } from "@swarmtales/models";
import {
	ChatWeaver,
	clip,
	HostResidentRunner,
	INNER_VOICE_HEAD,
	type Souffleur,
	toolsNotice,
	WEAVER_ID,
	WEAVER_REASON_MAX,
	WEAVER_TEXT_MAX,
	type WeaverAnswer,
	weaverPrompt,
	type WeaverQuestion,
} from "@swarmtales/roles";
import { DEFAULT_LIMITS } from "../../apps/cli/src/run-options.ts";
import { RESIDENT_LIMITS } from "../../apps/cli/src/host/residents.ts";

/** A step the provider's safeguards refused. */
const refused = (): FauxResponseStep => fauxAssistantMessage("", { stopReason: "error", errorMessage: "This request triggered cyber-related safeguards." });

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
		const events: { readonly type: string; readonly inputs?: readonly string[] }[] = [];
		const record = (type: string, payload: unknown): void => {
			const inputs = typeof payload === "object" && payload !== null && "inputs" in payload && Array.isArray(payload.inputs) ? payload.inputs.filter((entry): entry is string => typeof entry === "string") : undefined;
			events.push({ type, ...(inputs === undefined ? {} : { inputs }) });
		};
		const resident = new HostResidentRunner({
			id: "A01",
			systemPrompt: "You play.",
			tools: [{ name: "getStatus", description: "Your status.", parameters: Type.Object({}) }],
			binding: new ScriptedModelSource({ A01: steps }).bind("A01", RESIDENT_LIMITS),
			thinking: "off",
			record,
			openTools: () => ["getStatus"],
			innerVoice: {
				take: () => voices.shift() ?? [],
				giveBack: (back) => {
					voices.unshift([...back]);
				},
			},
			...(souffleur === undefined ? {} : { souffleur }),
		});
		const step = (...texts: string[]) => {
			const turn: Turn = {
				resident: "A01",
				minute: 3,
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
			return resident.step(turn, []);
		};
		const inputs = () => events.flatMap((event) => (event.type === "turn_input" && event.inputs !== undefined ? [event.inputs] : []));
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
