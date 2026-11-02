/**
 * The branches of the report's section renderers that neither a golden look nor the differential
 * scenarios reach (test/cli/host-gamemaker-golden.test.ts, host-gamemaker-differential.test.ts),
 * pinned to the old wording of packages/roles/src/gamemaker/situation.ts: a resident waiting at a
 * shut door, several borne seals, a seized piece, the holdout tribunal's lot and its cool-down, a
 * whisperer one minute before the vote, and an exiled whisperer.
 */
import { describe, expect, it } from "vitest";
import { renderResidents, type ProgressionSection } from "@swarmtales/mechanic-progression";
import { renderSealSection } from "@swarmtales/mechanic-seal";
import { computeStandoffSection, renderRiskSection, renderStandoffSection, type SectionReads, type StandoffSection } from "@swarmtales/mechanic-standoff";
import { renderHoldoutSection, type HoldoutSection } from "@swarmtales/mechanic-standoff-tribunal";
import { renderWhispererSection } from "@swarmtales/mechanic-whispers";

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
		const section: StandoffSection = {
			minute: 9,
			debts: [],
			city: [{ from: "A03", label: "the team certificate of door 8", needer: "A01", seized: true, price: 12 }],
			ultimatums: [],
			unused: [],
			risk: null,
			atRisk: [],
		};
		expect(renderStandoffSection(section, () => 0)).toEqual([
			"Standoffs (pieces not handed over; the city sees a hand-over when the holder writes the value to the one who needs it):",
			"- the city has seized the team certificate of door 8 of A03 for A01; A01 may buy it with claimPiece for 12 points",
			"",
		]);
	});

	it("lists a city piece only for a needer in the city, before its door, not yet bought; the held pieces only for needers still before theirs", () => {
		const reads: SectionReads = {
			minute: 9,
			alive: ["A01", "A02", "A03", "A04", "A05"],
			standing: (agent) => (agent === "A04" ? { kind: "gate", until: 11 } : { kind: "alive" }),
			levelOf: (agent) => (agent === "A03" ? 7 : 8),
			hasPassed: (agent) => agent === "A05",
			isExiled: (agent) => agent === "A06",
			points: () => 10,
			held: (agent) =>
				agent === "A04"
					? [
							{ kind: "certificate", level: 8, label: "the team certificate of door 8", needers: ["A01", "A05", "A06"] },
							{ kind: "fragment", level: 8, label: "the fragment of door 8", needers: ["A01"] },
						]
					: [],
			atRisk: () => ({ opens: 12, now: false, accused: ["A02"] }),
			cityPiecePrice: () => 7,
		};
		const piece = { level: 8, label: "the counter-factor of door 8", needers: ["A01", "A02", "A03", "A04", "A05"] };
		const section = computeStandoffSection({ outstanding: [], cityPieces: [{ from: "A06", piece, claimed: ["A02"] }], ultimatums: [], unused: [] }, reads);
		expect(section.city).toEqual([{ from: "A06", label: "the counter-factor of door 8", needer: "A01", seized: false, price: 7 }]);
		expect(section.atRisk).toEqual([
			{ agent: "A02", points: 10, gate: null, holds: [] },
			{ agent: "A04", points: 10, gate: 11, holds: ["the team certificate of door 8 for A01"] },
		]);
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
});
