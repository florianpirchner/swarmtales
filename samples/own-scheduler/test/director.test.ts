// SPDX-License-Identifier: LicenseRef-SUL-1.0
// Test 8 of section 3.7 of the M4 specification: a Director under `parallel`, and the pause between ticks.
import { SwtError, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { humanHand } from "@swarmtales/mechanic-human-hand";
import { defineDirector, defineGame } from "@swarmtales/sdk";
import { play, replay, testKernel } from "@swarmtales/testkit";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { parallel } from "../src/index.ts";
import { board } from "./board.ts";

const schedulers = { turns, parallel };
const host = defineDirector(
	{ id: "host", summary: "Hears every post.", on: [{ event: "board.posted" }], output: Type.Null({ description: "Nothing." }) },
	{ system: () => "s", input: () => "i", act: () => Promise.resolve() },
);
const gameOf = (kinds?: readonly string[]) =>
	defineGame({
		id: "board-director",
		residents: 2,
		mechanics: [board({}), humanHand()],
		directors: [{ use: host }],
		scheduler: { id: "parallel", options: { activation: "always", ...(kinds === undefined ? {} : { kinds: [...kinds] }) } },
		end: { ticks: 3 },
	});
const game = gameOf(["resident", "director"]);

// A promise that a driver opens, to hold another driver open until then.
function gate(): { readonly promise: Promise<void>; readonly open: () => void } {
	let open = (): void => undefined;
	const promise = new Promise<void>((resolve) => {
		open = resolve;
	});
	return { promise, open };
}
const later = (): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, 0);
	});

// A01 posts in tick 0 and stays open until the Director has taken its firing; A02 closes after a macrotask.
function driversOf(): Readonly<Record<string, ActorDriver>> {
	const heard = gate();
	return {
		"resident:A01": async (activation) => {
			await activation.call("post", {});
			if (activation.tick === 0) await heard.promise;
		},
		"resident:A02": later,
		director: async (activation) => {
			await activation.call("take", {});
			heard.open();
		},
	};
}
const seqOf = (log: readonly Envelope[], type: string, actor: string): number => log.find((event) => event.type === type && event.actor === actor)?.seq ?? -1;
const codesOf = (run: () => unknown): readonly string[] => {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error.issues.map((issue) => issue.code);
		throw error;
	}
	return [];
};

describe("parallel: a Director", () => {
	it("wakes the Director by a firing at the next close, while a resident is still open, and the log replays", async () => {
		const { events } = await play(game, { schedulers, drivers: driversOf() });
		const director = events.filter((event) => event.type === "activation_opened" && event.actor === "director:host");
		const detail = (payload: unknown): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, "detail") : undefined);
		expect(director.map((event) => [event.tick, detail(event.payload)])).toEqual([0, 1, 2].map((tick) => [tick, { reason: "news", n: 1 }]));
		const opened = seqOf(events, "activation_opened", "director:host");
		expect(seqOf(events, "activation_opened", "resident:A01")).toBeLessThan(opened);
		expect(opened).toBeLessThan(seqOf(events, "activation_closed", "resident:A01"));
		expect(opened).toBe(seqOf(events, "activation_closed", "resident:A02") + 1);
		expect((await replay({ game, log: events, schedulers })).issue).toBeUndefined();
	});

	it("is SWT-D003 when `kinds` does not name `director`", () => {
		expect(codesOf(() => testKernel(gameOf(), { schedulers }))).toContain("SWT-D003");
		expect(codesOf(() => testKernel(gameOf(["resident"]), { schedulers }))).toContain("SWT-D003");
		expect(codesOf(() => testKernel(game, { schedulers }))).toEqual([]);
	});
});

describe("parallel: the pause", () => {
	it("pauses between ticks through `humanHand.paused`: no activation is open, the run loop holds, and the log replays", async () => {
		const { kernel } = testKernel(game, { schedulers });
		const drivers = driversOf();
		// The run loop's rule: a tick is played only while the fact `humanHand.paused` is false.
		const step = async (): Promise<boolean> => {
			if (kernel.fact("humanHand.paused") === true) return false;
			await kernel.run(drivers, { ticks: 1 });
			return true;
		};
		expect(await step()).toBe(true);
		const before = kernel.log.length;
		expect(kernel.log.all().at(-1)?.type).toBe("tick_ended");
		expect(await kernel.submit({ actor: "human", as: "pause", params: { reason: "a look" } })).toMatchObject({ ok: true });
		expect([await step(), await step(), kernel.tick]).toEqual([false, false, 1]);
		expect(() => kernel.snapshot()).not.toThrow();
		expect(kernel.log.all().slice(before).map((event) => [event.actor, event.type])).toEqual([["human", "tool_called"], ["human", "paused"], ["human", "tool_result"]]);
		await kernel.submit({ actor: "human", as: "resume", params: {} });
		while (kernel.ended === undefined) expect(await step()).toBe(true);
		expect(kernel.ended).toMatchObject({ reason: "ticks", tick: 3 });
		expect((await replay({ game, log: kernel.log.all(), schedulers })).issue).toBeUndefined();
	});
});
