// SPDX-License-Identifier: Apache-2.0
/**
 * The recorder of the viewer's fixture `packages/viewer-core/test/fixtures/parallel-run`: one race of test 5 of
 * section 3.7 (the mechanic `board`, `onNews`, two activations a tick, drivers that wait a seeded random time), seed
 * 3. A race is not reproducible, so the test does not compare a new race with the committed log: it replays the
 * committed log by the close line and fails when the platform does not write it again. To record the fixture anew,
 * delete its `events.jsonl` and run this test.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EnvelopeSchema, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { rngFor } from "@swarmtales/kernel";
import { defineGame } from "@swarmtales/sdk";
import { play, replay } from "@swarmtales/testkit";
import { Check } from "typebox/value";
import { expect, it } from "vitest";
import { parallel } from "../src/index.ts";
import { board } from "./board.ts";

const FIXTURE = fileURLToPath(new URL("../../../packages/viewer-core/test/fixtures/parallel-run/events.jsonl", import.meta.url));
const SEED = 3;
const schedulers = { turns, parallel };
const game = defineGame({ id: "race", seed: 7, residents: 4, mechanics: [board({ who: ["A01", "A02", "A03", "A04"] })], scheduler: { id: "parallel", options: { activation: "onNews", activations: 2 } }, end: { ticks: 4 } });

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

// The racer of test 5: zero to two posts, a seeded wait before each and before the return; pending one time in three.
const racer: ActorDriver = async (turn) => {
	const rng = rngFor(SEED, turn.actor, turn.tick, JSON.stringify(turn.detail));
	const posts = rng.int(0, 2);
	for (let post = 0; post < posts; post++) {
		await sleep(rng.int(0, 3));
		await turn.call("post", {});
	}
	await sleep(rng.int(0, 3));
	return rng.int(0, 2) === 0 ? { pending: true } : undefined;
};

const envelopes = (text: string): readonly Envelope[] =>
	text
		.split("\n")
		.filter((line) => line !== "")
		.map((line): unknown => JSON.parse(line))
		.filter((value) => Check(EnvelopeSchema, value));

it("the fixture `parallel-run` is a race of test 5 that replays to itself", async () => {
	if (!existsSync(FIXTURE)) {
		const { events } = await play(game, { schedulers, drivers: { resident: racer } });
		writeFileSync(FIXTURE, events.map((event) => `${JSON.stringify(event)}\n`).join(""));
	}
	const text = readFileSync(FIXTURE, "utf8");
	const log = envelopes(text);
	expect(log).toHaveLength(text.split("\n").length - 1);
	expect((await replay({ game, log, schedulers })).issue).toBeUndefined();
});
