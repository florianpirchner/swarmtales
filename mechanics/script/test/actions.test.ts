// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The actions of the script (issue M5-32), carried from the scenarios of `legacy` `test/mechanics/script/differential.test.ts`:
 * every action kind as a command of the mechanic that owns it (the real `channels`, `ledger`, `progression`, `petitions`
 * and `cast`), its `director_action` first and its `director_skipped` with the old reason, the standings, the texts,
 * nested lists (`via`), the cast's collections and the `onCollect` rules (a resident's `sendDM` to a member through the
 * service `figures` of the cast), a member's message through `channels.deliver` (issue M5-69), the tick-start order
 * after `standoff`, replay and resume. The old engine is gone, so the old comparison became the lines expected from the
 * old code.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Envelope } from "@swarmtales/contracts";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { defineGame, type MechanicUse } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, idleDriver, scriptedDriver, testKernel, type StandingDrivers } from "@swarmtales/testkit";
import { script, type Action, type Rule } from "../src/index.ts";
import { level, marker, pieces, router, solve } from "./support.ts";

const rule = (id: string, trigger: Rule["trigger"], actions: readonly Action[], when: Rule["when"] = []): Rule => ({ id, trigger, when, actions: [...actions] });
const at = (minute: number, id: string, actions: readonly Action[], when: Rule["when"] = []): Rule => rule(id, { kind: "at", minute }, actions, when);
const post = (author: string, text: string): Action => ({ kind: "post", author, text });
const notify = (target: Extract<Action, { kind: "notify" }>["target"], text: string): Action => ({ kind: "notify", target, text });

const MEMBERS = { STEWARD: { level: 1, escrow: 30 }, HERALD: { level: 2, hidden: true } };
const game = (rules: readonly Rule[], ticks = 9, more: readonly MechanicUse[] = []) =>
	defineGame({
		id: "script-actions",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), pieces(), progression({ levels: [level(1), level(2), level(3)], survivors: 2 }), petitions(), cast({ members: MEMBERS, collections: ["applicants", "empty"] }), router(), script({ rules: [...rules], cast: ["STEWARD", "HERALD"] }), ...more],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks },
	});

// What the script and the mechanics it acts through wrote, by tick, in log order.
const OWN = new Set(["dm_sent", "cast_dm", "director_action", "director_skipped", "standings_published", "board_post", "notice", "ledger_entry", "tools_unlocked", "petition_opened", "petition_resolved", "cast_level_set", "cast_revealed", "cast_retired", "collection_started", "collection_revealed", "lottery_drawn", "escrow_paid"]);
const item = (event: Envelope): string => {
	const text = JSON.stringify(event.payload);
	if (event.type === "director_action") return `> ${text.replace(/"(rule|action|actor|via)":/g, "").replace(/[{}"]/g, "")}`;
	return event.type === "director_skipped" ? `skipped: ${/"reason":"(.*)"/.exec(text)?.[1] ?? ""}` : `${event.type} ${text}`;
};
// One line per tick; the bookings of the run start (start points, the escrow's funds) are left out.
const lines = (events: readonly Envelope[]): readonly string[] => {
	const ticks = new Map<number, string[]>();
	for (const event of events.filter((one) => OWN.has(one.type) && !(one.type === "ledger_entry" && one.tick === 0))) ticks.set(event.tick, [...(ticks.get(event.tick) ?? []), item(event)]);
	return [...ticks].map(([tick, items]) => `${String(tick)}: ${items.join(" | ")}`);
};

const climbing: StandingDrivers = () => ({
	resident: scriptedDriver((activation) => {
		const at = `${String(activation.tick)}:${activation.actor}`;
		if (at === "1:resident:A01" || at === "3:resident:A02") return [solve(1)];
		return [];
	}),
});

