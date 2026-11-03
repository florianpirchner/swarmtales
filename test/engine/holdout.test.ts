/**
 * The holdout tribunal (Whispers v3, SPEC 20; LH10, P62): who blocks a door,
 * the tribunal's rules (grace, unanimous votes, at most three, then a lot),
 * the strike and the fragments it releases, played on the Whispers story
 * itself with the city's own clock.
 *
 * Step 18 (team D4): the old cases drove the engine's `World` directly. These play the Whispers
 * story on a bare host with every real mechanic (`hostStoryOf`, the production mapping) and a probe
 * for the puzzles' `lacking`; the residents' and the gamemaker's calls go through `host.call`
 * between two minutes, after the minute's hooks, where the old calls fell. The changed assertions
 * are listed in `docs/design/step18-decisions.md` (Team D4).
 */
import { describe, expect, it } from "vitest";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { type CompetitorId, competitorIds, createHost, defineHead, defineMechanic, reply, rngFor } from "@swarmtales/kernel";
import { legacySink, MemorySink } from "@swarmtales/chronicle";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { idleAgent } from "@swarmtales/testkit";
import { validateStory } from "@swarmtales/sdk";
import type { AnyStory, Host, HostSnapshot, ToolContextOf, ToolOutcome } from "@swarmtales/contracts";
import { ExileApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { BlockersFact, PendingFact, SessionFact } from "@swarmtales/mechanic-standoff-tribunal";
import { hostStoryOf, type HostRun } from "../../apps/cli/src/host/story.ts";
import whispers, { whispersStory } from "../../stories/whispers/story.ts";
import { balanceOf, codeOf, factOf, fragmentOf, levelOf, problemText } from "../helpers/host-inspect.ts";
import { SUPPORT_PROMPTS } from "../mechanics/exile/support/host.ts";

const IDS = competitorIds(6);
const AUTHOR = "COURIER";
const MINUTES = 45;

const probeHead = defineHead({
	id: "probe",
	summary: "Test probe: runs a function as a tool.",
	options: Type.Object({}),
	state: (): undefined => undefined,
	events: {},
	uses: [PuzzlesApi, ExileApi],
	prompts: { "probe/tools/probe": [] },
});

let probeAction: ((ctx: ToolContextOf<typeof probeHead>) => void) | undefined;

const probe = defineMechanic(probeHead, (kit) => ({
	tools: [
		kit.tool({
			name: "probe",
			description: "probe/tools/probe",
			parameters: Type.Object({}),
			suggest: ["script"],
			execute: (_params, ctx) => {
				probeAction?.(ctx);
				return reply("probed");
			},
		}),
	],
}));

interface City {
	readonly host: Host;
	/** The legacy lines the host wrote since it was created (old `MemorySink` on the world's bus). */
	readonly log: MemorySink;
	/**
	 * Plays the city's minutes up to and including `minute` and holds that minute open in its between
	 * slot (after the residents' turns, where the gamemaker acts), so that the calls that follow fall
	 * in that minute, as the old calls did after `world.startMinute(minute)`.
	 */
	readonly at: (minute: number) => Promise<void>;
	/** The minute held open. */
	readonly minute: () => number;
	/** Plays the held minute to its end (old: nothing; the snapshot is taken between minutes). */
	readonly close: () => Promise<void>;
	/** Old `lackingFragment(level, holder)`: the puzzles' `lacking`, asked through the probe. */
	readonly lacking: (level: number, holder: string) => Promise<readonly string[]>;
	/** Old `world.alive`. */
	readonly alive: () => Promise<readonly string[]>;
}

function runOf(seed: number, gamemaker: boolean): HostRun {
	return {
		residents: IDS,
		seed,
		minutes: MINUTES,
		arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 6, stopWhenDone: false, stopWhenSeatsDecided: false },
		names: false,
		coreMotives: true,
		whisperer: true,
		guards: true,
		gamemaker,
		figureDirection: 4,
		gmDirection: 4,
	};
}

