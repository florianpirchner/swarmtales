// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The stage `review` from the sdk to a replay (M5-04, `12-m5-spec.md` 4.3): a review handler of one mechanic on a
 * tool of another (the guard), a tool's own review (the blame), both answered by Directors with `answers` through
 * the engine's answerer port and a scripted asker; the run replays and resumes equal, the answers fed from the log.
 */
import { nameOf, SwtError, type ActorDriver, type AskModel, type Envelope, type Kernel, type ReviewAnswer } from "@swarmtales/contracts";
import { createDirectorDrivers, createReviewPort, DIRECTOR_RECORDS, REVIEW_RECORDS, turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { defineDirector, defineHead, defineMechanic, refuse, reply, resolveGame, type DirectorDefinition, type ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { replay } from "../src/replay.ts";

const Text = Type.Object({ text: Type.String({ description: "The text" }) }, { description: "A text" });
const Blame = Type.Object({ dm: Type.Integer({ description: "The DM" }) }, { description: "A blame" });
const Verdict = Type.Object({ deniesReceipt: Type.Boolean({ description: "Whether the claim denies the receipt" }) }, { description: "The judge's verdict" });
const Allowed = Type.Object({ allowed: Type.Boolean({ description: "Whether the post keeps the rule" }) }, { description: "The guard's verdict" });

const isVerdict = (answer: ReviewAnswer | undefined): answer is { readonly ok: true; readonly answer: { readonly deniesReceipt: boolean } } => answer?.ok === true && typeof answer.answer === "object" && answer.answer !== null && "deniesReceipt" in answer.answer && typeof answer.answer.deniesReceipt === "boolean";

// The city: `post`, and `blame` with its own review; the reply holds the verdict, as the old blame did.
const city = defineMechanic(
	defineHead({ id: "city", package: "@test/city", summary: "Posts and blames.", events: { posted: Text, charged: Blame }, tools: { post: { description: "Posts.", params: Text, for: ["resident"] }, blame: { description: "Blames.", params: Blame, for: ["resident"] } } }),
	{
		tools: {
			post: { run: (params, ctx) => (ctx.emit("posted", params), reply("posted")) },
			blame: {
				review: { answerer: "judge", ask: (params, _ctx, answerable) => (answerable ? { question: { dm: params.dm } } : refuse("JUDGE_ABSENT", "no judge")) },
				run: (params, ctx, answer) => {
					if (!isVerdict(answer)) return refuse("JUDGE_FAILED", "the judge gave no verdict");
					ctx.emit("charged", params);
					return reply(answer.answer.deniesReceipt ? "upheld" : "rejected");
				},
			},
		},
	},
);

// The guard of a game over `post` of another mechanic, by bare name: a leak is refused at once, else the guard is asked.
const keeper = defineMechanic(defineHead({ id: "keeper", package: "@test/keeper", summary: "Keeps the rule of the city." }), {
	pipeline: {
		review: {
			answerer: "guard",
			ask: (call, _ctx, answerable) => {
				const text = typeof call.params === "object" && call.params !== null && "text" in call.params ? String(call.params.text) : "";
				if (call.tool !== "post") return undefined;
				if (text.includes("5EUXN")) return refuse("GUARD_BLOCKED", "the post carries part of a fragment; fragments travel by DM");
				return answerable ? { question: { text } } : undefined;
			},
			decide: (answer) => (answer.ok && typeof answer.answer === "object" && answer.answer !== null && "allowed" in answer.answer && answer.answer.allowed === false ? refuse("GUARD_BLOCKED", "the guard found a leak") : undefined),
		},
	},
});

const answerer = (id: string, answers: string, output: typeof Verdict | typeof Allowed): DirectorDefinition =>
	defineDirector({ id, summary: `Answers the reviews of ${answers}.`, on: [], output, answers }, { system: () => `You are the ${id}.`, input: (ctx) => JSON.stringify(ctx.question ?? null), act: () => Promise.resolve() });

const script: Readonly<Record<string, readonly (readonly [string, unknown])[]>> = {
	"0:A01": [["post", { text: "Mine for door 2: 5EUXN" }], ["post", { text: "Hello" }]],
	"0:A02": [["blame", { dm: 41 }]],
	"1:A02": [["blame", { dm: 40 }], ["post", { text: "Fine" }]],
};

function gameOf(directors: readonly string[]): ResolvedGame {
	return resolveGame({
		game: { schema: 1, id: "reviewed", residents: 2, mechanics: [{ use: "keeper" }, { use: "city" }], directors: directors.map((use) => ({ use })), scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } }, end: { ticks: 2 } },
		installed: { city, keeper },
		directors: { judge: answerer("judge", "judge", Verdict), guard: answerer("guard", "guard", Allowed) },
		schedulers: { turns },
		prompts: { render: (_owner, id) => id },
		records: [DIRECTOR_RECORDS, REVIEW_RECORDS],
	});
}

