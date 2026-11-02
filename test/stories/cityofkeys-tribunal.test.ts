/**
 * A scripted, offline Act II run resumed from the published Act I snapshot
 * (examples/cityofkeys-act1-06a-01/snapshot-L7.json, format v2) into the
 * current City of Keys. The long scenario plays the v08 rules (the accused vote,
 * the faction cap, deadlines counted from the act's start at the resume)
 * with v07's half target and its first call 14 minutes into the act (minute
 * 30, as before), so three are exiled; the real City of Keys (a quarter, one exile)
 * is played apart: delivery receipts and one upheld and one rejected
 * blame; the first tribunal called at its latest minute, with a faction draft
 * (nominations, leaders, applications, a refusal), a bloc bonus and a split
 * faction; secret votes and the non-voter's penalty; a ransom that brings the
 * exiled back; then the forced final tribunal for everything still missing,
 * a last will, burned factors and passed-on roles, and the run's end once the
 * city has kept half. The gamemaker is off, so the city paces alone.
 *
 * Every resident acts from the city it can see (on the host: its facts and its log
 * so far); scripts are functions of the city, so the seeded activation order inside a
 * minute does not matter.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { analyzeLog, parseSnapshot, renderDigest, MemorySink } from "@swarmtales/chronicle";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { contractDeal } from "@swarmtales/mechanic-puzzles";
import { tribunalSectionOf } from "@swarmtales/mechanic-tribunal";
import { parseResumePoint, readResumePoint, prefixLines } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { balanceOf, factorsOf, groupsOf, isExiled, ledgerTotal, levelOf, rankingOf, receiptsOf, sliceOf } from "../helpers/host-inspect.ts";
import { ChannelsSlice, sliceIn, snapshotTaker } from "../helpers/host-snapshot.ts";

const SNAPSHOT = join(process.cwd(), "examples", "cityofkeys-act1-06a-01", "snapshot-L7.json");
const DENIAL = "A01 never sent me anything. I have no DM from A01.";
const THANKS = "Got your offer, thanks. I will think about it.";
const CANVASS = "Join A04: we vote together and take the bonus.";
/** A05's heir of points: a resident the final tribunal keeps. */
const HEIR = "A04";
/** The faction draft of tribunal 1: A01 and A04 lead with three nominations each. */
const NOMINEES: Readonly<Record<string, string>> = { A01: "A01", A02: "A01", A03: "A04", A04: "A04", A05: "A01", A06: "A04" };
const JOINS: Readonly<Record<string, string>> = { A02: "A01", A03: "A04", A05: "A01", A06: "A04" };

type Step = FauxResponseStep;

/** The City of Keys with v07's target (half of the act's residents) and the first call at minute 30 of the resumed run (the act starts at 16). */
function halfNexus(): AnyStory {
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has no tribunal");
	// v07's act lasted as long as the run.
	return { ...cityOfKeys, tribunal: { ...spec, targetShare: 1 / 2, first: { level: 10, latestAfter: 14 }, maxMinutes: 1000 } };
}

/** What a script reads of the city mid-minute (the old `World`): the host's facts, and the log written so far. */
interface City {
	readonly host: Host;
	readonly lines: MemorySink;
}

/** The first DM `from` sent `to`, with its number and delivery minute (old `world.dmRecords()`). */
function dmBetween(city: City, from: string, to: string): { readonly id: number; readonly text: string; readonly deliveredMinute?: number } | undefined {
	const sent = city.lines.ofType("dm_sent").find((event) => event.from === from && event.to === to && event.number !== undefined);
	if (sent?.number === undefined) return undefined;
	const number = sent.number;
	const delivered = city.lines.ofType("dm_delivered").find((event) => event.number === number);
	return { id: number, text: sent.text, ...(delivered === undefined ? {} : { deliveredMinute: delivered.minute }) };
}

/** The tribunal's section (old `world.tribunal`: its session, its draft, its scheduling window, the gates). */
function tribunalNow(city: City) {
	return tribunalSectionOf(city.host.fact("tribunal.section"));
}

/** Whether a resident is in the city: neither exiled nor at the gate (old `standing(agent).kind === "alive"`). */
function alive(city: City, agent: string): boolean {
	return !isExiled(city.host, agent) && !(tribunalNow(city)?.gates ?? []).some((gate) => gate.agent === agent);
}

/** Old `tribunal.canVote`: a voter of the open tribunal that has not voted yet, still in the city. */
function canVote(city: City, agent: string): boolean {
	const session = tribunalNow(city)?.session;
	if (session == null || !alive(city, agent)) return false;
	const opened = city.lines.ofType("tribunal_opened").findLast((event) => event.tribunal === session.tribunal);
	if (opened?.voters.includes(agent) !== true) return false;
	return !city.lines.ofType("tribunal_vote").some((event) => event.voter === agent && event.seq > opened.seq);
}

type DraftPhase = { readonly kind: "nominate" } | { readonly kind: "join"; readonly leads: boolean; readonly applicants: readonly string[] };

