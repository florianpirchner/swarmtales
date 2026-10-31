/**
 * The seal's strict golden gate (carve-decisions.md D-12) on the two cityofkeys logs: its owned
 * lines (`goldenDiff`), its board posts, its status parts in every golden turn input, the order
 * among the seal, the goals and the cast (`goldenOrder`), the gamemaker's "Black seal" section from
 * the seal's facts, and the replies of every golden call of a seal tool (`compareReplies`).
 *
 * The other mechanics are stand-ins: progression writes `act_started` for Act II in the minute
 * the golden run's first resident reached level 8 (the old `#noteActStarts`) and `act_ended` at the
 * run's end; goals and cast write their golden lines in their slots of the order table.
 */
import { describe, expect, it } from "vitest";
import type { Host, TurnTaker } from "@swarmtales/contracts";
import { compareReplies, dropJustified, goldenCalls, goldenDiff, goldenOrder, goldenTurnInputs, inputPart, ownedBy, type LegacyLine } from "@swarmtales/testkit";
import { seal } from "@swarmtales/mechanic-seal";
import { SEAL } from "../../../stories/cityofkeys/characters.ts";
import { goldenLog } from "../puzzles/harness.ts";
import { legacyLines, startHost } from "../standoff/support/host.ts";
import { probe } from "../standoff/support/probe.ts";
import { channelsStandIn, ledgerStandIn } from "../standoff/support/world.ts";
import { actProgressionStandIn, castLinesStandIn, ConflictWorld, exileStandIn, goalsLinesStandIn, tribunalStandIn } from "./support.ts";

const LOGS = ["cityofkeys-f4g4", "cityofkeys-f10g10"] as const;
const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const SEAL_TOOLS = new Set(["bid", "permaDeath"]);

/** The minute the first resident reached `level` in a golden log. */
function reached(lines: readonly LegacyLine[], level: number): number {
	const line = lines.find((entry) => entry.type === "level_up" && entry.to === level);
	if (typeof line?.minute !== "number") throw new Error(`nobody reached level ${String(level)}`);
	return line.minute;
}

/** The old gamemaker's `sealLines` (packages/roles/src/gamemaker/situation.ts:249-260), from the seal's facts. */
function sealLines(facts: Readonly<Record<string, unknown>>): readonly string[] {
	const auction = facts["seal.auction"];
	const until = typeof auction === "object" && auction !== null && "until" in auction && typeof auction.until === "number" ? auction.until : undefined;
	const borne = Number(facts["seal.borne"]);
	const pending = Number(facts["seal.pending"]);
	const open = until === undefined ? 0 : 1;
	const parts = [
		...(until === undefined ? [] : [`an auction runs until minute ${String(until)} (bids are secret, also from you)`]),
		...(borne === 0 ? [] : [`${borne === 1 ? "someone bears an unused seal" : `${String(borne)} unused seals are borne`} (you do not know who)`]),
		...(pending > open ? [`${String(pending - open)} more to auction in this act`] : []),
	];
	if (parts.length === 0) return [];
	return ["Black seal (its bearer strikes one resident from the city at once):", ...parts.map((part) => `- ${part}`), ""];
}

/** The "Black seal" block of a gamemaker input, as lines, or none. */
function goldenSealBlock(input: string): readonly string[] {
	const lines = input.split("\n");
	const start = lines.indexOf("Black seal (its bearer strikes one resident from the city at once):");
	if (start < 0) return [];
	const end = lines.indexOf("", start);
	return lines.slice(start, end + 1);
}

const isSealPart = (part: string): boolean => part.startsWith("black seal auction") || part.startsWith("you bear a black seal");

interface Played {
	readonly host: Host;
	readonly world: ConflictWorld;
	/** The seal's status parts per `minute:agent`, first turn of the minute. */
	readonly parts: ReadonlyMap<string, readonly string[]>;
	/** The facts after each minute. */
	readonly facts: readonly Readonly<Record<string, unknown>>[];
}