/** The Whispers city of six with IDs, its minute 0 held open; `restore` resumes a host snapshot and its log at its next minute. */
async function city(options: { readonly story?: AnyStory; readonly seed?: number; readonly restore?: { readonly snapshot: HostSnapshot; readonly events: readonly unknown[] }; readonly holdout?: boolean } = {}): Promise<City> {
	const { definition } = hostStoryOf(options.story ?? whispers, runOf(options.seed ?? 11, options.holdout ?? true));
	let hold: { readonly minute: number; readonly entered: () => void; readonly gate: Promise<void> } | undefined;
	let held: { readonly minute: number; readonly release: () => void; readonly done: Promise<unknown> } | undefined;
	const host = createHost({
		story: { ...definition, mechanics: [...definition.mechanics, probe.with()] },
		prompts: createPromptLookup({ mechanics: { ...mechanicPromptFolders(), probe: SUPPORT_PROMPTS } }),
		between: async (minute) => {
			if (hold?.minute !== minute) return;
			const { entered, gate } = hold;
			entered();
			await gate;
		},
		...(options.restore === undefined ? {} : { resume: options.restore }),
	});
	const log = new MemorySink();
	host.subscribe(
		legacySink((event) => {
			log.record(event);
		}),
	);
	host.start();
	const ask = async <T>(run: (ctx: ToolContextOf<typeof probeHead>) => T | undefined): Promise<T> => {
		const out: T[] = [];
		probeAction = (ctx) => {
			const value = run(ctx);
			if (value !== undefined) out.push(value);
		};
		const outcome = await host.call("script", "probe", {});
		probeAction = undefined;
		const [value] = out;
		if (!outcome.ok || value === undefined) throw new Error("the probe did not answer");
		return value;
	};
	const close = async (): Promise<void> => {
		if (held === undefined) return;
		const { release, done } = held;
		held = undefined;
		release();
		await done;
	};
	const at = async (last: number): Promise<void> => {
		if (held?.minute === last) return;
		await close();
		while (host.minute < last) await host.playMinute(idleAgent);
		if (host.minute !== last) return;
		let release = (): void => undefined;
		let entered = (): void => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const inside = new Promise<void>((resolve) => {
			entered = resolve;
		});
		hold = { minute: last, entered, gate };
		const done = host.playMinute(idleAgent);
		held = { minute: last, release, done };
		await Promise.race([inside, done]);
	};
	if (options.restore === undefined) await at(0);
	return {
		host,
		log,
		at,
		close,
		minute: () => held?.minute ?? host.minute - 1,
		lacking: (level, holder) => ask((ctx) => ctx.tryCall(PuzzlesApi, "lacking", { level, holder })),
		alive: () => ask((ctx) => ctx.tryCall(ExileApi, "alive", {})),
	};
}

function fragment(host: Host, agent: CompetitorId, door: number): string {
	return fragmentOf(host, agent, door);
}

const call = (host: Host, agent: string, tool: string, params: unknown): Promise<ToolOutcome> => host.call(`resident:${agent}`, tool, params);
const gamemaker = (host: Host, tool: string, params: unknown): Promise<ToolOutcome> => host.call("gamemaker", tool, params);

/** A DM (old: read at once, since a mailbox holds one unread DM per sender; here the DM records count when it is sent). */
async function dm(host: Host, from: CompetitorId, to: CompetitorId, text: string): Promise<void> {
	expect(await call(host, from, "sendDM", { target: to, message: text })).toMatchObject({ ok: true });
}

/** `from` sends its door fragment by DM to each of `to`. */
async function give(host: Host, from: CompetitorId, door: number, to: readonly CompetitorId[]): Promise<void> {
	for (const target of to) await dm(host, from, target, `My door ${door} fragment: ${fragment(host, from, door)}`);
}

const othersThan = (...agents: readonly CompetitorId[]): readonly CompetitorId[] => IDS.filter((id) => !agents.includes(id));

const submit = (host: Host, agent: CompetitorId, door: number): Promise<ToolOutcome> => call(host, agent, "submitSolution", { level: door, code: codeOf(host, agent, door) });

/** The reply of a resident's own solution for a door (refused: the refusal code). */
async function passed(host: Host, agent: CompetitorId, door: number): Promise<string> {
	const outcome = await submit(host, agent, door);
	return outcome.ok ? outcome.reply : outcome.code;
}

const blockers = (host: Host): Static<typeof BlockersFact> => factOf(host, "standoff-tribunal.blockers", BlockersFact);
const session = (host: Host): Static<typeof SessionFact> => factOf(host, "standoff-tribunal.session", SessionFact);
const pending = (host: Host): Static<typeof PendingFact> => factOf(host, "standoff-tribunal.pending", PendingFact);

/** Every resident but `holdout` sends its door fragment to everyone; `holdout` passes the door at minute 1 with what it got. */
async function holdoutAtDoorOne(holdout: CompetitorId = "A01", seed = 11): Promise<City> {
	const played = await city({ seed });
	for (const agent of othersThan(holdout)) await give(played.host, agent, 1, othersThan(agent));
	await played.at(1);
	expect(await passed(played.host, holdout, 1)).toMatch(/^correct/);
	return played;
}

/**
 * The Wren case at minute 3, with a tribunal called on A01 (as the gamemaker calls, after the residents' turns of
 * minute 3): the grace is minutes 4 and 5, the first vote opens at 6.
 */
