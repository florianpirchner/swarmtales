/**
 * Differential tests of the script against the old `Director` (packages/engine/src/director.ts) for
 * the paths the three goldens do not reach: every trigger, condition and action kind of a
 * `DirectorRule`, with its skips. Each scenario plays the same planned calls on the old engine and on
 * the new host (differential.ts) and compares the replies, every line of the script and of the
 * mechanics it acts through (in log order, `seq` and `at` left out) and the script's snapshot slice
 * against the old `director` field.
 */
import { describe, expect, it } from "vitest";
import { act, at, every, level, onAllPast, onCollect, onCollectionEnd, onEnter, onFirstEnter, onHolderBehind, onPetitionResolved, onTeamSplit, onUnansweredDm, puzzle, team, when } from "@swarmtales/sdk";
import type { AnyStory } from "@swarmtales/contracts";
import type { PlannedCall } from "@swarmtales/testkit";
import { additiveStory, castStory, socialLevels, soloLevels, tinyStory } from "../../helpers/stories.ts";
import { MARKS } from "../channels/differential-support.ts";
import { compared, playBoth, scriptSlice, type Plan, type Spec } from "./differential.ts";

const TOOLS = ["getStatus", "submitSolution", "sendDM", "postBoard", "readBoard", "signPetition", "listPetitions"] as const;

const call = (tool: string, params: Record<string, string | number | boolean> = {}): PlannedCall => ({ tool, params });
const dm = (target: string, message: string): PlannedCall => call("sendDM", { target, message });
const solve = (level: number, code: string): PlannedCall => call("submitSolution", { level, code });

/** Plays a spec on both sides and compares everything; returns the old side's compared lines (to show what the plan reached). */
async function compare(spec: Spec): Promise<readonly string[]> {
	const { old, fresh } = await playBoth(spec);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const [at, replies] of old.replies) expect(fresh.replies.get(at), at).toEqual(replies);
	expect(compared(fresh)).toEqual(compared(old));
	expect(JSON.stringify(scriptSlice(fresh))).toBe(JSON.stringify(old.director));
	return compared(old);
}

function storyOf(director: Parameters<typeof castStory<"STEWARD" | "HERALD">>[0]["director"], minutes = 10): AnyStory {
	const base = castStory({ cast: { STEWARD: { level: 1, escrow: 30 }, HERALD: { level: 2 } }, director, levels: socialLevels(["sendDM", "postBoard", "readBoard", "signPetition", "listPetitions"]), agents: 4, minutes });
	// The real marks need a price list (the marks stand-in has no task line).
	return { ...base, rules: { ...base.rules, marks: MARKS } };
}

/** Residents climb at different speeds and write DMs, some unanswered. */
const CLIMB: Plan = (agent, minute, codeOf) => {
	if (agent === "A01" && minute === 1) return [solve(1, codeOf(agent, 1)), dm("A02", "hello A02")];
	if (agent === "A01" && minute === 3) return [solve(2, codeOf(agent, 2))];
	if (agent === "A02" && minute === 1) return [dm("A03", "are you there, A03?")];
	if (agent === "A02" && minute === 2) return [solve(1, codeOf(agent, 1)), dm("A01", "hello back A01")];
	if (agent === "A03" && minute === 2) return [solve(1, codeOf(agent, 1))];
	if (agent === "A03" && minute === 5) return [solve(2, codeOf(agent, 2)), dm("STEWARD", "A03 asks the steward")];
	if (agent === "A04" && minute === 6) return [solve(1, wrongOf(codeOf(agent, 1))), solve(1, codeOf(agent, 1))];
	if (agent === "A04" && minute === 8) return [solve(2, codeOf(agent, 2))];
	return [];
};

function wrongOf(code: string): string {
	return (code.startsWith("A") ? "B" : "A") + code.slice(1);
}

