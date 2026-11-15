// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Directors of M5-06 (`12-m5-spec.md` 4.4, rows 1 to 3, and decision A63) in a real kernel: a Director woken
 * every two ticks and by a resident's call of a tool, that reads a fact of the game its head lists and answers a
 * review of M5-04; the run replays and resumes equal at every boundary.
 */
import { nameOf, type ActorDriver, type AskModel, type Envelope, type Kernel } from "@swarmtales/contracts";
import { createDirectorDrivers, createReviewPort, DIRECTOR_RECORDS, REVIEW_RECORDS, turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { defineDirector, defineHead, defineMechanic, parseTake, refuse, reply, resolveGame, type ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { replay } from "../src/replay.ts";

const Text = Type.Object({ text: Type.String({ minLength: 1, description: "The text" }) }, { description: "A text" });
const Blame = Type.Object({ dm: Type.Integer({ description: "The DM" }) }, { description: "A blame" });
const Answer = Type.Object({ line: Type.String({ description: "A line" }), deniesReceipt: Type.Boolean({ description: "Whether the claim denies the receipt" }) }, { description: "The keeper's answer" });
const upheld = (answer: unknown): boolean => typeof answer === "object" && answer !== null && "deniesReceipt" in answer && answer.deniesReceipt === true;

// The city counts its posts (the fact `city.posts`); `blame` asks the judge in its own review.
const city = defineMechanic(
	defineHead({
		id: "city",
		package: "@test/city",
		summary: "Posts and blames.",
		state: Type.Object({ posts: Type.Integer({ description: "The posts so far" }) }, { description: "The city" }),
		start: () => ({ posts: 0 }),
		events: { posted: Text },
		tools: { post: { description: "Posts.", params: Text, for: ["resident", "keeper"] }, blame: { description: "Blames.", params: Blame, for: ["resident"] } },
	}),
	{
		tools: {
			post: { run: (params, ctx) => (ctx.emit("posted", params), (ctx.state.posts += 1), reply("posted")) },
			blame: {
				review: { answerer: "judge", ask: (params, _ctx, answerable) => (answerable ? { question: { dm: params.dm } } : refuse("JUDGE_ABSENT", "no judge")) },
				run: (_params, _ctx, answer) => (answer?.ok === true ? reply(upheld(answer.answer) ? "upheld" : "rejected") : refuse("JUDGE_FAILED", "no verdict")),
			},
		},
		facts: { posts: { output: Type.Integer({ description: "The posts so far" }), compute: (view) => view.state.posts } },
	},
);

// Woken at ticks 0 and 2 and by a resident's `post`; it posts what it saw, which wakes nobody (a Director's call).
const keeper = defineDirector(
	{ id: "keeper", summary: "Looks every two ticks and after a post; judges blames.", on: [{ every: 2 }, { event: "tool_called", tool: "post", where: (payload) => JSON.stringify(payload).includes("resident:") }], facts: ["city.posts"], output: Answer, answers: "judge" },
	{
		system: () => "You keep the city.",
		input: (ctx) => `${String(ctx.tick)} ${ctx.firings.map((firing) => `${firing.event}${JSON.stringify(firing.payload)}`).join(",")} posts=${JSON.stringify(ctx.facts)}${ctx.question === undefined ? "" : ` q=${JSON.stringify(ctx.question)}`}`,
		act: async (answer, ctx) => {
			await ctx.call("post", { text: answer.line });
		},
	},
);

const script: Readonly<Record<string, readonly (readonly [string, unknown])[]>> = {
	"0:A01": [["post", { text: "a" }]],
	"1:A01": [["post", { text: "" }]],
	"1:A02": [["blame", { dm: 7 }]],
	"3:A02": [["post", { text: "b" }]],
};

const game: ResolvedGame = resolveGame({
	game: { schema: 1, id: "kept", residents: 2, mechanics: [{ use: "city" }], directors: [{ use: "keeper" }], scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } }, end: { ticks: 4 } },
	installed: { city },
	directors: { keeper },
	schedulers: { turns },
	prompts: { render: (_owner, id) => id },
	records: [DIRECTOR_RECORDS, REVIEW_RECORDS],
});

// Plays the scripted run tick by tick, with a snapshot and the log length at every boundary.
async function recorded(): Promise<{ readonly log: readonly Envelope[]; readonly cuts: readonly { readonly snapshot: unknown; readonly lines: number }[]; readonly asked: readonly string[] }> {
	const asked: string[] = [];
	const ask: AskModel = (_activation, question) => (asked.push(question.input), Promise.resolve({ ok: true, value: { line: `seen ${String(asked.length)}`, deniesReceipt: true }, costUsd: 0 }));
	const resident: ActorDriver = async (activation) => {
		for (const [tool, params] of script[`${String(activation.tick)}:${nameOf(activation.actor)}`] ?? []) await activation.call(tool, params);
	};
	const run: { kernel?: Kernel } = {};
	const facts = (key: string): unknown => run.kernel?.fact(key);
	const kernel = createKernel(game.definition, { review: createReviewPort({ game, ask, facts }) });
	run.kernel = kernel;
	const drivers = { resident, ...createDirectorDrivers({ game, ask, facts }) };
	const cuts: { snapshot: unknown; lines: number }[] = [];
	kernel.start();
	for (let tick = 0; tick < 4; tick++) {
		cuts.push({ snapshot: JSON.parse(JSON.stringify(kernel.snapshot())), lines: kernel.log.length });
		await kernel.run(drivers, { ticks: 1 });
	}
	return { log: kernel.log.all(), cuts, asked };
}

describe("a Director woken every n ticks and by a call, reading a fact, answering a review", () => {
	it("is asked at every second tick, after a resident's post and for the blame, with the listed fact", async () => {
		const { log, asked } = await recorded();
		expect(asked).toEqual([
			'0 every{"every":2} posts={"city.posts":0}',
			'0 tool_called{"actor":"resident:A01","as":"post","params":{"text":"a"}} posts={"city.posts":2}',
			'1  posts={"city.posts":3} q={"dm":7}',
			'2 every{"every":2} posts={"city.posts":3}',
			'3 tool_called{"actor":"resident:A02","as":"post","params":{"text":"b"}} posts={"city.posts":5}',
		]);
		const taken = log.filter((event) => event.type === "tool_result" && event.actor === "director:keeper" && event.payload !== null && typeof event.payload === "object" && "as" in event.payload && event.payload.as === "take");
		expect(taken.map((event) => parseTake(String(Reflect.get(Object(event.payload), "reply")))?.firings.map((firing) => [firing.n, firing.tick, firing.event]))).toEqual([[[1, 0, "every"]], [[2, 0, "tool_called"]], [[3, 2, "every"]], [[4, 3, "tool_called"]]]);
		expect(log.filter((event) => event.type === "tool_result" && event.actor === "resident:A02").map((event) => event.payload)).toEqual([{ as: "blame", reply: "upheld" }, { as: "post", reply: "posted" }]);
	});

	it("replays equal from the log alone, and resumes equal from the snapshot of every boundary", async () => {
		const { log, cuts } = await recorded();
		expect(await replay({ game, log })).toMatchObject({ equal: true });
		for (const { snapshot, lines } of cuts) {
			const again = await replay({ game, log, resume: { snapshot, log: log.slice(0, lines) } });
			expect([lines, again.equal, again.firstDifference]).toEqual([lines, true, undefined]);
		}
	});
});
