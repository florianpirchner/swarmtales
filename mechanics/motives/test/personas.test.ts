// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The seeded personas (decision A95), carried from the old `test/agents/personas.test.ts` (kind `seeded`): the
 * persona of each seat that the old `assignPersonas` gave the oracle setups (the seat's old `agent_profile`,
 * `oracles/system-prompts.md`), the same deal from the same seed, the catalogue used again past its end, none without
 * a catalogue, no log line, and the same personas after a resume. A seat that plays a figure plays its figure's
 * profession instead, as the old host did (A98); a seat beyond the cast, or whose figure's profession the catalogue
 * lacks, falls back to the seeded deal.
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { Persona } from "../src/index.ts";
import { gameOf, setupOf, type Setup } from "./support.ts";

const Personas = Type.Record(Type.String(), Persona);
const namesOf = (test: TestKernel): Readonly<Record<string, string>> => Object.fromEntries(Object.entries(Value.Parse(Personas, test.fact("motives.personas"))).map(([id, persona]) => [id, persona.name]));

const WHISPERS = setupOf("whispers", "whispers");
const CITY = setupOf("cityofkeys", "cityofkeys");

describe("the personas of the old `assignPersonas`", () => {
	it.each([
		["whispers", 7, "A01", "Archivist"],
		["whispers", 7, "A06", "Merchant"],
		["whispers", 11, "A01", "Skeptic"],
		["cityofkeys", 7, "A01", "Gambler"],
		["cityofkeys", 11, "A01", "Recluse"],
	])("deals %s seed %i seat %s the %s, as the old run did", (game, seed, seat, name) => {
		expect(namesOf(testKernel(gameOf(setupOf(game, game), { seed })))[seat]).toBe(name);
	});

	it("gives a seat that plays a figure its figure's profession, and the seeded deal to a seat beyond the cast", () => {
		const n = (CITY.motives.figures?.length ?? 0) + 2;
		const test = testKernel(gameOf(CITY, { residents: n }));
		const played = Value.Parse(Type.Record(Type.String(), Type.Object({ figure: Type.Optional(Type.String()) }, { additionalProperties: true })), test.fact("motives.coreMotives"));
		const seeded = namesOf(testKernel(gameOf({ motives: { ...CITY.motives, figures: [] } }, { residents: n })));
		const expected = Object.fromEntries(
			Object.entries(played).map(([seat, { figure }]) => {
				const profession = CITY.motives.figures?.find((entry) => entry.id === figure)?.profession;
				return [seat, profession === undefined ? seeded[seat] : CITY.motives.personas?.find((persona) => persona.name.toLowerCase() === profession)?.name];
			}),
		);
		expect(Object.values(played).filter((entry) => entry.figure === undefined)).toHaveLength(2);
		expect(namesOf(test)).toEqual(expected);
	});

	it("falls back to the seeded deal when the catalogue has no persona of the figure's profession", () => {
		const figures = (CITY.motives.figures ?? []).map((figure) => ({ ...figure, profession: "nobody" }));
		const seeded = namesOf(testKernel(gameOf({ motives: { ...CITY.motives, figures: [] } })));
		expect(namesOf(testKernel(gameOf({ motives: { ...CITY.motives, figures } })))).toEqual(seeded);
	});

	it("deals every resident a distinct persona of the catalogue, the same from the same seed, other ones from other seeds", () => {
		const first = namesOf(testKernel(gameOf(WHISPERS)));
		expect(Object.keys(first)).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
		expect(new Set(Object.values(first)).size).toBe(6);
		expect(namesOf(testKernel(gameOf(WHISPERS)))).toEqual(first);
		const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => Object.values(namesOf(testKernel(gameOf(WHISPERS, { seed })))).join(",")));
		expect(orders.size).toBeGreaterThan(1);
	});

	it("uses the catalogue again when there are more residents than personas", () => {
		const names = Object.values(namesOf(testKernel(gameOf(WHISPERS, { residents: 8 }))));
		const counts = new Map<string, number>();
		for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
		expect([names.length, [...counts.values()].sort()]).toEqual([8, [1, 1, 1, 1, 2, 2]]);
	});

	it("deals none without a catalogue, and writes no log line for the deal", () => {
		const bare: Setup = { ...WHISPERS, motives: { ...WHISPERS.motives } };
		delete bare.motives.personas;
		const plain = testKernel(gameOf(bare));
		expect(plain.fact("motives.personas")).toEqual({});
		const dealt = testKernel(gameOf(WHISPERS));
		expect(dealt.kernel.log.all().map((event) => event.type)).toEqual(plain.kernel.log.all().map((event) => event.type));
	});

	it.each([
		["whispers", WHISPERS],
		["cityofkeys", CITY],
	])("deals the same personas of %s again when a run is resumed", async (_, setup) => {
		const test = testKernel(gameOf(setup));
		await test.playTicks(idleDriver, 2);
		const snapshot: unknown = JSON.parse(JSON.stringify(test.kernel.snapshot()));
		const resumed = testKernel(gameOf(setup), { resume: { snapshot, log: test.kernel.log.all() } });
		expect(resumed.fact("motives.personas")).toEqual(test.fact("motives.personas"));
	});
});
