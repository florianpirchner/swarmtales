// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal against the old `HoldoutTribunal`, carried from the old `holdout-differential.test.ts` and
 * `holdout.test.ts`: the six scripted scenarios of the old tests (`scenarios.ts`) play on a small fragment city
 * (`model.ts`), and the events, posts, notices, notes, strikes, replies and every resident's status each tick must be
 * those the old engine wrote for them, recorded once on `legacy` (`test/fixtures/old-engine/` there, the file of the
 * differential test without the old snapshots, here as `fixtures/holdout-differential.json`). `puzzles`,
 * `progression` and `exile` are stand-ins over the city, as on `legacy`; the posts, notices and notes go through the
 * real `channels` and its note desk. The exemptions of the DM cap are not compared: the cap's exemption is issue M5-68.
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation, ActorId, Envelope, ToolOutcome } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineGame, defineHead, defineMechanic, type MechanicUse } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { HoldoutPiecesService } from "../src/contract.ts";
import { standoffTribunal, StandoffTribunalOptions } from "../src/index.ts";
import type { FragmentModel } from "./model.ts";
import { SCENARIOS, type Action, type Scenario } from "./scenarios.ts";

const Lines = Type.Array(Type.String(), { description: "Lines" });
const Record_ = Type.Object({ events: Lines, posts: Lines, notices: Lines, notes: Lines, strikes: Lines, replies: Lines, status: Lines, exempt: Lines }, { description: "What the old run wrote" });
const OLD = Value.Parse(Type.Record(Type.String(), Record_), JSON.parse(readFileSync(new URL("fixtures/holdout-differential.json", import.meta.url), "utf8")));
const HOLDOUT = Value.Parse(Type.Object({ holdout: Type.Unknown() }), JSON.parse(readFileSync(new URL("../../../oracles/whispers/setup/whispers.story.json", import.meta.url), "utf8"))).holdout;
const OPTIONS = Value.Parse(StandoffTribunalOptions, { author: "COURIER", ...Value.Parse(Type.Object({}, { additionalProperties: true }), HOLDOUT) });
const DIRECTOR = { call: "callTribunal", drawLot: "drawLot", announce: "announceTribunal", permaDeath: "permaDeath" } as const;

const stub = <T>(value: T) => () => value;

// The stand-ins of `puzzles`, `progression` and `exile` over the city (old `stand-ins.ts`).
function standIns(model: FragmentModel, strikes: string[]): readonly MechanicUse[] {
	const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: the pieces of the city.", provides: [HoldoutPiecesService] }), {
		services: { "holdout-pieces": { openFragmentDoors: () => [...model.openDoors()], lacking: ({ level, holder }) => [...model.lacking(level, holder)], inherited: ({ resident, level }) => model.inherited(resident, level).map((entry) => ({ ...entry })) } },
	});
	const levels = defineMechanic(defineHead({ id: "progression", package: "@test/progression", summary: "Test: the levels of the city.", provides: [ProgressionService] }), {
		services: {
			progression: {
				...{ levelOf: ({ resident }) => model.levelOf(resident), hasPassed: ({ resident, level }) => model.hasPassed(resident, level), isOpenOnClock: ({ level }) => model.doors.has(level), isFinished: stub(false), hasSolved: stub(false) },
				...{ passed: stub([]), lastProgress: stub(-1), currentAct: stub(1), actStart: stub(null), door: stub(null), doorShut: stub(false), openDoor: stub(false), releaseDoor: stub(null), unlock: stub(null), ranking: stub([]) },
				...{ holdersBehind: stub([]), nextPenalty: stub(0), nextBlamePenalty: stub(0), chargeBlame: stub(0), endAct: stub(false), opensAt: stub(0), bounds: stub({ startLevel: 1, lastLevel: 3, survivors: 1 }) },
			},
		},
	});
	const exile = defineMechanic(defineHead({ id: "exile", package: "@test/exile", summary: "Test: who is in the city.", provides: [ExileService] }), {
		services: {
			exile: {
				banish: ({ resident, by }) => {
					strikes.push(`${resident} ${by ?? ""}`);
					model.exiled.add(resident);
					return { ok: true };
				},
				...{ alive: () => [...model.alive()], standing: ({ resident }) => model.standing(resident), isExiled: ({ resident }) => model.exiled.has(resident), toGate: stub(null), exiled: stub([]) },
				...{ exiledBy: stub(null), gates: stub([]), ransomed: stub(false), bequeathed: stub([]) },
			},
		},
	});
	return [levels(), pieces(), exile()];
}

