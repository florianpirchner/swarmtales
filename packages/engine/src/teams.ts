/**
 * Team layouts (SPEC §12.1): solo, random(size), sameAs(level), splitFrom(level, size).
 *
 * Every layout is drawn from a seed derived from the run seed and the level
 * number, so a level's teams do not depend on which levels were computed first.
 */
import type { CompetitorId } from "../core/ids.ts";
import { assertNever } from "../core/result.ts";
import { rngFor } from "../core/random.ts";
import type { LevelDefinition } from "../story/types.ts";

export interface Team {
	readonly members: readonly CompetitorId[];
	/** Seeded member named in task texts as the one who opens the group. */
	readonly leader: CompetitorId;
}

export class TeamLayoutError extends Error {
	override readonly name = "TeamLayoutError";
}

export class TeamPlanner {
	readonly #levels: readonly LevelDefinition[];
	readonly #ids: readonly CompetitorId[];
	readonly #seed: number;
	readonly #cache = new Map<number, readonly Team[]>();

	constructor(levels: readonly LevelDefinition[], ids: readonly CompetitorId[], seed: number) {
		this.#levels = levels;
		this.#ids = ids;
		this.#seed = seed;
	}

	teamsOf(levelNumber: number): readonly Team[] {
		const cached = this.#cache.get(levelNumber);
		if (cached !== undefined) return cached;
		const teams = this.#build(levelNumber, 0);
		this.#cache.set(levelNumber, teams);
		return teams;
	}

	teamOf(levelNumber: number, agent: CompetitorId): Team {
		const team = this.teamsOf(levelNumber).find((candidate) => candidate.members.includes(agent));
		if (team === undefined) throw new TeamLayoutError(`${agent} has no team on level ${levelNumber}`);
		return team;
	}

	#build(levelNumber: number, depth: number): readonly Team[] {
		if (depth > this.#levels.length) throw new TeamLayoutError(`Cyclic team reference at level ${levelNumber}`);
		const level = this.#levels.find((candidate) => candidate.number === levelNumber);
		if (level === undefined) throw new TeamLayoutError(`Unknown level ${levelNumber}`);
		const layout = level.team;
		switch (layout.kind) {
			case "solo":
				return this.#ids.map((id) => ({ members: [id], leader: id }));
			case "random":
				return this.#random(levelNumber, layout.size);
			case "sameAs":
				return this.teamsOf(layout.level);
			case "splitFrom":
				return this.#split(levelNumber, this.teamsOf(layout.level), layout.size);
			default:
				return assertNever(layout, "team layout");
		}
	}

	#requireDivisible(levelNumber: number, size: number): number {
		if (!Number.isInteger(size) || size < 1 || this.#ids.length % size !== 0) {
			throw new TeamLayoutError(
				`Level ${levelNumber}: ${this.#ids.length} agents cannot be split into teams of ${size}`,
			);
		}
		return this.#ids.length / size;
	}

	#random(levelNumber: number, size: number): readonly Team[] {
		const count = this.#requireDivisible(levelNumber, size);
		const shuffled = rngFor(this.#seed, "teams", levelNumber).shuffle(this.#ids);
		return Array.from({ length: count }, (_, index) =>
			this.#team(levelNumber, index, shuffled.slice(index * size, (index + 1) * size)),
		);
	}

	/**
	 * Deals the members of the reference teams into new teams so that each new
	 * team draws from as many different reference teams as possible: members
	 * are interleaved (first of every team, then second, ...) and cut into
	 * consecutive chunks.
	 */
	#split(levelNumber: number, reference: readonly Team[], size: number): readonly Team[] {
		const count = this.#requireDivisible(levelNumber, size);
		const rng = rngFor(this.#seed, "split", levelNumber);
		const shuffledTeams = rng.shuffle(reference).map((team) => rng.shuffle(team.members));

		// Interleave: first member of every team, then the second, and so on.
		const order: CompetitorId[] = [];
		const longest = Math.max(0, ...shuffledTeams.map((members) => members.length));
		for (let position = 0; position < longest; position++) {
			for (const members of shuffledTeams) {
				const member = members[position];
				if (member !== undefined) order.push(member);
			}
		}

		// Consecutive chunks of the interleaved order hold members of distinct
		// reference teams whenever there are at least `size` reference teams.
		const buckets = Array.from({ length: count }, (_, index) => order.slice(index * size, (index + 1) * size));
		return buckets.map((members, index) => this.#team(levelNumber, index, members));
	}

	#team(levelNumber: number, index: number, members: readonly CompetitorId[]): Team {
		const sorted = [...members].sort((a, b) => a.localeCompare(b));
		return { members, leader: rngFor(this.#seed, "leader", levelNumber, index).pick(sorted) };
	}
}

/** Number of pairs inside new teams whose members already shared a reference team. */
export function sharedPairs(teams: readonly Team[], reference: readonly Team[]): number {
	const home = new Map<CompetitorId, number>();
	reference.forEach((team, index) => {
		for (const member of team.members) home.set(member, index);
	});
	let pairs = 0;
	for (const team of teams) {
		team.members.forEach((left, index) => {
			for (const right of team.members.slice(index + 1)) {
				if (home.get(left) === home.get(right)) pairs += 1;
			}
		});
	}
	return pairs;
}