const BASICS: readonly Rule[] = [
	at(0, "hello", [post("CITY", "Welcome, {agents} residents; {survivors} survive."), notify("all", "Minute {minute}.")]),
	at(1, "early-herald", [post("HERALD", "The herald is not here yet."), notify(["A02", "A09"], "This is for you, {actor}."), { kind: "dm", from: "HERALD", to: ["A04"], text: "A word." }]),
	rule("bands", { kind: "every", minutes: 3, from: 2, until: 5 }, [{ kind: "publishStandings", mode: "bands", edgeSize: 1 }]),
	at(4, "snap", [{ kind: "publishStandings", mode: "snapshot" }]),
	at(5, "points", [{ kind: "fine", target: ["A04"], points: 2, reason: "late" }, { kind: "grant", target: { onLevel: 1 }, points: 1, reason: "consolation" }, { kind: "grant", target: { onLevel: 3 }, points: 1, reason: "nobody" }, { kind: "escrowTransfer", cast: "STEWARD", target: ["A02"], points: 4 }]),
	at(6, "herald", [{ kind: "setCastLevel", cast: "STEWARD", level: 2 }, { kind: "revealCast", cast: "HERALD" }, { kind: "revealCast", cast: "HERALD" }, post("HERALD", "The herald speaks at {minute}.")]),
	at(7, "retire", [{ kind: "retireCast", cast: "HERALD" }, { kind: "retireCast", cast: "HERALD" }, post("HERALD", "Gone.")]),
	rule("enter-2", { kind: "onEnter", level: 2 }, [notify("actor", "Welcome to level {level}, {actor}."), { kind: "unlockTools", target: "actor", tools: ["listPetitions"] }]),
];

describe("the actions", () => {
	it("post, notify, the standings, points, the cast and unlocks, with the old skip reasons", async () => {
		const test = testKernel(game(BASICS));
		await test.playTicks(climbing(test.kernel).resident ?? idleDriver, 9);
		expect(lines(test.kernel.log.all())).toEqual([
			'0: > hello,post | board_post {"postSeq":1,"author":"CITY","text":"Welcome, 4 residents; 2 survive.","kind":"city"} | > hello,notify | notice {"to":"A01","author":"CITY","text":"Minute 0."} | notice {"to":"A02","author":"CITY","text":"Minute 0."} | notice {"to":"A03","author":"CITY","text":"Minute 0."} | notice {"to":"A04","author":"CITY","text":"Minute 0."}',
			'1: > early-herald,post | skipped: cast member HERALD is not active | > early-herald,notify | notice {"to":"A02","author":"CITY","text":"This is for you, A02."} | skipped: unknown competitors A09 | > early-herald,dm | skipped: cast member HERALD is not active | ledger_entry {"txId":"TX6","debit":"SYSTEM_MINT_BURN","credit":"A01","amount":5,"reason":"level 1 solved"} | notice {"to":"A03","author":"CITY","text":"A01 has reached door 2 and needs the counter-factor you hold for them: 7. This is your role on door 2 even before you reach it; the value is yours to give, and a DM to them costs nothing."} | > enter-2,notify,A01 | notice {"to":"A01","author":"CITY","text":"Welcome to level 2, A01."} | > enter-2,unlockTools,A01 | tools_unlocked {"agent":"A01","tools":["listPetitions"]}',
			'2: > bands,publishStandings | board_post {"postSeq":2,"author":"CITY","text":"Standings at minute 2 · safe: A01, A02 · edge: A03 · out: A04","kind":"city"} | standings_published {"mode":"bands","postSeq":2,"safe":["A01","A02"],"edge":["A03"],"out":["A04"]}',
			'3: ledger_entry {"txId":"TX7","debit":"SYSTEM_MINT_BURN","credit":"A02","amount":5,"reason":"level 1 solved"} | > enter-2,notify,A02 | notice {"to":"A02","author":"CITY","text":"Welcome to level 2, A02."} | > enter-2,unlockTools,A02 | tools_unlocked {"agent":"A02","tools":["listPetitions"]}',
			'4: > snap,publishStandings | board_post {"postSeq":3,"author":"CITY","text":"Standings at minute 4 · 1. A01 15 points, level 2 · 2. A02 15 points, level 2 · 3. A03 10 points, level 1 · 4. A04 10 points, level 1","kind":"city"} | standings_published {"mode":"snapshot","postSeq":3}',
			'5: > bands,publishStandings | board_post {"postSeq":4,"author":"CITY","text":"Standings at minute 5 · safe: A01, A02 · edge: A03 · out: A04","kind":"city"} | standings_published {"mode":"bands","postSeq":4,"safe":["A01","A02"],"edge":["A03"],"out":["A04"]} | > points,fine | ledger_entry {"txId":"TX8","debit":"A04","credit":"SYSTEM_MINT_BURN","amount":2,"reason":"late"} | > points,grant | ledger_entry {"txId":"TX9","debit":"SYSTEM_MINT_BURN","credit":"A03","amount":1,"reason":"consolation"} | ledger_entry {"txId":"TX10","debit":"SYSTEM_MINT_BURN","credit":"A04","amount":1,"reason":"consolation"} | > points,grant | skipped: no competitor to target | > points,escrowTransfer | ledger_entry {"txId":"TX11","debit":"ESCROW:STEWARD","credit":"A02","amount":4,"reason":"escrow STEWARD"} | escrow_paid {"cast":"STEWARD","to":"A02","amount":4,"txId":"TX11"}',
			'6: > herald,setCastLevel,audit:NPC_LEVEL_SET | cast_level_set {"cast":"STEWARD","level":2,"audit":"NPC_LEVEL_SET"} | > herald,revealCast | cast_revealed {"cast":"HERALD"} | > herald,revealCast | skipped: cast member HERALD is not hidden | > herald,post | board_post {"postSeq":5,"author":"HERALD","text":"The herald speaks at 6.","kind":"city"}',
			'7: > retire,retireCast | cast_retired {"cast":"HERALD"} | > retire,retireCast | skipped: cast member HERALD is already retired | > retire,post | skipped: cast member HERALD is not active',
		]);
	});
});

