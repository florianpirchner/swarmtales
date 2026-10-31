/**
 * Fixes of the challenger review (docs/design/core-review-2c.md), part 1: labelled random streams
 * that draw what the old engine's `rngFor(seed, ...labels)` draws (problem 2), the order of status
 * parts within a kind (problem 4), options that keep the story's objects untouched and attributes
 * that only their owner reads (problem 11).
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, rngFor, storyData } from "@swarmtales/kernel";
import { playStory } from "@swarmtales/testkit";
import type { TurnNote } from "@swarmtales/contracts";

const IDS = ["A01", "A02", "A03", "A04", "A05", "A06"];

/** Deals with `rng("puzzle", level)` in the state setup and draws `rng("lottery", minute)` every minute. */
const dealer = defineMechanic(
	{
		id: "dealer",
		summary: "A test mechanic: labelled streams in the setup and in hooks.",
		options: Type.Object({}),
		state: (setup): { deal: string[]; seed: number } => ({ deal: setup.rng("puzzle", 1).shuffle(setup.residents), seed: setup.seed }),
		events: { drawn: Type.Object({ value: Type.Integer(), seed: Type.Integer() }) },
	},
	(kit) => ({
		hooks: {
			minuteStarted: (ctx) => {
				ctx.emit("drawn", { value: ctx.rng("lottery", "A01", ctx.minute).int(0, 1_000_000), seed: ctx.seed });
			},
		},
		facts: { deal: kit.fact(Type.Array(Type.String()), (view) => [...view.state.deal]) },
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ deal: Type.Array(Type.String()), seed: Type.Integer() }),
			save: (state) => ({ deal: [...state.deal], seed: state.seed }),
			load: (data) => ({ deal: [...data.deal], seed: data.seed }),
		}),
	}),
);

/** Writes an extra event every minute, before the dealer draws: `random()` would move, `rng` does not. */
const noisy = defineMechanic(
	{ id: "noisy", summary: "A test mechanic: extra events.", options: Type.Object({}), state: () => undefined, events: { noise: Type.Object({}) } },
	() => ({ hooks: { minuteStarted: (ctx) => {
		ctx.emit("noise", {});
	} } }),
);

function story(withNoise: boolean) {
	return defineCoreStory({ id: "streams", seed: 7, minutes: 4, residents: IDS, mechanics: withNoise ? [noisy.with(), dealer.with()] : [dealer.with()], grants: {} });
}

describe("labelled random streams (review problem 2)", () => {
	it("draws exactly what rngFor(seed, ...labels) draws, in the state setup and in hooks", async () => {
		const run = await playStory({ story: story(false) }, () => Promise.resolve());
		expect(run.host.facts()["dealer.deal"]).toEqual(rngFor(7, "puzzle", 1).shuffle(IDS));
		const drawn = run.events.filter((event) => event.type === "drawn").map((event) => event.payload);
		expect(drawn).toEqual([0, 1, 2, 3].map((minute) => ({ value: rngFor(7, "lottery", "A01", minute).int(0, 1_000_000), seed: 7 })));
	});

	it("gives the same numbers for a sequence of draws of every kind", () => {
		let draws: number[] = [];
		const probe = defineMechanic(
			{ id: "probe", summary: "A test mechanic: draws in runStarted.", options: Type.Object({}), state: () => undefined, events: {} },
			() => ({ hooks: { runStarted: (ctx) => {
				const stream = ctx.rng("seal", 3);
				draws = [stream.next(), stream.int(1, 6), ...stream.shuffle([1, 2, 3, 4, 5]), stream.pick([10, 20, 30]), stream.next()];
			} } }),
		);
		createHost({ story: defineCoreStory({ id: "probe", seed: 1234, minutes: 1, residents: 2, mechanics: [probe.with()], grants: {} }) }).start();
		const old = rngFor(1234, "seal", 3);
		expect(draws).toEqual([old.next(), old.int(1, 6), ...old.shuffle([1, 2, 3, 4, 5]), old.pick([10, 20, 30]), old.next()]);
	});

	it("does not move when other mechanics log more events", async () => {
		const quiet = await playStory({ story: story(false) }, () => Promise.resolve());
		const loud = await playStory({ story: story(true) }, () => Promise.resolve());
		const values = (events: typeof quiet.events) => events.filter((event) => event.type === "drawn").map((event) => JSON.stringify(event.payload));
		expect(values(loud.events)).toEqual(values(quiet.events));
		expect(loud.host.facts()["dealer.deal"]).toEqual(quiet.host.facts()["dealer.deal"]);
	});

	it("gives a turn policy the old engine's order stream", async () => {
		const orders: string[][] = [];
		const ordered = defineCoreStory({
			id: "ordered",
			seed: 7,
			minutes: 2,
			residents: IDS,
			mechanics: [],
			grants: {},
			turns: { passes: 2, order: (view) => view.rng("order", view.minute + 1, view.pass).shuffle(view.residents) },
		});
		const run = await playStory({ story: ordered }, () => Promise.resolve());
		for (const event of run.events) if (event.type === "pass_started" && typeof event.payload === "object" && event.payload !== null && "order" in event.payload && Array.isArray(event.payload.order)) orders.push(event.payload.order.map(String));
		expect(orders).toEqual([rngFor(7, "order", 1, 1).shuffle(IDS), rngFor(7, "order", 1, 2).shuffle(IDS), rngFor(7, "order", 2, 1).shuffle(IDS), rngFor(7, "order", 2, 2).shuffle(IDS)]);
	});
});

