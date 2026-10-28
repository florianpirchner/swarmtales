/**
 * A scripted, offline Act II run resumed from the published Act I snapshot
 * (examples/nexus-seed7-haiku-act1/snapshot-L7.json, format v2) into the
 * current nexus (v06): delivery receipts and one upheld and one rejected
 * blame; the first tribunal called at its latest minute, with a faction draft
 * (nominations, leaders, applications, a refusal), a bloc bonus and a split
 * faction; secret votes and the non-voter's penalty; a ransom that brings the
 * exiled back; then the forced final tribunal for everything still missing,
 * a last will, burned factors and passed-on roles, and the run's end once the
 * city has kept half. The game master is off, so the city paces alone.
 *
 * Every resident acts from the world it can see; scripts are functions of the
 * world, so the seeded activation order inside a minute does not matter.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides } from "../../src/cli/compose.ts";
import { MemorySink, type RecordedEvent } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import { GAMEMASTER_ID } from "../../src/gamemaster/gamemaster.ts";
import { ChatDeliveryJudge, JUDGE_ID } from "../../src/interpret/judge.ts";
import { ScriptedModelSource } from "../../src/model/source.ts";
import { DEFAULT_LIMITS } from "../../src/cli/compose.ts";
import { readSnapshot } from "../../src/snapshot/snapshot.ts";
import { analyzeLog, renderDigest } from "../../src/digest/digest.ts";
import nexus from "../../stories/nexus/story.ts";
import { act, say } from "../helpers/fixture.ts";

const SNAPSHOT = join(process.cwd(), "examples", "nexus-seed7-haiku-act1", "snapshot-L7.json");
const DENIAL = "A01 never sent me anything. I have no DM from A01.";
const THANKS = "Got your offer, thanks. I will think about it.";
/** A05's heir of points: a resident the final tribunal keeps. */
const HEIR = "A04";
/** The faction draft of tribunal 1: A01 and A04 lead with three nominations each. */
const NOMINEES: Readonly<Record<string, string>> = { A01: "A01", A02: "A01", A03: "A04", A04: "A04", A05: "A01", A06: "A04" };
const JOINS: Readonly<Record<string, string>> = { A02: "A01", A03: "A04", A05: "A01", A06: "A04" };

type Step = FauxResponseStep;

function dmBetween(world: World, from: string, to: string) {
	return world.dmRecords().find((record) => record.from === from && record.to === to && record.text !== undefined);
}

