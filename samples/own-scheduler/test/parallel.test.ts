// SPDX-License-Identifier: Apache-2.0
// Tests 1 to 4 of section 3.7 of the M4 specification: arrival order, the wake rule, `idle`, failures and resolution.
import { SwtError, type Activation, type ActorDriver, type Envelope, type Kernel } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { defineGame } from "@swarmtales/sdk";
import { idleDriver, play, testKernel, type PlayOptions } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { parallel } from "../src/index.ts";
import { board } from "./board.ts";

const schedulers = { turns, parallel };
type BoardOptions = Parameters<typeof board>[0];

const gameOf = (scheduler: { readonly id: string; readonly options?: Readonly<Record<string, unknown>> }, options: BoardOptions = {}) =>
	defineGame({ id: "board-game", residents: 2, mechanics: [board(options)], scheduler, end: { ticks: 3 } });
const run = (scheduler: Parameters<typeof gameOf>[0], options: BoardOptions, played: PlayOptions) => play(gameOf(scheduler, options), { schedulers, ...played });
const codeOf = async (promise: Promise<unknown>): Promise<string> => promise.then(() => "no error", (error: unknown) => (error instanceof SwtError ? error.code : String(error)));

// A promise that a test opens by hand, to interleave two drivers exactly.
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
const post = (activation: Activation) => activation.call("post", {});
const poster: ActorDriver = async (activation) => {
	await post(activation);
};
const byActor = (table: Readonly<Record<string, ActorDriver>>) => Object.fromEntries(Object.entries(table).map(([name, driver]) => [`resident:${name}`, driver]));
const short = (id: string): string => id.replace("resident:", "");

// `[tick, resident, reason, n]` of every activation_opened.
function opened(events: readonly Envelope[]): readonly (readonly unknown[])[] {
	return events.filter((event) => event.type === "activation_opened").map((event) => {
		const detail = event.payload !== null && typeof event.payload === "object" && "detail" in event.payload ? event.payload.detail : undefined;
		const { reason, n } = detail !== null && typeof detail === "object" && "reason" in detail && "n" in detail ? detail : { reason: undefined, n: undefined };
		return [event.tick, short(event.actor), reason, n];
	});
}
const at = (events: readonly Envelope[], type: string, actor: string, nth = 0): number => events.filter((event) => event.type === type && event.actor === `resident:${actor}`)[nth]?.seq ?? -1;
const next = (events: readonly Envelope[], seq: number): Envelope | undefined => events.find((event) => event.seq === seq + 1);

describe("parallel: arrival order", () => {
	it("commits the interleaved calls of two open activations in arrival order, each on its own actor's last answer", async () => {
		const [first, second, third] = [gate(), gate(), gate()];
		const drivers = byActor({
			A01: async (activation) => {
				await post(activation);
				first.open();
				await second.promise;
				await post(activation);
				third.open();
			},
			A02: async (activation) => {
				await first.promise;
				await post(activation);
				second.open();
				await third.promise;
				await post(activation);
			},
		});
		const { events } = await run({ id: "parallel", options: { activation: "always" } }, {}, { drivers, ticks: 1 });
		const calls = events.filter((event) => event.type === "tool_called");
		expect(calls.map((event) => short(event.actor))).toEqual(["A01", "A02", "A01", "A02"]);
		expect(events.filter((event) => event.type === "posted").map((event) => event.payload)).toEqual([1, 2, 3, 4].map((n, i) => ({ by: i % 2 === 0 ? "A01" : "A02", n })));
		for (const actor of ["A01", "A02"]) {
			const own = calls.filter((event) => event.actor === `resident:${actor}`);
			const opening = events.find((event) => event.seq === at(events, "activation_opened", actor));
			expect(own.map((event) => event.basis)).toEqual([opening?.basis, at(events, "tool_result", actor)]);
		}
		// The other actor's answer lies between, so the basis is not the log length at the call.
		expect(calls[2]?.basis).toBeLessThan(at(events, "tool_result", "A02"));
		expect(at(events, "activation_opened", "A02")).toBeLessThan(at(events, "activation_closed", "A01"));
	});
});

