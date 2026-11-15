// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from old `test/cli/host-gamemaker-sections.test.ts`: the branches of the report's section renderers that
 * no golden look reaches, pinned to the old wording. The case of the standoff's own computation
 * (`computeStandoffSection`) stays with `standoff`, which computes the fact; its rendered lines are kept here.
 */
import { describe, expect, it } from "vitest";
import { renderHoldoutSection, type HoldoutSection } from "../src/gamemaker/report/holdout.ts";
import { renderResidents, type ProgressionSection } from "../src/gamemaker/report/progression.ts";
import { renderRiskSection, renderStandoffSection, type StandoffSection } from "../src/gamemaker/report/standoff.ts";
import { renderTribunalSection } from "../src/gamemaker/report/tribunal.ts";
import { renderSealSection, renderWhispererSection } from "../src/gamemaker/report/whisperer-seal.ts";

const rules: ProgressionSection["rules"] = { penalty: [2, 4], maxAttemptsPerWindow: 2, attemptWindowMinutes: 5, rewards: [{ level: 1, reward: 5 }], survivors: 2, residents: 3 };

describe("the report's section renderers (old wording)", () => {
	it("writes a resident at a shut door, at the gate and exiled as the old residentLine", () => {
		const section: ProgressionSection = {
			minute: 7,
			rules,
			alive: ["A01", "A02"],
			standing: [],
			ranking: [
				{ agent: "A01", points: 30, rank: 1, level: 3, standing: { kind: "alive" }, finished: false, waiting: 3, nextPenalty: 2, open: 0 },
				{ agent: "A02", points: 20, rank: 2, level: 2, standing: { kind: "gate", until: 9 }, finished: false, waiting: null, nextPenalty: 4, open: 5 },
				{ agent: "A03", points: 0, rank: 3, level: 1, standing: { kind: "exiled" }, finished: false, waiting: null, nextPenalty: 2, open: 5 },
			],
		};
		expect(renderResidents(section, new Map([["A01", { levelSince: 2, wrongOnLevel: 0, lastActive: 6 }]]))).toEqual([
			"Residents:",
			"- A01: passed level 3, waits at the door until every resident has, 30 points, rank 1, last acted minute 6",
			"- A02: at the gate until minute 9, 20 points, has not acted yet",
			"- A03: exiled, no seat and no more turns",
		]);
	});

	it("counts several borne seals and what is left to auction", () => {
		expect(renderSealSection({ auction: null, borne: 2, pending: 1 })).toEqual([
			"Black seal (its bearer strikes one resident from the city at once):",
			"- 2 unused seals are borne (you do not know who)",
			"- 1 more to auction in this act",
			"",
		]);
		expect(renderSealSection({ auction: null, borne: 0, pending: 0 })).toEqual([]);
	});

	it("writes a seized piece with its price", () => {
		const section: StandoffSection = { minute: 9, debts: [], city: [{ from: "A03", label: "the team certificate of door 8", needer: "A01", seized: true, price: 12 }], ultimatums: [], unused: [], risk: null, atRisk: [] };
		expect(renderStandoffSection(section, () => 0)).toEqual([
			"Standoffs (pieces not handed over; the city sees a hand-over when the holder writes the value to the one who needs it):",
			"- the city has seized the team certificate of door 8 of A03 for A01; A01 may buy it with claimPiece for 12 points",
			"",
		]);
	});

	it("writes who is at risk of the next tribunal and what they hold", () => {
		const section: StandoffSection = {
			minute: 9,
			debts: [],
			city: [{ from: "A06", label: "the counter-factor of door 8", needer: "A01", seized: false, price: 7 }],
			ultimatums: [],
			unused: [],
			risk: { opens: 12, now: false },
			atRisk: [
				{ agent: "A02", points: 10, gate: null, holds: [] },
				{ agent: "A04", points: 10, gate: 11, holds: ["the team certificate of door 8 for A01"] },
			],
		};
		expect(renderRiskSection(section)).toEqual([
			"At risk (if they leave, what they hold goes to the city, which sells it to the one who needs it):",
			"- A02 (10 points) stands trial at minute 12 as things stand; holds nothing others need",
			"- A04 (10 points) at the gate until minute 11; holds the team certificate of door 8 for A01",
			"",
		]);
	});

	it("writes the holdout tribunal's lot, drawn and not yet drawn, and its cool-down", () => {
		const base: HoldoutSection = { minute: 10, stallMinutes: 3, alive: ["A01", "A02", "A03"], blockers: [], session: null, pending: null, cooldownUntil: 0, struck: [] };
		const session = { number: 2, accused: "A02", door: 1, stage: "lot", until: 12, vote: 3, maxVotes: 3, lacking: ["A03"], lastResult: { vote: 3, yes: 1, no: 1 } };
		expect(renderHoldoutSection({ ...base, session })).toContain(
			"- tribunal 2 on A02 (door 1): all 3 votes failed; vote 3: 1 yes, 1 no. YOUR MOVE: drawLot with every resident in the city (A01, A02, A03), then permaDeath on the one drawn; otherwise the city draws and strikes at minute 12",
		);
		expect(renderHoldoutSection({ ...base, session: { ...session, drawn: "A03" } })).toContain(
			"- tribunal 2 on A02 (door 1): all 3 votes failed; vote 3: 1 yes, 1 no. YOUR MOVE: the lot fell on A03: permaDeath(A03, reason); otherwise the city draws and strikes at minute 12",
		);
		const blocker = { door: 1, blocker: "A02", lacking: ["A03"], passed: false, since: 4 };
		expect(renderHoldoutSection({ ...base, blockers: [blocker], cooldownUntil: 11 })).toEqual([
			"Blockers (the city's facts: a resident at a door 3+ minutes, others before it 3+ minutes without its fragment):",
			"- door 1: A02 has not sent its fragment yet to A03 (a blocker since minute 4)",
			"Holdout tribunal:",
			"- none running; a tribunal ended a short while ago, the next may be called from minute 11",
			"- struck so far: nobody",
			"",
		]);
		expect(renderHoldoutSection({ ...base, blockers: [blocker], cooldownUntil: 10 })).toContain("- none running. YOUR MOVE if a blocker holds the city: callTribunal on A02");
	});

	it("says one minute before the vote, a met duty and the busiest pair; nothing once the whisperer left", () => {
		const pair: [string, string] = ["A01", "A02"];
		const duty = { agent: "A06", since: 6, nextVote: 12, whispers: 1, recipients: ["A02"], needWhispers: 1, needRecipients: 1, met: true, busiest: { pair, dms: 3 } };
		expect(renderWhispererSection({ whisperer: "A06", minute: 11, duty })).toEqual([
			"The whisperer (secret: only you and he know; never reveal it or hint at it, to anyone): A06",
			"His orders (for you alone): at least 1 whispers to 1 different residents before the vote at minute 12, 1 minute left. Since the vote at minute 6: 1 whisper to A02; met. Most DMs since then: A01 and A02 (3).",
			"",
		]);
		expect(renderWhispererSection(null)).toEqual([]);
	});

	// The lines of this case were written by the old `renderTribunalSection` of `legacy` from the same data.
	it("writes an open scheduling window, the session, the draft and a gate (old tribunalLines)", () => {
		const lines = renderTribunalSection({
			residents: 6,
			target: 2,
			exiled: ["A05"],
			missing: 1,
			actEnd: 60,
			rules: { voteMinutes: 2, gateMinutes: 5, ransom: { share: 0.3, selfShare: 0.5, minimum: 20 }, bequestPerHeir: 0.1, blocBonus: null, fallbackGap: 10 },
			plan: { tribunal: 2, called: false, by: "gamemaker", calledAt: 30, opens: 34, count: 1, factions: 2 },
			window: { open: true, earliest: 36, latestFinal: 50, missing: 1, maxFactions: 3 },
			cityCall: { calledAt: 40, opens: 44 },
			session: { tribunal: 1, accused: ["A01", "A02"], count: 1, until: 31 },
			draft: { group: "G3", leaders: ["A03"] },
			gates: [{ agent: "A02", since: 29, until: 34, ransomable: false, price: 0, selfPrice: 0, paid: 0, covered: 0, willDone: true }],
		});
		expect(lines).toEqual([
			"Tribunal:",
			"- the city keeps 4 of 6: 2 to exile, 1 exiled so far, 1 still missing; the act ends at minute 60 at the latest (the residents do not know)",
			"- each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 30% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points",
			"- tribunal 2 planned (by gamemaker), called at minute 30: opens at minute 34, exiles 1, 2 factions",
			"- YOUR MOVE: scheduleTribunal is available now. The city still has to exile 1 resident; the earliest opening is minute 36. If you plan nothing, the city calls one itself at minute 40 (it opens at minute 44).",
			"- scheduleTribunal is open: minute 36-50, count must be 1, factions 2-3; without a plan the city calls one itself 10 minutes after the last result",
			"- open tribunal 1: A01, A02 accused, 1 to exile, the vote closes at minute 31",
			"- faction draft in group G3, leaders A03",
			"- A02 at the gate until minute 34: bought back once already, no ransom, will written",
			"- exiled: A05",
			"",
		]);
	});
});