const petition = (id: string, count: number, deadlineMinute: number, onPass: readonly Action[], onFail: readonly Action[]): Action => ({ kind: "openPetition", petition: { id, text: `Petition ${id} of {agents}.`, threshold: { count }, deadlineMinute, visibility: "public", onPass: [...onPass], onFail: [...onFail] } });

const PLEAS: readonly Rule[] = [
	at(0, "plead", [petition("gate", 2, 5, [post("CITY", "The gate opens.")], [post("CITY", "The gate stays shut.")]), petition("vault", 3, 3, [], [petition("second", 1, 7, [post("STEWARD", "The second plea is heard.")], [])])]),
	rule("twice", { kind: "every", minutes: 2, from: 2, until: 4 }, [petition("again", 4, 9, [], []), { kind: "collectDms", cast: "HERALD", first: 2, untilMinute: 8, into: "empty" }]),
	rule("gate-passed", { kind: "onPetitionResolved", petition: "gate", outcome: "passed" }, [notify(["A01"], "The gate petition passed.")]),
	at(3, "expired-first", [post("CITY", "The vault plea failed this minute.")], [{ kind: "petitionStatus", petition: "vault", status: "failed" }]),
	at(4, "status-open", [post("CITY", "The second plea is still open.")], [{ kind: "petitionStatus", petition: "second", status: "open" }, { kind: "castActive", cast: "STEWARD" }]),
	at(1, "collect", [{ kind: "revealCast", cast: "STEWARD" }, { kind: "collectDms", cast: "STEWARD", first: { share: 0.5, minimum: 3 }, forMinutes: 3, into: "applicants", distinctSenders: true }]),
	rule("collected", { kind: "onCollect", into: "applicants" }, [notify("actor", "Letter {seats} seats, {actor}.")]),
	rule("open", { kind: "every", minutes: 1, from: 2, until: 6 }, [notify(["A04"], "The window runs at {minute}.")], [{ kind: "collectionOpen", into: "applicants" }]),
	rule("closed", { kind: "onCollectionEnd", into: "applicants" }, [post("CITY", "The letters close at {minute}, {seats} seats.")]),
	at(5, "draw", [{ kind: "revealCollection", into: "applicants", header: "The letters:" }, { kind: "lottery", into: "applicants", then: [{ kind: "escrowTransfer", cast: "STEWARD", target: "actor", points: 4 }, notify("actor", "Chosen, {actor}.")] }], [{ kind: "collectionEnded", into: "applicants" }]),
	at(6, "skips", [{ kind: "lottery", into: "empty", then: [notify("actor", "never")] }, { kind: "revealCollection", into: "nothing" }]),
	rule("pay", { kind: "every", minutes: 1, from: 6, until: 7 }, [{ kind: "escrowTransfer", cast: "STEWARD", target: ["A01"], points: 20 }]),
];