async function play(golden: readonly LegacyLine[]): Promise<Played> {
	const world = new ConflictWorld(RESIDENTS);
	world.actStartAt.set(reached(golden, SEAL.act), SEAL.act);
	const host = startHost({
		residents: RESIDENTS,
		minutes: 12,
		mechanics: [
			seal.with(SEAL),
			probe.with(),
			goalsLinesStandIn(golden, SEAL.act).with(),
			castLinesStandIn(golden).with(),
			exileStandIn(world).with(),
			tribunalStandIn(world).with(),
			actProgressionStandIn(world).with(),
			ledgerStandIn(world).with(),
			channelsStandIn(world).with(),
		],
		residentTools: ["bid", "permaDeath"],
	});
	const parts = new Map<string, readonly string[]>();
	const agent: TurnTaker = (turn) => {
		const key = `${String(turn.minute)}:${turn.resident}`;
		if (!parts.has(key)) parts.set(key, turn.inputs.filter((note) => note.source === "seal").map((note) => note.text));
		return Promise.resolve();
	};
	const facts: Readonly<Record<string, unknown>>[] = [];
	while (host.ended === undefined) {
		await host.playMinute(agent);
		facts.push(host.facts());
	}
	return { host, world, parts, facts };
}

describe.each(LOGS)("seal golden gate: %s (stand-in exile, tribunal, progression, goals, cast, ledger, channels)", (name) => {
	const golden = goldenLog(name);

	it("writes exactly the golden seal lines (goldenDiff)", async () => {
		const { host } = await play(golden);
		expect(goldenDiff(ownedBy(golden, ["seal"]), ownedBy(legacyLines(host.log.all()), ["seal"]))).toEqual([]);
	});

	it("keeps the golden order among seal, goals and cast (goldenOrder)", async () => {
		const { host } = await play(golden);
		const owners = ["seal", "goals", "cast"] as const;
		expect(goldenOrder(legacyLines(host.log.all()), owners)).toEqual(goldenOrder(golden, owners));
	});

	it("posts the golden board posts of the seal", async () => {
		const { world } = await play(golden);
		// The city's posts the seal carries: the board post right before each seal line of the golden.
		const posts = golden.flatMap((line, index) => {
			const next = golden[index + 1];
			return line.type === "board_post" && typeof next?.type === "string" && next.type.startsWith("seal_") ? [`${String(line.author)} ${String(line.text)}`] : [];
		});
		expect(posts.length).toBeGreaterThan(0);
		expect(world.posts.map((post) => `${post.author} ${post.text}`)).toEqual(posts);
	});

	it("shows the golden seal parts in every golden turn input", async () => {
		const { parts } = await play(golden);
		const inputs = goldenTurnInputs(golden);
		expect(inputs.length).toBeGreaterThan(0);
		const expected = inputs.map((input) => `${String(input.minute)}:${input.agent} ${JSON.stringify((inputPart(input, "[status] ") ?? "").slice("[status] ".length).split(" · ").filter(isSealPart))}`);
		const actual = inputs.map((input) => `${String(input.minute)}:${input.agent} ${JSON.stringify(parts.get(`${String(input.minute)}:${input.agent}`) ?? [])}`);
		expect(actual).toEqual(expected);
		expect(expected.filter((line) => line.includes("black seal auction")).length).toBe(6);
	});

	it("gives the gamemaker the golden Black seal section from its facts", async () => {
		const { facts } = await play(golden);
		const turns = golden.filter((line) => line.type === "gamemaker_turn");
		expect(turns.length).toBeGreaterThan(0);
		const expected = turns.map((line) => goldenSealBlock(String(line.input)));
		// The gamemaker's turn after round r reads the city after minute r - 1.
		const actual = turns.map((line) => sealLines(facts[Number(line.round) - 1] ?? {}));
		expect(actual).toEqual(expected);
		expect(expected.some((block) => block.length > 0)).toBe(true);
	});

	it("answers every golden call of a seal tool as the old engine did (none in the scripted goldens)", () => {
		const calls = goldenCalls(golden);
		// The scripted goldens never bid or break a seal; the differential test covers every reply.
		const { kept } = dropJustified(calls, (call) => !SEAL_TOOLS.has(call.tool), "calls of other mechanics' tools; the seal answers bid and permaDeath only");
		expect(compareReplies(kept, [])).toEqual([]);
	});
});
