// SPDX-License-Identifier: Apache-2.0
/**
 * The stage `review` (M5-04, `12-m5-spec.md` 4.3): the review handlers of the plugins and the tool's own review,
 * after `rule` and before `execute`, with the lane held while an answer is awaited. The first test of the issue
 * gives the shapes of the two cases the oracle files hold, with test plugins: the guarded post of
 * `whispers-s7.json` (refused at once at stage `guard`) and a judged blame of `cityofkeys-act2-s7.json` (the
 * question and the answer recorded inside the call, before its `tool_result`).
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { envelopeLogIssues, type Envelope, type KernelDefinition, type PluginInstance, type ResolvedPlugin, type ReviewAnswer, type ReviewPort, type ReviewRequest } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { A, caught, codeOf, each } from "./sample.ts";

const RECORDS = "@test/answerer";
const Any = Type.Unknown({ description: "Anything" });
const Note = Type.Object({ note: Type.String({ description: "The note" }) }, { description: "What the tool saw" });

// The tools `blame` (with its own review, answered by "judge") and `post`; `execute` reports the answer it got.
function court(seen: (string | undefined)[]): ResolvedPlugin {
	return {
		id: "court", package: "@test/court", version: "1.0.0", requires: [], provides: [], events: { judged: Note }, audiences: {}, options: null,
		create(port): PluginInstance {
			const blame = { name: "blame", description: "Blames", parameters: Any, free: false, answerer: "judge", prepare: (raw: unknown) => ({
				params: raw,
				rule: () => undefined,
				review: (answerable: (answerer: string) => boolean) => {
					seen.push(`answerable ${String(answerable("judge"))}`);
					if (!answerable("judge")) return { ok: false, code: "JUDGE_ABSENT", detail: "no judge" } as const;
					return raw === "settled" ? undefined : { answerer: "judge", question: { dm: String(raw) } };
				},
				execute: (answer?: ReviewAnswer) => {
					seen.push(answer === undefined ? "execute without answer" : `execute ${JSON.stringify(answer)}`);
					if (answer?.ok === false) return { ok: false, code: "JUDGE_FAILED", detail: "the judge gave no verdict" } as const;
					port.emit("judged", { note: JSON.stringify(answer ?? null) });
					return { ok: true, reply: answer === undefined ? "settled" : "upheld" } as const;
				},
			}) };
			const post = { name: "post", description: "Posts", parameters: Any, free: false, prepare: (raw: unknown) => ({ params: raw, rule: () => undefined, execute: () => ({ ok: true, reply: `posted ${String(raw)}` }) as const }) };
			return { tools: [blame, post], services: [], listeners: [], hooks: {}, stages: {}, jobs: {}, limits: [], facts: {}, slice: undefined };
		},
	};
}

// A review handler on `post` by bare name: "leak" is refused at once, "ask" asks "guard" and the answer decides.
function guard(): ResolvedPlugin {
	return {
		id: "guard", package: "@test/guard", version: "1.0.0", requires: [], provides: [], events: { checked: Note }, audiences: {}, options: null,
		create(port): PluginInstance {
			const review: NonNullable<PluginInstance["stages"]["review"]> = (call, answerable) => {
				if (call.name !== "post") return undefined;
				port.emit("checked", { note: String(call.params) });
				if (call.params === "leak") return { ok: false, code: "GUARD_BLOCKED", detail: "the post carries part of a fragment; fragments travel by DM" };
				if (call.params !== "ask" || !answerable("guard")) return undefined;
				return { answerer: "guard", question: { post: "ask" }, decide: (answer) => (answer.ok && answer.answer === "no" ? { ok: false, code: "GUARD_BLOCKED", detail: "the guard said no" } : undefined) };
			};
			return { tools: [], services: [], listeners: [], hooks: {}, stages: { review }, jobs: {}, limits: [], facts: {}, slice: undefined };
		},
	};
}

function definitionOf(seen: (string | undefined)[], plugins: readonly ResolvedPlugin[] = [guard(), court(seen)]): KernelDefinition {
	const grant = ["@test/court/court/blame", "@test/court/court/post"];
	return { game: { id: "review", hash: "h" }, seed: 1, actors: [{ id: A, kind: "resident", grant: "all", shared: {} }], plugins, scheduler: { definition: each, options: {} }, grants: { all: grant }, names: {}, startLocks: {}, replies: {}, limits: { maxTicks: 2 }, records: [{ id: RECORDS, events: { asked: Any, answered: Any } }] };
}

// An answerer port with scripted answers that records the question and the answer; `hold` keeps an answer back.
function portOf(answers: Readonly<Record<string, ReviewAnswer>>, asked: ReviewRequest[] = [], hold?: Promise<void>): ReviewPort {
	return {
		answers: (answerer) => Object.hasOwn(answers, answerer),
		async ask(request) {
			asked.push(request);
			request.record(RECORDS, "asked", { answerer: request.answerer, question: request.question });
			if (hold !== undefined) await hold;
			const answer = answers[request.answerer] ?? { ok: false };
			request.record(RECORDS, "answered", answer.ok ? { ok: true, answer: answer.answer } : { ok: false });
			return answer;
		},
	};
}

const lines = (events: readonly Envelope[], from: number): readonly string[] => events.slice(from).map((event) => `${event.source === "kernel" ? "" : `${event.source} `}${event.type}${event.type === "tool_refused" ? ` ${JSON.stringify(event.payload)}` : ""}`);

describe("the stage `review`: the first test (12-m5-spec.md 4.3)", () => {
	it("(a) a review handler that refuses at once gives the guarded post: `tool_called`, then `tool_refused` at stage `guard` with the code and the detail, nothing asked", async () => {
		const asked: ReviewRequest[] = [];
		const kernel = createKernel(definitionOf([]), { review: portOf({ guard: { ok: true, answer: "yes" } }, asked) });
		kernel.start();
		const from = kernel.log.length;
		expect(await kernel.submit({ actor: A, as: "post", params: "leak" })).toEqual({ ok: false, code: "GUARD_BLOCKED", detail: "the post carries part of a fragment; fragments travel by DM" });
		expect(lines(kernel.log.all(), from)).toEqual(["tool_called", "@test/guard/guard checked", 'tool_refused {"as":"post","stage":"guard","code":"GUARD_BLOCKED","detail":"the post carries part of a fragment; fragments travel by DM"}']);
		expect(asked).toEqual([]);
	});

	it("(b) a tool's own review answered by a scripted answerer gives the judged blame: the question and the answer inside the call, before its events and its `tool_result`", async () => {
		const seen: (string | undefined)[] = [];
		const kernel = createKernel(definitionOf(seen), { review: portOf({ judge: { ok: true, answer: { deniesReceipt: true } } }) });
		kernel.start();
		const from = kernel.log.length;
		expect(await kernel.submit({ actor: A, as: "blame", params: 41 })).toEqual({ ok: true, reply: "upheld" });
		expect(await kernel.submit({ actor: A, as: "blame", params: 40 })).toEqual({ ok: true, reply: "upheld" });
		const events = kernel.log.all().slice(from);
		const call = ["tool_called", `${RECORDS} asked`, `${RECORDS} answered`, "@test/court/court judged", "tool_result"];
		expect(lines(events, 0)).toEqual([...call, ...call]);
		// The records are the caller's, caused by the call, and carry the tool, as `core.role_asked` of the old file.
		const [called, question] = events;
		expect(question).toMatchObject({ actor: A, causedBy: called?.seq, tool: "@test/court/court/blame", audience: ["human"], payload: { answerer: "judge", question: { dm: "41" } } });
		expect(seen).toEqual(["answerable true", 'execute {"ok":true,"answer":{"deniesReceipt":true}}', "answerable true", 'execute {"ok":true,"answer":{"deniesReceipt":true}}']);
		expect(envelopeLogIssues(kernel.log.all())).toEqual([]);
	});
});

describe("the stage `review`: the rules of 4.3", () => {
	it("skips: a review that answers at once asks nothing, records nothing, and `execute` gets no answer", async () => {
		const seen: (string | undefined)[] = [];
		const asked: ReviewRequest[] = [];
		const kernel = createKernel(definitionOf(seen), { review: portOf({ judge: { ok: true, answer: 1 } }, asked) });
		kernel.start();
		const from = kernel.log.length;
		expect(await kernel.submit({ actor: A, as: "blame", params: "settled" })).toEqual({ ok: true, reply: "settled" });
		expect(await kernel.submit({ actor: A, as: "post", params: "fine" })).toEqual({ ok: true, reply: "posted fine" });
		expect(asked).toEqual([]);
		expect(seen).toEqual(["answerable true", "execute without answer"]);
		expect(lines(kernel.log.all(), from)).toEqual(["tool_called", "@test/court/court judged", "tool_result", "tool_called", "@test/guard/guard checked", "tool_result"]);
	});

	it("no answerer: the review is told so and refuses at stage `consult` (`JUDGE_ABSENT`), or a handler lets the call through; without a port too", async () => {
		for (const review of [portOf({}), undefined]) {
			const seen: (string | undefined)[] = [];
			const kernel = createKernel(definitionOf(seen), review === undefined ? {} : { review });
			kernel.start();
			const from = kernel.log.length;
			expect(await kernel.submit({ actor: A, as: "blame", params: 41 })).toEqual({ ok: false, code: "JUDGE_ABSENT", detail: "no judge" });
			expect(await kernel.submit({ actor: A, as: "post", params: "ask" })).toEqual({ ok: true, reply: "posted ask" });
			expect(seen).toEqual(["answerable false"]);
			expect(lines(kernel.log.all(), from)).toEqual(["tool_called", 'tool_refused {"as":"blame","stage":"consult","code":"JUDGE_ABSENT","detail":"no judge"}', "tool_called", "@test/guard/guard checked", "tool_result"]);
		}
	});

	it("fails: an answer that failed reaches the tool as `{ ok: false }`, and its refusal is logged at `execute`; a handler's `decide` refuses at `guard`", async () => {
		const seen: (string | undefined)[] = [];
		const kernel = createKernel(definitionOf(seen), { review: portOf({ judge: { ok: false }, guard: { ok: true, answer: "no" } }) });
		kernel.start();
		const from = kernel.log.length;
		expect(await kernel.submit({ actor: A, as: "blame", params: 41 })).toEqual({ ok: false, code: "JUDGE_FAILED", detail: "the judge gave no verdict" });
		expect(await kernel.submit({ actor: A, as: "post", params: "ask" })).toEqual({ ok: false, code: "GUARD_BLOCKED", detail: "the guard said no" });
		expect(seen).toEqual(["answerable true", 'execute {"ok":false}']);
		expect(lines(kernel.log.all(), from)).toEqual([
			"tool_called", `${RECORDS} asked`, `${RECORDS} answered`, 'tool_refused {"as":"blame","stage":"execute","code":"JUDGE_FAILED","detail":"the judge gave no verdict"}',
			"tool_called", "@test/guard/guard checked", `${RECORDS} asked`, `${RECORDS} answered`, 'tool_refused {"as":"post","stage":"guard","code":"GUARD_BLOCKED","detail":"the guard said no"}',
		]);
	});

	it("holds the lane: a call submitted while an answer is awaited commits after the reviewed call", async () => {
		let release: () => void = () => undefined;
		const hold = new Promise<void>((resolve) => {
			release = resolve;
		});
		const kernel = createKernel(definitionOf([]), { review: portOf({ judge: { ok: true, answer: 1 } }, [], hold) });
		kernel.start();
		const from = kernel.log.length;
		const judged = kernel.submit({ actor: A, as: "blame", params: 41 });
		const posted = kernel.submit({ actor: A, as: "post", params: "later" });
		await new Promise((resolve) => setImmediate(resolve));
		expect(lines(kernel.log.all(), from)).toEqual(["tool_called", `${RECORDS} asked`]);
		release();
		expect(await Promise.all([judged, posted])).toEqual([{ ok: true, reply: "upheld" }, { ok: true, reply: "posted later" }]);
		expect(lines(kernel.log.all(), from)).toEqual(["tool_called", `${RECORDS} asked`, `${RECORDS} answered`, "@test/court/court judged", "tool_result", "tool_called", "@test/guard/guard checked", "tool_result"]);
	});

	it("a staged call of a tool with its own review is refused at `lock` (`TOOL_NOT_GRANTED`), and a review handler of a staged call is told that no answerer answers", () => {
		const asked: ReviewRequest[] = [];
		const stager: ResolvedPlugin = { ...guard(), id: "stager", events: {}, create: (port) => ({ tools: [], services: [], listeners: [], hooks: { runStarted: [{ run: () => { port.stage("blame", 41); port.stage("post", "ask"); } }] }, stages: {}, jobs: {}, limits: [], facts: {}, slice: undefined }) };
		const base = definitionOf([], [stager, guard(), court([])]);
		const definition: KernelDefinition = { ...base, actors: [...base.actors, { id: "script", kind: "script", grant: "all", shared: {} }] };
		const kernel = createKernel(definition, { review: portOf({ judge: { ok: true, answer: 1 }, guard: { ok: true, answer: "no" } }, asked) });
		const from = kernel.log.length;
		kernel.start();
		expect(lines(kernel.log.all(), from + 1)).toEqual(["tool_called", 'tool_refused {"as":"blame","stage":"lock","code":"TOOL_NOT_GRANTED"}', "tool_called", "@test/guard/guard checked", "tool_result"]);
		expect(asked).toEqual([]);
	});

	it("a review that throws ends the run with `SWT-R003`, and a record of an undeclared source with `SWT-R017`", async () => {
		const throwing: ResolvedPlugin = { ...guard(), id: "broken", create: () => ({ tools: [], services: [], listeners: [], hooks: {}, stages: { review: () => { throw new RangeError("broken"); } }, jobs: {}, limits: [], facts: {}, slice: undefined }) };
		const kernel = createKernel(definitionOf([], [throwing, court([])]));
		kernel.start();
		expect(codeOf(await caught(() => kernel.submit({ actor: A, as: "post", params: 1 })))).toBe("SWT-R003");
		// A `decide` that throws is the code of the plugin whose review gave the question, not of the tool's owner.
		const deciding: ResolvedPlugin = { ...guard(), id: "decider", create: () => ({ tools: [], services: [], listeners: [], hooks: {}, stages: { review: () => ({ answerer: "guard", question: null, decide: () => { throw new RangeError("undecided"); } }) }, jobs: {}, limits: [], facts: {}, slice: undefined }) };
		const third = createKernel(definitionOf([], [deciding, court([])]), { review: portOf({ guard: { ok: true, answer: "yes" } }) });
		third.start();
		const thrown = await caught(() => third.submit({ actor: A, as: "post", params: 1 }));
		expect([codeOf(thrown), thrown instanceof Error && thrown.message.includes('"decider"')]).toEqual(["SWT-R003", true]);
		const wrong: ReviewPort = { answers: () => true, ask: (request) => Promise.resolve((request.record("@test/nobody", "asked", {}), { ok: false })) };
		const second = createKernel(definitionOf([]), { review: wrong });
		second.start();
		expect(codeOf(await caught(() => second.submit({ actor: A, as: "blame", params: 1 })))).toBe("SWT-R017");
		expect(second.ended).toMatchObject({ reason: "error" });
	});
});
