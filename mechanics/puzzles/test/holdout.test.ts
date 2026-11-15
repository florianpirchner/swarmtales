// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The service `holdout-pieces` through the real `standoff-tribunal` and `exile` (decision A82, erratum J168): the
 * tribunal strikes a holder, and in the same call, before the listener of `exile.exiled` runs, each teammate before
 * the door gets the struck holder's fragment and the blocker who only lacked the struck holder is cleared.
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation, ActorDriver, ActorId, Kernel } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ProgressionEvents, ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { defineGame, defineHead, defineMechanic, type Game } from "@swarmtales/sdk";
import { checkResumeEveryBoundary, testKernel } from "@swarmtales/testkit";
import { puzzles } from "../src/index.ts";

const TEXTS = {
	rule: "The holdout rule.",
	called: "{accused} holds door {door} from {lacking}: {grace}, {graceUntil}, {vote}, {maxVotes}.",
	drawnAccused: "The lot among {candidates} fell on {drawn}.",
	voteOpened: "Vote {number} of {maxVotes} on {accused} until {until}.",
	accusedVote: "{accused}, vote {number} of {maxVotes} on you until {until}.",
	struck: "{struck} is struck.",
	struckNotice: "{struck}, you are struck.",
	released: "{struck} is gone; you hold {fragments}.",
	dropped: "The tribunal on {accused} is dropped.",
	graceFailed: "{accused} missed the grace; the vote runs until {until}.",
	voteFailed: "{number} on {accused}: {yes}/{no}, {left} left, until {until}.",
	banished: "{accused} banished ({yes}).",
	lot: "{accused}: the lot fell on {drawn}.",
	spared: "{accused} spared at door {door}.",
};

// Everyone stands before door 1 for good: the stand-in of `progression` the tribunal reads.
const progression = defineMechanic(defineHead({ id: "progression", package: "@test/progression", summary: "Test: everyone before door 1.", events: ProgressionEvents.events, provides: [ProgressionService] }), {
	services: {
		progression: {
			levelOf: () => 1,
			isFinished: () => false,
			hasPassed: () => false,
			hasSolved: () => false,
			passed: () => [],
			lastProgress: () => -1,
			currentAct: () => 1,
			actStart: () => null,
			door: () => null,
			doorShut: () => false,
			openDoor: () => false,
			releaseDoor: () => null,
			unlock: () => null,
			ranking: () => [],
			holdersBehind: () => [],
			nextPenalty: () => 0,
			nextBlamePenalty: () => 0,
			chargeBlame: () => 0,
			endAct: () => false,
			isOpenOnClock: () => true,
			opensAt: () => 0,
			bounds: () => ({ startLevel: 1, lastLevel: 1, survivors: 1 }),
		},
	},
});

function game(): Game {
	return defineGame({
		id: "holdout-pieces",
		seed: 7,
		residents: ["A01", "A02", "A03"],
		mechanics: [
			progression(),
			channels(),
			exile(),
			puzzles({ levels: [{ number: 1, team: { kind: "random", size: 3 }, puzzle: { kind: "fragments", length: [9, 12], overlap: 2 } }] }),
			standoffTribunal({ stallMinutes: 1, graceMinutes: 1, voteMinutes: 2, maxVotes: 3, fallbackMinutes: 1, texts: TEXTS }),
		],
		grants: { script: ["callTribunal", "permaDeath"] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 7 },
	});
}

const Solutions = Type.Array(Type.Object({ agent: Type.String(), fragment: Type.Union([Type.String(), Type.Null()]) }));
const fragmentOf = (kernel: Kernel, agent: string): string => {
	const fragment = Value.Parse(Solutions, kernel.fact("puzzles.solutions")).find((row) => row.agent === agent)?.fragment;
	if (typeof fragment !== "string") throw new RangeError(`no fragment of ${agent}`);
	return fragment;
};

// Tick 0: A02 sends its fragment to both, A03 to A02 only, A01 nothing. Tick 1: the call on A01; tick 3: the votes;
// tick 5: the Director strikes the banished A01.
function drivers(kernel: Kernel, answers: string[]): { resident: ActorDriver } {
	const say = async (tick: number, actor: ActorId, as: string, params: unknown) => {
		const outcome = await kernel.submit({ actor, as, params });
		answers.push(`${String(tick)} ${as} ${outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`}`);
	};
	const sends: Readonly<Record<string, readonly string[]>> = { A02: ["A01", "A03"], A03: ["A02"] };
	return {
		resident: async ({ tick, actor }: Activation) => {
			const id = actor.slice("resident:".length);
			if (tick === 0) for (const target of sends[id] ?? []) await say(tick, actor, "sendDM", { target, message: `mine: ${fragmentOf(kernel, id)}` });
			if (tick === 3 && id !== "A01") await say(tick, actor, "tribunalVote", { yes: true });
			if (id !== "A03") return;
			if (tick === 1) await say(tick, "script", "callTribunal", { accused: ["A01"], reason: "A01 holds the first door." });
			if (tick === 5) await say(tick, "script", "permaDeath", { agent: "A01", reason: "A01 leaves the city." });
		},
	};
}

describe("holdout-pieces through the real tribunal and exile", () => {
	it("releases the struck holder's fragment to each teammate and clears the blocker who only lacked it, in the call of the strike", async () => {
		const { kernel } = testKernel(game());
		const answers: string[] = [];
		await kernel.run(drivers(kernel, answers), { ticks: 7 });
		expect(answers.filter((line) => !line.includes("sendDM"))).toContain("5 permaDeath A01 is struck from the city (banished by the vote); its fragments go to everyone left");
		const found = kernel.log.all().filter((event) => event.type === "blocker_found").map((event) => event.payload);
		expect(found).toEqual([
			{ door: 1, blocker: "A01", lacking: ["A02", "A03"] },
			{ door: 1, blocker: "A03", lacking: ["A01"] },
		]);
		const strike = kernel.log.all().filter((event) => event.tick === 5 && /exile|channels|standoff-tribunal|puzzles/.test(event.source));
		const fragment = fragmentOf(kernel, "A01");
		expect(strike.map((event) => `${event.type} ${JSON.stringify(event.payload)}`).slice(-6)).toEqual([
			'board_post {"postSeq":7,"author":"CITY","text":"A01 is struck.","kind":"city"}',
			'exiled {"agent":"A01","by":"holdout"}',
			`notice {"to":"A02","author":"CITY","text":"A01 is gone; you hold door 1: ${fragment}."}`,
			`notice {"to":"A03","author":"CITY","text":"A01 is gone; you hold door 1: ${fragment}."}`,
			'blocker_cleared {"door":1,"blocker":"A03"}',
			'gamemaker_note {"to":"board","author":"COURIER","text":"A01 leaves the city.","number":6}',
		]);
		// A strike that keeps burns nothing and contracts nothing; afterwards nobody lacks a fragment.
		expect(strike.filter((event) => event.type === "factor_burned" || event.type === "level_contracted")).toEqual([]);
		expect(kernel.fact("puzzles.lacking")).toEqual([]);
	});

	it("resumes at every tick boundary through the strike", async () => {
		expect(await checkResumeEveryBoundary(game(), (kernel) => drivers(kernel, []))).toEqual([]);
	});
});