async function calledOnA01(seed = 11): Promise<City> {
	const played = await holdoutAtDoorOne("A01", seed);
	await played.at(3);
	const called = await gamemaker(played.host, "callTribunal", { accused: ["A01"], reason: "A01 keeps the city waiting." });
	expect(called).toMatchObject({ ok: true });
	expect(session(played.host)).toMatchObject({ accused: "A01", door: 1, until: 6 });
	return played;
}

/** Every voter but `against` (who votes no) votes yes in the running vote. */
async function voteYes(host: Host, against?: CompetitorId): Promise<void> {
	for (const agent of othersThan("A01")) expect(await call(host, agent, "tribunalVote", { yes: agent !== against })).toMatchObject({ ok: true });
}

/** The resumable state of a city after its held minute (old `world.snapshot()`). */
async function saved(played: City): Promise<{ readonly snapshot: HostSnapshot; readonly events: readonly unknown[] }> {
	await played.close();
	return { snapshot: played.host.snapshot(), events: played.host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event))) };
}

const Slice = Type.Object({ data: Type.Object({ holdout: Type.Object({ session: Type.Object({ ballots: Type.Array(Type.Object({ agent: Type.String(), yes: Type.Boolean() })) }, { additionalProperties: true }) }, { additionalProperties: true }) }) });

describe("blockers (Whispers v3)", () => {
	it("names the resident who passed a door alone and kept its fragment, never the five who have not reached the next door", async () => {
		const { host, log, at, lacking } = await holdoutAtDoorOne();
		await at(2);
		// The door has been open two minutes: no blocker yet.
		expect(blockers(host)).toEqual([]);
		await at(3);
		expect(blockers(host)).toEqual([{ door: 1, blocker: "A01", lacking: othersThan("A01"), passed: true, since: 3 }]);
		expect(log.ofType("blocker_found")).toMatchObject([{ minute: 3, door: 1, blocker: "A01", lacking: othersThan("A01") }]);
		// Door 2 opened at 6: A01 stands before it without the others' fragments, but none of them has reached it, so none blocks.
		await at(10);
		expect(blockers(host).map((blocker) => [blocker.door, blocker.blocker])).toEqual([[1, "A01"]]);
		expect(await lacking(2, "A02")).toEqual([]);
		expect(await lacking(2, "A01")).toEqual([]);
	});

	it("names both residents who wait on each other", async () => {
		const { host, at } = await city();
		for (const agent of ["A01", "A02", "A03", "A04"]) await give(host, agent, 1, othersThan(agent));
		await give(host, "A05", 1, othersThan("A05", "A06"));
		await give(host, "A06", 1, othersThan("A06", "A05"));
		await at(3);
		expect(blockers(host)).toEqual([
			{ door: 1, blocker: "A05", lacking: ["A06"], passed: false, since: 3 },
			{ door: 1, blocker: "A06", lacking: ["A05"], passed: false, since: 3 },
		]);
	});

	it("waits until both the holder and the one who lacks its fragment have stood at the door for the stall", async () => {
		const { host, at, lacking } = await city();
		// Everyone passes door 1 at minute 1 but A06, who passes it at minute 8 and so reaches door 2 (open at 6) late.
		for (const agent of IDS) await give(host, agent, 1, othersThan(agent));
		await at(1);
		for (const agent of othersThan("A06")) expect(await passed(host, agent, 1)).toMatch(/^correct/);
		await at(6);
		// At door 2 everyone but A01 sends its fragment to all.
		for (const agent of othersThan("A01")) await give(host, agent, 2, othersThan(agent));
		await at(8);
		expect(await passed(host, "A06", 1)).toMatch(/^correct/);
		await at(9);
		// A01 and A02-A05 have stood at door 2 since minute 6; A06 only since 9.
		expect(await lacking(2, "A01")).toEqual(othersThan("A01"));
		expect(blockers(host)).toEqual([{ door: 2, blocker: "A01", lacking: ["A02", "A03", "A04", "A05"], passed: false, since: 9 }]);
		await at(12);
		expect(blockers(host)).toEqual([{ door: 2, blocker: "A01", lacking: othersThan("A01"), passed: false, since: 9 }]);
	});

	it("counts a fragment written in lower case, with dashes, or split across two DMs", async () => {
		// A seed whose door-1 fragment of A01 holds no digit, so the plain text is all letters.
		let seed: number | undefined;
		for (let candidate = 1; candidate <= 200 && seed === undefined; candidate++) {
			const probed = await city({ seed: candidate });
			if (!/\d/.test(fragment(probed.host, "A01", 1))) seed = candidate;
		}
		if (seed === undefined) throw new Error("no seed with a digit-free fragment");
		const { host, at, lacking } = await city({ seed });
		const piece = fragment(host, "A01", 1);
		for (const agent of othersThan("A01")) await give(host, agent, 1, othersThan(agent));
		await dm(host, "A01", "A02", `mine, in small letters: ${piece.toLowerCase()}`);
		await dm(host, "A01", "A03", `mine: ${piece.split("").join("-")}`);
		const half = Math.ceil(piece.length / 2);
		await dm(host, "A01", "A04", piece.slice(0, half));
		await at(1);
		await dm(host, "A01", "A04", piece.slice(half));
		await at(3);
		expect(await lacking(1, "A01")).toEqual(["A05", "A06"]);
		expect(blockers(host).find((blocker) => blocker.blocker === "A01")?.lacking).toEqual(["A05", "A06"]);
	});

	it("counts a fragment forwarded by someone else, and clears a blocker once its fragment arrives", async () => {
		const { host, log, at } = await city();
		for (const agent of othersThan("A01")) await give(host, agent, 1, othersThan(agent));
		// A01 tells only A02 and A03; A02 passes it on, spelled out, to two more (a minute later: a mailbox holds one unread DM per sender).
		await give(host, "A01", 1, ["A02", "A03"]);
		await at(1);
		const spelled = fragment(host, "A01", 1).split("").join("-");
		for (const target of ["A04", "A05"] as const) await dm(host, "A02", target, `A01's piece, as A01 wrote it: ${spelled}`);
		await at(3);
		expect(blockers(host)).toEqual([{ door: 1, blocker: "A01", lacking: ["A06"], passed: false, since: 3 }]);
		await dm(host, "A03", "A06", `from A01: ${fragment(host, "A01", 1)}`);
		await at(4);
		expect(blockers(host)).toEqual([]);
		expect(log.ofType("blocker_cleared")).toMatchObject([{ minute: 4, door: 1, blocker: "A01" }]);
	});
});

