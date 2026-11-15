// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { SwtError, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { defineGame, defineMechanic, reply } from "@swarmtales/sdk";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkSnapshotRoundTrip } from "../src/conformance.ts";
import { fakeDriver, scriptedDriver } from "../src/drivers.ts";
import { guessNumber, guessNumberHead } from "../src/fixtures/guess-number.ts";
import { play, testKernel } from "../src/play.ts";

const game = (max: number, scheduler: Record<string, unknown> = {}, residents = 2) =>
	defineGame({ id: "guess", residents, seed: 7, mechanics: [guessNumber({ max })], scheduler: { id: "turns", options: { order: "roster", ...scheduler } }, end: { ticks: 30 } });
const guesses = (events: readonly Envelope[]): readonly unknown[] => events.filter((event) => event.type === "guessed").map((event) => event.payload);
const opened = (events: readonly Envelope[]): readonly Envelope[] => events.filter((event) => event.type === "activation_opened");
const woken = (tick: number, actor: string): object => ({ tick, actor, payload: { detail: { reason: "toAct" } } });
// Every resident guesses the tick's number plus one: decided from the activation alone, so it fits a resumed run.
const counting = (): ActorDriver => scriptedDriver((activation) => [{ tool: "guess", params: { value: activation.tick + 1 } }]);

describe("guess-number", () => {
	it("is found in two guesses by a driver that reads the hint", async () => {
		// Between 1 and 3: the middle first, then the side the answer names.
		let next = 2;
		const halving: ActorDriver = async (activation) => {
			const outcome = await activation.call("guess", { value: next });
			expect(outcome).toMatchObject({ ok: true, endsTurn: true });
			if (outcome.ok) next = outcome.reply.includes("too low") ? 3 : 1;
		};
		const { end, events, kernel } = await play(game(3, {}, 1), { drivers: { resident: halving } });
		const made = guesses(events);
		expect(made).toHaveLength(2);
		expect(made[0]).toMatchObject({ by: "A01", value: 2 });
		expect(made[1]).toMatchObject({ by: "A01", hint: "right" });
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "guess-number.solved" });
		expect(events.find((event) => event.type === "limit_reached")?.payload).toEqual({ limit: "guess-number.solved", reason: "A01 found the secret" });
		expect(kernel.toolSpecs("resident").map((tool) => tool.name)).toEqual(["guess"]);
	});

	it("draws the secret from the seed and the option `max`, and plays the same run for the same seed", async () => {
		expect(await checkDeterminism(game(20), counting)).toEqual([]);
		const fake = (seed: number) => play(game(20), { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		const [first, again] = [await fake(3), await fake(3)];
		expect(again.events).toEqual(first.events);
		expect(guesses(first.events).length).toBeGreaterThan(0);
		const secrets = await Promise.all([1, 2, 3, 4, 5, 6].map(async (seed) => guesses((await play(game(20), { seed, drivers: { resident: counting() } })).events).length));
		expect(new Set(secrets).size).toBeGreaterThan(1);
		expect((await play(game(1), { drivers: { resident: counting() } })).end).toEqual({ reason: "limit", tick: 1, limit: "guess-number.solved" });
	});

	it("keeps its state in the snapshot: a run cut, written as JSON and resumed plays as the whole run", async () => {
		const whole = await play(game(20), { drivers: { resident: counting() } });
		expect(whole.end).toMatchObject({ reason: "limit" });
		expect(whole.end?.tick).toBeGreaterThan(2);
		expect(await checkSnapshotRoundTrip(game(20), counting, 2)).toEqual([]);
		const cut = await play(game(20), { drivers: { resident: counting() }, ticks: 2 });
		expect(cut.kernel.snapshot().plugins["guess-number"]).toMatchObject({ data: { secret: whole.end?.tick } });
	});

	it("a wrong payload is SWT-M021 and ends the run", async () => {
		const broken = defineMechanic(guessNumberHead, {
			tools: {
				guess: {
					run(params, ctx) {
						// @ts-expect-error -- the planted fault: `hint` is no hint of the head's schema
						ctx.emit("guessed", { by: "A01", value: params.value, hint: "warm" });
						return reply("ok");
					},
				},
			},
		});
		const test = testKernel(defineGame({ id: "broken", residents: 1, mechanics: [broken()], end: { ticks: 2 } }));
		const error: unknown = await test.call("A01", "guess", { value: 1 }).catch((thrown: unknown) => thrown);
		const codes = [];
		for (let at = error; at instanceof SwtError; at = at.cause) codes.push(at.code);
		expect(codes).toContain("SWT-M021");
		expect(test.kernel.ended).toMatchObject({ reason: "error" });
		expect(test.kernel.log.all().some((event) => event.type === "guessed")).toBe(false);
	});

	it("with the activation `toAct`, the scheduler wakes only whom the hook names", async () => {
		const { events, end } = await play(game(20, { activation: "toAct" }), { drivers: { resident: counting() } });
		const ticks = end?.tick ?? 0;
		expect(end).toMatchObject({ reason: "limit", limit: "guess-number.solved" });
		// While unsolved the hook names every resident; the first right guess ends the run before the second resident is woken.
		const expected = [...Array.from({ length: ticks - 1 }, (_, tick) => [woken(tick, "resident:A01"), woken(tick, "resident:A02")]).flat(), woken(ticks - 1, "resident:A01")];
		expect(opened(events)).toHaveLength(expected.length);
		expect(opened(events)).toMatchObject(expected);
		expect(events.some((event) => event.type === "activation_skipped")).toBe(false);
	});
});