// Plays the scripted run tick by tick, with a snapshot and the log length at every boundary.
async function recorded(): Promise<{ readonly game: ResolvedGame; readonly log: readonly Envelope[]; readonly cuts: readonly { readonly snapshot: unknown; readonly lines: number }[]; readonly asked: readonly string[] }> {
	const game = gameOf(["judge", "guard"]);
	const answers: Readonly<Record<string, unknown[]>> = { "director:guard": [{ allowed: false }, { allowed: true }], "director:judge": [{ deniesReceipt: true }, { deniesReceipt: false }] };
	const asked: string[] = [];
	const ask: AskModel = (activation, question) => {
		asked.push(`${activation.actor} ${question.input}`);
		return Promise.resolve({ ok: true, value: answers[activation.actor]?.shift(), costUsd: 0 });
	};
	const resident: ActorDriver = async (activation) => {
		for (const [tool, params] of script[`${String(activation.tick)}:${nameOf(activation.actor)}`] ?? []) await activation.call(tool, params);
	};
	const kernel: Kernel = createKernel(game.definition, { review: createReviewPort({ game, ask }) });
	const drivers = { resident, ...createDirectorDrivers({ game, ask }) };
	const cuts: { snapshot: unknown; lines: number }[] = [];
	kernel.start();
	for (let tick = 0; tick < 2; tick++) {
		cuts.push({ snapshot: JSON.parse(JSON.stringify(kernel.snapshot())), lines: kernel.log.length });
		await kernel.run(drivers, { ticks: 1 });
	}
	return { game, log: kernel.log.all(), cuts, asked };
}

const shape = (log: readonly Envelope[]): readonly string[] =>
	log.filter((event) => event.source !== "kernel" || ["tool_called", "tool_result", "tool_refused"].includes(event.type)).filter((event) => event.actor.startsWith("resident")).map((event) => `${event.type}${event.type === "tool_refused" ? ` ${JSON.stringify(event.payload)}` : ""}`);

describe("the stage `review` from the sdk to a replay", () => {
	it("records the guard's verdict and the two judged blames inside their calls, in the order of the oracle files", async () => {
		const { log, asked } = await recorded();
		expect(asked).toEqual(['director:guard {"text":"Hello"}', 'director:judge {"dm":41}', 'director:judge {"dm":40}', 'director:guard {"text":"Fine"}']);
		expect(shape(log)).toEqual([
			"tool_called", 'tool_refused {"as":"post","stage":"guard","code":"GUARD_BLOCKED","detail":"the post carries part of a fragment; fragments travel by DM"}',
			"tool_called", "asked", "answered", 'tool_refused {"as":"post","stage":"guard","code":"GUARD_BLOCKED","detail":"the guard found a leak"}',
			"tool_called", "asked", "answered", "charged", "tool_result",
			"tool_called", "asked", "answered", "charged", "tool_result",
			"tool_called", "asked", "answered", "posted", "tool_result",
		]);
		const answered = log.filter((event) => event.source === REVIEW_RECORDS.id && event.type === "answered").map((event) => event.payload);
		expect(answered[1]).toEqual({ answerer: "judge", ok: true, answer: { deniesReceipt: true }, costUsd: 0 });
		expect(log.filter((event) => event.type === "tool_result").map((event) => event.payload)).toEqual([{ as: "blame", reply: "upheld" }, { as: "blame", reply: "rejected" }, { as: "post", reply: "posted" }]);
	});

	it("replays equal from the log alone, and resumes equal from the snapshot of every boundary", async () => {
		const { game, log, cuts } = await recorded();
		expect(await replay({ game, log })).toMatchObject({ equal: true });
		for (const { snapshot, lines } of cuts) {
			const again = await replay({ game, log, resume: { snapshot, log: log.slice(0, lines) } });
			expect([lines, again.equal, again.firstDifference]).toEqual([lines, true, undefined]);
		}
		// The answerers of the run are an input too: told there is none, the first blame is refused at `consult`.
		const without = await replay({ game, log, answerers: [] });
		expect(without.equal).toBe(false);
		expect(without.log.find((event) => event.type === "tool_refused" && event.payload !== null && typeof event.payload === "object" && "stage" in event.payload && event.payload.stage === "consult")).toBeDefined();
	});

	it("refuses at load a game whose review names an answerer no Director answers (SWT-D004), and names the answerers", () => {
		expect(city.head.answerers).toEqual(["judge"]);
		expect(keeper.head.answerers).toEqual([]);
		const issues = (() => {
			try {
				gameOf(["guard"]);
				return [];
			} catch (error) {
				return error instanceof SwtError ? error.issues : [error];
			}
		})();
		expect(issues).toMatchObject([{ code: "SWT-D004", where: { path: "mechanics[1]" }, details: { answerer: "judge" } }]);
	});
});