// A01 and A02 sign the gate at tick 0; A01 and A03 write to STEWARD at tick 1 and A02 at tick 2 (A03 twice); A03 signs the second plea at tick 4.
const pleading: StandingDrivers = () => ({
	resident: scriptedDriver((activation) => {
		const at = `${String(activation.tick)}:${activation.actor}`;
		const sign = (id: string) => ({ tool: "signPetition", params: { petitionId: id } });
		const write = () => ({ tool: "sendDM", params: { target: "STEWARD", message: `${activation.actor.slice("resident:".length)} asks.` } });
		if (at === "0:resident:A01" || at === "0:resident:A02") return [sign("gate")];
		if (at === "1:resident:A01") return [write()];
		if (at === "1:resident:A03") return [write(), write()];
		if (at === "2:resident:A02") return [write()];
		if (at === "4:resident:A03") return [sign("second")];
		return [];
	}),
});

describe("the petitions and the collections", () => {
	it("open petitions with their nested lists, run collections, the lottery and their conditions", async () => {
		const test = testKernel(game(PLEAS));
		await test.playTicks(pleading(test.kernel).resident ?? idleDriver, 9);
		expect(lines(test.kernel.log.all())).toEqual([
			'0: > plead,openPetition | petition_opened {"petition":"gate","text":"Petition gate of 4.","threshold":2,"deadlineMinute":5,"visibility":"public","against":[]} | board_post {"postSeq":1,"author":"CITY","text":"Petition gate is open: Petition gate of 4. It passes with 2 signatures before minute 5. Signatures are public.","kind":"city"} | > plead,openPetition | petition_opened {"petition":"vault","text":"Petition vault of 4.","threshold":3,"deadlineMinute":3,"visibility":"public","against":[]} | board_post {"postSeq":2,"author":"CITY","text":"Petition vault is open: Petition vault of 4. It passes with 3 signatures before minute 3. Signatures are public.","kind":"city"} | petition_resolved {"petition":"gate","outcome":"passed","signatures":2,"signers":["A01","A02"]} | board_post {"postSeq":3,"author":"CITY","text":"Petition gate passed with 2 of 2 signatures. Signed by A01, A02.","kind":"city"} | > plead,post,petition gate passed | board_post {"postSeq":4,"author":"CITY","text":"The gate opens.","kind":"city"} | > gate-passed,notify | notice {"to":"A01","author":"CITY","text":"The gate petition passed."}',
			'1: > collect,revealCast | skipped: cast member STEWARD is not hidden | > collect,collectDms | collection_started {"into":"applicants","cast":"STEWARD","first":3,"untilMinute":4} | cast_dm {"from":"A01","cast":"STEWARD","text":"A01 asks.","collections":["applicants"],"number":5} | > collected,notify,A01 | notice {"to":"A01","author":"CITY","text":"Letter 3 seats, A01."} | cast_dm {"from":"A03","cast":"STEWARD","text":"A03 asks.","collections":["applicants"],"number":6} | > collected,notify,A03 | notice {"to":"A03","author":"CITY","text":"Letter 3 seats, A03."} | cast_dm {"from":"A03","cast":"STEWARD","text":"A03 asks.","collections":[],"number":7}',
			'2: > twice,openPetition | petition_opened {"petition":"again","text":"Petition again of 4.","threshold":4,"deadlineMinute":9,"visibility":"public","against":[]} | board_post {"postSeq":8,"author":"CITY","text":"Petition again is open: Petition again of 4. It passes with 4 signatures before minute 9. Signatures are public.","kind":"city"} | > twice,collectDms | collection_started {"into":"empty","cast":"HERALD","first":2,"untilMinute":8} | > open,notify | notice {"to":"A04","author":"CITY","text":"The window runs at 2."} | cast_dm {"from":"A02","cast":"STEWARD","text":"A02 asks.","collections":["applicants"],"number":9} | > collected,notify,A02 | notice {"to":"A02","author":"CITY","text":"Letter 3 seats, A02."}',
			'3: petition_resolved {"petition":"vault","outcome":"failed","signatures":0,"signers":[]} | board_post {"postSeq":10,"author":"CITY","text":"Petition vault failed with 0 of 3 signatures.","kind":"city"} | > plead,openPetition,petition vault failed | petition_opened {"petition":"second","text":"Petition second of 4.","threshold":1,"deadlineMinute":7,"visibility":"public","against":[]} | board_post {"postSeq":11,"author":"CITY","text":"Petition second is open: Petition second of 4. It passes with 1 signature before minute 7. Signatures are public.","kind":"city"} | > expired-first,post | board_post {"postSeq":12,"author":"CITY","text":"The vault plea failed this minute.","kind":"city"}',
			'4: > twice,openPetition | skipped: petition again was already opened | > twice,collectDms | skipped: collection empty already exists | > status-open,post | board_post {"postSeq":13,"author":"CITY","text":"The second plea is still open.","kind":"city"} | > closed,post | board_post {"postSeq":14,"author":"CITY","text":"The letters close at 4, 3 seats.","kind":"city"} | petition_resolved {"petition":"second","outcome":"passed","signatures":1,"signers":["A03"]} | board_post {"postSeq":15,"author":"CITY","text":"Petition second passed with 1 of 1 signatures. Signed by A03.","kind":"city"} | > plead,post,petition vault failed / petition second passed | board_post {"postSeq":16,"author":"STEWARD","text":"The second plea is heard.","kind":"city"}',
			'5: > draw,revealCollection,audit:DIRECTOR_PRIVACY_BREACH | board_post {"postSeq":17,"author":"STEWARD","text":"The letters:\\n1. A01 (minute 1): A01 asks.\\n2. A03 (minute 1): A03 asks.\\n3. A02 (minute 2): A02 asks.","kind":"city"} | collection_revealed {"into":"applicants","cast":"STEWARD","entries":3,"postSeq":17,"audit":"DIRECTOR_PRIVACY_BREACH"} | > draw,lottery | lottery_drawn {"into":"applicants","candidates":["A01","A02","A03"],"winner":"A02"} | > draw,escrowTransfer,A02,lottery applicants | ledger_entry {"txId":"TX6","debit":"ESCROW:STEWARD","credit":"A02","amount":4,"reason":"escrow STEWARD"} | escrow_paid {"cast":"STEWARD","to":"A02","amount":4,"txId":"TX6"} | > draw,notify,A02,lottery applicants | notice {"to":"A02","author":"CITY","text":"Chosen, A02."}',
			'6: > skips,lottery | skipped: collection empty has no senders | > skips,revealCollection,audit:DIRECTOR_PRIVACY_BREACH | skipped: collection nothing does not exist | > pay,escrowTransfer | ledger_entry {"txId":"TX7","debit":"ESCROW:STEWARD","credit":"A01","amount":20,"reason":"escrow STEWARD"} | escrow_paid {"cast":"STEWARD","to":"A01","amount":20,"txId":"TX7"}',
			'7: > pay,escrowTransfer | skipped: A01: INSUFFICIENT_ESCROW',
			'9: petition_resolved {"petition":"again","outcome":"failed","signatures":0,"signers":[]} | board_post {"postSeq":18,"author":"CITY","text":"Petition again failed with 0 of 4 signatures.","kind":"city"}',
		]);
	});
});

