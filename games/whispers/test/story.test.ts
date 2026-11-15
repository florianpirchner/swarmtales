// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The old story tests of Whispers where they test the game (legacy `test/stories/whispers.test.ts`, "whispers in one
 * scripted run"), carried onto the game: one scripted run of all 45 minutes covers what no oracle file reaches, doors
 * 5 to 7 and the final vote (`12-m5-spec.md` 3.4). The run plays one pass per minute with every resident woken, no
 * gamemaker, Confessor or names, as the old host fixture did. Everyone DMs the whisperer at minute 0, opens each door
 * a minute after the clock opens it and names the favourite in every vote; the favourite tries door 2 early, the
 * sender posts its door-2 fragment, the whisperer rumours and forges a receipt of the sender's DM to the victim after
 * the first vote, and the sender exposes it with the real receipt.
 *
 * Not carried: the old definition tests (`validateStory`, the old sdk's puzzle builder, JSON round trips) test the
 * old builder, which this platform does not have (the data is pinned in `carried.test.ts`); the description of
 * `showReceipt` is pinned there too; the draw of every door for seeds 1 to 100 is a test of `puzzles`; and
 * `whispers-direction.test.ts` tests the system prompts of the figure direction, which are not carried (A89).
 */
import { nameOf, type Envelope, type Kernel } from "@swarmtales/contracts";
import { play, scriptedDriver, timelineOf, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { whispersGame, WhispersParams } from "../game.ts";

const DOORS = [1, 2, 3, 4, 5, 6, 7] as const;
const VOTES = [4, 10, 16, 22, 28, 34, 42] as const;
const RUMOUR = "the Veteran keeps his fragment back.";
const FORGED = "I will hold my fragment until the very end.";
const opensAt = (door: number): number => 6 * (door - 1);

const params = (more: Partial<WhispersParams>) => Value.Parse(WhispersParams, Value.Default(WhispersParams, { gamemaker: false, classifier: false, names: false, passesPerMinute: 1, activation: "always", ...more }));
const Solutions = Type.Array(Type.Object({ level: Type.Integer(), agent: Type.String(), code: Type.Union([Type.String(), Type.Null()]), fragment: Type.Union([Type.String(), Type.Null()]) }), { description: "The fact `puzzles.solutions`" });
const Counts = Type.Record(Type.String(), Type.Integer(), { description: "A count per resident" });

const payloadOf = (event: Envelope): Readonly<Record<string, unknown>> => (typeof event.payload === "object" && event.payload !== null ? Object.fromEntries(Object.entries(event.payload)) : {});
const ofType = (events: readonly Envelope[], type: string): readonly Readonly<Record<string, unknown>>[] => events.filter((event) => event.type === type).map(payloadOf);

interface Cast {
	readonly whisperer: string;
	readonly sender: string;
	readonly victim: string;
	readonly favourite: string;
}

function castOf(kernel: Kernel): Cast {
	const whisperer = Value.Parse(Type.String({ description: "The whisperer" }), kernel.fact("whispers.whisperer"));
	const [sender, victim, favourite] = Value.Parse(Type.Array(Type.String({ description: "A resident" })), kernel.fact("roster.residents")).filter((id) => id !== whisperer);
	if (sender === undefined || victim === undefined || favourite === undefined) throw new TypeError("too few residents");
	return { whisperer, sender, victim, favourite };
}

// The receipt of the sender's message to the whisperer at minute 0.
function receiptOf(kernel: Kernel, { sender, whisperer }: Cast): string {
	const issued = kernel.log.all().map(payloadOf).find((payload) => payload.kind === "dm" && String(payload.parties) === `${sender},${whisperer}`);
	return typeof issued?.receipt === "string" ? issued.receipt : "R-none";
}

// The door a resident submits at a tick: each door a minute after the clock opens it, and the favourite's door 2 early.
const doorOf = (cast: Cast, id: string, tick: number): number | undefined => DOORS.find((number) => opensAt(number) + 1 === tick) ?? (id === cast.favourite && tick === 2 ? 2 : undefined);

// The calls that only the sender and the whisperer make, by resident and tick.
function plotOf(kernel: Kernel, cast: Cast, fragment: string): ReadonlyMap<string, readonly PlannedCall[]> {
	const { sender, victim, whisperer } = cast;
	return new Map([
		[`${sender} 6`, [{ tool: "postBoard", params: { message: `Mine: ${fragment}` } }]],
		[
			`${whisperer} 9`,
			[
				{ tool: "sendDM", params: { target: victim, message: `${sender} told me ${RUMOUR}` } },
				{ tool: "forgeReceipt", params: { to: victim, receiptId: receiptOf(kernel, cast), text: FORGED } },
			],
		],
		[`${sender} 11`, [{ tool: "showReceipt", params: { receiptId: receiptOf(kernel, cast), to: victim } }]],
	]);
}

// The calls of one resident at one tick (the old `scriptOf`).
function callsOf(kernel: Kernel, cast: Cast, id: string, tick: number): readonly PlannedCall[] {
	const solution = (level: number) => Value.Parse(Solutions, kernel.fact("puzzles.solutions")).find((entry) => entry.level === level && entry.agent === id);
	if (tick === 0) return id === cast.whisperer ? [] : [{ tool: "sendDM", params: { target: cast.whisperer, message: `Hello from ${id}.` } }];
	const door = doorOf(cast, id, tick);
	if (door !== undefined) return [{ tool: "submitSolution", params: { level: door, code: solution(door)?.code } }];
	const plot = plotOf(kernel, cast, String(solution(2)?.fragment)).get(`${id} ${String(tick)}`);
	if (plot !== undefined) return plot;
	return VOTES.some((vote) => vote === tick) ? [{ tool: "nameFavourite", params: { agent: id === cast.favourite ? cast.whisperer : cast.favourite } }] : [];
}

/**
 * Plays 45 minutes, or `more.minutes`, at seed 7; each resident makes the calls of `plan` (none when absent).
 *
 * @param more - The params besides the old host fixture's.
 * @param plan - The calls of one resident at one tick, given the cast.
 * @returns The played run, the calls with their outcomes, every tool a resident had open at an activation, and the texts of a resident's inputs.
 */
async function run(more: Partial<WhispersParams>, plan?: (kernel: Kernel, cast: Cast, id: string, tick: number) => readonly PlannedCall[]) {
	const record: CallRecord[] = [];
	const open = new Map<string, Set<string>>();
	const played = await play(whispersGame(params(more)), {
		seed: 7,
		drivers: (kernel) => {
			let cast: Cast | undefined;
			return {
				resident: scriptedDriver((activation) => {
					const id = nameOf(activation.actor);
					open.set(id, new Set([...(open.get(id) ?? []), ...kernel.openTools(activation.actor)]));
					if (plan === undefined) return [];
					cast ??= castOf(kernel);
					return plan(kernel, cast, id, activation.tick);
				}, record),
			};
		},
	});
	const inputs = (id: string): string => timelineOf(played.events).flatMap((entry) => (entry.k === "turn" && entry.resident === id ? entry.inputs.map((input) => input.text) : [])).join("\n");
	return { ...played, record, inputs, opened: (id: string, tool: string): boolean => open.get(id)?.has(tool) === true };
}

const refusals = (record: readonly CallRecord[], id: string, tool: string): readonly string[] => record.flatMap((call) => (nameOf(call.actor) === id && call.tool === tool && !call.outcome.ok ? [`${call.outcome.code}: ${call.outcome.detail ?? ""}`] : []));

// The whole scripted run, played once for the tests that read it.
let whole: ReturnType<typeof run> | undefined;
async function scriptedRun() {
	whole ??= run({}, callsOf);
	const played = await whole;
	const residents = Value.Parse(Type.Array(Type.String({ description: "A resident" })), played.kernel.fact("roster.residents"));
	return { ...played, residents, cast: castOf(played.kernel) };
}

describe("whispers in one scripted run", () => {
	it("plays seven doors on the clock, a door refused before it opens, and the guard", async () => {
		const { events, record, residents, cast } = await scriptedRun();
		expect(ofType(events, "whisperer_chosen")).toEqual([{ agent: cast.whisperer }]);
		expect(ofType(events, "motive_dealt")).toHaveLength(6);
		// The first resident through each door gets +5, and the city says so.
		const firsts = ofType(events, "director_action").filter((event) => String(event.rule).startsWith("first-through-") && event.action === "grant");
		expect(firsts.map((event) => event.rule)).toEqual(DOORS.map((door) => `first-through-${String(door)}`));
		for (const [index, event] of firsts.entries()) expect(event.actor).toBe(ofType(events, "level_up").find((up) => up.to === index + 2)?.agent);
		expect(ofType(events, "board_post").filter((post) => post.author === "CITY" && /is the first through door \d/.test(String(post.text)))).toHaveLength(7);
		expect(refusals(record, cast.favourite, "submitSolution")).toEqual(["DOOR_CLOSED: door 2 opens at minute 6; the city takes no code before"]);
		expect(ofType(events, "notice").filter((notice) => String(notice.text).startsWith("Door 2 is open now, at minute 6.")).map((notice) => notice.to).sort()).toEqual([...residents].sort());
		// The guard refuses the sender's fragment on the board without a model (this run has none).
		expect(refusals(record, cast.sender, "postBoard")).toEqual(["GUARD_BLOCKED: the post carries part of a fragment; fragments travel by DM"]);
	}, 120_000);

	it("gives the whisperer alone its duty and forgery, and the real receipt exposes the forged one", async () => {
		const { events, kernel, inputs, opened, residents, cast } = await scriptedRun();
		const { whisperer, sender, victim } = cast;
		// The duty notice right after every vote is counted, for the whisperer alone; nothing before the first.
		const duties = events.filter((event) => event.type === "whisper_duty");
		expect(duties.map((duty) => [duty.tick, payloadOf(duty).agent])).toEqual([6, 12, 18, 24, 30, 36, 44].map((tick) => [tick, whisperer]));
		expect(duties[1]?.payload).toMatchObject({ since: 6, dms: 1, forgeries: 1 });
		for (const id of residents) expect([inputs(id).includes("Time to whisper"), opened(id, "forgeReceipt"), opened(id, "nameFavourite")], id).toEqual([id === whisperer, id === whisperer, true]);
		expect(ofType(events, "receipt_forged")).toMatchObject([{ by: whisperer, to: victim, from: sender, text: `Hello from ${sender}.`, forged: FORGED }]);
		for (const [by, text] of [[whisperer, FORGED], [sender, `Hello from ${sender}.`]]) expect(inputs(victim)).toContain(`${by} shows you a receipt: the city verifies R-0001: DM #1 from ${sender}, delivered to ${whisperer} at minute 0, text ${JSON.stringify(text)}`);
		expect(Value.Parse(Counts, kernel.fact("marks.remaining"))).toMatchObject({ [whisperer]: 4, [sender]: 4, [victim]: 5 });
	}, 120_000);

	it("holds seven votes to the final one, and everyone ends past door 7 with the old points", async () => {
		const { events, kernel, residents, cast } = await scriptedRun();
		const { whisperer, favourite } = cast;
		// Five name the favourite, who names the whisperer; +5 six times and +15 at the end.
		expect(events.filter((event) => event.type === "popularity_opened").map((event) => [event.tick, payloadOf(event).until, payloadOf(event).points])).toEqual(VOTES.map((tick, index) => [tick, tick + 2, index === 6 ? 15 : 5]));
		expect(ofType(events, "popularity_ballot")).toHaveLength(42);
		expect(ofType(events, "popularity_result").map((result) => result.winners)).toEqual(VOTES.map(() => [favourite]));
		// The board ranks every resident, 0 votes too, never who named whom.
		const ranking = String(ofType(events, "board_post").find((post) => String(post.text).startsWith("The city has counted the vote (before door 2)"))?.text);
		const votesOf = new Map([[favourite, 5], [whisperer, 1]]);
		for (const id of residents) expect(ranking).toContain(`${id} ${String(votesOf.get(id) ?? 0)}`);
		const firsts = ofType(events, "director_action").filter((event) => event.action === "grant");
		const prize = new Map([[favourite, 6 * 5 + 15]]);
		const balances = Value.Parse(Counts, kernel.fact("ledger.balances"));
		for (const id of residents) expect(balances[id], id).toBe(10 + 7 * 10 + 5 * firsts.filter((event) => event.actor === id).length + (prize.get(id) ?? 0));
		expect(kernel.fact("progression.levels")).toEqual(residents.map((agent) => ({ agent, level: 8, held: false })));
	}, 120_000);

	it("plays the control run without a whisperer, duty or forgery tool", async () => {
		const { events, kernel, opened } = await run({ whisperer: false, minutes: 7 });
		expect(kernel.fact("whispers.whisperer")).toBeNull();
		expect([ofType(events, "whisperer_chosen"), ofType(events, "whisper_duty")]).toEqual([[], []]);
		for (const id of ["A01", "A02", "A03", "A04", "A05", "A06"]) expect(opened(id, "forgeReceipt"), id).toBe(false);
	}, 120_000);

	it("binds no forgery in the rumours variant, but still whispers and votes", async () => {
		const { events, kernel, inputs, opened } = await run({ receipts: false, minutes: 7 });
		expect(events.filter((event) => event.type === "whisper_duty").map((duty) => duty.tick)).toEqual([6]);
		const whisperer = String(kernel.fact("whispers.whisperer"));
		expect(inputs(whisperer)).toContain("Time to whisper, until minute 7: about ballots, plans and how the others see someone.");
		for (const id of ["A01", "A02", "A03", "A04", "A05", "A06"]) expect([opened(id, "forgeReceipt"), opened(id, "showReceipt")], id).toEqual([false, false]);
		expect(events.filter((event) => event.type === "popularity_opened").map((event) => [event.tick, event.payload])).toEqual([[4, { round: 1, until: 6, points: 5 }]]);
	}, 120_000);
});