const answer = (outcome: ToolOutcome): string => (outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`.trim());
const Payload = Type.Record(Type.String(), Type.Unknown(), { description: "A payload" });
const fields = (event: Envelope) => Value.Parse(Payload, event.payload);

// What the run wrote, in the shapes of the old record (old `recordOf` and the old stand-ins' recorder).
function recordOf(log: readonly Envelope[], strikes: readonly string[], replies: readonly string[], status: readonly string[]) {
	const of = (source: string, type: string) => log.filter((event) => event.source.endsWith(`/${source}`) && event.type === type).map(fields);
	return {
		events: log.filter((event) => event.source.endsWith("/standoff-tribunal")).map((event) => JSON.stringify({ type: event.type, ...fields(event), minute: event.tick })),
		posts: of("channels", "board_post").map((post) => `${String(post.author)} ${String(post.text)}`),
		notices: of("channels", "notice").map((notice) => `${String(notice.to)} ${String(notice.author)} ${String(notice.text)}`),
		notes: of("channels", "gamemaker_note").map((note) => `tribunal ${String(note.number)} ${String(note.to)} ${String(note.text)}`),
		strikes: [...strikes],
		replies: [...replies],
		status: [...status],
	};
}

// Plays a scenario: every resident's holdout status is read in its turn, and the tick's steps run in the last turn.
async function play(scenario: Scenario) {
	const model = scenario.model();
	const strikes: string[] = [];
	const game = defineGame({
		id: "holdout-differential",
		seed: 7,
		residents: [...scenario.residents],
		mechanics: [...standIns(model, strikes), channels(), standoffTribunal(OPTIONS)],
		grants: { script: Object.values(DIRECTOR) },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: scenario.minutes },
	});
	const { kernel } = testKernel(game);
	const replies: string[] = [];
	const status: string[] = [];
	const submit = async (actor: ActorId, as: string, params: unknown) => {
		replies.push(answer(await kernel.submit({ actor, as, params })));
	};
	const step = async (action: Action): Promise<void> => {
		if (action.kind === "give") model.give(action.to, action.holder, action.door);
		else if (action.kind === "pass") model.pass(action.agent);
		else if (action.kind === "gate") model.gate.set(action.agent, action.until);
		else if (action.kind === "exile") model.exiled.add(action.agent);
		else if (action.kind === "vote") await submit(`resident:${action.agent}`, "tribunalVote", { yes: action.yes });
		else {
			const { kind, ...params } = action;
			await submit("script", DIRECTOR[kind], params);
		}
	};
	let parts = new Map<string, string>();
	const driver = async (activation: Activation): Promise<void> => {
		const notes = activation.inputs.filter((note) => note.source.endsWith("standoff-tribunal") && note.kind === "status");
		parts.set(activation.actor.slice("resident:".length), JSON.stringify(notes.map((note) => note.text)));
		if (parts.size < scenario.residents.length) return;
		for (const action of scenario.steps[activation.tick] ?? []) await step(action);
		for (const agent of scenario.residents) status.push(`${String(activation.tick)} ${agent} ${parts.get(agent) ?? "missing"}`);
		parts = new Map();
	};
	await kernel.run({ resident: driver }, { ticks: scenario.minutes });
	return recordOf(kernel.log.all(), strikes, replies, status);
}

describe("standoff-tribunal against the old HoldoutTribunal (stand-in puzzles, progression, exile)", () => {
	it.each(SCENARIOS)("%s: the same events, posts, notices, notes, strikes, replies and status", async (name, scenario) => {
		const old = OLD[name] ?? Value.Parse(Record_, {});
		// The old exemptions are carried with the file and taken as they are (M5-68).
		expect({ ...(await play(scenario())), exempt: old.exempt }).toEqual(old);
	});

	it("covers every tool's reply, every refusal code and every way a tribunal ends", async () => {
		const records = await Promise.all(SCENARIOS.map(([, scenario]) => play(scenario())));
		const codes = new Set(records.flatMap((record) => record.replies).map((text) => /^([A-Z_]+):/.exec(text)?.[1]));
		for (const code of ["NOT_NOW", "INVALID_ACCUSED", "NOT_A_BLOCKER", "UNKNOWN_AGENT", "INVALID_CANDIDATES", "ALREADY_DRAWN", "NOT_ALLOWED", "NO_LOT", "NOTHING_TO_ANNOUNCE", "TOOL_LOCKED"]) expect(codes, code).toContain(code);
		const outcomes = new Set(records.flatMap((record) => record.events).flatMap((line) => /"outcome":"([^"]+)"/.exec(line)?.[1] ?? []));
		expect(outcomes).toEqual(new Set(["dropped", "banished", "lot", "spared"]));
		expect(records.flatMap((record) => record.notices).some((line) => line.includes("You now hold its fragment"))).toBe(true);
		expect(records.flatMap((record) => record.strikes)).toContain("A02 holdout");
	});
});