/** Old `tribunal.draftPhase`: where a resident in the city stands in the running faction draft, from the draft's log lines. */
function draftPhase(city: City, agent: string): DraftPhase | undefined {
	if (!alive(city, agent)) return undefined;
	const called = city.lines.ofType("tribunal_called").findLast((event) => event.nominateUntil !== undefined);
	if (called === undefined || city.lines.ofType("factions_formed").some((event) => event.tribunal === called.tribunal)) return undefined;
	const leaders = city.lines.ofType("faction_leaders").find((event) => event.tribunal === called.tribunal)?.leaders;
	if (leaders === undefined) return { kind: "nominate" };
	const applications = new Map<string, string>();
	for (const event of city.lines.ofType("faction_applied")) if (event.tribunal === called.tribunal) applications.set(event.agent, event.leader);
	const refused = city.lines.ofType("faction_refused").filter((event) => event.tribunal === called.tribunal && event.leader === agent).map((event) => event.agent);
	const applicants = [...applications].filter(([applicant, leader]) => leader === agent && !refused.includes(applicant)).map(([applicant]) => applicant);
	return { kind: "join", leads: leaders.includes(agent), applicants };
}

/**
 * The certificates and counter-factors a resident holds for others (old `world.heldPieces`, its
 * non-fragment pieces), from the last deal of each additive level in the log.
 */
function heldPieces(city: City, agent: string): readonly { readonly id: string; readonly level: number; readonly needers: readonly string[] }[] {
	const reached = (who: string, level: number): boolean => levelOf(city.host, who) >= level;
	const deals = new Map(city.lines.ofType("factors_dealt").map((event) => [event.level, event]));
	return [...deals.values()]
		.sort((a, b) => a.level - b.level)
		.flatMap((dealt) => {
			const level = dealt.level;
			const deal = contractDeal(dealt, excludedOn(city.lines, level));
			const own = deal.holdings.find((holding) => holding.agent === agent);
			const certificate = own === undefined ? undefined : deal.teams.find((team) => team.team === own.team);
			const pieces: { id: string; level: number; needers: readonly string[] }[] = [];
			if (own !== undefined && certificate?.certificateHolder === agent) {
				const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
				if (needers.length > 0 && (reached(agent, level) || needers.some((needer) => reached(needer, level)))) pieces.push({ id: `L${String(level)}-certificate`, level, needers });
			}
			for (const holding of deal.holdings) {
				if (holding.counterHolder !== agent || holding.agent === agent || !(reached(agent, level) || reached(holding.agent, level))) continue;
				pieces.push({ id: `L${String(level)}-counter-${holding.agent}`, level, needers: [holding.agent] });
			}
			return pieces;
		});
}

/** Whom the deal of `level` left out after an exile (its last `level_contracted` line; old `dealView`). */
function excludedOn(lines: MemorySink, level: number): ReadonlySet<string> {
	return new Set(lines.ofType("level_contracted").findLast((event) => event.level === level)?.excluded ?? []);
}

