// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Director's driver with the plugin `directors` and `turns` in a real kernel (specification of M3, sections
 * 4.4 and 4.6): the cases of the old `test/host/overseers.test.ts` that are about an event trigger, `maxCalls`,
 * the fallback and the logged call. The asker is written here: the engine imports no model.
 */
import { nameOf, TOOL_NOT_GRANTED, type ActorDriver, type AskModel, type DirectorUse, type DriverTable, type Kernel, type ModelAnswer, type ModelQuestion, type ToolOutcome } from "@swarmtales/contracts";
import { createKernel } from "@swarmtales/kernel";
import { defineDirector, defineHead, defineMechanic, reply, resolveGame, type DirectorDefinition } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createDirectorDrivers, createReviewPort, DIRECTOR_RECORDS, REVIEW_RECORDS } from "../src/directors/driver.ts";
import { turns } from "../src/turns/turns.ts";

const Line = Type.Object({ line: Type.String({ description: "The line" }) }, { description: "A line" });
const votes = defineMechanic(
	defineHead({
		id: "votes",
		package: "@test/votes",
		summary: "Proposals and the lines posted about them.",
		events: { proposed: Line, posted: Line },
		tools: { propose: { description: "Proposes.", params: Line, for: ["resident"] }, post: { description: "Posts a line.", params: Line, for: ["warden"] }, seal: { description: "Seals.", params: Line, for: ["resident"] } },
	}),
	{
		tools: {
			propose: { run: (params, ctx) => (ctx.emit("proposed", params), reply("proposed")) },
			post: { run: (params, ctx) => (ctx.emit("posted", params), reply("posted")) },
			seal: { run: () => reply("sealed") },
		},
	},
);

const lineOf = (payload: unknown): string => (typeof payload === "object" && payload !== null && "line" in payload ? String(payload.line) : "");
// The warden posts the answered line; the line `seal` makes it try a tool that is not in its grant, `boom` makes it throw.
const warden = (outcomes: ToolOutcome[], fallback?: string): DirectorDefinition =>
	defineDirector(
		{ id: "warden", summary: "Posts a line about proposals that are not hushed.", on: [{ event: "votes.proposed", where: (payload) => lineOf(payload) !== "hush" }], output: Line },
		{
			system: (ctx) => `You are ${ctx.name}.`,
			input: (ctx) => `${String(ctx.tick)}: ${ctx.firings.map((firing) => lineOf(firing.payload)).join("+")}`,
			act: async (answer, ctx) => {
				if (answer.line === "boom") throw new TypeError("the act failed");
				outcomes.push(await ctx.call(answer.line === "seal" ? "seal" : "post", answer));
			},
			...(fallback === undefined ? {} : { fallback: () => ({ line: fallback }) }),
		},
	);

interface Setup {
	/** `<tick>:<resident name>` to the lines the resident proposes in that activation. */
	readonly script: Readonly<Record<string, readonly string[]>>;
	/** The answers of the model, in order; after the last one the asker answers `error`. */
	readonly answers: readonly ModelAnswer[];
	readonly use?: Partial<DirectorUse>;
	readonly fallback?: string;
}

// A game of two residents and the warden, three ticks; the asker and the residents' driver are scripted.
function setup({ script, answers, use, fallback }: Setup) {
	const outcomes: ToolOutcome[] = [];
	const game = resolveGame({
		game: { schema: 1, id: "demo", residents: 2, mechanics: [{ use: "votes" }], directors: [{ use: "warden", ...use }], scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } }, end: { ticks: 3 } },
		installed: { votes },
		directors: { warden: warden(outcomes, fallback) },
		schedulers: { turns },
		prompts: { render: (_owner, id) => id },
		records: [DIRECTOR_RECORDS],
	});
	const asked: string[] = [];
	const ask: AskModel = (_activation, question) => {
		asked.push(`${question.system} ${question.input}${question.answerTool === undefined ? "" : ` (tool ${question.answerTool.name})`}`);
		return Promise.resolve(answers[asked.length - 1] ?? { ok: false, reason: "error", detail: "no answer left" });
	};
	const resident: ActorDriver = async (activation) => {
		for (const line of script[`${String(activation.tick)}:${nameOf(activation.actor)}`] ?? []) await activation.call("propose", { line });
	};
	const drivers: DriverTable = { resident, ...createDirectorDrivers({ game, ask }) };
	return { game, asked, outcomes, drivers, kernel: createKernel(game.definition) };
}

