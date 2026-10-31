/**
 * Additive-secret puzzle (SPEC 12.3).
 *
 * Every competitor A on a level has a personal code of `digits` digits:
 *
 *     CODE[A] = (salt[A] + city factor + certificate[team(A)] + counter-factor[A]) mod 10^digits
 *
 * The city factor is one value for the level, or one per team (`cityFactorPerTeam`).
 * The salt is in A's own task, the city factor is released by the director,
 * the team certificate sits with one member of A's team and the
 * counter-factor with exactly one other competitor, chosen by the topology.
 * Deals are checked against the invariants and redrawn on value collisions.
 */
import type { CompetitorId } from "../../core/ids.ts";
import type { Rng } from "../../core/random.ts";
import { assertNever } from "../../core/result.ts";
import type { FactorTopology } from "../../story/types.ts";
import { MAX_FACTOR_DIGITS, MIN_FACTOR_DIGITS } from "../../story/validate.ts";

// One source of truth: the story validator checks the same bounds.
export { MAX_FACTOR_DIGITS, MIN_FACTOR_DIGITS } from "../../story/validate.ts";

/** The certificate of one team and the member who holds it. */
export interface TeamCertificate {
	/** Index of the team on that level. */
	readonly team: number;
	readonly certificate: string;
	readonly certificateHolder: CompetitorId;
	/** The team's own city factor, on a level whose city factor is per team. */
	readonly cityFactor?: string;
}

/** One competitor's parts: its salt, its counter-factor and who holds it, and the resulting code. */
export interface FactorHolding {
	readonly agent: CompetitorId;
	readonly team: number;
	readonly salt: string;
	readonly counterFactor: string;
	/** The other competitor who holds this agent's counter-factor. */
	readonly counterHolder: CompetitorId;
	readonly code: string;
}

export interface FactorDeal {
	readonly digits: number;
	/** The level's city factor; unused when every team carries its own (`TeamCertificate.cityFactor`). */
	readonly cityFactor: string;
	readonly teams: readonly TeamCertificate[];
	/** Sorted by agent. */
	readonly holdings: readonly FactorHolding[];
}

export interface DealOptions {
	readonly digits: number;
	readonly topology: FactorTopology;
	/** Members of every team, in team index order. */
	readonly teams: readonly (readonly CompetitorId[])[];
	/** Every team gets its own city factor (SPEC 12.3). */
	readonly cityFactorPerTeam?: boolean;
	readonly maxAttempts?: number;
}

export class FactorDealError extends Error {
	override readonly name = "FactorDealError";
}

/** `value` with leading zeros, `digits` wide. */
export function formatFactor(value: number, digits: number): string {
	return String(value).padStart(digits, "0");
}

/** The sum of the parts modulo 10^digits, with leading zeros. */
export function addFactors(parts: readonly string[], digits: number): string {
	const modulus = 10 ** digits;
	return formatFactor(parts.reduce((sum, part) => (sum + Number(part)) % modulus, 0), digits);
}

/**
 * Who holds whose counter-factor: maps every competitor A to h(A), the one
 * other competitor holding A's counter-factor. Every competitor holds exactly one.
 */
export function counterHolders(rng: Rng, topology: FactorTopology, teams: readonly (readonly CompetitorId[])[]): ReadonlyMap<CompetitorId, CompetitorId> {
	const holders = new Map<CompetitorId, CompetitorId>();
	switch (topology) {
		case "mutual":
			for (const members of teams) {
				const [first, second] = members;
				if (members.length !== 2 || first === undefined || second === undefined) {
					throw new FactorDealError(`mutual needs teams of 2, got ${members.length}`);
				}
				holders.set(first, second);
				holders.set(second, first);
			}
			return holders;
		case "cycle":
			for (const members of teams) {
				if (members.length < 3) throw new FactorDealError(`cycle needs teams of at least 3, got ${members.length}`);
				const order = rng.shuffle(members);
				order.forEach((member, index) => {
					const next = order[(index + 1) % order.length];
					if (next !== undefined) holders.set(member, next);
				});
			}
			return holders;
		case "crossTeam":
			return crossTeamHolders(rng, teams);
		default:
			return assertNever(topology, "factor topology");
	}
}