describe("parallel: the wake rule", () => {
	it("gives `always` its `activations` per tick, a second activation opening while another actor is open", async () => {
		const drivers = byActor({ A01: idleDriver, A02: later });
		const { events } = await run({ id: "parallel", options: { activation: "always", activations: 3 } }, {}, { drivers, ticks: 2 });
		const tick = (n: number) => [[n, "A01", "always", 1], [n, "A02", "always", 1], [n, "A01", "always", 2], [n, "A01", "always", 3], [n, "A02", "always", 2], [n, "A02", "always", 3]];
		expect(opened(events)).toEqual([...tick(0), ...tick(1)]);
		expect(at(events, "activation_opened", "A01", 2)).toBeLessThan(at(events, "activation_closed", "A02"));
	});

	it("wakes on news and on a pending answer under `onNews`, and a closed actor with news at the next close only", async () => {
		let kernel: Kernel | undefined;
		const before: number[] = [];
		const A01: ActorDriver = async (activation) => {
			if (activation.detail.n !== 2) return undefined;
			await post(activation);
			return { pending: true };
		};
		const A02: ActorDriver = async (activation) => {
			if (activation.detail.n !== 1) return;
			await later();
			await post(activation);
			await later();
			before.push(opened(kernel?.log.all() ?? []).filter((line) => line[1] === "A01").length);
		};
		const { events } = await run({ id: "parallel", options: { activations: 3 } }, {}, { drivers: (made) => ((kernel = made), byActor({ A01, A02 })), ticks: 2 });
		expect(opened(events)).toEqual([[0, "A01", "news", 1], [0, "A02", "news", 1], [0, "A01", "news", 2], [0, "A01", "answer", 3], [0, "A02", "news", 2]]);
		// A01 had news since A02's post, but waited for A02's close; the scan of the close runs at once.
		expect(before).toEqual([1]);
		expect(next(events, at(events, "activation_closed", "A02"))?.seq).toBe(at(events, "activation_opened", "A01", 1));
		const closeA01 = at(events, "activation_closed", "A01", 1);
		expect([next(events, closeA01)?.seq, next(events, closeA01 + 1)?.seq]).toEqual([at(events, "activation_opened", "A01", 2), at(events, "activation_opened", "A02", 1)]);
	});

	it("wakes under `toAct` whom the plugin names", async () => {
		const { events } = await run({ id: "parallel", options: { activation: "toAct" } }, { who: ["A02"] }, { ticks: 2 });
		expect(opened(events)).toEqual([[0, "A02", "toAct", 1], [1, "A02", "toAct", 1]]);
	});
});

describe("parallel: idle as under turns", () => {
	const both = (options: BoardOptions) =>
		Promise.all([run({ id: "turns", options: { activation: "onNews", order: "roster" } }, options, {}), run({ id: "parallel", options: { activation: "onNews" } }, options, {})]).then((runs) => runs.map((played) => played.end));

	it("ends by a limit in a quiet tick at the same tick under both schedulers: a quiet tick is not idle", async () => {
		const ends = await both({ endAfter: 2 });
		expect(ends).toEqual([0, 1].map(() => ({ reason: "limit", tick: 2, limit: "board.ended" })));
	});

	it("keeps the clock in a tick that is halted before its first scan: that tick is idle", async () => {
		const ends = await both({ haltAt: 1 });
		expect(ends).toEqual([0, 1].map(() => ({ reason: "limit", tick: 1, limit: "board.halted" })));
	});
});

describe("parallel: failures and resolution", () => {
	it("ends every open activation of a failed tick, then throws the first failure in the order of opening", async () => {
		let kernel: Kernel | undefined;
		const A01: ActorDriver = async (activation) => {
			await post(activation);
			await later();
			throw new Error("A01 broke");
		};
		const A02: ActorDriver = () => Promise.reject<undefined>(new Error("A02 broke"));
		const failed = run({ id: "parallel", options: { activation: "always", activations: 3 } }, {}, { drivers: (made) => ((kernel = made), byActor({ A01, A02 })) });
		await expect(failed).rejects.toThrow("A01 broke");
		const events = kernel?.log.all() ?? [];
		expect(opened(events)).toEqual([[0, "A01", "always", 1], [0, "A02", "always", 1]]);
		expect(events.filter((event) => event.type === "activation_closed").map((event) => [short(event.actor), event.payload])).toEqual([
			["A02", { actor: "resident:A02", calls: 0, outcome: "error" }],
			["A01", { actor: "resident:A01", calls: 1, outcome: "error" }],
		]);
	});

	it("fails an actor without a driver with SWT-R011, and opens nothing more once the run is halted", async () => {
		expect(await codeOf(run({ id: "parallel" }, {}, { drivers: byActor({ A01: idleDriver }) }))).toBe("SWT-R011");
		const halted = await run({ id: "parallel", options: { activation: "always", activations: 3 } }, { maxPosts: 1 }, { drivers: byActor({ A01: poster, A02: later }) });
		expect(halted.end).toMatchObject({ reason: "limit", limit: "board.full" });
		expect(opened(halted.events)).toEqual([[0, "A01", "always", 1], [0, "A02", "always", 1]]);
	});

	it("resolves `parallel` from the table, keeps the hash of a game without `scheduler.id`, and names the known ids", async () => {
		const plain = defineGame({ id: "board-game", residents: 2, mechanics: [board({})], end: { ticks: 3 } });
		const hash = (table: NonNullable<PlayOptions["schedulers"]>) => testKernel(plain, { schedulers: table }).kernel.snapshot().gameHash;
		expect(hash(schedulers)).toBe(hash({ turns }));
		expect((await run({ id: "parallel" }, {}, { ticks: 1 })).events.filter((event) => event.type === "pass_started")).toEqual([]);
		const unknown = run({ id: "fast" }, {}, {});
		expect(await codeOf(unknown)).toBe("SWT-G020");
		await expect(unknown).rejects.toThrow('known: "turns", "parallel"');
	});
});