const part = (id: string, text: string, order?: number) =>
	defineMechanic({ id, summary: "A test mechanic: one status part.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
		hooks: { turnInputs: () => [order === undefined ? { kind: "status", text } : { kind: "status", text, order }, { kind: "notice", text: `${id} notice`, order: order === undefined ? 0 : -order }] },
	}));

describe("the order of lines within a kind (review problem 4)", () => {
	it("sorts the parts of a joined status line by order, not by load order", async () => {
		const seen: (readonly TurnNote[])[] = [];
		const parts = [part("points", "12 points", 20), part("minute", "minute 1", 10), part("plain", "plain"), part("rank", "rank 2", 30)];
		const ordered = defineCoreStory({
			id: "status",
			seed: 1,
			minutes: 1,
			residents: 1,
			mechanics: parts.map((definition) => definition.with()),
			grants: {},
			turns: { inputs: [{ kind: "status", join: " · " }, { kind: "notice" }] },
		});
		await playStory({ story: ordered }, (turn) => {
			seen.push(turn.inputs);
			return Promise.resolve();
		});
		expect(seen[0]?.map((note) => note.text)).toEqual(["plain · minute 1 · 12 points · rank 2", "rank notice", "points notice", "minute notice", "plain notice"]);
		expect(seen[0]?.every((note) => !("order" in note))).toBe(true);
	});
});

describe("options and attributes (review problem 11)", () => {
	it("fills defaults into a copy, so storyData does not depend on whether a host was created", () => {
		const optioned = defineMechanic(
			{
				id: "optioned",
				summary: "A test mechanic: an option with a default.",
				options: Type.Object({ start: Type.Integer({ default: 3, description: "A number." }), nested: Type.Object({ rate: Type.Integer({ default: 2, description: "A rate." }) }, { default: {}, description: "Nested." }) }),
				state: () => undefined,
				events: {},
			},
			() => ({}),
		);
		const fresh = defineCoreStory({ id: "options", seed: 1, minutes: 1, residents: 1, mechanics: [optioned.with({})], grants: {} });
		const before = JSON.stringify(storyData(fresh));
		createHost({ story: fresh });
		expect(JSON.stringify(storyData(fresh))).toBe(before);
		expect(before).toContain('"options":{}');
	});

	it("lets a mechanic read only its own attributes", () => {
		const seen: unknown[] = [];
		const writer = defineMechanic({ id: "writer", summary: "Writes an attribute.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
			hooks: { runStarted: (ctx) => {
				ctx.residents.setAttribute("A01", "mood", "glad");
				seen.push(ctx.residents.attribute("A01", "mood"));
			} },
		}));
		const reader = defineMechanic({ id: "reader", summary: "Reads it.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
			hooks: { runStarted: (ctx) => {
				seen.push(ctx.residents.attribute("A01", "mood"));
			} },
		}));
		createHost({ story: defineCoreStory({ id: "bags", seed: 1, minutes: 1, residents: 1, mechanics: [writer.with(), reader.with()], grants: {} }) }).start();
		expect(seen).toEqual(["glad", undefined]);
	});
});