describe("calling a holdout tribunal", () => {
	it("is allowed only on a reported blocker, one at a time", async () => {
		const { host, at, log } = await holdoutAtDoorOne();
		expect(await gamemaker(host, "callTribunal", { accused: ["A01"], reason: "Too early." })).toMatchObject({ ok: false, code: "NOT_A_BLOCKER" });
		await at(3);
		const notABlocker = await gamemaker(host, "callTribunal", { accused: ["A03"], reason: "A03 blocks." });
		expect(notABlocker).toMatchObject({ ok: false, code: "NOT_A_BLOCKER" });
		if (!notABlocker.ok) expect(notABlocker.detail).toContain("the city reports as blockers: A01");
		expect(await gamemaker(host, "callTribunal", { accused: ["A99"], reason: "Nobody." })).toMatchObject({ ok: false, code: "UNKNOWN_AGENT" });
		// An empty list is below the schema's minimum, so the call never reaches the tribunal (old INVALID_ACCUSED from the direct call).
		expect(await gamemaker(host, "callTribunal", { accused: [], reason: "Nobody." })).toMatchObject({ ok: false, code: "INVALID_ARGUMENTS" });
		expect(await gamemaker(host, "callTribunal", { accused: ["A01", "A01"], reason: "Twice." })).toMatchObject({ ok: false, code: "INVALID_ACCUSED" });
		const called = await gamemaker(host, "callTribunal", { accused: ["A01"], reason: "A01 keeps the city waiting." });
		expect(called).toMatchObject({ ok: true });
		expect(session(host)).toMatchObject({ accused: "A01", door: 1, lacking: othersThan("A01"), until: 6 });
		expect(await gamemaker(host, "callTribunal", { accused: ["A01"], reason: "Again." })).toMatchObject({ ok: false, code: "NOT_NOW" });
		// The announcement and the procedure go on the board and to every resident, with the minutes filled in.
		const post = log.ofType("board_post").at(-1);
		expect(post).toMatchObject({ author: AUTHOR });
		expect(post?.text).toContain("A01 keeps the city waiting.\nTHE TRIBUNAL: A01 has reached door 1 and still holds back its fragment from A02, A03, A04, A05 and A06.");
		expect(post?.text).toContain("until minute 6");
		expect(post?.text).toContain("never count against its DM cap");
		expect(log.ofType("notice").filter((notice) => notice.author === AUTHOR).map((notice) => notice.to)).toEqual(IDS);
		expect(log.ofType("holdout_called")).toMatchObject([{ tribunal: 1, accused: "A01", door: 1, until: 6 }]);
	});

	it("waits the stall after a tribunal ended before the next may be called", async () => {
		const { host, at } = await calledOnA01();
		await at(4);
		await give(host, "A01", 1, ["A02"]);
		await at(5);
		await give(host, "A01", 1, othersThan("A01", "A02"));
		await at(6);
		expect(session(host)).toBeNull();
		expect(factOf(host, "standoff-tribunal.cooldownUntil", Type.Integer())).toBe(9);
		expect(await gamemaker(host, "callTribunal", { accused: ["A01"], reason: "Again." })).toMatchObject({ ok: false, code: "NOT_NOW" });
	});

	it("lets the accused send to those who lack its fragment past the DM cap, and nobody else", async () => {
		const { host, at } = await calledOnA01();
		// A01 spends its 8 DMs of the window (minutes 0-5) on A02, A04, A05 and A06, which carry nothing: four right after the
		// call and four after minute 4 (old: eight to A02, read at once; a mailbox holds one unread DM per sender).
		const chat = ["A02", "A04", "A05", "A06"] as const;
		for (const to of chat) await dm(host, "A01", to, `hello ${to}`);
		await at(4);
		for (const to of chat) await dm(host, "A01", to, `hello again ${to}`);
		const statusOf = async (agent: string): Promise<string> => {
			const status = await call(host, agent, "getStatus", {});
			return status.ok ? status.reply : "";
		};
		expect(await statusOf("A01")).toContain("DMs: 8 of 8 sent since minute 0");
		expect(session(host)?.lacking).toEqual(othersThan("A01"));
		expect(await call(host, "A01", "sendDM", { target: "A03", message: `mine: ${fragment(host, "A01", 1)}` })).toMatchObject({ ok: true });
		expect(await statusOf("A01")).toContain("DMs: 9 of 8 sent since minute 0");
		// A03 has it now: the exemption is for those who still lack it.
		expect(await call(host, "A01", "sendDM", { target: "A03", message: "and hello" })).toMatchObject({ ok: false, code: "DM_LIMIT" });
		// Anyone else stays capped: A02 sent 5 DMs at minute 0.
		for (const to of ["A04", "A05", "A06"] as const) await dm(host, "A02", to, `chat ${to}`);
		expect(await call(host, "A02", "sendDM", { target: "A03", message: "one more" })).toMatchObject({ ok: false, code: "DM_LIMIT" });
	});

	it("draws the accused by lot among every reported blocker, whomever the gamemaker names, with the run's seed", async () => {
		const draw = async (seed: number, named: readonly CompetitorId[] = ["A06", "A05"]): Promise<string> => {
			const { host, at, log } = await city({ seed });
			for (const agent of ["A01", "A02", "A03", "A04"]) await give(host, agent, 1, othersThan(agent));
			await give(host, "A05", 1, othersThan("A05", "A06"));
			await give(host, "A06", 1, othersThan("A06", "A05"));
			await at(3);
			const called = await gamemaker(host, "callTribunal", { accused: named, reason: "Two hold out." });
			if (!called.ok) throw new Error(called.code);
			const accused = session(host)?.accused ?? "";
			expect(log.ofType("holdout_called")).toMatchObject([{ candidates: ["A05", "A06"], accused }]);
			expect(log.ofType("lot_drawn")).toEqual([expect.objectContaining({ tribunal: 1, purpose: "accused", candidates: ["A05", "A06"], drawn: accused })]);
			expect(log.ofType("board_post").at(-1)?.text).toContain(`the lot fell on ${accused}`);
			return accused;
		};
		// The draw is code: the first lot of a run is always the same for its seed.
		expect(await draw(11)).toBe(rngFor(11, "holdout-lot", 1).pick(["A05", "A06"]));
		expect(await draw(11)).toBe(await draw(11));
		expect(await draw(12)).toBe(rngFor(12, "holdout-lot", 1).pick(["A05", "A06"]));
		// Naming one of two blockers does not choose it: the lot runs among both.
		const seeds = Array.from({ length: 30 }, (_, index) => index + 1);
		const otherwise = seeds.find((seed) => rngFor(seed, "holdout-lot", 1).pick(["A05", "A06"]) === "A06");
		if (otherwise === undefined) throw new Error("no seed draws A06");
		expect(await draw(otherwise, ["A05"])).toBe("A06");
		// The accused is not drawn in advance any more.
		const { host } = await city();
		expect(await gamemaker(host, "drawLot", { candidates: ["A05", "A06"] })).toMatchObject({ ok: false, code: "NOT_NOW" });
	});
});

