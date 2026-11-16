// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The remaining params of the City (issue M5-48): the cast choice (old `--cast`) and the direction dials, with the
 * old command line's refusals as `SWT-G041` of the family. From figure direction 6 a figure plays no persona (old
 * `led`, `apps/cli/src/host/residents.ts`): with every seat a figure the prompts are those without personas, and a
 * seat beyond a partial cast keeps its seeded persona (M5-90); the rest of the old prompt at 6 and above is not
 * carried (A89).
 */
import { residentPrompts } from "@swarmtales/cli/src/resident-prompts.ts";
import { SwtError } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { familyParams, resolveGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { cityFamily, cityGame, CityParams } from "../game.ts";

const texts = createPromptLookup();
const SIX = ["auditor", "banner", "believer", "broker", "candle", "clerk"];
const Played = Type.Record(Type.String(), Type.Object({ figure: Type.Optional(Type.String()) }, { additionalProperties: true }), { description: "The core motive per resident, with its figure" });

const paramsOf = (overrides: Readonly<Record<string, unknown>>): CityParams => Value.Parse(CityParams, Value.Default(CityParams, { minutes: 12, ...overrides }));

// The code and the param of the refusal of a build, or undefined when the game builds.
function refusal(overrides: Readonly<Record<string, unknown>>): readonly [string, unknown] | undefined {
	try {
		cityGame(paramsOf(overrides));
		return undefined;
	} catch (error) {
		if (!(error instanceof SwtError)) throw error;
		return [error.code, error.issues[0]?.details?.param];
	}
}

// The kernel of a run before it starts, and the prompts the live run builds then.
function started(overrides: Readonly<Record<string, unknown>>, seed = 7) {
	const game = resolveGame({ game: cityGame(paramsOf(overrides)), schedulers: { turns }, prompts: texts, seed });
	const kernel = createKernel(game.definition, {});
	return { kernel, prompts: residentPrompts(game, texts, kernel) };
}

describe("city: the cast and the direction dials", () => {
	it("defaults to a seeded cast at directions 4 and 4, the old story's", () => {
		const { params, issues } = familyParams(cityFamily);
		expect(issues).toEqual([]);
		expect([params.cast, params.figureDirection, params.gmDirection]).toEqual([[], 4, 4]);
	});

	it.each([
		[{ agents: 7 }, "agents"],
		[{ cast: ["auditor"], coreMotives: false }, "cast"],
		[{ figureDirection: 8, coreMotives: false }, "figureDirection"],
		[{ cast: ["auditor", "auditor"] }, "cast"],
		[{ cast: ["auditor", "nobody"] }, "cast"],
		[{ cast: [...SIX, "tally"] }, "cast"],
	])("refuses %j with SWT-G041 on the param %s", (overrides, param) => {
		expect(refusal(overrides)).toEqual(["SWT-G041", param]);
	});

	it("refuses a dial outside 0 to 10 by its schema (SWT-G041)", () => {
		const { issues } = familyParams(cityFamily, { figureDirection: 11, gmDirection: -1 });
		expect(issues.map((issue) => [issue.code, issue.details?.param])).toEqual([["SWT-G041", "figureDirection"], ["SWT-G041", "gmDirection"]]);
	});

	it("builds the dials the old command line let through: no cast, a cast without direction, a full cast at 10, direction 5 as 4", () => {
		for (const overrides of [{ cast: [] }, { cast: ["auditor"] }, { cast: SIX, figureDirection: 10 }, { figureDirection: 6 }, { cast: ["auditor", "banner"], figureDirection: 6 }, { coreMotives: false }]) expect(refusal(overrides)).toBeUndefined();
		expect(resolveGame({ game: cityGame(paramsOf({ figureDirection: 5 })), schedulers: { turns }, prompts: texts }).data).toEqual(resolveGame({ game: cityGame(paramsOf({})), schedulers: { turns }, prompts: texts }).data);
	});

	it("deals the named figures, and drawn core motives to the residents beyond the cast", () => {
		const played = Value.Parse(Played, started({ cast: ["auditor", "banner"] }).kernel.fact("motives.coreMotives"));
		const figures = Object.values(played).map((entry) => entry.figure);
		expect(figures.filter((figure) => figure !== undefined).sort()).toEqual(["auditor", "banner"]);
		expect(figures.filter((figure) => figure === undefined)).toHaveLength(4);
		expect(Object.values(Value.Parse(Played, started({ cast: SIX }).kernel.fact("motives.coreMotives"))).map((entry) => entry.figure).sort()).toEqual(SIX);
	});

	it.each([7, 11])("seed %i: from figure direction 6 every seat plays its figure without a persona, the old `led`", (seed) => {
		const plain = started({}, seed).prompts;
		const led = started({ figureDirection: 6 }, seed).prompts;
		expect(led).toEqual(started({ personas: false }, seed).prompts);
		for (const [actor, prompt] of Object.entries(led)) expect(prompt, actor).not.toBe(plain[actor]);
		expect(started({ figureDirection: 5 }, seed).prompts).toEqual(plain);
	});

	it.each([7, 11])("seed %i: at figure direction 6 a partial cast drops the figures' personas and keeps the seeded one beyond the cast", (seed) => {
		const cast = ["auditor", "banner"];
		const { kernel, prompts } = started({ cast, figureDirection: 6 }, seed);
		const played = Value.Parse(Played, kernel.fact("motives.coreMotives"));
		const bare = started({ cast, personas: false }, seed).prompts;
		const seeded = started({ cast }, seed);
		const figureSeats = Object.keys(played).filter((seat) => played[seat]?.figure !== undefined);
		expect(figureSeats).toHaveLength(2);
		expect(Object.keys(Value.Parse(Type.Record(Type.String(), Type.Unknown()), kernel.fact("motives.personas"))).sort()).toEqual(Object.keys(played).filter((seat) => !figureSeats.includes(seat)).sort());
		const figureActors = figureSeats.map((seat) => `resident:${seat}`);
		expect(Object.keys(prompts)).toHaveLength(6);
		for (const [actor, prompt] of Object.entries(prompts)) expect(prompt, actor).toBe(figureActors.includes(actor) ? bare[actor] : seeded.prompts[actor]);
		for (const actor of figureActors) expect(prompts[actor], actor).not.toBe(seeded.prompts[actor]);
	});
});
