// SPDX-License-Identifier: Apache-2.0
/** `replay`: a log played again from its inputs alone; the first differing line; what is refused. */
import { setTimeout as sleep } from "node:timers/promises";
import { SwtError, type ActorDriver, type Envelope, type RecordSource } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGame, resolveGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { guessNumber } from "../src/fixtures/index.ts";
import { play, testKernel } from "../src/play.ts";
import { replay } from "../src/replay.ts";

const MODEL: RecordSource = {
	id: "@test/model",
	events: { request: Type.Object({ lines: Type.Integer({ description: "The input lines." }) }, { description: "A request." }), response: Type.Object({ text: Type.String({ description: "The answer." }) }, { description: "An answer." }) },
};
const game = defineGame({ id: "guess", residents: 2, seed: 7, mechanics: [guessNumber({ max: 1000 })], scheduler: { id: "turns", options: { order: "roster", blockSize: 2 } }, end: { ticks: 3 } });
const script = { A01: [["guess", { value: 4 }], ["guess", { value: "many" }]], A02: [["guess", { value: 900 }]] } as const;

// A driver like a model's: a record when the request starts and one when the answer is there, then the call. A01
// is slow, so A02's records are in the log before A01's call although A02 plays after A01.
const model: ActorDriver = async (turn) => {
	turn.record(MODEL.id, "request", { lines: turn.inputs.length });
	await sleep(turn.actor === "resident:A01" ? 12 : 1);
	turn.record(MODEL.id, "response", { text: "a guess" });
	await turn.call("guess", { value: turn.tick + 1 });
};

// A run with records inside and outside activations and a call between two ticks.
async function recorded(): Promise<readonly Envelope[]> {
	const test = testKernel(game, { records: [MODEL] });
	test.kernel.record(MODEL.id, "script", "request", { lines: 0 });
	await test.playTicks(model, 1);
	await test.call("A02", "guess", { value: 500 });
	await test.playTicks(model, 2);
	return test.kernel.log.all();
}

const where = (log: readonly Envelope[], type: string, actor: string): number => log.findIndex((event) => event.type === type && event.actor === actor);

describe("replay", () => {
	it("replays a scripted run equal, from the game in its builder form and in its resolved form", async () => {
		const { events } = await play(game, { script });
		expect(events.filter((event) => event.type === "tool_refused")).toHaveLength(1);
		const again = await replay({ game, log: events });
		expect([again.equal, again.firstDifference, again.issue]).toEqual([true, undefined, undefined]);
		expect(again.log).toEqual(events);
		const resolved = resolveGame({ game, schedulers: { turns }, prompts: createPromptLookup() });
		expect((await replay({ game: resolved, log: events })).equal).toBe(true);
	});

	it("takes the seed from the log and ignores the stamp `at` of a log file", async () => {
		const { events } = await play(game, { seed: 99, script });
		const file = events.map((event) => ({ ...event, at: "2026-11-14T10:00:00.000Z" }));
		expect((await replay({ game, log: file })).equal).toBe(true);
	});

	it("names the first differing line when one payload was changed", async () => {
		const { events } = await play(game, { script });
		const at = where(events, "guessed", "resident:A02");
		const changed = events.map((event, index) => (index === at ? { ...event, payload: { by: "A02", value: 900, hint: "low" } } : event));
		const again = await replay({ game, log: changed });
		expect(again.equal).toBe(false);
		expect(again.firstDifference).toEqual({ line: at + 1, expected: changed[at], got: events[at] });
		expect(again.issue).toMatchObject({ code: "SWT-T003", where: { line: at + 1 } });
		// A changed input changes the lines after it: the call itself is repeated as it stands in the log.
		const call = where(events, "tool_called", "resident:A02");
		const other = events.map((event, index) => (index === call ? { ...event, payload: { as: "guess", params: { value: 1 } } } : event));
		expect((await replay({ game, log: other })).firstDifference?.line).toBe(call + 2);
		expect((await replay({ game, log: events.slice(0, -1) })).firstDifference).toMatchObject({ line: events.length, expected: undefined });
	});

	it("writes the records at their lines and submits a call between two ticks, without the driver that made them", async () => {
		const log = await recorded();
		expect(where(log, "response", "resident:A02")).toBeLessThan(where(log, "tool_called", "resident:A01"));
		expect(log.filter((event) => event.source === MODEL.id)).toHaveLength(13);
		expect(log.filter((event) => event.type === "tool_called" && event.causedBy === undefined)).toHaveLength(1);
		const again = await replay({ game, log, records: [MODEL] });
		expect([again.equal, again.firstDifference]).toEqual([true, undefined]);
		// Without the record source the records are results nobody writes: the first one is the first difference.
		await expect(replay({ game, log })).resolves.toMatchObject({ equal: false, firstDifference: { line: 2 } });
	});

	it("refuses a call outside an activation inside a tick with SWT-T004", async () => {
		const { events } = await play(game, { script });
		const call = where(events, "tool_called", "resident:A01");
		const loose = events.map((event, index): Envelope => (index === call ? { seq: event.seq, tick: event.tick, source: event.source, type: event.type, actor: event.actor, payload: event.payload } : event));
		const error: unknown = await replay({ game, log: loose }).catch((thrown: unknown) => thrown);
		expect(error instanceof SwtError ? [error.code, error.message.includes(`line ${String(call + 1)} `)] : error).toEqual(["SWT-T004", true]);
	});
});