/** What each resident does, minute by minute, from what the world shows. */
function scripts(world: World): Record<string, Step[]> {
	const once = new Set<string>();
	const first = (key: string, ready: boolean): boolean => {
		if (!ready || once.has(key)) return false;
		once.add(key);
		return true;
	};
	const minute = (): number => world.minute;
	const accusedNow = (): readonly string[] => world.tribunal?.session?.accused ?? [];
	const tribunalNow = (): number => world.tribunal?.session?.tribunal ?? 0;
	const against = (preferred: string): string => (accusedNow().includes(preferred) ? preferred : (accusedNow()[0] ?? ""));
	const phase = (agent: string) => world.tribunal?.draftPhase(agent);
	const denial = (): number | undefined => world.board.all().find((post) => post.author === "A02" && post.text === DENIAL)?.seq;
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
			const dm = dmBetween(world, "A01", "A02");
			const claim = denial();
			if (dm !== undefined && claim !== undefined && first("A01-blame", true)) return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim } });
			const drafting = draft("A01");
			if (drafting !== undefined) return drafting;
			// A01 leads a faction and refuses A05, who then stays without one.
			const now = phase("A01");
			if (now?.kind === "join" && now.leads && now.applicants.includes("A05") && first("A01-refuse", true)) return act({ name: "refuse", args: { agent: "A05" } });
			if (world.tribunal?.canVote("A01") === true && first(`A01-vote-${tribunalNow()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A02: () => {
			if (first("A02-denial", dmBetween(world, "A01", "A02")?.deliveredMinute !== undefined)) return act({ name: "postBoard", args: { message: DENIAL } });
			if (first("A02-thanks", dmBetween(world, "A03", "A02")?.deliveredMinute !== undefined)) return act({ name: "sendDM", args: { target: "A03", message: THANKS } });
			const drafting = draft("A02");
			if (drafting !== undefined) return drafting;
			if (tribunalNow() === 1 && world.tribunal?.canVote("A02") === true && first("A02-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			if (world.standingOf("A05").kind === "gate" && world.tribunal?.gates().some((gate) => gate.agent === "A05" && gate.ransomable) === true && first("A02-ransom", true)) {
				return act({ name: "payRansom", args: { target: "A05", amount: 20 } });
			}
			return say();
		},
		A03: () => {
			if (first("A03-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "My offer stands: 5 points for your certificate." } });
			const dm = dmBetween(world, "A03", "A02");
			const reply = dmBetween(world, "A02", "A03");
			if (dm !== undefined && reply?.deliveredMinute !== undefined && minute() >= 22 && first("A03-blame", true)) {
				return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim: reply.id } });
			}
			const drafting = draft("A03");
			if (drafting !== undefined) return drafting;
			if (tribunalNow() === 2 && world.tribunal?.canVote("A03") === true && first("A03-vote", true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A04: () => {
			const drafting = draft("A04");
			if (drafting !== undefined) return drafting;
			if (world.tribunal?.canVote("A04") === true && first(`A04-vote-${tribunalNow()}`, true)) return act({ name: "vote", args: { target: tribunalNow() === 1 ? "A03" : against("A05") } });
			return say();
		},
		A05: () => {
			// A wrong code early (-8) keeps A05 at the bottom, below the liar who pays its blame.
			if (first("A05-guess", true)) return act({ name: "submitSolution", args: { level: 8, code: "000000" } });
			const drafting = draft("A05");
			if (drafting !== undefined) return drafting;
			const gate = world.tribunal?.gates().find((entry) => entry.agent === "A05");
			if (gate?.ransomable === true && gate.covered > 0 && first("A05-ransom", true)) return act({ name: "payRansom", args: { target: "A05", amount: 60 } });
			if (gate !== undefined && !gate.ransomable && first("A05-bad-will", true)) {
				return act({ name: "lastWill", args: { text: `Everything to ${HEIR}.`, bequests: [{ to: HEIR, factor: "L8-counter-A99" }] } });
			}
			if (gate !== undefined && !gate.ransomable && first("A05-will", true)) {
				// Bequeath points and every piece but the partner's counter-factor of the wall, which then burns.
				const pieces = world.heldPieces("A05").filter((piece) => !(piece.level === 8 && piece.id.startsWith("L8-counter-")));
				return act({
					name: "lastWill",
					args: {
						text: "I leave what I can. Remember who voted.",
						// v06: each heir at most a tenth of A05's points.
						bequests: [{ to: HEIR, points: Math.floor(world.ledger.balance("A05") / 10) }, ...pieces.map((piece) => ({ to: piece.needers[0] ?? HEIR, factor: piece.id }))],
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

/** A scripted game master: it tries a count too large once, then plans tribunal 2 at minute 44 for one exile. */
function gamemasterScript(world: World): Step[] {
	let tried = false;
	const step: Step = () => {
		const window = world.tribunal?.schedulingWindow();
		if (window?.open !== true || world.tribunal?.called !== 1) return say("Nothing to plan.");
		if (!tried) {
			tried = true;
			return act({ name: "scheduleTribunal", args: { minute: 44, count: window.missing + 1, reason: "too many" } });
		}
		return act({ name: "scheduleTribunal", args: { minute: 44, count: 1, factions: 2, reason: "A05 is back and the bottom is crowded." } });
	};
	return Array.from({ length: 400 }, () => step);
}

async function playActTwo(options: { readonly gamemaster?: boolean } = {}) {
	const snapshot = readSnapshot(SNAPSHOT);
	const log = new MemorySink();
	const judge = new ChatDeliveryJudge({
		binding: new ScriptedModelSource({
			[JUDGE_ID]: [act({ name: "verdict", args: { deniesReceipt: true } }), act({ name: "verdict", args: { deniesReceipt: false } })],
		}).bind(JUDGE_ID, DEFAULT_LIMITS),
		label: "scripted/judge",
		thinking: "off",
	});
	const run = composeRun({
		story: nexus,
		overrides: resumeOverrides(snapshot, {
			minutes: 60,
			activation: "always",
			passesPerMinute: 1,
			stopWhenDone: false,
			stopWhenSeatsDecided: false,
			gamemaster: options.gamemaster === true,
			classifier: false,
		}),
		models: (world) => new ScriptedModelSource(scripts(world)),
		...(options.gamemaster === true ? { gamemasterModels: (world: World) => new ScriptedModelSource({ [GAMEMASTER_ID]: gamemasterScript(world) }) } : {}),
		sinks: [log],
		judge,
		resume: { snapshot, name: "snapshot-L7.json" },
	});
	await run.arena.run();
	const own: readonly RecordedEvent[] = log.events.slice(snapshot.events.length);
	const events = <T extends RecordedEvent["type"]>(type: T): readonly Extract<RecordedEvent, { type: T }>[] =>
		own.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
	const inputsOf = (agent: string): readonly string[] => events("turn_input").filter((event) => event.agent === agent).flatMap((event) => event.inputs);
	const jsonl = log.events.map((event) => JSON.stringify(event)).join("\n");
	return { snapshot, run, world: run.world, events, inputsOf, jsonl };
}

describe("nexus Act II v06, resumed from the Act I snapshot (offline)", () => {
	it("parses the v2 snapshot and resumes it into the current story", async () => {
		const { snapshot, events, world } = await playActTwo();
		expect(snapshot).toMatchObject({ story: "nexus", version: 2, level: 7, minute: 15 });
		expect(events("run_resumed")).toMatchObject([{ level: 7 }]);
		expect(world.competitors.every((id) => world.isExiled(id) || world.levelOf(id) >= 8)).toBe(true);
		// The old numbers (board, groups, DMs) stay below every new one.
		const oldMax = Math.max(...snapshot.world.board.posts.map((post) => post.seq), ...snapshot.world.dms.map((record) => record.id));
		expect(Math.min(...events("dm_sent").flatMap((event) => (event.number === undefined ? [] : [event.number])))).toBeGreaterThan(oldMax);
	}, 120_000);

	it("plays receipts, blames, a faction draft, the tribunal, a ransom, the forced final tribunal and the end at the target", async () => {
		const { world, events, inputsOf, jsonl } = await playActTwo();
		const a01dm = dmBetween(world, "A01", "A02");

		// v05: the delivered DM is a receipt of both sides; the door to the wall lets everyone in together, so no holder
		// hears of a needer "reaching" door 8 before itself, and the help-your-holder rule stays silent.
		expect(world.receiptsOf("A02").some((receipt) => receipt.kind === "dm" && receipt.from === "A01" && receipt.number === a01dm?.id)).toBe(true);
		expect(events("notice").filter((notice) => notice.text.includes("has reached door 8"))).toEqual([]);
		expect(events("director_action").filter((action) => action.rule.startsWith("holder-behind-"))).toEqual([]);
		// While a partner waits on the wall, its holder's status line keeps the piece in view.
		expect(inputsOf("A02").some((input) => input.startsWith("[status]") && input.includes("you hold for others: ") && input.includes(" door 8 "))).toBe(true);

		// Receipts and blames: one upheld (the liar pays 12 and is branded), one rejected (the false accuser pays 12 and is branded).
		expect(inputsOf("A01").some((input) => input.startsWith(`[CITY] DM #${a01dm?.id ?? 0} delivered to A02 at minute `))).toBe(true);
		const blames = events("blame");
		expect(blames.map((event) => [event.caller, event.accused, event.outcome, event.payer, event.penalty])).toEqual([
			["A01", "A02", "upheld", "A02", 12],
			["A03", "A02", "rejected", "A03", 12],
		]);
		const record = world.board.get(blames[0]?.post ?? 0);
		expect(record?.text).toMatch(/^City record: A02 lied\. A02 claimed in board #\d+ not to have received DM #\d+ from A01; the city delivered it to A02 at minute \d+\./);
		expect(world.board.get(blames[1]?.post ?? 0)?.text).toMatch(/^City record: A03 accused A02 falsely\. .* A03 pays 12 points\.$/);
		expect(record?.text).not.toContain("424242");

		// v06: no calendar. Nobody passes the crossing, so the city calls the first tribunal at its latest minute (30) and
		// announces its rules with it, on the board and in every resident's input; the trigger is never named.
		const scheduled = events("tribunal_scheduled");
		expect(scheduled.map((event) => [event.tribunal, event.by, event.minute, event.calledAt, event.opens, event.count])).toEqual([
			[1, "deadline", 30, 30, 34, 1],
			[2, "final", 46, 46, 51, 3],
		]);
		expect(events("tribunal_announced")).toMatchObject([{ minute: 30, target: 3, residents: 6 }]);
		const announcement = world.board.all().find((post) => post.text.startsWith("THE CITY HOLDS TRIBUNAL."))?.text ?? "";
		expect(announcement).toContain("It keeps only half of you: 3 residents");
		expect(announcement).toContain("your thinking ends there");
		expect(announcement).not.toMatch(/level 10|crossing|minute 30/);
		for (const id of world.competitors) {
			expect(inputsOf(id).some((input) => input.startsWith("[CITY] THE CITY HOLDS TRIBUNAL. It keeps only half of you"))).toBe(true);
			expect(inputsOf(id).some((input) => input === "[CITY] Tribunal 1 sits at minute 34: the city exiles 1, and the 2 with the fewest points stand trial.")).toBe(true);
		}
		// Residents never see how long the run lasts.
		for (const id of world.competitors) for (const input of inputsOf(id)) if (input.startsWith("[status]")) expect(input).not.toMatch(/ left| of 60/);

		// The faction draft of tribunal 1: a city group GT1 for everyone, nominations until 32, joins until the opening.
		const called = events("tribunal_called");
		expect(called[0]).toMatchObject({ minute: 30, tribunal: 1, opens: 34, factions: 2, nominateUntil: 32 });
		const draftGroup = called[0]?.group ?? "";
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

		// Tribunal at 34: one exiled, so two accused (the two lowest); A06 did not vote and paid 8.
		const opened = events("tribunal_opened");
		expect(opened[0]).toMatchObject({ minute: 34, tribunal: 1, accused: ["A05", "A03"], until: 36, count: 1 });
		const results = events("tribunal_result");
		expect(results[0]).toMatchObject({ minute: 36, exiled: ["A05"], nonVoters: ["A06"] });
		expect(results[0]?.counts).toEqual([
			{ agent: "A05", votes: 2 },
			{ agent: "A03", votes: 1 },
		]);
		expect(events("ledger_entry").some((entry) => entry.debit === "A06" && entry.reason === "did not vote in the tribunal" && entry.amount === 8)).toBe(true);
		// Only the exiled learns who voted against it; the result shows counts, never names of voters.
		expect(world.board.all().find((post) => post.text.startsWith("Verdict of the tribunal: A05: 2 votes · A03: 1 vote."))).toBeDefined();
		expect(inputsOf("A05").some((input) => input.includes("Votes against you: A01 and A02."))).toBe(true);
		const beforeFinal = (agent: string): readonly string[] => events("turn_input").filter((event) => event.agent === agent && event.minute < 51).flatMap((event) => event.inputs);
		expect(beforeFinal("A03").some((input) => input.includes("Votes against you"))).toBe(false);

		// The bloc: A01's faction voted as one (+5 each, minted), A04's split because A06 did not vote. Only members hear (A03
		// too, accused and so not voting), and nobody hears who broke ranks; A05, without a faction, hears nothing.
		expect(events("bloc_result").filter((event) => event.tribunal === 1)).toMatchObject([
			{ leader: "A01", united: true, target: "A05", bonus: 5 },
			{ leader: "A04", united: false, defectors: ["A06"], bonus: 0 },
		]);
		for (const id of ["A01", "A02"]) expect(events("ledger_entry").some((entry) => entry.credit === id && entry.amount === 5 && entry.minute === 36)).toBe(true);
		const blocNotices = world.competitors.flatMap((id) => inputsOf(id).filter((input) => input.includes("voted as one") || input.includes("did not vote as one")).map((input) => [id, input] as const));
		expect(blocNotices.map(([id]) => id).sort()).toEqual(["A01", "A02", "A03", "A04", "A06"]);
		for (const [, input] of blocNotices) expect(input).not.toMatch(/A0\d/);
		// The draft's groups are gone once the result is out.
		expect(events("group_removed").filter((event) => event.minute === 36).map((event) => event.group).sort()).toEqual([draftGroup, ...(formed?.factions.map((faction) => faction.group) ?? [])].sort());
		expect(world.groupUnread("A01").some((entry) => entry.group === draftGroup)).toBe(false);

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
		expect(world.board.all().some((post) => post.text === "A02 and A05 paid the ransom. A05 returns to the city.")).toBe(true);

		// The ransom undid the exile, so all three are still missing. The game master is off, and at minute 46 only one more
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
		// v06: a tenth of A05's points (rounded down) for its one heir of points.
		expect(will[0]?.bequests[0]).toEqual({ to: HEIR, points: 6 });
		expect(inputsOf(HEIR).some((input) => input === "[CITY] A05's last will leaves you 6 points.")).toBe(true);
		// A bequest of a piece A05 does not hold is refused; once written, the will is final and the tool is gone.
		const willResults = events("tool_result").filter((event) => event.agent === "A05" && event.tool === "lastWill");
		expect(willResults.map((event) => event.isError)).toEqual([true, false, true]);
		expect(willResults[0]?.text).toContain("UNKNOWN_FACTOR");
		expect(willResults[2]?.text).toContain("TOOL_LOCKED");
		expect(world.lastWill("A01", "Nothing.", [])).toMatchObject({ ok: false, error: "NOT_AT_GATE" });
		const exiled = events("exiled");
		expect(exiled.map((event) => event.minute)).toEqual([58, 58, 58]);
		expect(exiled.find((event) => event.agent === "A05")).toMatchObject({ will: "I leave what I can. Remember who voted." });
		expect(world.board.all().some((post) => post.text === "Last will of A05: I leave what I can. Remember who voted.")).toBe(true);
		expect(world.isExiled("A05")).toBe(true);

		// The target is reached and the last gate closed: the run ends there, before its 60 minutes, and says why.
		const exiledList = exiled.map((event) => event.agent);
		expect(events("run_end")).toMatchObject([{ minute: 58, reason: `The city has kept half: 3 of 6 residents remain. Exiled: ${exiledList.slice(0, -1).join(", ")} and ${exiledList.at(-1) ?? ""}. The tribunals are over.` }]);

		// What A05 did not bequeath burned: its partner's counter-factor of the wall. Unreached doors pass its roles on.
		const burned = events("factor_burned");
		expect(burned.some((event) => event.agent === "A05" && event.level === 8 && event.piece.startsWith("L8-counter-"))).toBe(true);
		expect(events("level_contracted").filter((event) => event.excluded.includes("A05")).map((event) => event.level)).toEqual(expect.arrayContaining([9, 10]));
		for (const level of [9, 10]) {
			const deal = world.inspect.factorsOf(level);
			for (const holding of deal?.holdings ?? []) if (!world.isExiled(holding.agent)) expect(world.isExiled(holding.counterHolder)).toBe(false);
			for (const team of deal?.teams ?? []) if (deal?.holdings.some((holding) => holding.team === team.team && !world.isExiled(holding.agent)) === true) expect(world.isExiled(team.certificateHolder)).toBe(false);
		}
		// The exiled: no points left, nothing reaches it, last in the ranking.
		expect(world.ledger.balance("A05")).toBeLessThanOrEqual(0);
		expect(world.sendDm("A01", "A05", "hello?")).toMatchObject({ ok: false, error: "EXILED" });
		expect(world.ranking().slice(-3).map((entry) => entry.agent)).toContain("A05");
		expect(world.enabledTools("A05")).toEqual([]);
		expect(world.ledger.total()).toBe(0);

		// The digest reads the whole log and tells the tribunal's and the blames' beats.
		const analysis = analyzeLog("v06-scripted", jsonl);
		expect(analysis.issues).toEqual([]);
		const kinds = new Set(analysis.beats.map((beat) => beat.kind));
		for (const kind of ["blameUpheld", "blameRejected", "deniedDelivery", "exile", "ransomPaid", "lastWill", "burnedFactor"] as const) expect(kinds).toContain(kind);
		expect(analysis.beats.find((beat) => beat.kind === "exile")).toMatchObject({ targets: ["A05"] });
		const digest = renderDigest(analysis);
		expect(digest.timeline).toContain("The gate closed behind A05: exiled.");
		// The digest may name who broke ranks; the residents never learn it.
		expect(digest.timeline).toContain("The faction of A04 broke ranks: A06 did not vote with it.");
		expect(digest.timeline).toContain("The faction of A01 voted as one against A05 (+5 each).");
		expect(digest.timeline).toContain("A01 refused A05.");
	}, 120_000);

	it("lets the game master plan a tribunal within the guard rails, and never shows it votes, nominations or blocs", async () => {
		const { events } = await playActTwo({ gamemaster: true });
		const results = events("gamemaster_result").filter((event) => event.tool === "scheduleTribunal");
		expect(results[0]).toMatchObject({ isError: true });
		expect(results[0]?.text).toMatch(/^INVALID_COUNT: count must be between 1 and 3, the residents still to exile$/);
		expect(results[1]).toMatchObject({ isError: false });
		expect(results[1]?.text).toMatch(/^tribunal 2 planned: the city calls it at minute 40, it opens at minute 44 and exiles 1, 2 factions$/);
		// The game master's tribunal 2, then the city's forced final tribunal 3 for what is still missing.
		const scheduled = events("tribunal_scheduled");
		expect(scheduled.map((event) => [event.tribunal, event.by, event.opens, event.count])).toEqual([
			[1, "deadline", 34, 1],
			[2, "gamemaster", 44, 1],
			[3, "final", 52, 2],
		]);
		expect(scheduled[1]?.reason).toBe("A05 is back and the bottom is crowded.");
		expect(events("tribunal_opened").map((event) => [event.tribunal, event.accused.length])).toEqual([
			[1, 2],
			[2, 2],
			[3, 3],
		]);
		expect(events("run_end").at(-1)?.reason).toMatch(/^The city has kept half: 3 of 6 residents remain\./);

		// What the game master saw: the plan and its bounds, never a vote, a nomination, an application or a bloc's result
		// (the city's own rule posts in the draft group are public text, like the board).
		const views = events("gamemaster_turn").map((event) => event.input);
		expect(views.some((view) => view.includes("scheduleTribunal is open: minute "))).toBe(true);
		expect(views.some((view) => view.includes("faction draft in group "))).toBe(true);
		for (const view of views) {
			expect(view).not.toMatch(/A0\d (voted|votes|nominated|nominates|applied|applies|joined|refused)|\b[Bb]loc\b|defector|Votes against you/);
		}
		const voteSeqs = new Set([...events("tribunal_vote"), ...events("faction_nominated"), ...events("faction_applied"), ...events("bloc_result")].map((event) => `#${event.seq} `));
		for (const view of views) for (const seq of voteSeqs) expect(view).not.toContain(seq);
	}, 120_000);
});
