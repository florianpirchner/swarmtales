// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Levels 8 to 10 played to their end and the feast of STEWARD (issue M5-47), carried from the old
 * `test/stories/cityofkeys-wall.test.ts` where it tests the game: no oracle file goes past the wall's first minutes.
 * The residents climb from what the city shows: every door's code from the facts of `puzzles` (the old observer view
 * of Act I, here for the wall and the ring too, since the factors' exchange is the carried tests' of `puzzles`), and on
 * the crossing four guests write to STEWARD and every resident submits only once its team's city factor of door 10
 * has reached it. What the old test asserted of the run's own rules is asserted here: the city factors of the wall and
 * the ring on the board, the crossing's factor privately to the first three guests, the fourth guest's message
 * collected by nobody, the table cleared 3 minutes after the first resident passes door 10 (v09, `FEAST_AFTER_SOLVE`),
 * then every resident on door 10 without its factor handed its own team's, once.
 */
import type { Activation, Envelope, Kernel } from "@swarmtales/contracts";
import { playStanding, scriptedDriver, type PlannedCall, type StandingDrivers } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { cityGame, CityParams } from "../game.ts";

const Solutions = Type.Array(Type.Object({ level: Type.Integer(), agent: Type.String(), code: Type.Union([Type.String(), Type.Null()]) }), { description: "The fact `puzzles.solutions`" });
const Levels = Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer() }), { description: "The fact `progression.levels`" });
const Deal = Type.Object({ teams: Type.Array(Type.Object({ team: Type.Integer(), cityFactor: Type.String() })), holdings: Type.Array(Type.Object({ agent: Type.String(), team: Type.Integer() })) }, { description: "A `factors_dealt` of the crossing" });

/** Four residents write to STEWARD; the table seats three. */
const GUESTS = ["A01", "A02", "A03", "A04"];
const LETTER = "May I have a seat at your table?";

function climb(kernel: Kernel, activation: Activation, wrote: Set<string>): readonly PlannedCall[] {
	const agent = activation.actor.slice("resident:".length);
	const level = Value.Parse(Levels, kernel.fact("progression.levels")).find((entry) => entry.agent === agent)?.level ?? 0;
	const code = Value.Parse(Solutions, kernel.fact("puzzles.solutions")).find((entry) => entry.agent === agent && entry.level === level)?.code;
	if (code === undefined || code === null) return [];
	if (level < 10) return [{ tool: "submitSolution", params: { level, code } }];
	if (GUESTS.includes(agent) && !wrote.has(agent)) {
		wrote.add(agent);
		return [{ tool: "sendDM", params: { target: "STEWARD", message: LETTER } }];
	}
	return activation.inputs.some((input) => input.text.includes("City factor of level 10: ")) ? [{ tool: "submitSolution", params: { level, code } }] : [];
}

const PARAMS = Value.Parse(CityParams, { agents: 6, minutes: 30, startLevel: 1, lastLevel: 10, passesPerMinute: 1, activation: "always", stopWhenDone: true, stopWhenSeatsDecided: false, personas: true, gamemaker: false, classifier: false, names: true, coreMotives: true, cast: [], figureDirection: 4, gmDirection: 4 });

const field = (value: unknown, name: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined);
const of = (events: readonly Envelope[], source: string, type: string): readonly Envelope[] => events.filter((event) => event.source.endsWith(`/${source}`) && event.type === type);

async function playTheWall(): Promise<readonly Envelope[]> {
	const wrote = new Set<string>();
	const drivers: StandingDrivers = (kernel) => ({ resident: scriptedDriver((activation) => climb(kernel, activation, wrote)), director: scriptedDriver(() => [{ tool: "take", params: {} }]) });
	return (await playStanding(cityGame(PARAMS), drivers, { seed: 7 })).events;
}