/**
 * A seeded derangement across teams: h(A) is always in another team. Random
 * permutations are tried first (so pairs may or may not be mutual); a
 * rotation of the team-ordered list is the deterministic fallback.
 */
function crossTeamHolders(rng: Rng, teams: readonly (readonly CompetitorId[])[]): ReadonlyMap<CompetitorId, CompetitorId> {
	const all = teams.flat();
	const largest = Math.max(0, ...teams.map((members) => members.length));
	if (teams.length < 2 || largest * 2 > all.length) {
		throw new FactorDealError(`crossTeam needs at least 2 teams and no team with more than half of the ${all.length} competitors`);
	}
	const teamOf = new Map<CompetitorId, number>();
	teams.forEach((members, index) => {
		for (const member of members) teamOf.set(member, index);
	});
	for (let attempt = 0; attempt < 1_000; attempt++) {
		const holders = rng.shuffle(all);
		if (all.every((agent, index) => teamOf.get(holders[index] ?? agent) !== teamOf.get(agent))) {
			return new Map(all.map((agent, index) => [agent, holders[index] ?? agent]));
		}
	}
	// Rotating the team-ordered list by the largest team size never stays inside a team.
	const ordered = rng.shuffle(teams).flatMap((members) => rng.shuffle(members));
	return new Map(ordered.map((agent, index) => [agent, ordered[(index + largest) % ordered.length] ?? agent]));
}

/** Draws salts, city factor, certificates and counter-factors; every value of a level is distinct. */
export function dealFactors(rng: Rng, options: DealOptions): FactorDeal {
	const { digits, topology, teams } = options;
	if (!Number.isInteger(digits) || digits < MIN_FACTOR_DIGITS || digits > MAX_FACTOR_DIGITS) {
		throw new FactorDealError(`digits must be between ${MIN_FACTOR_DIGITS} and ${MAX_FACTOR_DIGITS}, got ${digits}`);
	}
	const holders = counterHolders(rng, topology, teams);
	const draw = (): string => formatFactor(rng.int(0, 10 ** digits - 1), digits);
	const maxAttempts = options.maxAttempts ?? 100;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const cityFactor = draw();
		const certificates: TeamCertificate[] = teams.map((members, team) => ({
			team,
			certificate: draw(),
			certificateHolder: rng.pick([...members].sort((a, b) => a.localeCompare(b))),
		}));
		if (options.cityFactorPerTeam === true) {
			certificates.forEach((entry, index) => {
				certificates[index] = { ...entry, cityFactor: draw() };
			});
		}
		const holdings: FactorHolding[] = teams
			.flatMap((members, team) => members.map((agent) => ({ agent, team })))
			.sort((a, b) => a.agent.localeCompare(b.agent))
			.map(({ agent, team }) => {
				const salt = draw();
				const counterFactor = draw();
				const certificate = certificates[team]?.certificate ?? formatFactor(0, digits);
				const city = certificates[team]?.cityFactor ?? cityFactor;
				return {
					agent,
					team,
					salt,
					counterFactor,
					counterHolder: holders.get(agent) ?? agent,
					code: addFactors([salt, city, certificate, counterFactor], digits),
				};
			});
		const deal: FactorDeal = { digits, cityFactor, teams: certificates, holdings };
		if (validateDeal(deal, topology, teams).length === 0) return deal;
	}
	throw new FactorDealError(`No valid factor deal after ${maxAttempts} attempts`);
}

/** The city factor `agent` needs: its team's own, or the level's. */
export function cityFactorOf(deal: FactorDeal, agent: CompetitorId): string {
	const team = deal.holdings.find((holding) => holding.agent === agent)?.team;
	return (team === undefined ? undefined : deal.teams[team]?.cityFactor) ?? deal.cityFactor;
}

/**
 * The deal rule after an exile (SPEC 6.4): the seeded deal stays as it is
 * (same values, same codes), and the roles of `excluded` competitors pass on,
 * so the exile itself makes no door impossible. A counter-factor an excluded
 * competitor held moves along the holder chain to the first remaining holder:
 * the one who held the excluded's own counter-factor, and so on, possibly
 * the needer itself ("you hold it yourself"). Every remaining competitor
 * still holds exactly one counter-factor. A certificate an excluded
 * competitor held goes to the first remaining member of its team. Excluded
 * competitors keep their holding, held by themselves; nobody needs them.
 */
