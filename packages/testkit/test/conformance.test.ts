// SPDX-License-Identifier: LicenseRef-SUL-1.0
import type { ActorDriver, GameData } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip } from "../src/conformance.ts";
import { scriptedDriver } from "../src/drivers.ts";
import { guessNumber } from "../src/fixtures/guess-number.ts";

// The planted fault of the round trip: the saved form keeps a count of at most 1, so a resumed run counts on from there.
const lossyHead = defineHead({
	id: "lossy",
	package: "@test/lossy",
	summary: "Counts, and forgets the count when it is saved.",
	options: Type.Object({ step: Type.Integer({ default: 1, description: "What one call adds." }), deep: Type.Optional(Type.Object({ bare: Type.Optional(Type.Boolean()) }, { description: "A group." })) }, { description: "The options." }),
	state: Type.Object({ count: Type.Integer() }),
	snapshot: { save: (state: { count: number }) => ({ count: Math.min(state.count, 1) }), load: (data) => ({ count: data.count }) },
	start: () => ({ count: 0 }),
	events: { counted: Type.Object({ count: Type.Integer() }) },
	tools: { add: { description: "Adds to the count.", params: Type.Object({}), for: ["resident"] } },
});
const lossy = defineMechanic(lossyHead, {
	tools: {
		add: {
			run(_params, ctx) {
				ctx.state.count += ctx.options.step;
				ctx.emit("counted", { count: ctx.state.count });
				return reply("Added.");
			},
		},
	},
});

const guessing = defineGame({ id: "guess", residents: 2, seed: 7, mechanics: [guessNumber({ max: 20 })], end: { ticks: 30 } });
const counting = defineGame({ id: "count", residents: 2, mechanics: [lossy()], end: { ticks: 4 } });
const guess = (): ActorDriver => scriptedDriver((activation) => [{ tool: "guess", params: { value: activation.tick + 1 } }]);
const add = (): ActorDriver => scriptedDriver(() => [{ tool: "add", params: {} }]);
const manifest = { name: "@swarmtales/testkit", swarmtales: { kind: "mechanic", class: "game", layer: "L3", mechanics: ["guessNumber"] } };

describe("checkDeterminism", () => {
	it("passes for two equal runs, also of a game in its data form", async () => {
		expect(await checkDeterminism(guessing, guess)).toEqual([]);
		const data: GameData = { schema: 1, id: "count", residents: 2, mechanics: [{ use: "lossy" }], end: { ticks: 2 } };
		expect(await checkDeterminism(data, add, { installed: { lossy }, seed: 3 })).toEqual([]);
	});

	it("finds a run that depends on something outside the seed", async () => {
		let runs = 0;
		const drifting = (): ActorDriver => {
			const value = ++runs;
			return scriptedDriver(() => [{ tool: "guess", params: { value } }]);
		};
		const problems = await checkDeterminism(guessing, drifting);
		expect(problems.length).toBeGreaterThan(0);
		expect(problems.join("\n")).toMatch(/^determinism: event \d+ differs:/m);
		expect(problems.length).toBeLessThanOrEqual(5);
	});
});

describe("checkSnapshotRoundTrip", () => {
	it("passes for a mechanic that saves its whole state", async () => {
		expect(await checkSnapshotRoundTrip(guessing, guess, 3)).toEqual([]);
	});

	it("finds state that the snapshot loses, although the two straight runs are equal", async () => {
		expect(await checkDeterminism(counting, add)).toEqual([]);
		const problems = await checkSnapshotRoundTrip(counting, add, 2);
		expect(problems.join("\n")).toMatch(/snapshot round trip: event \d+ differs:[^]*"count":5[^]*"count":2/);
	});

	it("reports a cut behind the end of the run instead of passing on nothing", async () => {
		expect(await checkSnapshotRoundTrip(counting, add, 4)).toEqual(["snapshot round trip: the run ended before the cut after 4 ticks, so nothing was resumed"]);
	});
});

describe("checkOptionsDocumented", () => {
	it("passes for the fixture and finds an option without a description at any depth", () => {
		expect(checkOptionsDocumented(guessNumber)).toEqual([]);
		expect(checkOptionsDocumented(lossy)).toEqual(['lossy: option "deep.bare" has no description']);
		expect(checkOptionsDocumented({ id: "blank", options: Type.Object({ size: Type.Integer({ description: " " }) }) })).toEqual(['blank: option "size" has no description']);
	});
});

describe("checkPackage", () => {
	it("passes when the head names the package and the package registers a mechanic", () => {
		expect(checkPackage(guessNumber, manifest)).toEqual([]);
	});

	it("finds a head that names another package as SWT-M011", () => {
		expect(checkPackage(lossy, manifest)).toEqual(['SWT-M011: mechanic "lossy" declares the package "@test/lossy", but lives in "@swarmtales/testkit"']);
	});

	it("finds a missing or wrong `swarmtales` field", () => {
		expect(checkPackage(guessNumber, { name: "@swarmtales/testkit", swarmtales: { layer: "L4" } }).join("\n")).toMatch(/package\.json\/swarmtales/);
		expect(checkPackage(guessNumber, { ...manifest, swarmtales: { ...manifest.swarmtales, mechanics: [] } })).toHaveLength(1);
		expect(checkPackage(guessNumber, { ...manifest, swarmtales: { ...manifest.swarmtales, class: "core" } }).join("\n")).toMatch(/swarmtales\/class/);
		expect(checkPackage(guessNumber, "no object").length).toBeGreaterThan(0);
	});
});