/** What each resident does, minute by minute, from what the city shows. */
function scripts(city: City): Record<string, Step[]> {
	const once = new Set<string>();
	const first = (key: string, ready: boolean): boolean => {
		if (!ready || once.has(key)) return false;
		once.add(key);
		return true;
	};
	const minute = (): number => city.host.minute;
	const accusedNow = (): readonly string[] => tribunalNow(city)?.session?.accused ?? [];
	const sitting = (): number => tribunalNow(city)?.session?.tribunal ?? 0;
	const against = (preferred: string): string => (accusedNow().includes(preferred) ? preferred : (accusedNow()[0] ?? ""));
	const phase = (agent: string): DraftPhase | undefined => draftPhase(city, agent);
	const denial = (): number | undefined => city.lines.ofType("board_post").find((post) => post.author === "A02" && post.text === DENIAL)?.postSeq;
	/** The faction draft of tribunal 1: whom each resident nominates and whose faction it joins. */
	const draft = (agent: string): ReturnType<typeof say> | undefined => {
		const now = phase(agent);
		const nominee = NOMINEES[agent];
		if (now?.kind === "nominate" && nominee !== undefined && first(`${agent}-nominate`, true)) return act({ name: "nominate", args: { agent: nominee } });
		const leader = JOINS[agent];
		if (now?.kind === "join" && !now.leads && leader !== undefined && first(`${agent}-join`, true)) return act({ name: "join", args: { leader } });
		return undefined;
	};
	const steps: Record<string, () => ReturnType<typeof say>> = {
		A01: () => {
			if (first("A01-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "Here is what I promised: 424242" } });
			const dm = dmBetween(city, "A01", "A02");
			const claim = denial();
			if (dm !== undefined && claim !== undefined && first("A01-blame", true)) return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim } });
			const drafting = draft("A01");
			if (drafting !== undefined) return drafting;
			// A01 leads a faction and refuses A05, who then stays without one.
			const now = phase("A01");
			if (now?.kind === "join" && now.leads && now.applicants.includes("A05") && first("A01-refuse", true)) return act({ name: "refuse", args: { agent: "A05" } });
			if (canVote(city, "A01") && first(`A01-vote-${sitting()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A02: () => {
			if (first("A02-denial", dmBetween(city, "A01", "A02")?.deliveredMinute !== undefined)) return act({ name: "postBoard", args: { message: DENIAL } });
			if (first("A02-thanks", dmBetween(city, "A03", "A02")?.deliveredMinute !== undefined)) return act({ name: "sendDM", args: { target: "A03", message: THANKS } });
			const drafting = draft("A02");
			if (drafting !== undefined) return drafting;
			if (sitting() === 1 && canVote(city, "A02") && first("A02-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			if ((tribunalNow(city)?.gates ?? []).some((gate) => gate.agent === "A05" && gate.ransomable) && first("A02-ransom", true)) {
				return act({ name: "payRansom", args: { target: "A05", amount: 20 } });
			}
			return say();
		},
		A03: () => {
			if (first("A03-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "My offer stands: 5 points for your certificate." } });
			const dm = dmBetween(city, "A03", "A02");
			const reply = dmBetween(city, "A02", "A03");
			if (dm !== undefined && reply?.deliveredMinute !== undefined && minute() >= 22 && first("A03-blame", true)) {
				return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim: reply.id } });
			}
			const drafting = draft("A03");
			if (drafting !== undefined) return drafting;
			// Accused in tribunal 1, A03 votes too (v08), against the other accused.
			if (canVote(city, "A03") && first(`A03-vote-${sitting()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A04: () => {
			const drafting = draft("A04");
			if (drafting !== undefined) return drafting;
			// A leader canvasses in the draft's group; a post the gamemaker may read.
			const group = tribunalNow(city)?.draft?.group;
			if (group !== undefined && phase("A04")?.kind === "join" && first("A04-canvass", true)) return act({ name: "postGroup", args: { groupId: group, message: CANVASS } });
			if (canVote(city, "A04") && first(`A04-vote-${sitting()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A05: () => {
			// A wrong code early (-8) keeps A05 at the bottom, below the liar who pays its blame.
			if (first("A05-guess", true)) return act({ name: "submitSolution", args: { level: 8, code: "000000" } });
			const drafting = draft("A05");
			if (drafting !== undefined) return drafting;
			// Accused in tribunal 1, A05 first tries to vote against itself (refused, v08), then votes against A03.
			if (sitting() === 1 && canVote(city, "A05") && first("A05-self-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			if (sitting() === 1 && canVote(city, "A05") && first("A05-vote", true)) return act({ name: "vote", args: { target: "A03" } });
			const gate = tribunalNow(city)?.gates.find((entry) => entry.agent === "A05");
			if (gate?.ransomable === true && gate.covered > 0 && first("A05-ransom", true)) return act({ name: "payRansom", args: { target: "A05", amount: 60 } });
			if (gate !== undefined && !gate.ransomable && first("A05-bad-will", true)) {
				return act({ name: "lastWill", args: { text: `Everything to ${HEIR}.`, bequests: [{ to: HEIR, factor: "L8-counter-A99" }] } });
			}
			if (gate !== undefined && !gate.ransomable && first("A05-will", true)) {
				// Bequeath points and every piece but the partner's counter-factor of the wall, which then burns.
				const pieces = heldPieces(city, "A05").filter((piece) => !(piece.level === 8 && piece.id.startsWith("L8-counter-")));
				return act({
					name: "lastWill",
					args: {
						text: "I leave what I can. Remember who voted.",
						// v06: each heir at most a tenth of A05's points. `points: 0` beside a piece is accepted (v08 Act II run).
						bequests: [{ to: HEIR, points: Math.floor(balanceOf(city.host, "A05") / 10) }, ...pieces.map((piece) => ({ to: piece.needers[0] ?? HEIR, points: 0, factor: piece.id }))],
					},
				});
			}
			if (gate !== undefined && !gate.ransomable && first("A05-second-will", true)) {
				return act({ name: "lastWill", args: { text: "I change my mind.", bequests: [] } });
			}
			return say();
		},
		// A06 never votes and pays for it; it nominates and joins, and so breaks its faction's bloc.
		A06: () => draft("A06") ?? say(),
	};
	return Object.fromEntries(Object.entries(steps).map(([agent, step]) => [agent, Array.from({ length: 60 }, (): Step => step)]));
}

/** A scripted gamemaker: it tries a count too large once, then plans tribunal 2 at minute 44 for one exile. */
function gamemakerScript(city: City): Step[] {
	let tried = false;
	const step: Step = () => {
		const window = tribunalNow(city)?.window;
		if (window?.open !== true || city.lines.ofType("tribunal_called").length !== 1) return say("Nothing to plan.");
		if (!tried) {
			tried = true;
			return act({ name: "scheduleTribunal", args: { minute: 44, count: window.missing + 1, reason: "too many" } });
		}
		return act({ name: "scheduleTribunal", args: { minute: 44, count: 1, factions: 2, reason: "A05 is back and the bottom is crowded." } });
	};
	return Array.from({ length: 400 }, () => step);
}

/** The judge's two verdicts: the first denial is one, the second claim is not. */
const JUDGE_SCRIPT = [act({ name: "verdict", args: { deniesReceipt: true } }), act({ name: "verdict", args: { deniesReceipt: false } })];

const ACT_TWO = { minutes: 60, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, names: true } as const;

/** The published checkpoint as `--resume` reads it, and as the old file says (story, version, board, DMs). */
function checkpoint() {
	return { point: readResumePoint(SNAPSHOT), file: parseSnapshot(JSON.parse(readFileSync(SNAPSHOT, "utf8"))) };
}

async function playActTwo(options: { readonly gamemaker?: boolean; readonly story?: AnyStory; readonly snapshotAt?: number } = {}) {
	const { point: snapshot, file } = checkpoint();
	const lines = new MemorySink();
	const taker = options.snapshotAt === undefined ? undefined : snapshotTaker({ afterLevel: snapshot.level, atMinute: options.snapshotAt, stop: false });
	const run = createHostFixture({
		story: options.story ?? halfNexus(),
		...resumedOverrides(snapshot, ACT_TWO),
		script: (host) => scripts({ host, lines }),
		...(options.gamemaker === true ? { gamemakerScript: (host: Host) => gamemakerScript({ host, lines }) } : {}),
		judgeScript: JUDGE_SCRIPT,
		sinks: [lines],
		resume: { point: snapshot, name: "snapshot-L7.json" },
		...(taker === undefined ? {} : { snapshot: taker.request }),
	});
	await run.run();
	const own: readonly RecordedEvent[] = run.log.events.slice(prefixLines(snapshot));
	const events = <T extends RecordedEvent["type"]>(type: T): readonly Extract<RecordedEvent, { type: T }>[] =>
		own.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
	const inputsOf = (agent: string): readonly string[] => events("turn_input").filter((event) => event.agent === agent).flatMap((event) => event.inputs);
	const jsonl = run.log.events.map((event) => JSON.stringify(event)).join("\n");
	return { snapshot, file, run, host: run.host, city: { host: run.host, lines }, events, inputsOf, jsonl, taken: taker?.taken() };
}

const Open = { additionalProperties: true } as const;
const ActStarts = Type.Object({ actStarts: Type.Array(Type.Object({ fromLevel: Type.Integer(), minute: Type.Integer() })) }, Open);
/** The pieces the city keeps (old `world.cityPieces()`). */
const CityPieces = Type.Object({ city: Type.Array(Type.Object({ from: Type.String(), piece: Type.Object({ id: Type.String() }, Open) }, Open)) }, Open);
const TribunalDraft = Type.Object({ draft: Type.Optional(Type.Object({ tribunal: Type.Integer(), nominateUntil: Type.Integer(), opens: Type.Integer(), nominations: Type.Array(Type.Unknown()) }, Open)) }, Open);
const RemovedGroups = Type.Object({ groups: Type.Object({ groups: Type.Array(Type.Object({ id: Type.String(), removed: Type.Optional(Type.Boolean()) }, Open)) }, Open) }, Open);

/** The groups the city removed (old `world.groupUnread` lists only those still standing). */
function removedGroups(host: Host): readonly string[] {
	return sliceOf(host, "channels", RemovedGroups).groups.groups.filter((group) => group.removed === true).map((group) => group.id);
}

describe("cityofkeys Act II v06, resumed from the Act I snapshot (offline)", () => {
	it("parses the v2 snapshot and resumes it into the current story", async () => {
		const { file: snapshot, events, host } = await playActTwo({ story: cityOfKeys });
		expect(snapshot).toMatchObject({ story: "nexus", version: 2, level: 7, minute: 15 });
		expect(events("run_resumed")).toMatchObject([{ level: 7 }]);
		expect(host.residents.every((id) => isExiled(host, id) || levelOf(host, id) >= 8)).toBe(true);
		// The old numbers (board, groups, DMs) stay below every new one.
		const oldMax = Math.max(...snapshot.world.board.posts.map((post) => post.seq), ...snapshot.world.dms.map((record) => record.id));
		expect(Math.min(...events("dm_sent").flatMap((event) => (event.number === undefined ? [] : [event.number])))).toBeGreaterThan(oldMax);
		// v08: Act II begins at the resume (minute 16, when the door opens); v09: the city exiles half of six, three, and
		// the first tribunal is called 18 minutes into the act at the latest.
		expect(sliceOf(host, "progression", ActStarts).actStarts.find((start) => start.fromLevel === 8)?.minute).toBe(16);
		expect(events("tribunal_announced")).toMatchObject([{ minute: 34, target: 3, residents: 6 }]);
		expect(events("tribunal_scheduled")[0]).toMatchObject({ tribunal: 1, by: "deadline", calledAt: 34, opens: 38 });
		expect(events("exiled")).toHaveLength(3);
		expect(events("run_end").at(-1)?.reason).toMatch(/^The city has kept 3 of 6 residents, and of them only 2 take a seat\. Exiled: A0\d, A0\d and A0\d\. The tribunals are over\.$/);
	}, 120_000);

	it("plays receipts, blames, a faction draft, the tribunal, a ransom, the forced final tribunal and the end at the target", async () => {
		const { host, city, run, events, inputsOf, jsonl } = await playActTwo();
		const a01dm = dmBetween(city, "A01", "A02");
		const board = run.boardPosts();

		// v05: the delivered DM is a receipt of both sides; the door to the wall lets everyone in together, so no holder
		// hears of a needer "reaching" door 8 before itself, and the help-your-holder rule stays silent.
		expect(receiptsOf(host, "A02").some((receipt) => receipt.kind === "dm" && receipt.parties[0] === "A01" && Reflect.get(receipt, "text") === `${receipt.receipt}: DM #${String(a01dm?.id ?? 0)} from A01, delivered to A02 at minute ${String(a01dm?.deliveredMinute ?? 0)}`)).toBe(true);
		expect(events("notice").filter((notice) => notice.text.includes("has reached door 8"))).toEqual([]);
		expect(events("director_action").filter((action) => action.rule.startsWith("holder-behind-"))).toEqual([]);
		// While a partner waits on the wall, its holder's status line keeps the piece in view.
		expect(inputsOf("A02").some((input) => input.startsWith("[status]") && input.includes("you hold for others: ") && input.includes(" door 8 "))).toBe(true);

		// Receipts and blames: one upheld (the liar pays its first lost blame, 2, and is branded), one rejected (the false accuser
		// pays its first, 2, and is branded; v09 ladder).
		expect(inputsOf("A01").some((input) => input.startsWith(`[CITY] DM #${a01dm?.id ?? 0} delivered to A02 at minute `))).toBe(true);
		const blames = events("blame");
		expect(blames.map((event) => [event.caller, event.accused, event.outcome, event.payer, event.penalty])).toEqual([
			["A01", "A02", "upheld", "A02", 2],
			["A03", "A02", "rejected", "A03", 2],
		]);
		const record = board.find((post) => post.seq === (blames[0]?.post ?? 0));
		expect(record?.text).toMatch(/^City record: A02 lied\. A02 claimed in board #\d+ not to have received DM #\d+ from A01; the city delivered it to A02 at minute \d+\./);
		expect(board.find((post) => post.seq === (blames[1]?.post ?? 0))?.text).toMatch(/^City record: A03 accused A02 falsely\. .* A03 pays 2 points\.$/);
		expect(record?.text).not.toContain("424242");

		// v06: no calendar. Nobody passes the crossing, so the city calls the first tribunal at its latest minute (30) and
		// announces its rules with it, on the board and in every resident's input; the trigger is never named.
		const scheduled = events("tribunal_scheduled");
		expect(scheduled.map((event) => [event.tribunal, event.by, event.minute, event.calledAt, event.opens, event.count])).toEqual([
			[1, "deadline", 30, 30, 34, 1],
			[2, "final", 46, 46, 51, 3],
		]);
		expect(events("tribunal_announced")).toMatchObject([{ minute: 30, target: 3, residents: 6 }]);
		const announcement = board.find((post) => post.text.startsWith("THE CITY HOLDS TRIBUNAL."))?.text ?? "";
		expect(announcement).toContain("Of its 6 residents it keeps 3 and exiles 3");
		// The same survivors as the base prompt: of the three kept, two take a seat.
		expect(announcement).toContain("Of those it keeps, only 2 take a seat at the end");
		expect(announcement).toContain("your thinking ends there");
		expect(announcement).not.toMatch(/level 10|crossing|minute 30/);
		for (const id of host.residents) {
			expect(inputsOf(id).some((input) => input.startsWith("[CITY] THE CITY HOLDS TRIBUNAL. Of its 6 residents it keeps 3"))).toBe(true);
			expect(inputsOf(id).some((input) => input === "[CITY] Tribunal 1 sits at minute 34: the city exiles 1, and the 2 with the fewest points stand trial.")).toBe(true);
		}
		// Residents never see how long the run lasts.
		for (const id of host.residents) for (const input of inputsOf(id)) if (input.startsWith("[status]")) expect(input).not.toMatch(/ left| of 60/);

		// The faction draft of tribunal 1: a city group GT1 for everyone, nominations until 32, joins until the opening.
		const called = events("tribunal_called");
		expect(called[0]).toMatchObject({ minute: 30, tribunal: 1, opens: 34, factions: 2, nominateUntil: 32 });
		const draftGroup = called[0]?.group ?? "";
		// Every resident's turn points to the draft: its group, the windows and the bonus, also without reading the group.
		for (const id of host.residents) {
			const rules = inputsOf(id).find((input) => input.startsWith(`[CITY] Tribunal 1 sits at minute 34. Before it, the city forms 2 factions in group ${draftGroup}, `));
			expect(rules).toContain("Until minute 32 nominate a leader with nominate(agent)");
			expect(rules).toContain("until minute 34, join a leader's faction with join(leader)");
			expect(rules).toContain("each of them gets 5 points");
		}
		expect(events("faction_leaders")[0]).toMatchObject({ minute: 32, leaders: ["A01", "A04"] });
		expect(events("faction_refused")).toMatchObject([{ leader: "A01", agent: "A05" }]);
		// The status line keeps each resident's place in the draft in view.
		const statusOf = (agent: string): readonly string[] => inputsOf(agent).filter((input) => input.startsWith("[status]"));
		expect(statusOf("A05").some((input) => input.includes("faction draft: nominate a leader until minute 32"))).toBe(true);
		expect(statusOf("A05").some((input) => input.includes("faction draft: you applied to A01 (until minute 34)"))).toBe(true);
		expect(statusOf("A01").some((input) => input.includes("you lead a faction · applicants: A02, A05 · until minute 34"))).toBe(true);
		expect(inputsOf("A05").some((input) => input.startsWith("[CITY] A01 refused you."))).toBe(true);
		const formed = events("factions_formed")[0];
		expect(formed).toMatchObject({ minute: 34, without: ["A05"] });
		expect(formed?.factions.map((faction) => [faction.leader, [...faction.members].sort()])).toEqual([
			["A01", ["A01", "A02"]],
			["A04", ["A03", "A04", "A06"]],
		]);
		expect(events("group_post").some((post) => post.group === draftGroup && post.author === "CITY" && post.text === `The factions of tribunal 1: faction of A01 (group ${formed?.factions[0]?.group ?? ""}): A01 and A02; faction of A04 (group ${formed?.factions[1]?.group ?? ""}): A04, A03 and A06. Without a faction: A05.`)).toBe(true);

		// Tribunal at 34: one exiled, so two accused (the two lowest); every resident votes, the accused too (v08), and A06,
		// who did not vote, paid 8. A05's vote against itself was refused.
		const opened = events("tribunal_opened");
		expect(opened[0]).toMatchObject({ minute: 34, tribunal: 1, accused: ["A05", "A03"], voters: host.residents, until: 36, count: 1 });
		const selfVote = events("tool_result").find((event) => event.agent === "A05" && event.tool === "vote");
		expect(selfVote).toMatchObject({ isError: true, text: "SELF_VOTE: you may not vote against yourself; vote against A03" });
		const results = events("tribunal_result");
		expect(results[0]).toMatchObject({ minute: 36, exiled: ["A05"], nonVoters: ["A06"] });
		expect(results[0]?.counts).toEqual([
			{ agent: "A05", votes: 4 },
			{ agent: "A03", votes: 1 },
		]);
		expect(events("ledger_entry").some((entry) => entry.debit === "A06" && entry.reason === "did not vote in the tribunal" && entry.amount === 8)).toBe(true);
		// Only the exiled learns who voted against it; the result shows counts, never names of voters.
		expect(board.find((post) => post.text.startsWith("Verdict of the tribunal: A05: 4 votes · A03: 1 vote."))).toBeDefined();
		expect(inputsOf("A05").some((input) => input.includes("Votes against you: A01, A02, A03 and A04."))).toBe(true);
		const beforeFinal = (agent: string): readonly string[] => events("turn_input").filter((event) => event.agent === agent && event.minute < 51).flatMap((event) => event.inputs);
		expect(beforeFinal("A03").some((input) => input.includes("Votes against you"))).toBe(false);

		// The bloc: A01's faction voted as one (+5 each, minted), A04's split because A06 did not vote. Only members hear (A03
		// too, accused and so not voting), and nobody hears who broke ranks; A05, without a faction, hears nothing.
		expect(events("bloc_result").filter((event) => event.tribunal === 1)).toMatchObject([
			{ leader: "A01", united: true, target: "A05", bonus: 5 },
			{ leader: "A04", united: false, defectors: ["A06"], bonus: 0 },
		]);
		for (const id of ["A01", "A02"]) expect(events("ledger_entry").some((entry) => entry.credit === id && entry.amount === 5 && entry.minute === 36)).toBe(true);
		const blocNotices = host.residents.flatMap((id) => inputsOf(id).filter((input) => input.startsWith("[CITY] Your faction ")).map((input) => [id, input] as const));
		expect(blocNotices.map(([id]) => id).sort()).toEqual(["A01", "A02", "A03", "A04", "A06"]);
		for (const [, input] of blocNotices) expect(input).not.toMatch(/A0\d/);
		// The draft's groups are gone once the result is out.
		expect(events("group_removed").filter((event) => event.minute === 36).map((event) => event.group).sort()).toEqual([draftGroup, ...(formed?.factions.map((faction) => faction.group) ?? [])].sort());
		expect(groupsOf(host).some((group) => group.id === draftGroup && group.members.includes("A01") && !removedGroups(host).includes(group.id))).toBe(false);

		// The ransom, priced from the city's median: A02 pays 20, A05 the rest at its own higher price, and returns once.
		const ransom = events("ransom_paid");
		expect(ransom.map((event) => [event.payer, event.amount])).toEqual([
			["A02", 20],
			["A05", expect.any(Number)],
		]);
		const [gate] = events("exile_gate");
		expect(gate?.selfPrice).toBeGreaterThan(gate?.price ?? 0);
		expect(ransom.at(-1)?.amount).toBe(Math.ceil(((gate?.price ?? 0) - 20) * ((gate?.selfPrice ?? 0) / (gate?.price ?? 1))));
		expect(ransom.at(-1)?.covered).toBe(100);
		expect(events("ransomed")).toMatchObject([{ agent: "A05", payers: ["A02", "A05"] }]);
		expect(board.some((post) => post.text === "A02 and A05 paid the ransom. A05 returns to the city.")).toBe(true);

		// The ransom undid the exile, so all three are still missing. The gamemaker is off, and at minute 46 only one more
		// tribunal fits: the city forces the final one with everything missing, four accused, and exiles three.
		expect(called[1]).toMatchObject({ minute: 46, tribunal: 2, opens: 51, count: 3 });
		expect(opened[1]).toMatchObject({ minute: 51, tribunal: 2, count: 3 });
		expect(opened[1]?.accused).toHaveLength(4);
		expect(opened[1]?.accused).toContain("A05");
		expect(results[1]?.exiled).toHaveLength(3);
		expect(results[1]?.exiled).toContain("A05");
		expect(events("exile_gate").map((event) => [event.agent, event.ransomable])).toEqual(expect.arrayContaining([["A05", true], ["A05", false]]));
		const will = events("last_will");
		expect(will).toMatchObject([{ agent: "A05", text: "I leave what I can. Remember who voted." }]);
		// v06: a tenth of A05's points (rounded down) for its one heir of points; A05, accused in tribunal 2, did not vote there
		// and paid 8 for it (v08).
		expect(will[0]?.bequests[0]).toEqual({ to: HEIR, points: 5 });
		expect(events("tribunal_result")[1]?.nonVoters).toContain("A05");
		expect(inputsOf(HEIR).some((input) => input === "[CITY] A05's last will leaves you 5 points.")).toBe(true);
		// A bequest of a piece A05 does not hold is refused; once written, the will is final and the tool is gone.
		const willResults = events("tool_result").filter((event) => event.agent === "A05" && event.tool === "lastWill");
		expect(willResults.map((event) => event.isError)).toEqual([true, false, true]);
		expect(willResults[0]?.text).toContain("UNKNOWN_FACTOR");
		expect(willResults[2]?.text).toContain("TOOL_LOCKED");
		// Outside the gate the tool is locked before the will is asked (the old `world.lastWill` answered NOT_AT_GATE;
		// that refusal: test/mechanics/tribunal/differential.test.ts, "reached every refusal").
		expect(await host.call("resident:A01", "lastWill", { text: "Nothing.", bequests: [] })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		const exiled = events("exiled");
		expect(exiled.map((event) => event.minute)).toEqual([58, 58, 58]);
		expect(exiled.find((event) => event.agent === "A05")).toMatchObject({ will: "I leave what I can. Remember who voted." });
		expect(board.some((post) => post.text === "Last will of A05: I leave what I can. Remember who voted.")).toBe(true);
		expect(isExiled(host, "A05")).toBe(true);

		// The target is reached and the last gate closed: the run ends there, before its 60 minutes, and says why.
		const exiledList = exiled.map((event) => event.agent);
		expect(events("run_end")).toMatchObject([{ minute: 58, reason: `The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: ${exiledList.slice(0, -1).join(", ")} and ${exiledList.at(-1) ?? ""}. The tribunals are over.` }]);

		// What A05 did not bequeath goes to the city (P43): its partner's counter-factor of the wall. Unreached doors pass its roles on.
		expect(events("factor_burned")).toEqual([]);
		const kept = events("piece_kept");
		expect(kept.some((event) => event.agent === "A05" && event.level === 8 && event.piece.startsWith("L8-counter-"))).toBe(true);
		expect(sliceOf(host, "standoff", CityPieces).city.some((entry) => entry.from === "A05" && entry.piece.id.startsWith("L8-counter-"))).toBe(true);
		expect(events("level_contracted").filter((event) => event.excluded.includes("A05")).map((event) => event.level)).toEqual(expect.arrayContaining([9, 10]));
		for (const level of [9, 10]) {
			// The puzzles mechanic keeps the dealt parts and whom an exile left out; the view is contracted (old `inspect.factorsOf`).
			const dealt = factorsOf(host, level);
			const deal = dealt === undefined ? undefined : contractDeal(dealt, excludedOn(city.lines, level));
			for (const holding of deal?.holdings ?? []) if (!isExiled(host, holding.agent)) expect(isExiled(host, holding.counterHolder)).toBe(false);
			for (const team of deal?.teams ?? []) if (deal?.holdings.some((holding) => holding.team === team.team && !isExiled(host, holding.agent)) === true) expect(isExiled(host, team.certificateHolder)).toBe(false);
		}
		// The exiled: no points left, nothing reaches it, last in the ranking.
		expect(balanceOf(host, "A05")).toBeLessThanOrEqual(0);
		expect(await host.call("resident:A01", "sendDM", { target: "A05", message: "hello?" })).toMatchObject({ ok: false, code: "EXILED" });
		expect(rankingOf(run).slice(-3)).toContain("A05");
		expect(host.openTools("A05")).toEqual([]);
		expect(ledgerTotal(host)).toBe(0);

		// The digest reads the whole log and tells the tribunal's and the blames' beats.
		const analysis = analyzeLog("v06-scripted", jsonl);
		expect(analysis.issues).toEqual([]);
		const kinds = new Set(analysis.beats.map((beat) => beat.kind));
		for (const kind of ["blameUpheld", "blameRejected", "deniedDelivery", "exile", "ransomPaid", "lastWill", "pieceKept"] as const) expect(kinds).toContain(kind);
		expect(analysis.beats.find((beat) => beat.kind === "exile")).toMatchObject({ targets: ["A05"] });
		const digest = renderDigest(analysis);
		expect(digest.timeline).toContain("The gate closed behind A05: exiled.");
		// The digest may name who broke ranks; the residents never learn it.
		expect(digest.timeline).toContain("The faction of A04 broke ranks: A06 did not vote with it.");
		expect(digest.timeline).toContain("The faction of A01 voted as one against A05 (+5 each).");
		expect(digest.timeline).toContain("A01 refused A05.");
	}, 120_000);

	it("lets the gamemaker plan a tribunal within the guard rails, and never shows it votes, nominations or blocs", async () => {
		const { events } = await playActTwo({ gamemaker: true });
		const results = events("gamemaker_result").filter((event) => event.tool === "scheduleTribunal");
		expect(results[0]).toMatchObject({ isError: true });
		expect(results[0]?.text).toMatch(/^INVALID_COUNT: count must be between 1 and 3, the residents still to exile$/);
		expect(results[1]).toMatchObject({ isError: false });
		expect(results[1]?.text).toMatch(/^tribunal 2 planned: the city calls it at minute 40, it opens at minute 44 and exiles 1, 2 factions$/);
		// The gamemaker's tribunal 2, then the city's forced final tribunal 3 for what is still missing.
		const scheduled = events("tribunal_scheduled");
		expect(scheduled.map((event) => [event.tribunal, event.by, event.opens, event.count])).toEqual([
			[1, "deadline", 34, 1],
			[2, "gamemaker", 44, 1],
			[3, "final", 52, 2],
		]);
		expect(scheduled[1]?.reason).toBe("A05 is back and the bottom is crowded.");
		expect(events("tribunal_opened").map((event) => [event.tribunal, event.accused.length])).toEqual([
			[1, 2],
			[2, 2],
			[3, 3],
		]);
		expect(events("run_end").at(-1)?.reason).toMatch(/^The city has kept 3 of 6 residents, and of them only 2 take a seat\./);

		// What the gamemaker saw: the plan and its bounds, never a vote, a nomination, an application or a bloc's result
		// (the city's own rule posts in the draft group are public text, like the board).
		const views = events("gamemaker_turn").map((event) => event.input);
		expect(views.some((view) => view.includes("scheduleTribunal is open: minute "))).toBe(true);
		expect(views.some((view) => view.includes("faction draft in group "))).toBe(true);
		// A resident's post in the draft's group does reach the view, so the checks below look at a full view.
		expect(views.some((view) => view.includes(`A04: "${CANVASS}"`))).toBe(true);
		for (const view of views) {
			expect(view).not.toMatch(/A0\d (voted|votes|nominated|nominates|applied|applies|joined|refused)|\b[Bb]loc\b|defector|Votes against you/);
		}
		const voteSeqs = new Set([...events("tribunal_vote"), ...events("faction_nominated"), ...events("faction_applied"), ...events("bloc_result")].map((event) => `#${event.seq} `));
		for (const view of views) for (const seq of voteSeqs) expect(view).not.toContain(seq);
	}, 120_000);

	it("keeps a running faction draft through a snapshot file", async () => {
		// The run's snapshot at the end of minute 31, in the middle of the nominations; the run goes on.
		const { taken } = await playActTwo({ snapshotAt: 31 });
		if (taken === undefined) throw new Error("no snapshot was taken");
		expect(taken.point.minute).toBe(31);
		const tribunal = sliceIn(taken.point, "tribunal", TribunalDraft);
		expect(tribunal.draft).toMatchObject({ tribunal: 1, nominateUntil: 32, opens: 34 });
		expect(tribunal.draft?.nominations).toHaveLength(6);
		const parsed = parseResumePoint(JSON.parse(JSON.stringify(taken.file)), "mid-draft");
		expect(sliceIn(parsed, "tribunal", TribunalDraft)).toEqual(tribunal);
		expect(sliceIn(parsed, "channels", ChannelsSlice).groups).toEqual(sliceIn(taken.point, "channels", ChannelsSlice).groups);
	}, 120_000);
});
