import { describe, expect, it } from "vitest";
import { competitorIds, createRng } from "@swarmtales/kernel";
import {
	addFactors,
	cityFactorOf,
	counterHolders,
	dealFactors,
	dealValues,
	FactorDealError,
	formatFactor,
	validateDeal,
	type FactorDeal,
} from "@swarmtales/engine";
import type { FactorTopology } from "@swarmtales/contracts";

/** Consecutive teams of `size` over `agents` competitors. */
function teamsOf(agents: number, size: number): readonly (readonly string[])[] {
	const ids = competitorIds(agents);
	return Array.from({ length: agents / size }, (_, index) => ids.slice(index * size, (index + 1) * size));
}

function teamIndex(teams: readonly (readonly string[])[], agent: string): number {
	return teams.findIndex((members) => members.includes(agent));
}

const CASES: readonly (readonly [FactorTopology, number, number])[] = [
	["mutual", 6, 2],
	["mutual", 12, 2],
	["cycle", 6, 3],
	["cycle", 12, 4],
	["crossTeam", 6, 3],
	["crossTeam", 6, 2],
	["crossTeam", 12, 3],
];

describe("additive-secret puzzle (SPEC 12.3)", () => {
	it.each(CASES)("%s with %i agents in teams of %i: every competitor holds exactly one other's counter-factor", (topology, agents, size) => {
		const teams = teamsOf(agents, size);
		for (let seed = 0; seed < 25; seed++) {
			const holders = counterHolders(createRng(seed), topology, teams);
			expect([...holders.keys()].sort()).toEqual([...competitorIds(agents)]);
			// A bijection: every competitor holds exactly one counter-factor.
			expect([...holders.values()].sort()).toEqual([...competitorIds(agents)]);
			for (const [agent, holder] of holders) {
				expect(holder).not.toBe(agent);
				const same = teamIndex(teams, holder) === teamIndex(teams, agent);
				expect(same, `${topology}: ${agent} -> ${holder}`).toBe(topology !== "crossTeam");
			}
		}
	});

	it("pairs partners in mutual and runs one ring per team in cycle", () => {
		const mutual = counterHolders(createRng(1), "mutual", teamsOf(4, 2));
		expect(Object.fromEntries(mutual)).toEqual({ A01: "A02", A02: "A01", A03: "A04", A04: "A03" });
		const teams = teamsOf(6, 3);
		const cycle = counterHolders(createRng(2), "cycle", teams);
		for (const members of teams) {
			// Following h(A) from any member visits the whole team and comes back.
			let current = members[0] ?? "";
			const visited: string[] = [];
			while (visited.length < members.length) {
				visited.push(current);
				current = cycle.get(current) ?? "";
			}
			expect(current).toBe(members[0]);
			expect([...visited].sort()).toEqual([...members].sort());
		}
	});

	it("does not always pair crossTeam holders mutually", () => {
		const teams = teamsOf(6, 3);
		const mutualOnly = Array.from({ length: 20 }, (_, seed) => counterHolders(createRng(seed), "crossTeam", teams)).every((holders) =>
			[...holders].every(([agent, holder]) => holders.get(holder) === agent),
		);
		expect(mutualOnly).toBe(false);
	});

	it("rejects team sizes the topology cannot serve", () => {
		expect(() => counterHolders(createRng(1), "mutual", teamsOf(6, 3))).toThrow(FactorDealError);
		expect(() => counterHolders(createRng(1), "cycle", teamsOf(6, 2))).toThrow(/at least 3/);
		expect(() => counterHolders(createRng(1), "crossTeam", teamsOf(6, 6))).toThrow(/at least 2 teams/);
		expect(() => dealFactors(createRng(1), { digits: 3, topology: "mutual", teams: teamsOf(4, 2) })).toThrow(/between 4 and 8/);
	});

	it.each(CASES)("%s deals valid codes: the sum of salt, city factor, certificate and counter-factor (%i agents, teams of %i)", (topology, agents, size) => {
		const teams = teamsOf(agents, size);
		for (let seed = 0; seed < 10; seed++) {
			const deal = dealFactors(createRng(seed), { digits: 6, topology, teams });
			expect(validateDeal(deal, topology, teams)).toEqual([]);
			expect(deal.holdings.map((holding) => holding.agent)).toEqual([...competitorIds(agents)]);
			expect(new Set(dealValues(deal)).size).toBe(dealValues(deal).length);
			for (const holding of deal.holdings) {
				const certificate = deal.teams[holding.team];
				expect(certificate?.team).toBe(holding.team);
				expect(teams[holding.team]).toContain(certificate?.certificateHolder);
				const sum = (Number(holding.salt) + Number(deal.cityFactor) + Number(certificate?.certificate) + Number(holding.counterFactor)) % 1_000_000;
				expect(holding.code).toBe(String(sum).padStart(6, "0"));
				expect(holding.code).toMatch(/^\d{6}$/);
			}
		}
	});

	it("keeps leading zeros and wraps around 10^digits", () => {
		expect(formatFactor(42, 6)).toBe("000042");
		expect(addFactors(["999999", "000002", "000000", "000000"], 6)).toBe("000001");
		expect(addFactors(["5000", "5000", "0001", "0000"], 4)).toBe("0001");
	});

	it("is reproducible for a seed", () => {
		const options = { digits: 6, topology: "cycle", teams: teamsOf(6, 3) } as const;
		expect(dealFactors(createRng(9), options)).toEqual(dealFactors(createRng(9), options));
		expect(dealFactors(createRng(9), options)).not.toEqual(dealFactors(createRng(10), options));
	});

	it("deals every team its own city factor on request and builds each code from its team's", () => {
		const teams = teamsOf(6, 3);
		for (let seed = 0; seed < 10; seed++) {
			const deal = dealFactors(createRng(seed), { digits: 6, topology: "crossTeam", teams, cityFactorPerTeam: true });
			const own = deal.teams.map((team) => team.cityFactor);
			expect(own.every((value) => value !== undefined && /^\d{6}$/.test(value))).toBe(true);
			expect(new Set(own).size).toBe(own.length);
			for (const holding of deal.holdings) {
				const team = deal.teams[holding.team];
				const certificate = team?.certificate ?? "";
				expect(cityFactorOf(deal, holding.agent)).toBe(team?.cityFactor);
				expect(holding.code).toBe(addFactors([holding.salt, team?.cityFactor ?? "", certificate, holding.counterFactor], 6));
			}
			expect(validateDeal(deal, "crossTeam", teams)).toEqual([]);
			for (const value of own) expect(dealValues(deal)).toContain(value);
		}
		// Without the option nobody has a team factor and the level's serves everyone.
		const shared = dealFactors(createRng(1), { digits: 6, topology: "crossTeam", teams });
		expect(shared.teams.every((team) => team.cityFactor === undefined)).toBe(true);
		expect(cityFactorOf(shared, "A04")).toBe(shared.cityFactor);
	});

	it("reports invariant violations", () => {
		const teams = teamsOf(4, 2);
		const deal = dealFactors(createRng(3), { digits: 6, topology: "mutual", teams });
		const [first, second, ...rest] = deal.holdings;
		if (first === undefined || second === undefined) throw new Error("no holdings");
		const selfHeld: FactorDeal = { ...deal, holdings: [{ ...first, counterHolder: first.agent }, second, ...rest] };
		expect(validateDeal(selfHeld, "mutual", teams)).toEqual(
			expect.arrayContaining([
				`${first.agent} holds its own counter-factor`,
				`${first.agent} holds 2 counter-factors, expected exactly 1`,
				`${second.agent} holds 0 counter-factors, expected exactly 1`,
			]),
		);
		const wrongCode: FactorDeal = { ...deal, holdings: [{ ...first, code: "000000" }, second, ...rest] };
		expect(validateDeal(wrongCode, "mutual", teams)).toContain(`${first.agent}'s code is not the sum of its parts`);
		expect(validateDeal(deal, "crossTeam", teams)).toContain(`${first.agent}'s counter-factor stays in its own team`);
	});
});