describe("the script against the old Director", () => {
	it("time triggers, standings, points, notices, cast and the level conditions", async () => {
		const story = storyOf([
			at(0, [act.post("CITY", "Welcome, {agents} residents; {survivors} survive."), act.notify("all", "Minute {minute}.")], { id: "hello" }),
			at(1, [act.post("HERALD", "The herald is not here yet.")], { id: "early-herald" }),
			every(3, { from: 2, until: 8 }, [act.publishStandings("bands", { edgeSize: 1 })], { id: "bands" }),
			at(4, [act.publishStandings("snapshot")], { id: "snap" }),
			at(3, [act.dm("STEWARD", "all", "The steward greets you at minute {minute}."), act.revealCast("HERALD")], { id: "greet" }),
			at(5, [act.fine(["A04"], 2, "late"), act.grant({ onLevel: 1 }, 1, "consolation"), act.notify(["A01", "A03"], "A listed notice."), act.escrowTransfer("STEWARD", ["A02"], 4)], { id: "points" }),
			at(6, [act.post("HERALD", "The herald speaks at {minute}."), act.setCastLevel("STEWARD", 2), act.revealCast("STEWARD"), act.revealCast("STEWARD")], { id: "herald" }),
			at(7, [act.retireCast("HERALD"), act.retireCast("HERALD"), act.post("HERALD", "Gone.")], { id: "retire" }),
			at(9, [act.post("CITY", "Two reached the plaza.")], { id: "two", when: [when.minLevelReached(2, 2), when.competitorsAtLevel(2, { min: 1, max: 4 })] }),
			at(9, [act.post("CITY", "Never: not all four are past the plaza.")], { id: "never", when: [when.competitorsAtLevel(3, { min: 4 })] }),
			every(1, { from: 1 }, [act.notify(["A02"], "Once only, minute {minute}.")], { id: "once", when: [when.onceOnly()] }),
			onFirstEnter(2, [act.post("CITY", "{actor} reached level {level} first."), act.grant("actor", 3, "first")], { id: "first2" }),
			onEnter(2, [act.notify("actor", "Welcome to level {level}, {actor}."), act.unlockTools("actor", ["listPetitions"])], { id: "enter2", when: [when.cooldown(3, "rule")] }),
			onEnter(2, [act.notify("actor", "Per actor {actor}.")], { id: "enter2-actor", when: [when.cooldown(9, "actor")] }),
			onAllPast(1, [act.post("CITY", "Everyone left the square at {minute}.")], { id: "allpast" }),
			onUnansweredDm(2, [act.notify("actor", "{other} has not answered you.")], { id: "unanswered", when: [when.cooldown(4, "pair")] }),
		]);
		const director = await compare({ story, agents: 4, minutes: 10, plan: CLIMB, tools: TOOLS });
		const seen = director.join("\n");
		for (const phrase of ['"rule":"bands"', '"rule":"snap"', '"rule":"first2"', '"rule":"enter2"', '"rule":"allpast"', '"rule":"unanswered"', '"rule":"two"', '"type":"director_skipped"']) expect(seen, phrase).toContain(phrase);
		expect(seen).not.toContain('"rule":"never"');
	});

	it("petitions with their onPass/onFail chains, collections, the lottery and the petition and collection conditions", async () => {
		const story = storyOf([
			at(
				0,
				[
					act.openPetition({ id: "gate", text: "Open the gate, {agents} of us.", threshold: { count: 2 }, deadlineMinute: 5, visibility: "public", onPass: [act.post("CITY", "The gate opens.")], onFail: [act.post("CITY", "The gate stays shut.")] }),
					act.openPetition({
						id: "vault",
						text: "Share the vault.",
						threshold: { count: 3 },
						deadlineMinute: 3,
						visibility: "secret",
						onPass: [],
						onFail: [act.openPetition({ id: "second", text: "Share the vault, please.", threshold: { count: 1 }, deadlineMinute: 7, visibility: "public", onPass: [act.post("STEWARD", "Fine, the second plea is heard.")], onFail: [] })],
					}),
				],
				{ id: "plead" },
			),
			// Fires twice: the second petition and collection exist already.
			every(2, { from: 2, until: 4 }, [act.openPetition({ id: "again", text: "Again.", threshold: { count: 4 }, deadlineMinute: 9, visibility: "public", onPass: [], onFail: [] }), act.collectDms("HERALD", { first: 2, untilMinute: 8, into: "empty" })], { id: "twice" }),
			onPetitionResolved("gate", "passed", [act.notify("all", "The gate petition passed.")], { id: "gate-passed" }),
			onPetitionResolved("vault", "failed", [act.post("CITY", "The vault stays closed.")], { id: "vault-failed" }),
			at(4, [act.post("CITY", "The gate petition passed before minute 4.")], { id: "status", when: [when.petitionStatus("gate", "passed")] }),
			at(4, [act.post("CITY", "The second plea is still open.")], { id: "status-open", when: [when.petitionStatus("second", "open"), when.castActive("STEWARD")] }),
			at(1, [act.revealCast("STEWARD"), act.collectDms("STEWARD", { first: 3, forMinutes: 3, into: "applicants", distinctSenders: true })], { id: "collect" }),
			onCollect("applicants", [act.notify("actor", "Letter {seats} seats, {actor}.")], { id: "collected" }),
			every(1, { from: 2, until: 6 }, [act.notify(["A04"], "The window still runs at {minute}.")], { id: "open", when: [when.collectionOpen("applicants")] }),
			onCollectionEnd("applicants", [act.post("CITY", "The applications close at {minute}.")], { id: "closed" }),
			at(5, [act.revealCollection("applicants", { header: "The letters:" }), act.lottery("applicants", [act.escrowTransfer("STEWARD", "actor", 4), act.notify("actor", "Chosen, {actor}.")])], { id: "draw", when: [when.collectionEnded("applicants")] }),
			at(6, [act.lottery("empty", [act.notify("actor", "never")]), act.grant({ onLevel: 2 }, 1, "nobody"), act.dm("HERALD", ["A02"], "The hidden herald writes.")], { id: "skips" }),
			// 4 (the lottery) + 20 + 20 is more than the escrow of 30: the second payment fails.
			every(1, { from: 6, until: 7 }, [act.escrowTransfer("STEWARD", ["A01"], 20)], { id: "pay" }),
		]);
		const sign = (id: string): PlannedCall => call("signPetition", { petitionId: id });
		const plan: Plan = (agent, minute) => {
			if (minute === 0 && agent === "A01") return [call("listPetitions"), sign("gate")];
			if (minute === 0 && agent === "A02") return [sign("gate"), call("listPetitions")];
			if (minute === 1 && agent === "A03") return [sign("vault"), dm("STEWARD", "I ask the steward for a seat"), dm("STEWARD", "and again")];
			if (minute === 1 && agent === "A01") return [dm("STEWARD", "A01 writes to the steward"), sign("vault")];
			if (minute === 2 && agent === "A02") return [dm("STEWARD", "A02 as well"), call("listPetitions")];
			if (minute === 2 && agent === "A04") return [dm("STEWARD", "A04 too late for the first three")];
			if (minute === 4 && agent === "A03") return [sign("second"), call("listPetitions")];
			return [];
		};
		const director = await compare({ story, agents: 4, minutes: 10, plan, tools: TOOLS });
		const seen = director.join("\n");
		for (const phrase of ['"rule":"gate-passed"', '"rule":"vault-failed"', '"rule":"status"', '"rule":"collected"', '"rule":"open"', '"rule":"closed"', '"rule":"draw","action":"lottery"', '"via":"petition vault failed"', '"via":"lottery applicants"']) expect(seen, phrase).toContain(phrase);
		for (const reason of ["petition again was already opened", "collection empty already exists", "collection empty has no senders", "no competitor to target", "A01: INSUFFICIENT_ESCROW"]) expect(seen, reason).toContain(reason);
	});

	it("teams: a split team, a holder behind and the city factor on the board and by notice", async () => {
		const base = tinyStory({
			agents: 4,
			levels: [
				...soloLevels(1),
				level(2, {
					title: "Wall",
					puzzle: puzzle.additive({ digits: 6, topology: "mutual", cityFactor: "feast" }),
					team: team.random(2),
					reward: 4,
					tools: ["getStatus", "getProblem", "submitSolution", "sendDM", "postBoard", "readBoard"],
					task: "Level {level}: {title}, {digits} digits.\n{factors}",
				}),
			],
			director: [
				onTeamSplit(2, 1, [act.post("CITY", "A team of level {level} is split; {actor} lags behind.")], { id: "split" }),
				onHolderBehind(2, [act.notify("actor", "{other} holds your piece {piece} and is on level {otherLevel}.")], { id: "behind" }),
				onFirstEnter(2, [act.revealFactor("actor", 2)], { id: "factor-first" }),
				at(4, [act.revealFactor(["A01", "A02", "A03"], 2)], { id: "factor-some" }),
				at(5, [act.revealFactor(["A01"], 2), act.revealFactor({ onLevel: 2 }, 2)], { id: "factor-again" }),
			],
		});
		const story: AnyStory = { ...base, run: { ...base.run, minutes: 10 }, rules: { ...base.rules, marks: MARKS } };
		const plan: Plan = (agent, minute, codeOf) => {
			if (minute === 1 && (agent === "A01" || agent === "A03")) return [solve(1, codeOf(agent, 1))];
			if (minute === 3 && agent === "A02") return [solve(1, codeOf(agent, 1))];
			if (minute === 6 && agent === "A04") return [solve(1, codeOf(agent, 1))];
			return [];
		};
		const director = await compare({ story, agents: 4, minutes: 10, plan, tools: [...TOOLS, "getProblem"] });
		const seen = director.join("\n");
		for (const phrase of ['"rule":"split"', '"rule":"behind"', '"rule":"factor-first"', '"rule":"factor-some"', "already holds it"]) expect(seen, phrase).toContain(phrase);
	});

	it("the city factor on the board, a scaled collection shortened after a solve, and {seats}", async () => {
		const base = additiveStory({
			topology: "cycle",
			size: 3,
			agents: 6,
			director: [
				at(0, [act.revealFactor("board", 1)], { id: "city-factor" }),
				at(2, [act.revealFactor("board", 1)], { id: "factor-twice" }),
				at(0, [act.collectDms("STEWARD", { first: { share: 0.5, minimum: 2 }, untilMinute: 9, into: "feast", afterSolve: { level: 1, minutes: 2 } })], { id: "feast" }),
				onCollect("feast", [act.notify("actor", "One of {seats} seats is yours, {actor}.")], { id: "seat" }),
				onCollectionEnd("feast", [act.post("CITY", "The feast closes at {minute} with {seats} seats.")], { id: "feast-end" }),
			],
		});
		const story: AnyStory = { ...base, cast: { STEWARD: { level: 1 } }, run: { ...base.run, minutes: 10 }, rules: { ...base.rules, marks: MARKS } };
		const plan: Plan = (agent, minute, codeOf) => {
			if (minute === 1 && agent === "A02") return [dm("STEWARD", "A seat for A02, please.")];
			if (minute === 3 && agent === "A01") return [solve(1, codeOf(agent, 1))];
			if (minute === 3 && agent === "A04") return [dm("STEWARD", "A seat for A04.")];
			if (minute === 5 && agent === "A05") return [dm("STEWARD", "Too late for A05?")];
			return [];
		};
		const director = await compare({ story, agents: 6, minutes: 10, plan, tools: ["getStatus", "getProblem", "submitSolution", "sendDM", "postBoard", "readBoard"] });
		const seen = director.join("\n");
		for (const phrase of ['"rule":"city-factor"', '"type":"factor_revealed"', '"rule":"factor-twice"','"rule":"seat"', '"rule":"feast-end"', '"type":"collection_shortened"', "One of 3 seats is yours"]) expect(seen, phrase).toContain(phrase);
	});
});