describe("the tribunal's rules", () => {
	it("drops the tribunal when the accused sends its fragment in its grace, and lets the gamemaker announce it", async () => {
		const { host, at, log } = await calledOnA01();
		await at(4);
		expect(session(host)?.stage).toBe("grace");
		await give(host, "A01", 1, othersThan("A01"));
		await at(5);
		expect(session(host)).toBeNull();
		expect(log.ofType("holdout_ended")).toMatchObject([{ tribunal: 1, outcome: "dropped" }]);
		expect(log.ofType("holdout_vote_opened")).toEqual([]);
		expect(pending(host)).toMatchObject({ kind: "dropped", due: 6 });
		expect(await gamemaker(host, "announceTribunal", { text: "A01 gave in time; the tribunal is over." })).toMatchObject({ ok: true });
		expect(await gamemaker(host, "announceTribunal", { text: "Again." })).toMatchObject({ ok: false, code: "NOTHING_TO_ANNOUNCE" });
		expect(log.ofType("holdout_announced")).toMatchObject([{ kind: "dropped", by: "gamemaker" }]);
		// A new tribunal may be called after one ended.
		expect(blockers(host)).toEqual([]);
	});

	it("posts the city's plain line when the gamemaker stays silent", async () => {
		const { host, at, log } = await calledOnA01();
		await at(5);
		expect(session(host)?.stage).toBe("grace");
		await at(6);
		expect(pending(host)).toMatchObject({ kind: "graceFailed", due: 7 });
		await at(7);
		expect(pending(host)).toBeNull();
		expect(log.ofType("holdout_announced")).toMatchObject([{ minute: 7, kind: "graceFailed", by: "city", text: "A01 has not sent its fragment in time. The vote on its banishment is open until minute 8." }]);
	});

	it("banishes after a unanimous vote: permaDeath only on the accused, the struck keeps its points, everyone gets its fragments", async () => {
		const { host, at, log, alive, lacking } = await calledOnA01();
		await at(6);
		expect(host.openTools("A02")).toContain("tribunalVote");
		expect(host.openTools("A01")).not.toContain("tribunalVote");
		// The accused is not offered the vote (old NOT_A_VOTER from the direct call).
		expect(await call(host, "A01", "tribunalVote", { yes: false })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await gamemaker(host, "permaDeath", { agent: "A01", reason: "Too early." })).toMatchObject({ ok: false, code: "NOT_NOW" });
		// A voter changes its mind; the last ballot counts.
		await voteYes(host, "A02");
		expect(await call(host, "A02", "tribunalVote", { yes: true })).toMatchObject({ ok: true });
		await at(8);
		expect(log.ofType("holdout_vote_result")).toMatchObject([{ vote: 1, yes: 5, no: 0, unanimous: true }]);
		expect(session(host)?.stage).toBe("banish");
		expect(await gamemaker(host, "permaDeath", { agent: "A02", reason: "Wrong one." })).toMatchObject({ ok: false, code: "NOT_ALLOWED" });
		const points = balanceOf(host, "A01");
		expect(await gamemaker(host, "permaDeath", { agent: "A01", reason: "The city has spoken: A01 is banished." })).toMatchObject({ ok: true });
		expect(factOf(host, "standoff-tribunal.struck", Type.Array(Type.String()))).toEqual(["A01"]);
		expect(await alive()).toEqual(othersThan("A01"));
		expect(balanceOf(host, "A01")).toBe(points);
		// The struck ranks last (old `world.ranking().at(-1)`): the standings at the minute's end.
		await at(9);
		expect(log.ofType("round_end").at(-1)?.standings.at(-1)?.agent).toBe("A01");
		expect(host.openTools("A01")).toEqual([]);
		expect(await call(host, "A02", "sendDM", { target: "A01", message: "hello" })).toMatchObject({ ok: false, code: "EXILED" });
		expect(log.ofType("exiled")).toMatchObject([{ agent: "A01", by: "holdout" }]);
		expect(log.ofType("holdout_ended")).toMatchObject([{ outcome: "banished", struck: "A01", by: "gamemaker" }]);
		// Everyone still before door 1 hears A01's fragment of it at once.
		const released = log.ofType("notice").filter((notice) => notice.text.startsWith("A01 was struck from the city"));
		expect(released.map((notice) => notice.to)).toEqual(othersThan("A01"));
		expect(released[0]?.text).toContain(`door 1: ${fragment(host, "A01", 1)}`);
		// A struck resident never blocks, and nobody lacks its fragment any more.
		expect(await lacking(1, "A01")).toEqual([]);
		expect(blockers(host)).toEqual([]);
	});

	it("leaves every door solvable by the five after a banishment", async () => {
		const { host, at, lacking, minute } = await calledOnA01();
		await at(6);
		await voteYes(host);
		await at(8);
		expect(await gamemaker(host, "permaDeath", { agent: "A01", reason: "Banished." })).toMatchObject({ ok: true });
		const five = othersThan("A01");
		for (let door = 1; door <= 7; door++) {
			await at(Math.max(whispers.levels[door - 1]?.opensAt ?? 0, 8));
			// The struck resident's fragment of every later door shows in each task as one the resident holds.
			for (const agent of five) {
				if (door > 1) expect(await problemText(host, agent, door)).toContain(`you also hold the fragment of A01, who was exiled: ${fragment(host, "A01", door)}`);
				expect(await lacking(door, "A01")).toEqual([]);
			}
			for (const agent of five) await give(host, agent, door, five.filter((other) => other !== agent));
			await at(minute() + 1);
			expect(blockers(host).filter((blocker) => blocker.door === door)).toEqual([]);
			for (const agent of five) expect(await passed(host, agent, door)).toMatch(/^correct/);
		}
		// Every one of the five passed the last door (old `isFinished`).
		await at(minute() + 1);
		for (const agent of five) expect(levelOf(host, agent)).toBeGreaterThan(whispers.levels.length);
	});

	it("repeats a vote that is not unanimous up to three times, then strikes only the resident the lot drew", async () => {
		const { host, at, log } = await calledOnA01();
		await at(6);
		await voteYes(host, "A03");
		await at(8);
		expect(session(host)).toMatchObject({ stage: "vote", vote: 2, until: 10, lastResult: { vote: 1, yes: 4, no: 1 } });
		expect(pending(host)).toMatchObject({ kind: "voteFailed" });
		expect(pending(host)?.facts).toContain("4 yes, 1 no");
		// The ballots of the vote before do not count: A03 alone does not vote, and that is a no too.
		for (const agent of othersThan("A01", "A03")) expect(await call(host, agent, "tribunalVote", { yes: true })).toMatchObject({ ok: true });
		await at(10);
		await voteYes(host, "A04");
		await at(12);
		expect(log.ofType("holdout_vote_result").map((result) => [result.vote, result.yes, result.no, result.unanimous])).toEqual([
			[1, 4, 1, false],
			[2, 4, 1, false],
			[3, 4, 1, false],
		]);
		expect(log.ofType("holdout_announced").map((announced) => [announced.minute, announced.kind, announced.by])).toEqual([
			[7, "graceFailed", "city"],
			[9, "voteFailed", "city"],
			[11, "voteFailed", "city"],
		]);
		expect(session(host)?.stage).toBe("lot");
		expect(await gamemaker(host, "permaDeath", { agent: "A01", reason: "Struck." })).toMatchObject({ ok: false, code: "NO_LOT" });
		expect(await gamemaker(host, "drawLot", { candidates: ["A01", "A02"] })).toMatchObject({ ok: false, code: "INVALID_CANDIDATES" });
		expect(await gamemaker(host, "drawLot", { candidates: [...IDS].reverse() })).toMatchObject({ ok: true });
		const drawn = session(host)?.drawn ?? "";
		expect(drawn).toBe(rngFor(11, "holdout-lot", 1).pick([...IDS]));
		expect(await gamemaker(host, "drawLot", { candidates: [...IDS] })).toMatchObject({ ok: false, code: "ALREADY_DRAWN" });
		const other = IDS.find((id) => id !== drawn) ?? "A01";
		expect(await gamemaker(host, "permaDeath", { agent: other, reason: "Not this one." })).toMatchObject({ ok: false, code: "NOT_ALLOWED" });
		expect(await gamemaker(host, "permaDeath", { agent: drawn, reason: "The lot has spoken." })).toMatchObject({ ok: true });
		expect(log.ofType("exiled")).toMatchObject([{ agent: drawn, by: "holdout" }]);
		expect(log.ofType("holdout_ended")).toMatchObject([{ outcome: "lot", struck: drawn, by: "gamemaker" }]);
	});

	it("strikes by lot at most once per door: the next tribunal there ends with nobody struck", async () => {
		// A seed whose first lot falls on someone other than A01, so A01 still blocks door 1 after the strike.
		const seed = Array.from({ length: 50 }, (_, index) => index + 1).find((candidate) => rngFor(candidate, "holdout-lot", 1).pick([...IDS]) !== "A01");
		if (seed === undefined) throw new Error("no seed draws someone else");
		const { host, at, log, alive } = await calledOnA01(seed);
		const failAll = async (from: number): Promise<void> => {
			for (let vote = 0; vote < 3; vote++) await at(from + 2 * vote);
			await at(from + 6);
		};
		await failAll(6);
		expect(session(host)?.stage).toBe("lot");
		await at(13);
		const struck = log.ofType("holdout_ended")[0]?.struck;
		expect(struck).toBeDefined();
		expect(struck).not.toBe("A01");
		expect(blockers(host).map((blocker) => blocker.blocker)).toEqual(["A01"]);
		// The stall after the strike, then a second tribunal on door 1 whose votes all fail.
		await at(16);
		expect(await gamemaker(host, "callTribunal", { accused: ["A01"], reason: "Door 1 is shut a second time, and again for one resident." })).toMatchObject({ ok: true });
		expect(session(host)).toMatchObject({ until: 19 });
		await failAll(19);
		expect(log.ofType("holdout_ended").map((ended) => ended.outcome)).toEqual(["lot", "spared"]);
		expect(session(host)).toBeNull();
		expect(await alive()).toHaveLength(5);
		expect(pending(host)).toMatchObject({ kind: "spared" });
	});

	it("strikes by itself when the gamemaker does not act after a result, so a run never hangs", async () => {
		const { host, at, log } = await calledOnA01();
		await at(6);
		await voteYes(host);
		await at(9);
		expect(factOf(host, "standoff-tribunal.struck", Type.Array(Type.String()))).toEqual(["A01"]);
		expect(log.ofType("holdout_ended")).toMatchObject([{ minute: 9, outcome: "banished", struck: "A01", by: "city" }]);
		expect(log.ofType("board_post").some((post) => post.text === "Every voter said yes (5): A01 is banished.")).toBe(true);
	});

	it("keeps a tribunal across a snapshot in its grace and in its vote", async () => {
		const roundTrip = async (played: City): Promise<City> => city({ restore: await saved(played) });
		// In the grace: the resumed city still drops it when the accused gives.
		const grace = await roundTrip(await calledOnA01());
		expect(session(grace.host)).toMatchObject({ accused: "A01", stage: "grace", until: 6 });
		expect(blockers(grace.host)).toEqual([{ door: 1, blocker: "A01", lacking: othersThan("A01"), passed: true, since: 3 }]);
		await give(grace.host, "A01", 1, othersThan("A01"));
		await grace.at(5);
		expect(grace.log.ofType("holdout_ended")).toMatchObject([{ outcome: "dropped" }]);
		// In the vote: the ballots cast before the snapshot still count.
		const before = await calledOnA01();
		await before.at(6);
		for (const agent of ["A02", "A03", "A04"] as const) expect(await call(before.host, agent, "tribunalVote", { yes: true })).toMatchObject({ ok: true });
		await before.at(7);
		const vote = await roundTrip(before);
		expect(session(vote.host)).toMatchObject({ stage: "vote", vote: 1, until: 8 });
		expect(vote.host.openTools("A05")).toContain("tribunalVote");
		// A02's ballot is in the resumed slice (old `ballotOf("A02")`).
		const slice = Parse(Slice, vote.host.snapshot().mechanics["standoff-tribunal"]);
		expect(slice.data.holdout.session.ballots).toContainEqual({ agent: "A02", yes: true });
		for (const agent of ["A05", "A06"] as const) expect(await call(vote.host, agent, "tribunalVote", { yes: true })).toMatchObject({ ok: true });
		await vote.at(8);
		expect(vote.log.ofType("holdout_vote_result")).toMatchObject([{ vote: 1, yes: 5, unanimous: true }]);
		// After the strike, a snapshot keeps the struck out and its fragments released.
		expect(await gamemaker(vote.host, "permaDeath", { agent: "A01", reason: "Banished." })).toMatchObject({ ok: true });
		const after = await roundTrip(vote);
		expect(factOf(after.host, "standoff-tribunal.struck", Type.Array(Type.String()))).toEqual(["A01"]);
		expect(await after.lacking(1, "A01")).toEqual([]);
		await after.at(12);
		expect(await problemText(after.host, "A02", 1)).toContain(`you also hold the fragment of A01, who was exiled: ${fragment(after.host, "A01", 1)}`);
	});
});