describe("city: the wall, the ring and the crossing (old cityofkeys-wall.test.ts)", () => {
	const run = playTheWall();

	it("lets every resident pass door 10", async () => {
		const events = await run;
		const passed = (agent: string): readonly unknown[] => of(events, "progression", "level_up").filter((event) => field(event.payload, "agent") === agent).map((event) => field(event.payload, "to"));
		for (const agent of ["A01", "A02", "A03", "A04", "A05", "A06"]) expect(passed(agent), agent).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
	}, 120_000);

	it("seats the first three guests of STEWARD at the feast", async () => {
		const events = await run;
		// The city factors of the wall and the ring go to the board; the crossing's privately, first to three guests.
		const revealed = of(events, "puzzles", "factor_revealed").map((event) => event.payload);
		expect(revealed.slice(0, 5).map((payload) => [field(payload, "level"), field(payload, "target")])).toEqual([[8, "board"], [9, "board"], [10, "notice"], [10, "notice"], [10, "notice"]]);
		const firstArrival = of(events, "progression", "level_up").find((event) => field(event.payload, "to") === 10);
		expect(of(events, "cast", "collection_started").map((event) => [event.tick, field(event.payload, "into")])).toEqual([[firstArrival?.tick, "feast"]]);
		const seated = revealed.slice(2, 5).flatMap((payload) => [field(payload, "agents")].flat());
		expect(new Set(seated).size).toBe(3);
		for (const guest of seated) expect(GUESTS).toContain(guest);
		expect(of(events, "channels", "dm_sent").filter((event) => field(event.payload, "from") === "STEWARD").map((event) => field(event.payload, "to")).sort()).toEqual([...seated].sort());
		expect(of(events, "cast", "cast_dm").filter((event) => [field(event.payload, "collections")].flat().length === 0)).toHaveLength(1);
	}, 120_000);

	it("clears the table and hands every resident on door 10 its own team's factor, once", async () => {
		const events = await run;
		// The table is cleared 3 minutes after the first resident passes door 10; then every resident on door 10 without
		// its factor gets its own team's, once, and never on the board.
		const firstPass = of(events, "progression", "level_up").find((event) => field(event.payload, "to") === 11);
		const shortened = of(events, "cast", "collection_shortened").map((event) => field(event.payload, "untilMinute"));
		expect(shortened).toEqual([(firstPass?.tick ?? 0) + 3]);
		const late = of(events, "puzzles", "factor_revealed").filter((event) => field(event.payload, "level") === 10).slice(3);
		for (const event of late) expect(event.tick).toBe(shortened[0]);
		const handed = of(events, "puzzles", "factor_revealed").filter((event) => field(event.payload, "level") === 10).flatMap((event) => [field(event.payload, "agents")].flat());
		expect([...handed].sort()).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
		const deal = Value.Parse(Deal, of(events, "puzzles", "factors_dealt").map((event) => event.payload).find((payload) => field(payload, "level") === 10));
		const notices = of(events, "channels", "notice").map((event) => event.payload);
		for (const holding of deal.holdings) {
			const factor = deal.teams.find((team) => team.team === holding.team)?.cityFactor ?? "";
			expect(notices.filter((payload) => field(payload, "to") === holding.agent && field(payload, "text") === `City factor of level 10: ${factor}.`), holding.agent).toHaveLength(1);
		}
		expect(of(events, "channels", "board_post").some((event) => String(field(event.payload, "text")).includes("City factor of level 10"))).toBe(false);
	}, 120_000);

	it("posts the courier lines of the wall, the ring and the crossing", async () => {
		const events = await run;
		const board = of(events, "channels", "board_post").map((event) => String(field(event.payload, "text")));
		// The courier lines of the wall, the ring and the crossing; only the cleared table may find nobody to hand to.
		for (const line of ["A wall is climbed in pairs.", "STEWARD sets a table for 3", "What you need now is held by someone"]) expect(board.some((text) => text.startsWith(line)), line).toBe(true);
		expect(of(events, "script", "director_skipped").filter((event) => field(event.payload, "rule") !== "table-cleared")).toEqual([]);
	}, 120_000);
});
