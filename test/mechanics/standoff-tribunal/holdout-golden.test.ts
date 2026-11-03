/**
 * The holdout tribunal's strict golden gate (carve-decisions.md D-12) on the Whispers log: its
 * owned lines (`goldenDiff`, the five `blocker_found` of minute 3), their order (`goldenOrder`),
 * its status parts in every golden turn input, the gamemaker's "Blockers" and "Holdout tribunal"
 * sections from its facts, and the replies of every golden call of a holdout tool (`compareReplies`).
 *
 * Puzzles and progression are stand-ins over the golden's inputs, never its holdout lines: the deal
 * (`fragments_dealt`), the levels (`level_up` of the minutes before), the story's door clock and the
 * DMs sent, read as the old `lackingFragment` and `#holdsFragment` read them. The real T3 mechanics
 * do not provide `openFragmentDoors`, `inherited` and `isOpenOnClock` yet (request R2-6). Channels,
 * exile and the note desk are stand-ins too.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Host, TurnTaker } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, NotesApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { compareReplies, dropJustified, goldenCalls, goldenDiff, goldenOrder, goldenTurnInputs, inputPart, ownedBy, type LegacyLine } from "@swarmtales/testkit";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { goldenLog, RESIDENTS, storyOf } from "../puzzles/harness.ts";
import { legacyLines, startHost } from "../standoff/support/host.ts";
import { probe } from "../standoff/support/probe.ts";
import { provider } from "../standoff/support/provider.ts";
import { HOLDOUT_RULE } from "./rule.ts";

const NAME = "whispers-f10-grudge";
const HOLDOUT_TOOLS = new Set(["tribunalVote", "callTribunal", "drawLot", "announceTribunal", "permaDeath"]);

/** The city of the golden run as the old world saw it at a minute's start: deal, levels, door clock and DMs. */
class GoldenCity {
	readonly #deals = new Map<number, { readonly teams: ReadonlyMap<string, number>; readonly fragments: ReadonlyMap<string, string> }>();
	readonly #opensAt = new Map<number, number>();

	constructor(readonly golden: readonly LegacyLine[]) {
		for (const line of golden) {
			if (line.type !== "fragments_dealt" || !Array.isArray(line.holdings)) continue;
			const holdings = line.holdings.flatMap((entry: unknown) =>
				typeof entry === "object" && entry !== null && "agent" in entry && "team" in entry && "fragment" in entry ? [{ agent: String(entry.agent), team: Number(entry.team), fragment: String(entry.fragment) }] : [],
			);
			this.#deals.set(Number(line.level), { teams: new Map(holdings.map((entry) => [entry.agent, entry.team])), fragments: new Map(holdings.map((entry) => [entry.agent, entry.fragment])) });
		}
		for (const level of storyOf(NAME).levels) if (level.opensAt !== undefined) this.#opensAt.set(level.number, level.opensAt);
	}

	levelOf(resident: string, minute: number): number {
		const ups = this.golden.filter((line) => line.type === "level_up" && line.agent === resident && Number(line.minute) < minute);
		const last = ups[ups.length - 1];
		return last === undefined ? 1 : Number(last.to);
	}

