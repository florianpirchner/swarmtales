// SPDX-License-Identifier: Apache-2.0
/**
 * Team layouts: solo, random(size), sameAs(level), splitFrom(level, size). Carried from the old platform. Every
 * layout is drawn from a labelled stream of the run seed and the level number, so a level's teams do not depend on
 * which levels were computed first, or on which other levels the game has.
 */
import type { RandomLabel, RandomSource } from "@swarmtales/contracts";

/**
 * One team of a level.
 *
 * @public
 */
export interface Team {
	/** The members, in the order they were drawn. */
	readonly members: readonly string[];
	/** Seeded member named in task texts as the one who opens the group. */
	readonly leader: string;
}

/**
 * How the residents form teams on a level.
 *
 * @public
 */
export type TeamLayout =
	| { readonly kind: "solo" }
	| { readonly kind: "random"; readonly size: number }
	| { readonly kind: "sameAs"; readonly level: number }
	| { readonly kind: "splitFrom"; readonly level: number; readonly size: number };

/**
 * What the planner reads of a level.
 *
 * @public
 */
export interface PlannedLevel {
	/** The level's number. */
	readonly number: number;
	/** Its team layout. */
	readonly team: TeamLayout;
}

/**
 * The labelled stream of the run seed (`ctx.rng`).
 *
 * @public
 */
export type Streams = (...labels: readonly RandomLabel[]) => RandomSource;

/**
 * A team layout that cannot be drawn: an unknown level, a cycle of references, or a size the residents do not divide into.
 *
 * @public
 */
export class TeamLayoutError extends Error {
	/** The name of the error. */
	override readonly name = "TeamLayoutError";
}

/**
 * Draws and caches the teams of every level.
 *
 * @public
 */
export class TeamPlanner {
	readonly #levels: readonly PlannedLevel[];
	readonly #ids: readonly string[];
	readonly #streams: Streams;
	readonly #cache = new Map<number, readonly Team[]>();

	/**
	 * Plans nothing yet: a level's teams are drawn when first asked for.
	 *
	 * @param levels - The levels of the game.
	 * @param ids - Every resident, in the game's order.
	 * @param streams - The labelled streams of the run seed.
	 */
	constructor(levels: readonly PlannedLevel[], ids: readonly string[], streams: Streams) {
		this.#levels = levels;
		this.#ids = ids;
		this.#streams = streams;
	}

	/**
	 * The teams of a level.
	 *
	 * @param levelNumber - The level.
	 * @returns Its teams, in team order.
	 * @throws TeamLayoutError when the layout cannot be drawn.
	 */
	teamsOf(levelNumber: number): readonly Team[] {
		const cached = this.#cache.get(levelNumber);
		if (cached !== undefined) return cached;
		const teams = this.#build(levelNumber, 0);
		this.#cache.set(levelNumber, teams);
		return teams;
	}

	/**
	 * The team of a resident on a level.
	 *
	 * @param levelNumber - The level.
	 * @param agent - The resident.
	 * @returns Its team.
	 * @throws TeamLayoutError when the resident has no team there, or the layout cannot be drawn.
	 */
	teamOf(levelNumber: number, agent: string): Team {
		const team = this.teamsOf(levelNumber).find((candidate) => candidate.members.includes(agent));
		if (team === undefined) throw new TeamLayoutError(`${agent} has no team on level ${String(levelNumber)}`);
		return team;
	}

	#build(levelNumber: number, depth: number): readonly Team[] {
		if (depth > this.#levels.length) throw new TeamLayoutError(`Cyclic team reference at level ${String(levelNumber)}`);
		const level = this.#levels.find((candidate) => candidate.number === levelNumber);
		if (level === undefined) throw new TeamLayoutError(`Unknown level ${String(levelNumber)}`);
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
		}
	}

	#requireDivisible(levelNumber: number, size: number): number {
		if (!Number.isInteger(size) || size < 1 || this.#ids.length % size !== 0) {
			throw new TeamLayoutError(`Level ${String(levelNumber)}: ${String(this.#ids.length)} agents cannot be split into teams of ${String(size)}`);
		}
		return this.#ids.length / size;
	}

	#random(levelNumber: number, size: number): readonly Team[] {
		const count = this.#requireDivisible(levelNumber, size);
		const shuffled = this.#streams("teams", levelNumber).shuffle(this.#ids);
		return Array.from({ length: count }, (_, index) => this.#team(levelNumber, index, shuffled.slice(index * size, (index + 1) * size)));
	}

	// Deals the members of the reference teams into new teams so that each new team draws from as
	// many different reference teams as possible: members are interleaved and cut into chunks.
	#split(levelNumber: number, reference: readonly Team[], size: number): readonly Team[] {
		const count = this.#requireDivisible(levelNumber, size);
		const rng = this.#streams("split", levelNumber);
		const shuffledTeams = rng.shuffle(reference).map((team) => rng.shuffle(team.members));
		const order: string[] = [];
		const longest = Math.max(0, ...shuffledTeams.map((members) => members.length));
		for (let position = 0; position < longest; position++) {
			for (const members of shuffledTeams) {
				const member = members[position];
				if (member !== undefined) order.push(member);
			}
		}
		const buckets = Array.from({ length: count }, (_, index) => order.slice(index * size, (index + 1) * size));
		return buckets.map((members, index) => this.#team(levelNumber, index, members));
	}

	#team(levelNumber: number, index: number, members: readonly string[]): Team {
		const sorted = [...members].sort((a, b) => a.localeCompare(b));
		return { members, leader: this.#streams("leader", levelNumber, index).pick(sorted) };
	}
}