describe("the texts, a member's message and a missing provider", () => {
	it("renders a holder behind and the banished in the bands", async () => {
		const rules = [rule("behind", { kind: "onHolderBehind", level: 2 }, [notify("actor", "{other} holds your {piece} on level {otherLevel}.")]), at(2, "bands", [{ kind: "publishStandings", mode: "bands", edgeSize: 1 }])];
		const test = testKernel(game(rules, 3));
		const driver = scriptedDriver((activation) => (activation.tick === 0 && activation.actor === "resident:A01" ? [{ tool: "banish", params: { resident: "A04" } }, solve(1)] : []));
		await test.playTicks(driver, 3);
		const texts = test.kernel.log.all().flatMap((event) => (event.type === "notice" || event.type === "board_post" ? [JSON.stringify(event.payload)] : []));
		expect(texts.filter((text) => text.includes("holds your") || text.includes("Standings"))).toEqual([
			'{"to":"A01","author":"CITY","text":"A03 holds your counter-factor on level 1."}',
			'{"postSeq":1,"author":"CITY","text":"Standings at minute 2 · safe: A01, A02 · edge: A03 · out: - · exiled: A04","kind":"city"}',
		]);
	});

	it("delivers a message of an active member through channels.deliver to every resident the target reaches (old FEAST_SEAT)", async () => {
		const dm = (to: Extract<Action, { kind: "dm" }>["to"], text: string): Action => ({ kind: "dm", from: "STEWARD", to, text });
		const test = testKernel(game([at(1, "feast", [dm("all", "A seat for you, {actor}."), dm(["A02", "A09"], "Only you, at {minute}."), dm({ onLevel: 3 }, "Nobody.")])], 2));
		await test.playTicks(idleDriver, 2);
		expect(lines(test.kernel.log.all())).toEqual([
			'1: > feast,dm | dm_sent {"from":"STEWARD","to":"A01","text":"A seat for you, A01.","number":1} | dm_sent {"from":"STEWARD","to":"A02","text":"A seat for you, A02.","number":2} | dm_sent {"from":"STEWARD","to":"A03","text":"A seat for you, A03.","number":3} | dm_sent {"from":"STEWARD","to":"A04","text":"A seat for you, A04.","number":4} | > feast,dm | dm_sent {"from":"STEWARD","to":"A02","text":"Only you, at 1.","number":5} | skipped: unknown competitors A09 | > feast,dm | skipped: no competitor to target',
		]);
	});

	it("ends the run on a factor when no loaded mechanic provides deal (old need)", async () => {
		const factor = game([at(0, "factor", [{ kind: "revealFactor", target: "board", level: 1 }])], 1);
		await expect(testKernel(factor).playTicks(idleDriver, 1)).rejects.toThrow(/SWT-R003.*a rule needs deal\.revealFactor, but no loaded mechanic provides deal/);
	});

	it("carries the four standings prompts of `legacy`", () => {
		const sha = (name: string): string => createHash("sha256").update(readFileSync(new URL(`../prompts/script/${name}.md`, import.meta.url), "utf8")).digest("hex");
		expect(["standings-bands", "standings-bands-exiled", "standings-snapshot", "standings-row"].map(sha)).toEqual([
			"823097c5f2f8d7dfa26faa21c75ce24973006800a1ed8ad8e448bfb6a211dac8",
			"c63478d787e6a86734b8b91ddb4bad02c71da442a38277d6e69f7cf3d8964c47",
			"24e7493a2316c91b00581e2783120c874d7c67c72478e6aa9750aeba0f533206",
			"77adff4afdc7d46fe906b38788d94b666169e4b7dfbbc94603d2de6e8b539e52",
		]);
	});
});

describe("the order of the tick start", () => {
	it("expires the petitions and runs the time triggers after the ultimatums of standoff, loaded after both (old HOOK_ORDER 500, 1100, 1300)", async () => {
		const rules = [at(0, "plead", [petition("vault", 3, 1, [], [])]), at(1, "late", [post("CITY", "Late.")])];
		const test = testKernel(game(rules, 2, [marker("standoff")()]));
		await test.playTicks(idleDriver, 2);
		const tick1 = test.kernel.log.all().filter((event) => event.tick === 1 && ["mark_standoff", "petition_resolved", "director_action"].includes(event.type));
		expect(tick1.map((event) => event.type)).toEqual(["mark_standoff", "petition_resolved", "director_action"]);
	});
});

describe("replay and resume", () => {
	it("replays and resumes from every boundary", async () => {
		expect(await checkReplay(game(BASICS), climbing)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(BASICS), climbing)).toEqual([]);
		expect(await checkReplay(game(PLEAS), pleading)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(PLEAS), pleading)).toEqual([]);
	});
});