const says = (line: string): ModelAnswer => ({ ok: true, value: { line }, costUsd: 0.01 });
const WARDEN = "director:warden";
// The events of the given types as short lines: tick, type, actor and payload.
const lines = (kernel: Kernel, ...types: readonly string[]): readonly string[] =>
	kernel.log.all().filter((event) => types.length === 0 || types.includes(event.type)).map((event) => `${String(event.tick)} ${event.type} ${event.actor} ${JSON.stringify(event.payload)}`);
const payloads = (kernel: Kernel, type: string): readonly unknown[] => kernel.log.all().filter((event) => event.type === type).map((event) => event.payload);

describe("the Director's driver in a real kernel", () => {
	it("is activated after the block that wrote the event, once per kept event, and acts through a logged tool call", async () => {
		const { kernel, drivers, asked, outcomes } = setup({ script: { "0:A01": ["one"], "0:A02": ["hush"], "1:A02": ["two"] }, answers: [says("heard"), says("again")] });
		expect(await kernel.run(drivers)).toEqual({ reason: "ticks", tick: 3 });
		const first = kernel.log.all().findIndex((event) => event.actor === WARDEN);
		expect(lines(kernel).slice(first - 1, first + 10)).toEqual([
			'0 activation_closed resident:A01 {"actor":"resident:A01","calls":1,"outcome":"acted"}',
			'0 activation_opened director:warden {"actor":"director:warden","inputs":[],"detail":{"slot":"afterBlock","pass":1,"block":1}}',
			'0 tool_called director:warden {"as":"take","params":{}}',
			'0 tool_result director:warden {"as":"take","reply":"{\\"firings\\":[{\\"n\\":1,\\"tick\\":0,\\"event\\":\\"votes.proposed\\",\\"payload\\":{\\"line\\":\\"one\\"}}],\\"calls\\":1}"}',
			'0 asked director:warden {"firings":[1]}',
			'0 answered director:warden {"ok":true,"fallback":false,"costUsd":0.01}',
			'0 tool_called director:warden {"as":"post","params":{"line":"heard"}}',
			'0 posted director:warden {"line":"heard"}',
			'0 tool_result director:warden {"as":"post","reply":"posted"}',
			'0 activation_closed director:warden {"actor":"director:warden","calls":2,"outcome":"acted"}',
			'0 activation_opened resident:A02 {"actor":"resident:A02","inputs":[],"detail":{"pass":1,"block":2,"reason":"always"}}',
		]);
		// `hush` is filtered by `where`: the warden is opened twice in three ticks, the second time after the block of A02.
		expect(lines(kernel, "activation_opened").filter((line) => line.includes(` ${WARDEN} `)).map((line) => line.slice(-41))).toEqual(['{"slot":"afterBlock","pass":1,"block":1}}', '{"slot":"afterBlock","pass":1,"block":2}}']);
		expect([asked, outcomes, payloads(kernel, "posted")]).toEqual([["You are warden. 0: one", "You are warden. 1: two"], [{ ok: true, reply: "posted" }, { ok: true, reply: "posted" }], [{ line: "heard" }, { line: "again" }]]);
		expect(kernel.log.all().filter((event) => event.type === "asked").map((event) => [event.source, event.audience])).toEqual([[DIRECTOR_RECORDS.id, ["human"]], [DIRECTOR_RECORDS.id, ["human"]]]);
	});

	it("gives two events before the slot as one activation with two firings", async () => {
		const { kernel, drivers, asked } = setup({ script: { "0:A01": ["a", "hush", "b"] }, answers: [says("both")] });
		await kernel.run(drivers);
		expect([asked, payloads(kernel, "asked"), payloads(kernel, "posted")]).toEqual([["You are warden. 0: a+b"], [{ firings: [1, 2] }], [{ line: "both" }]]);
	});

	it("stops at `maxCalls`: no further activation, and `skipped` is written once", async () => {
		const { kernel, drivers, asked } = setup({ script: { "0:A01": ["a"], "0:A02": ["b"], "1:A01": ["c"], "1:A02": ["d"], "2:A01": ["e"] }, answers: [says("1"), says("2"), says("3")], use: { limits: { maxCalls: 2 } } });
		await kernel.run(drivers);
		expect([asked.length, payloads(kernel, "posted"), payloads(kernel, "skipped")]).toEqual([2, [{ line: "1" }, { line: "2" }], [{ director: "warden", reason: "maxCalls" }]]);
		expect(kernel.log.all().filter((event) => event.type === "activation_opened" && event.actor === WARDEN)).toHaveLength(2);
	});

	it("takes the fallback for an answer that does not fit and for no answer; without a fallback nothing is called", async () => {
		const script = { "0:A01": ["a"], "1:A01": ["b"], "2:A01": ["c"] };
		// P482: the asker's `invalid` (an answer it could not read) carries what the request cost into `answered`.
		const answers: ModelAnswer[] = [{ ok: true, value: { line: 5 }, costUsd: 0.02 }, { ok: false, reason: "limit", detail: "the cap is reached" }, { ok: false, reason: "invalid", detail: "no JSON", costUsd: 0.03 }];
		const invalid = { ok: false, costUsd: 0.02, reason: "invalid", detail: "the answer does not fit the output of the Director" };
		const limit = { ok: false, costUsd: 0, reason: "limit", detail: "the cap is reached" };
		const unread = { ok: false, costUsd: 0.03, reason: "invalid", detail: "no JSON" };
		const calm = setup({ script, answers, fallback: "calm" });
		await calm.kernel.run(calm.drivers);
		expect([payloads(calm.kernel, "answered"), payloads(calm.kernel, "posted")]).toEqual([[{ ...invalid, fallback: true }, { ...limit, fallback: true }, { ...unread, fallback: true }], [{ line: "calm" }, { line: "calm" }, { line: "calm" }]]);
		const bare = setup({ script, answers });
		expect(await bare.kernel.run(bare.drivers)).toEqual({ reason: "ticks", tick: 3 });
		expect([payloads(bare.kernel, "answered"), bare.outcomes]).toEqual([[{ ...invalid, fallback: false }, { ...limit, fallback: false }, { ...unread, fallback: false }], []]);
		expect(lines(bare.kernel, "tool_called").filter((line) => line.includes(WARDEN))).toEqual(['0 tool_called director:warden {"as":"take","params":{}}', '1 tool_called director:warden {"as":"take","params":{}}', '2 tool_called director:warden {"as":"take","params":{}}']);
	});

	it("gets `TOOL_NOT_GRANTED` for a tool outside its grant, and a throw of `act` ends the run", async () => {
		const sealed = setup({ script: { "0:A01": ["a"] }, answers: [says("seal")] });
		expect(await sealed.kernel.run(sealed.drivers)).toEqual({ reason: "ticks", tick: 3 });
		expect([sealed.outcomes.map((outcome) => (outcome.ok ? "ok" : outcome.code)), sealed.kernel.toolSpecs("warden").map((tool) => tool.name)]).toEqual([[TOOL_NOT_GRANTED], ["take", "post"]]);
		expect(lines(sealed.kernel, "tool_refused")).toEqual([`0 tool_refused director:warden {"as":"seal","stage":"lock","code":"${TOOL_NOT_GRANTED}","detail":"replies/core/not-granted"}`]);
		const thrown = setup({ script: { "0:A01": ["a"] }, answers: [says("boom")] });
		await thrown.kernel.run(thrown.drivers).catch(() => undefined);
		expect([thrown.kernel.ended?.reason, lines(thrown.kernel, "activation_closed").at(-1)]).toEqual(["error", '0 activation_closed director:warden {"actor":"director:warden","calls":1,"outcome":"error"}']);
	});

	it("goes on from a snapshot with a queued firing and the count of calls", async () => {
		const given: Setup = { script: { "0:A01": ["a"] }, answers: [says("1"), says("2")], use: { limits: { maxCalls: 2 } } };
		const straight = setup(given);
		await straight.kernel.run(straight.drivers, { ticks: 1 });
		// Between two ticks no slot is served: the firing of this call waits in the plugin's slice.
		expect(await straight.kernel.submit({ actor: "resident:A02", as: "propose", params: { line: "late" } })).toEqual({ ok: true, reply: "proposed" });
		const snapshot: unknown = JSON.parse(JSON.stringify(straight.kernel.snapshot()));
		const log = straight.kernel.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		expect(snapshot).toMatchObject({ tick: 1, plugins: { directors: { data: { queue: { warden: [{ event: "votes.proposed", payload: { line: "late" } }] }, calls: { warden: 1 } } } } });
		const resumed = setup({ ...given, answers: given.answers.slice(1) });
		const kernel = createKernel(resumed.game.definition, {}, { snapshot, log });
		await kernel.run(resumed.drivers);
		await straight.kernel.run(straight.drivers);
		expect(lines(kernel)).toEqual(lines(straight.kernel));
		expect(resumed.asked).toEqual(["You are warden. 1: late"]);
		expect(lines(kernel, "activation_opened", "posted").filter((line) => line.includes(WARDEN)).slice(2)).toEqual(['1 activation_opened director:warden {"actor":"director:warden","inputs":[],"detail":{"slot":"start","pass":1,"block":0}}', '1 posted director:warden {"line":"2"}']);
		expect(lines(kernel, "tool_result").at(-2)).toContain('\\"calls\\":2}');
	});

	it("ends an activation without a firing before it asks, and gives no driver for a game without a Director", async () => {
		const { game, drivers, asked } = setup({ script: {}, answers: [says("x")] });
		const calls: string[] = [];
		const record = (): never => {
			throw new TypeError("nothing is recorded without a firing");
		};
		for (const taken of [{ ok: true, reply: '{"firings":[],"calls":0}' }, { ok: true, reply: "no answer of take" }, { ok: false, code: "STEP_LIMIT" }] satisfies ToolOutcome[]) {
			const call = (as: string): Promise<ToolOutcome> => Promise.resolve((calls.push(as), taken));
			await drivers[WARDEN]?.({ actor: WARDEN, tick: 0, basis: 0, detail: {}, inputs: [], tools: [], call, record });
		}
		expect([calls, asked, Object.keys(drivers), createDirectorDrivers({ game: { ...game, directors: [] }, ask: record })]).toEqual([["take", "take", "take"], [], ["resident", WARDEN], {}]);
	});

	it("P482: writes the cost of an unreadable answer into the review's `answered`; a refused question costs 0", async () => {
		const guard = defineDirector({ id: "guard", summary: "Answers the reviews of the guard.", on: [], output: Line, answers: "guard" }, { system: () => "You are the guard.", input: () => "Keeps it the rule?", act: () => Promise.resolve() });
		const game = resolveGame({
			game: { schema: 1, id: "demo", residents: 1, mechanics: [{ use: "votes" }], directors: [{ use: "guard" }], scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } }, end: { ticks: 1 } },
			installed: { votes },
			directors: { guard },
			schedulers: { turns },
			prompts: { render: (_owner, id) => id },
			records: [DIRECTOR_RECORDS, REVIEW_RECORDS],
		});
		// The guard's first answer of whispers-001 (#69, #70): read as `invalid`, and paid for.
		const answers: ModelAnswer[] = [{ ok: false, reason: "invalid", detail: "no JSON", costUsd: 0.000176775 }, { ok: false, reason: "limit", detail: "the cap is reached" }, { ok: true, value: { line: 7 }, costUsd: 0.01 }];
		const actors: string[] = [];
		const port = createReviewPort({ game, ask: (activation) => (actors.push(activation.actor), Promise.resolve(answers[actors.length - 1] ?? { ok: false, reason: "error", detail: "none" })) });
		const answered: unknown[] = [];
		const call = { tool: "@test/votes/votes/propose", name: "propose", as: "propose", owner: "votes", actor: "resident:A01", params: { line: "x" }, seq: 5 } as const;
		const record = (source: string, type: string, payload: unknown) => {
			if (type === "answered") answered.push(payload);
			return { seq: 6, tick: 0, source, type, actor: call.actor, causedBy: call.seq, payload };
		};
		const ask = () => port.ask({ answerer: "guard", question: { text: "x" }, call, record });
		const results = [await ask(), await ask(), await ask()];
		expect([results, actors]).toEqual([[{ ok: false }, { ok: false }, { ok: false }], ["director:guard", "director:guard", "director:guard"]]);
		expect(answered).toEqual([{ answerer: "guard", ok: false, costUsd: 0.000176775, reason: "invalid" }, { answerer: "guard", ok: false, costUsd: 0, reason: "limit" }, { answerer: "guard", ok: false, reason: "invalid", costUsd: 0.01 }]);
	});

	// Runtime revision 8 (B2): the guard's answer schema has the title `verdict`; a Director without a title is asked as before.
	it("asks for an answer tool named by the title of the answer schema, in a review and in an activation, and for none without a title", async () => {
		const Verdict = Type.Object({ allowed: Type.Boolean({ description: "Kept" }) }, { title: "verdict", description: "Record the verdict." });
		const guard = defineDirector({ id: "guard", summary: "Answers the reviews of the guard.", on: [], output: Verdict, answers: "guard" }, { system: () => "You are the guard.", input: () => "Keeps it the rule?", act: () => Promise.resolve() });
		const game = resolveGame({
			game: { schema: 1, id: "demo", residents: 1, mechanics: [{ use: "votes" }], directors: [{ use: "guard" }], scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } }, end: { ticks: 1 } },
			installed: { votes },
			directors: { guard },
			schedulers: { turns },
			prompts: { render: (_owner, id) => id },
			records: [DIRECTOR_RECORDS, REVIEW_RECORDS],
		});
		const questions: ModelQuestion[] = [];
		const port = createReviewPort({ game, ask: (_activation, question) => (questions.push(question), Promise.resolve({ ok: true, value: { allowed: false }, costUsd: 0 })) });
		const call = { tool: "@test/votes/votes/propose", name: "propose", as: "propose", owner: "votes", actor: "resident:A01", params: { line: "x" }, seq: 5 } as const;
		const record = (source: string, type: string, payload: unknown) => ({ seq: 6, tick: 0, source, type, actor: call.actor, causedBy: call.seq, payload });
		expect(await port.ask({ answerer: "guard", question: { text: "x" }, call, record })).toEqual({ ok: true, answer: { allowed: false } });
		expect(questions).toEqual([{ system: "You are the guard.", input: "Keeps it the rule?", output: Verdict, answerTool: { name: "verdict", description: "Record the verdict." } }]);
		const { kernel, drivers, asked } = setup({ script: { "0:A01": ["one"] }, answers: [says("heard")] });
		await kernel.run(drivers, { ticks: 1 });
		expect(asked).toEqual(["You are warden. 0: one"]);
		expect(warden([]).output).not.toHaveProperty("title");
	});
});
