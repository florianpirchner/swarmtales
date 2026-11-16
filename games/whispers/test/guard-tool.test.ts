// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * B2 (runtime revision 8, `13-m6-spec.md` section 8, P480): the guard answers its review by a call of its tool
 * `verdict`, through the real asker of the models package over a scripted model. Its request offers that one tool
 * with the old text `guard/tool-verdict`, the system text alone; the verdict blocks the call; and the run replays
 * and resumes equal. The residents, the gamemaker and the Confessor play as in the fake run (`fake.ts`).
 */
import type { AskModel, Envelope } from "@swarmtales/contracts";
import { GUARD_VERDICT_TEXT } from "@swarmtales/city-directors";
import { createReviewPort, turns } from "@swarmtales/engine";
import { act, createAsker, createCostMeter, DIRECTOR_MODEL_RECORDS, scriptedSource, type ModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, play } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { whispersGame, WhispersParams } from "../game.ts";
import { fakeRun, RECORDS } from "./fake.ts";

const SEED = 7;
const GUARD = "director:guard";
const VERDICT = { allowed: false, reason: "The scripted guard keeps every text off the board." };
const game = whispersGame(Value.Parse(WhispersParams, Value.Default(WhispersParams, { minutes: 12 })));
const resolved = resolveGame({ game, seed: SEED, schedulers: { turns }, prompts: createPromptLookup(), records: RECORDS });
const records = [...RECORDS, DIRECTOR_MODEL_RECORDS];

// The scripted provider keeps a prompt cache of its own per binding, and a resumed run binds again: no cache here.
function uncached(source: ModelSource): ModelSource {
	return {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
			return {
				...binding,
				streamFn: async (model, context, options) => {
					const stream = await binding.streamFn(model, context, options);
					const push = stream.push.bind(stream);
					stream.push = (event) => {
						push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, input: 1, cacheRead: 0, cacheWrite: 0 } } } : event);
					};
					return stream;
				},
			};
		},
	};
}

// A fresh asker for each run: the guard calls `verdict` with the same verdict at every review; the tools it was offered are kept.
function asker(offered: unknown[] = []): AskModel {
	const source = uncached(scriptedSource({ [GUARD]: Array.from({ length: 500 }, () => act({ name: "verdict", args: VERDICT })) }));
	const seen: ModelSource = {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
			return { ...binding, streamFn: (model, context, options) => (offered.push(context.messages[0]), binding.streamFn(model, context, options)) };
		},
	};
	return createAsker(seen, createCostMeter(100), () => ({}));
}

const review = () => createReviewPort({ game: resolved, ask: asker() });
const field = (event: Envelope, name: string): unknown => (typeof event.payload === "object" && event.payload !== null ? Reflect.get(event.payload, name) : undefined);

describe("whispers: the guard answers by its tool (runtime revision 8)", () => {
	it("is offered the one tool verdict with its old text, and its call blocks the guarded text", async () => {
		const offered: unknown[] = [];
		const { drivers } = fakeRun(game, SEED);
		const { events } = await play(game, { seed: SEED, records, review: createReviewPort({ game: resolved, ask: asker(offered) }), drivers });
		const requests = events.filter((event) => event.source === DIRECTOR_MODEL_RECORDS.id && event.type === "request");
		expect(requests.length).toBeGreaterThan(0);
		// A record of a review is written into the call under review, so its actor is the author; the model asked is the guard's.
		expect(new Set(requests.map((event) => JSON.stringify(field(event, "tools"))))).toEqual(new Set([`["verdict"]`]));
		expect(offered).toHaveLength(requests.length);
		expect(offered[0]).toMatchObject({ role: "system", toolsAdded: [{ name: "verdict", description: GUARD_VERDICT_TEXT, parameters: { type: "object", required: ["allowed", "reason"] } }] });
		expect(JSON.stringify(offered[0])).not.toContain("Answer with one JSON value");
		const answered = events.filter((event) => event.type === "answered" && field(event, "answerer") === "guard");
		expect(answered.map((event) => field(event, "answer"))).toEqual(requests.map(() => VERDICT));
		expect(events.some((event) => event.type === "tool_refused" && field(event, "code") === "GUARD_BLOCKED" && field(event, "detail") === VERDICT.reason)).toBe(true);
	}, 120_000);

	it("replays equal, and resumed from three boundaries writes the straight log", async () => {
		const { drivers } = fakeRun(game, SEED);
		expect(await checkReplay(game, drivers, { seed: SEED, records, review })).toEqual([]);
		expect(await checkResumeEveryBoundary(game, drivers, { seed: SEED, records, review, boundaries: [1, 6, 11] })).toEqual([]);
	}, 300_000);
});