export function contractDeal(deal: FactorDeal, excluded: ReadonlySet<CompetitorId>): FactorDeal {
	if (excluded.size === 0) return deal;
	const holderOf = new Map(deal.holdings.map((holding) => [holding.agent, holding.counterHolder]));
	const passOn = (needer: CompetitorId, holder: CompetitorId): CompetitorId => {
		let current = holder;
		for (let step = 0; excluded.has(current) && current !== needer && step <= deal.holdings.length; step++) current = holderOf.get(current) ?? needer;
		return excluded.has(current) ? needer : current;
	};
	return {
		...deal,
		teams: deal.teams.map((entry) => {
			if (!excluded.has(entry.certificateHolder)) return entry;
			const heir = deal.holdings.filter((holding) => holding.team === entry.team && !excluded.has(holding.agent)).map((holding) => holding.agent)[0];
			return heir === undefined ? entry : { ...entry, certificateHolder: heir };
		}),
		holdings: deal.holdings.map((holding) =>
			excluded.has(holding.agent) ? { ...holding, counterHolder: holding.agent } : { ...holding, counterHolder: passOn(holding.agent, holding.counterHolder) },
		),
	};
}

/** Every value a deal hands out (factors, salts and codes). */
export function dealValues(deal: FactorDeal): readonly string[] {
	return [
		deal.cityFactor,
		...deal.teams.flatMap((entry) => (entry.cityFactor === undefined ? [] : [entry.cityFactor])),
		...deal.teams.map((entry) => entry.certificate),
		...deal.holdings.flatMap((holding) => [holding.salt, holding.counterFactor, holding.code]),
	];
}

/** All invariant violations of a deal; empty when it is valid. */
export function validateDeal(deal: FactorDeal, topology: FactorTopology, teams: readonly (readonly CompetitorId[])[]): readonly string[] {
	const issues: string[] = [];
	const teamOf = new Map<CompetitorId, number>();
	teams.forEach((members, index) => {
		for (const member of members) teamOf.set(member, index);
	});
	const held = new Map<CompetitorId, number>();
	const pattern = new RegExp(`^\\d{${deal.digits}}$`);

	for (const value of dealValues(deal)) {
		if (!pattern.test(value)) issues.push(`value ${value} does not have ${deal.digits} digits`);
	}
	const values = dealValues(deal);
	if (new Set(values).size !== values.length) issues.push("two parts of the level share a value");

	if (deal.holdings.length !== teamOf.size) issues.push(`${deal.holdings.length} holdings for ${teamOf.size} competitors`);
	for (const holding of deal.holdings) {
		const { agent, counterHolder } = holding;
		const team = teamOf.get(agent);
		if (team === undefined || team !== holding.team) issues.push(`${agent} is dealt into the wrong team`);
		if (counterHolder === agent) issues.push(`${agent} holds its own counter-factor`);
		if (!teamOf.has(counterHolder)) issues.push(`${agent}'s counter-factor is held by unknown ${counterHolder}`);
		const sameTeam = teamOf.get(counterHolder) === team;
		if (topology === "crossTeam" && sameTeam) issues.push(`${agent}'s counter-factor stays in its own team`);
		if (topology !== "crossTeam" && !sameTeam) issues.push(`${agent}'s counter-factor leaves its team`);
		held.set(counterHolder, (held.get(counterHolder) ?? 0) + 1);
		const certificate = deal.teams[holding.team]?.certificate;
		const city = deal.teams[holding.team]?.cityFactor ?? deal.cityFactor;
		if (certificate === undefined || holding.code !== addFactors([holding.salt, city, certificate, holding.counterFactor], deal.digits)) {
			issues.push(`${agent}'s code is not the sum of its parts`);
		}
	}
	for (const agent of teamOf.keys()) {
		const count = held.get(agent) ?? 0;
		if (count !== 1) issues.push(`${agent} holds ${count} counter-factors, expected exactly 1`);
	}
	deal.teams.forEach((entry, index) => {
		if (entry.team !== index || teamOf.get(entry.certificateHolder) !== index) issues.push(`team ${index}'s certificate is held outside the team`);
	});
	if (deal.teams.length !== teams.length) issues.push(`${deal.teams.length} certificates for ${teams.length} teams`);
	return issues;
}
