// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The two standing checks in process: they pass on a game that holds, and each names the fault of one that does not. */
import type { ActorDriver, ReviewAnswer } from "@swarmtales/contracts";
import { defineDirector, defineGame, defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { fakeDriver, idleDriver, scriptedDriver } from "../src/drivers.ts";
import { guessNumber } from "../src/fixtures/guess-number.ts";
import { play } from "../src/play.ts";
import { replay } from "../src/replay.ts";
import { answeringReview, checkReplay, checkResumeEveryBoundary, playStanding, sampleBoundaries, type StandingDrivers } from "../src/standing.ts";

const game = defineGame({ id: "guess", residents: 2, seed: 7, mechanics: [guessNumber({ max: 20 })], end: { ticks: 6 } });
/** A driver that decides from its activation alone. */
const byTick: StandingDrivers = () => ({ resident: scriptedDriver((activation) => [{ tool: "guess", params: { value: activation.tick + 1 } }]) });
/** The planted fault: a driver that counts its own activations, so a fresh one after a resume starts at 1 again. */
const counting: StandingDrivers = () => {
	let made = 0;
	const driver: ActorDriver = scriptedDriver(() => [{ tool: "guess", params: { value: (made += 1) } }]);
	return { resident: driver };
};

describe("sampleBoundaries", () => {
	it("takes every boundary of a short run, and of a long one the first, the fifths and the last three", () => {
		expect(sampleBoundaries(4)).toEqual([0, 1, 2, 3]);
		expect(sampleBoundaries(12)).toHaveLength(12);
		expect(sampleBoundaries(13)).toEqual([0, 2, 5, 7, 10, 11, 12]);
		expect(sampleBoundaries(28)).toEqual([0, 5, 11, 16, 22, 25, 26, 27]);
		expect(sampleBoundaries(45)).toEqual([0, 9, 18, 27, 36, 42, 43, 44]);
		expect(sampleBoundaries(31, 30)).toEqual([0, 6, 12, 18, 24, 28, 29, 30]);
		expect(sampleBoundaries(30, 30)).toHaveLength(30);
		expect(sampleBoundaries(0)).toEqual([]);
	});

	it("takes at most eight boundaries of a run longer than 12 ticks (decision A102, M5-92)", () => {
		const lengths = Array.from({ length: 300 }, (_, index) => index + 13);
		expect(lengths.filter((ticks) => sampleBoundaries(ticks).length > 8)).toEqual([]);
	});
});

describe("checkReplay", () => {
	it("passes for a scripted run and for a fake run", async () => {
		expect(await checkReplay(game, byTick)).toEqual([]);
		expect(await checkReplay(game, (kernel) => ({ resident: fakeDriver(kernel, 3) }), { seed: 3 })).toEqual([]);
	});

	it("does not pass on a run without an accepted call", async () => {
		expect(await checkReplay(game, () => ({ resident: idleDriver }))).toEqual(["replay: the run holds no accepted call, so its replay proves nothing"]);
	});
});

describe("checkResumeEveryBoundary", () => {
	it("passes for a driver that decides from its activation, from every boundary and from chosen ones", async () => {
		expect(await checkResumeEveryBoundary(game, byTick)).toEqual([]);
		expect(await checkResumeEveryBoundary(game, (kernel) => ({ resident: fakeDriver(kernel, 3) }), { seed: 3, boundaries: [0, 5] })).toEqual([]);
	});

	it("names every boundary from which the resumed run differs, and a boundary the run did not have", async () => {
		const problems = await checkResumeEveryBoundary(game, counting);
		// Boundary 0 resumes before the first activation, so the fresh count is the straight one; every later one differs.
		expect(problems.map((problem) => problem.split(":")[0])).toEqual([1, 2, 3, 4, 5].map((tick) => `resume from boundary ${String(tick)}`));
		expect(problems[0]).toMatch(/^resume from boundary 1: line \d+ differs:\n {2}\{.*"value":3.*\n {2}\{.*"value":1/);
		expect(await checkResumeEveryBoundary(game, byTick, { boundaries: [2, 6] })).toEqual(["resume from boundary 6: the run of 6 ticks has no such boundary"]);
	});
});

// A game whose `blame` asks the judge: refused `JUDGE_ABSENT` without one, else upheld or rejected by the answer.
const Blame = Type.Object({ dm: Type.Integer({ description: "The DM" }) }, { description: "A blame" });
const Verdict = Type.Object({ upheld: Type.Boolean({ description: "Whether the blame holds" }) }, { description: "The judge's verdict" });
const upheld = (answer: ReviewAnswer | undefined): boolean | undefined => (answer?.ok === true && typeof answer.answer === "object" && answer.answer !== null && "upheld" in answer.answer && typeof answer.answer.upheld === "boolean" ? answer.answer.upheld : undefined);
const court = defineMechanic(defineHead({ id: "court", package: "@test/court", summary: "Blames.", tools: { blame: { description: "Blames.", params: Blame, for: ["resident"] } } }), {
	tools: {
		blame: {
			review: { answerer: "judge", ask: (params, _ctx, answerable) => (answerable ? { question: { dm: params.dm } } : refuse("JUDGE_ABSENT", "no judge")) },
			run: (_params, _ctx, answer) => {
				const verdict = upheld(answer);
				return verdict === undefined ? refuse("JUDGE_FAILED", "no verdict") : reply(verdict ? "upheld" : "rejected");
			},
		},
	},
});
const judge = defineDirector({ id: "judge", summary: "Answers the blames.", on: [], output: Verdict, answers: "judge" }, { system: () => "You are the judge.", input: () => "", act: () => Promise.resolve() });
const judged = defineGame({ id: "judged", residents: 2, seed: 7, mechanics: [guessNumber({ max: 20 }), court()], directors: [{ use: judge }], scheduler: { id: "turns", options: { afterBlocks: ["director"] } }, end: { ticks: 4 } });
const blaming: StandingDrivers = () => ({ resident: scriptedDriver((activation) => [{ tool: "guess", params: { value: activation.tick + 1 } }, { tool: "blame", params: { dm: activation.tick } }]) });
const review = answeringReview({ judge: (question) => ({ upheld: JSON.stringify(question).includes('"dm":2') }) });

describe("the standing checks with an answerer of the stage review", () => {
	const outcomes = async (withJudge: boolean): Promise<readonly string[]> => {
		const { events } = await playStanding(judged, blaming, withJudge ? { review } : {});
		return events.filter((event) => event.actor === "resident:A01" && ["tool_result", "tool_refused"].includes(event.type) && JSON.stringify(event.payload).includes("blame")).map((event) => JSON.stringify(event.payload));
	};

	it("plays the blame by the answer: refused without a judge, upheld or rejected with one", async () => {
		expect(await outcomes(false)).toEqual(Array.from({ length: 4 }, () => '{"as":"blame","stage":"consult","code":"JUDGE_ABSENT","detail":"no judge"}'));
		expect(await outcomes(true)).toEqual(["rejected", "rejected", "upheld", "rejected"].map((said) => `{"as":"blame","reply":"${said}"}`));
	});

	it("pass with the same answerers on the straight run and the replay: none, or the judge", async () => {
		expect(await checkReplay(judged, blaming)).toEqual([]);
		expect(await checkResumeEveryBoundary(judged, blaming)).toEqual([]);
		expect(await checkReplay(judged, blaming, { review })).toEqual([]);
		expect(await checkResumeEveryBoundary(judged, blaming, { review })).toEqual([]);
		// The fault this fixes: a run without a judge, replayed with the game's Directors as answerers, differs.
		const { events } = await play(judged, { drivers: blaming });
		expect(await replay({ game: judged, log: events })).toMatchObject({ equal: false });
	});
});