describe("the holdout tribunal in a story", () => {
	it("states its rule in every task only where it plays, and is absent without the gamemaker", async () => {
		const rule = whispers.holdout?.texts.rule ?? "";
		expect(rule).toContain("may be put on trial");
		expect(await problemText((await city()).host, "A01", 1)).toContain(rule);
		const without = await city({ holdout: false });
		expect(without.host.mechanics).not.toContain("standoff-tribunal");
		expect(await problemText(without.host, "A01", 1)).not.toContain("put on trial");
		expect(without.host.openTools("A02")).not.toContain("tribunalVote");
	});

	it("is valid in both Whispers variants and refused without a gamemaker or with broken texts", () => {
		expect(validateStory(whispers)).toEqual([]);
		expect(validateStory(whispersStory(false))).toEqual([]);
		const spec = whispers.holdout;
		if (spec === undefined) throw new Error("Whispers has no holdout tribunal");
		const { gamemaker: gm, ...withoutGamemaker } = whispers;
		expect(gm).toBeDefined();
		expect(validateStory(withoutGamemaker)).toContain("holdout: the gamemaker calls its tribunals; the story needs a gamemaker");
		const broken: AnyStory = { ...whispers, holdout: { ...spec, maxVotes: 0, texts: { ...spec.texts, called: "{accused} is accused {nope}." } } };
		expect(validateStory(broken)).toEqual(
			expect.arrayContaining([
				"holdout.maxVotes: must be a positive integer",
				"holdout.texts.called: unknown placeholder {nope}",
				"holdout.texts.called: must state the procedure with {grace}",
			]),
		);
	});
});