	isOpen(level: number, minute: number): boolean {
		return minute >= (this.#opensAt.get(level) ?? 0);
	}

	openDoors(minute: number): readonly number[] {
		return [...this.#deals.keys()].sort((a, b) => a - b).filter((level) => this.isOpen(level, minute));
	}

	/** The DMs to `agent` sent before `minute`, joined, upper-cased and stripped as the old `#holdsFragment` reads them. */
	#received(agent: string, minute: number): string {
		return this.golden
			.filter((line) => line.type === "dm_sent" && line.to === agent && Number(line.minute) < minute)
			.map((line) => String(line.text).toUpperCase().replace(/[^A-Z0-9]/g, ""))
			.join("");
	}

	/** Old `lackingFragment` (nobody is exiled in the golden run, so nothing is inherited). */
	lacking(level: number, holder: string, minute: number): readonly string[] {
		const deal = this.#deals.get(level);
		const fragment = deal?.fragments.get(holder);
		const team = deal?.teams.get(holder);
		if (deal === undefined || fragment === undefined || this.levelOf(holder, minute) < level) return [];
		return [...deal.teams.entries()]
			.filter(([member, of]) => of === team && member !== holder && this.levelOf(member, minute) === level)
			.map(([member]) => member)
			.filter((member) => !this.#received(member, minute).includes(fragment))
			.sort((a, b) => a.localeCompare(b));
	}
}

/** The stand-ins read the city at the minute the clock set first thing in the minute. */
function cityStandIns(city: GoldenCity) {
	const clock = { minute: 0 };
	return [
		defineMechanic({ id: "clock", summary: "Sets the stand-ins' minute.", options: Type.Object({}), state: (): undefined => undefined, events: {} }, () => ({
			hooks: {
				minuteStarted: {
					order: 0,
					run: (ctx) => {
						clock.minute = ctx.minute;
					},
				},
			},
		})),
		provider("puzzles", PuzzlesApi, {
			openFragmentDoors: () => [...city.openDoors(clock.minute)],
			lacking: ({ level, holder }) => [...city.lacking(level, holder, clock.minute)],
			kindOf: () => "fragments" as const,
			inherited: () => [],
		}),
		provider("progression", ProgressionApi, {
			levelOf: ({ resident }) => city.levelOf(resident, clock.minute),
			hasPassed: ({ resident, level }) => city.levelOf(resident, clock.minute) > level,
			isOpenOnClock: ({ level }) => city.isOpen(level, clock.minute),
		}),
	];
}

/** Channels: every write recorded (the golden run calls no tribunal, so none is expected). */
function channelsStandIn(posts: string[]) {
	return provider("channels", ChannelsApi, {
		post: ({ author, text }) => {
			posts.push(`${author} ${text}`);
			return { postSeq: 0 };
		},
		notify: ({ to, author, text }) => {
			posts.push(`${to} ${author} ${text}`);
			return null;
		},
		lastNumber: () => 0,
	});
}

const exileStandIn = () =>
	provider("exile", ExileApi, {
		alive: () => [...RESIDENTS],
		standing: () => ({ kind: "alive" as const }),
	});

const notesStandIn = () => provider("notes", NotesApi, { check: ({ text }) => ({ ok: true as const, text: text.trim() }), record: () => null });

interface Played {
	readonly host: Host;
	readonly posts: readonly string[];
	/** The holdout's status parts per `minute:agent`. */
	readonly parts: ReadonlyMap<string, readonly string[]>;
	/** The facts after each minute. */
	readonly facts: readonly Readonly<Record<string, unknown>>[];
}

async function play(golden: readonly LegacyLine[]): Promise<Played> {
	const posts: string[] = [];
	const host = startHost({
		residents: [...RESIDENTS],
		minutes: 20,
		mechanics: [
			standoffTribunal.with(HOLDOUT_RULE),
			probe.with(),
			...cityStandIns(new GoldenCity(golden)).map((mechanic) => mechanic.with()),
			channelsStandIn(posts).with(),
			exileStandIn().with(),
			notesStandIn().with(),
		],
		residentTools: ["tribunalVote"],
		gamemakerTools: ["callTribunal", "drawLot", "announceTribunal", "permaDeath"],
	});
	const parts = new Map<string, readonly string[]>();
	const agent: TurnTaker = (turn) => {
		parts.set(`${String(turn.minute)}:${turn.resident}`, turn.inputs.filter((note) => note.source === "standoff-tribunal").map((note) => note.text));
		return Promise.resolve();
	};
	const facts: Readonly<Record<string, unknown>>[] = [];
	while (host.ended === undefined) {
		await host.playMinute(agent);
		facts.push(host.facts());
	}
	return { host, posts, parts, facts };
}

interface BlockerFact {
	readonly door: number;
	readonly blocker: string;
	readonly lacking: readonly string[];
	readonly passed: boolean;
	readonly since: number;
}

function isBlocker(value: unknown): value is BlockerFact {
	return typeof value === "object" && value !== null && "door" in value && "blocker" in value && "lacking" in value && "since" in value && "passed" in value;
}

/**
 * The old gamemaker's `holdoutLines` (packages/roles/src/gamemaker/situation.ts:187-245) from the
 * holdout's facts, for a city with no tribunal running (the golden calls none; the differential
 * test covers the tribunal's stages).
 */
function holdoutLines(facts: Readonly<Record<string, unknown>>, minute: number): readonly string[] {
	const blockers = (Array.isArray(facts["standoff-tribunal.blockers"]) ? facts["standoff-tribunal.blockers"] : []).filter(isBlocker);
	if (facts["standoff-tribunal.session"] !== null) throw new Error("a tribunal runs; this gate renders only a city without one");
	const struck = Array.isArray(facts["standoff-tribunal.struck"]) ? facts["standoff-tribunal.struck"].map(String) : [];
	const cooldownUntil = Number(facts["standoff-tribunal.cooldownUntil"]);
	const lines = [`Blockers (the city's facts: a resident at a door ${String(HOLDOUT_RULE.stallMinutes)}+ minutes, others before it ${String(HOLDOUT_RULE.stallMinutes)}+ minutes without its fragment):`];
	if (blockers.length === 0) lines.push("- nobody");
	for (const blocker of blockers) {
		const what = blocker.passed ? `${blocker.blocker} passed it and holds back its fragment from ${blocker.lacking.join(", ")}` : `${blocker.blocker} has not sent its fragment yet to ${blocker.lacking.join(", ")}`;
		lines.push(`- door ${String(blocker.door)}: ${what} (a blocker since minute ${String(blocker.since)})`);
	}
	lines.push("Holdout tribunal:");
	const accusable = [...new Set(blockers.map((blocker) => blocker.blocker))];
	lines.push(
		accusable.length === 0
			? "- none running; callTribunal needs a blocker"
			: minute < cooldownUntil
				? `- none running; a tribunal ended a short while ago, the next may be called from minute ${String(cooldownUntil)}`
				: `- none running. YOUR MOVE if a blocker holds the city: callTribunal on ${accusable.join(" or ")}` +
					(accusable.length > 1 ? ` (the city draws the accused by lot among all ${String(accusable.length)} blockers, whomever you name)` : ""),
	);
	lines.push(`- struck so far: ${struck.length === 0 ? "nobody" : struck.join(", ")}`);
	return [...lines, ""];
}

/** The holdout block of a golden gamemaker input: from the "Blockers" heading to the blank line after "Holdout tribunal:". */
function goldenHoldoutBlock(input: string): readonly string[] {
	const lines = input.split("\n");
	const start = lines.findIndex((line) => line.startsWith("Blockers (the city's facts"));
	if (start < 0) return [];
	const end = lines.indexOf("", start);
	return lines.slice(start, end + 1);
}

const isHoldoutPart = (part: string): boolean => part.startsWith("holdout tribunal on");

describe(`standoff-tribunal golden gate: ${NAME} (stand-in puzzles and progression over the golden deal, levels and DMs; stand-in channels, exile, notes)`, () => {
	const golden = goldenLog(NAME);

	it("writes exactly the golden holdout lines (goldenDiff): the five blockers of minute 3", async () => {
		const { host } = await play(golden);
		const expected = ownedBy(golden, ["standoff-tribunal"]);
		expect(expected.filter((line) => line.includes("blocker_found")).length).toBe(5);
		expect(goldenDiff(expected, ownedBy(legacyLines(host.log.all()), ["standoff-tribunal"]))).toEqual([]);
	});

	it("keeps the golden order of the holdout's lines (goldenOrder)", async () => {
		const { host } = await play(golden);
		// Only the holdout writes lines here (progression is a stand-in): its lines keep their minutes and order.
		const owners = ["standoff-tribunal"] as const;
		expect(goldenOrder(legacyLines(host.log.all()), owners)).toEqual(goldenOrder(golden, owners));
	});

	it("posts and notifies nothing, as the golden run (no tribunal was called)", async () => {
		const { posts } = await play(golden);
		expect(posts).toEqual([]);
	});

	it("shows the golden holdout parts in every golden turn input (none: no tribunal ran)", async () => {
		const { parts } = await play(golden);
		const inputs = goldenTurnInputs(golden);
		expect(inputs.length).toBeGreaterThan(0);
		const expected = inputs.map((input) => `${String(input.minute)}:${input.agent} ${JSON.stringify((inputPart(input, "[status] ") ?? "").slice("[status] ".length).split(" · ").filter(isHoldoutPart))}`);
		const actual = inputs.map((input) => `${String(input.minute)}:${input.agent} ${JSON.stringify(parts.get(`${String(input.minute)}:${input.agent}`) ?? [])}`);
		expect(actual).toEqual(expected);
	});

	it("gives the gamemaker the golden Blockers and Holdout tribunal sections from its facts", async () => {
		const { facts } = await play(golden);
		const turns = golden.filter((line) => line.type === "gamemaker_turn");
		expect(turns.length).toBeGreaterThan(0);
		const expected = turns.map((line) => goldenHoldoutBlock(String(line.input)));
		// The gamemaker's turn after round r reads the city after minute r - 1, at minute r.
		const actual = turns.map((line) => holdoutLines(facts[Number(line.round) - 1] ?? {}, Number(line.round)));
		expect(actual).toEqual(expected);
		expect(expected.some((block) => block.some((text) => text.includes("YOUR MOVE")))).toBe(true);
	});

	it("answers every golden call of a holdout tool as the old engine did (none in the golden)", () => {
		const calls = goldenCalls(golden);
		const { kept } = dropJustified(calls, (call) => !HOLDOUT_TOOLS.has(call.tool), "calls of other mechanics' tools; the holdout answers its five tools only");
		expect(compareReplies(kept, [])).toEqual([]);
	});
});
