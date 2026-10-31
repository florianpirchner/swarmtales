/** The scripted seal scenarios (team T4b), run on the old SealHouse and on the new host. */
import { oldDraw, type Scenario } from "./differential.ts";

const SIX = ["A01", "A02", "A03", "A04", "A05", "A06"];
const points = (ids: readonly string[], value: number, extra: Readonly<Record<string, number>> = {}) => ({ ...Object.fromEntries(ids.map((id) => [id, value])), ...extra });

/** Two seals (5 in the city at the act's start), a tie the seeded draw decides, every refusal of both tools, a strike at the gate, a lost bidder exiled, the target reached. */
export function wonAndUsed(): Scenario {
	const [winner = "", loser = ""] = oldDraw(1, ["A01", "A02"]);
	return {
		residents: SIX,
		points: points(SIX, 50, { A04: 20 }),
		rule: { act: 8, announceAfter: 1, bidMinutes: 2, perResidents: 3, spacing: 3 },
		minutes: 9,
		actStartAt: 1,
		missing: 3,
		exiled: ["A06"],
		steps: {
			0: [{ kind: "bid", agent: "A01", points: 5 }],
			2: [
				{ kind: "bid", agent: "A01", points: 10 },
				{ kind: "bid", agent: "A02", points: 10 },
				{ kind: "bid", agent: "A03", points: 0 },
				{ kind: "bid", agent: "A04", points: 200 },
				{ kind: "gate", agent: "A05", until: 9 },
				{ kind: "bid", agent: "A05", points: 3 },
				{ kind: "use", agent: "A01", target: "A02" },
			],
			3: [{ kind: "bid", agent: "A01", points: 10 }],
			4: [
				{ kind: "use", agent: winner, target: winner },
				{ kind: "use", agent: winner, target: "A99" },
				{ kind: "use", agent: winner, target: "A06" },
				{ kind: "use", agent: winner, target: "A05" },
				{ kind: "use", agent: winner, target: "A03" },
			],
			5: [
				{ kind: "bid", agent: "A03", points: 6 },
				{ kind: "bid", agent: "A04", points: 4 },
				{ kind: "bid", agent: loser, points: 7 },
				{ kind: "exile", agent: loser },
			],
			6: [{ kind: "missing", value: 0 }],
			7: [{ kind: "use", agent: "A03", target: "A04" }],
		},
	};
}

/** Three seals: one won and lost with its holder, one with only a bid of 0, one still open when the act ends. */
export function endedEveryWay(): Scenario {
	return {
		residents: SIX,
		points: points(SIX, 30),
		rule: { act: 4, announceAfter: 0, bidMinutes: 1, perResidents: 2, spacing: 2 },
		minutes: 8,
		actStartAt: 1,
		actEndAt: 6,
		missing: 2,
		steps: {
			1: [{ kind: "bid", agent: "A01", points: 5 }],
			3: [{ kind: "bid", agent: "A02", points: 0 }],
			4: [{ kind: "exile", agent: "A01" }],
			5: [{ kind: "bid", agent: "A03", points: 2 }],
			6: [{ kind: "bid", agent: "A03", points: 3 }],
		},
	};
}

/** One seal ("the black seal"), won, then the act ends with it unused: its bearer hears it crumble. */
export function heldAtTheEnd(): Scenario {
	return {
		residents: ["A01", "A02", "A03"],
		points: points(["A01", "A02", "A03"], 12, { A02: 3 }),
		rule: { act: 8, announceAfter: 2, bidMinutes: 2, perResidents: 12, spacing: 6 },
		minutes: 7,
		actStartAt: 0,
		missing: 1,
		steps: {
			2: [
				{ kind: "bid", agent: "A02", points: 3 },
				{ kind: "bid", agent: "A03", points: 3 },
			],
			3: [{ kind: "exile", agent: "A01" }],
			5: [{ kind: "use", agent: "A03", target: "A01" }],
		},
	};
}

/** Fewer than two in the city at the act's start: no seal at all. */
export function noSeal(): Scenario {
	return {
		residents: ["A01", "A02"],
		points: points(["A01", "A02"], 10),
		rule: { act: 8, announceAfter: 0, bidMinutes: 1, perResidents: 1, spacing: 1 },
		minutes: 4,
		actStartAt: 0,
		missing: 1,
		exiled: ["A02"],
		steps: { 1: [{ kind: "bid", agent: "A01", points: 1 }] },
	};
}

export const SCENARIOS: readonly (readonly [string, () => Scenario])[] = [
	["a seal won on a tie and used, every refusal, a strike at the gate, the target reached", wonAndUsed],
	["seals that end every other way: holder exiled, a bid of 0, still open at the act's end", endedEveryWay],
	["the only seal held unused at the act's end", heldAtTheEnd],
	["no seal with fewer than two in the city", noSeal],
];
