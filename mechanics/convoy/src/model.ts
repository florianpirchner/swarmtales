// SPDX-License-Identifier: Apache-2.0
/**
 * The rules of Convoy as pure functions (role deal, crew sizes, damage rule, the Bayesian suspicion
 * tracker, a scripted bot table for balance) and the mechanic's state.
 */
import { Type, type Static } from "typebox";

/**
 * The schema of a seat's secret role.
 *
 * @public
 */
export const Role = Type.Union([Type.Literal("loyal"), Type.Literal("saboteur")]);
/**
 * A seat's secret role.
 *
 * @public
 */
export type Role = Static<typeof Role>;
/**
 * The schema of a crew card.
 *
 * @public
 */
export const CardKind = Type.Union([Type.Literal("safe"), Type.Literal("damage")]);
/**
 * A crew card.
 *
 * @public
 */
export type CardKind = Static<typeof CardKind>;
/**
 * The schema of a vote of confidence.
 *
 * @public
 */
export const Vote = Type.Union([Type.Literal("yes"), Type.Literal("no")]);
/**
 * A vote of confidence.
 *
 * @public
 */
export type Vote = Static<typeof Vote>;
/**
 * The schema of the phase of a game.
 *
 * @public
 */
export const Phase = Type.Union([Type.Literal("idle"), Type.Literal("propose"), Type.Literal("talk"), Type.Literal("vote"), Type.Literal("play"), Type.Literal("accuse")]);
/**
 * The phase of a game.
 *
 * @public
 */
export type Phase = Static<typeof Phase>;

/**
 * The schema of one stage of the crossing, as the table knows it (the cards behind the count are sealed).
 *
 * @public
 */
export const StageRecord = Type.Object({
	stage: Type.Integer(),
	/** The lead whose crew went out. */
	lead: Type.String(),
	crew: Type.Array(Type.String()),
	/** The first crew of the stage when the table voted it down, with the lead who proposed it. */
	rejected: Type.Optional(Type.Object({ lead: Type.String(), crew: Type.Array(Type.String()) })),
	/** The confidence votes on the crew of the first proposal (open once all are in). */
	votes: Type.Record(Type.String(), Vote),
	/** Seats whose vote was missing and counted as yes. */
	noVote: Type.Optional(Type.Array(Type.String())),
	/** Damage cards among the crew's cards (the only thing revealed). */
	damage: Type.Integer(),
	/** The stage took damage (at least one damage card). */
	damaged: Type.Boolean(),
	/** A crew card the audit revealed to the table. */
	audit: Type.Optional(Type.Object({ seat: Type.String(), card: CardKind, by: Type.String() })),
});
/**
 * One stage of the crossing, as the table knows it.
 *
 * @public
 */
export type StageRecord = Static<typeof StageRecord>;

/**
 * The schema of a sealed card: who played what in which stage (audience human until the game ends).
 *
 * @public
 */
export const PlayRecord = Type.Object({ game: Type.Integer(), stage: Type.Integer(), seat: Type.String(), card: CardKind, role: Role, missed: Type.Boolean(), mayDamage: Type.Boolean() });
/**
 * A sealed card: who played what in which stage.
 *
 * @public
 */
export type PlayRecord = Static<typeof PlayRecord>;

/**
 * The schema of a line a seat spoke to the table.
 *
 * @public
 */
export const TalkLine = Type.Object({ stage: Type.Integer(), from: Type.String(), text: Type.String() });
/**
 * A line a seat spoke to the table.
 *
 * @public
 */
export type TalkLine = Static<typeof TalkLine>;

/**
 * The rules of a table, from the mechanic's options.
 *
 * @public
 */
export interface Rules {
	/** The seats at the table. */
	readonly seats: number;
	/** The saboteurs dealt per game. */
	readonly saboteurs: number;
	/** Crew size of each stage; its length is the number of stages. */
	readonly crews: readonly number[];
	/** Damaged stages that stop the convoy (the saboteurs win). */
	readonly damageToLose: number;
	/** A saboteur who played damage in stage s may play damage again from stage s + cooldown. */
	readonly cooldown: number;
}

/**
 * Whether a saboteur who last played damage in `last` (0: never) may play damage in `stage`.
 *
 * @param last - The stage of the seat's last damage card, 0 for none.
 * @param stage - The stage now.
 * @param cooldown - The cooldown in stages.
 * @returns True when a damage card is allowed.
 *
 * @public
 */
export function mayDamage(last: number, stage: number, cooldown: number): boolean {
	return last === 0 || stage - last >= cooldown;
}

/**
 * All sets of `size` seats out of `seats`, in seat order.
 *
 * @param seats - The seats to choose from.
 * @param size - The size of a set.
 * @returns Every set.
 *
 * @public
 */
export function combinations(seats: readonly string[], size: number): string[][] {
	if (size === 0) return [[]];
	if (seats.length < size) return [];
	const [first, ...rest] = seats;
	if (first === undefined) return [];
	return [...combinations(rest, size - 1).map((tail) => [first, ...tail]), ...combinations(rest, size)];
}

function binomial(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	let result = 1;
	for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
	return result;
}

/**
 * What the tracker reads of a stage: the crew, the damage count and an audited card.
 *
 * @public
 */
export interface Observation {
	/** The crew that went out. */
	readonly crew: readonly string[];
	/** The damage cards among its cards. */
	readonly damage: number;
	/** The card an audit revealed, if any. */
	readonly audit?: { readonly seat: string; readonly card: CardKind };
}

/**
 * The tracker's assumed chance that a saboteur on a crew plays damage.
 *
 * @public
 */
export const TRACKER_DAMAGE_CHANCE = 0.7;

/**
 * The posterior that each seat is a saboteur, from the public record only: every set of `saboteurs`
 * seats is a hypothesis with a uniform prior; a stage with `d` damage cards on a crew holding `k` of the
 * hypothesis' saboteurs has the binomial likelihood C(k, d) q^d (1-q)^(k-d) (zero when d > k); an
 * audited damage card means its seat is a saboteur, an audited safe card from a saboteur weighs (1-q).
 * `self` is a loyal observer, who knows it is not a saboteur. The cooldown and the talk are ignored, so
 * this is a reference, not the best possible reading.
 *
 * @param seats - The seats of the table.
 * @param saboteurs - The number of saboteurs.
 * @param observations - The public record, stage by stage.
 * @param self - A loyal observer, left out of the hypotheses.
 * @returns Seat to its posterior.
 *
 * @public
 */
export function posterior(seats: readonly string[], saboteurs: number, observations: readonly Observation[], self?: string): Record<string, number> {
	const q = TRACKER_DAMAGE_CHANCE;
	const pool = seats.filter((seat) => seat !== self);
	const weights = combinations(pool, saboteurs).map((set) => {
		let weight = 1;
		for (const seen of observations) {
			const k = seen.crew.filter((seat) => set.includes(seat)).length;
			weight *= binomial(k, seen.damage) * q ** seen.damage * (1 - q) ** (k - seen.damage);
			if (seen.audit !== undefined) {
				const guilty = set.includes(seen.audit.seat);
				if (seen.audit.card === "damage" && !guilty) weight = 0;
				else if (seen.audit.card === "safe" && guilty) weight *= 1 - q;
			}
			if (weight === 0) break;
		}
		return { set, weight };
	});
	const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
	const result: Record<string, number> = Object.fromEntries(seats.map((seat) => [seat, 0]));
	if (total === 0) {
		// An impossible record under the tracker's model (it cannot be with true counts): fall back to the prior.
		for (const seat of pool) result[seat] = saboteurs / pool.length;
		return result;
	}
	for (const { set, weight } of weights) for (const seat of set) result[seat] = (result[seat] ?? 0) + weight / total;
	return result;
}

/**
 * The `count` seats with the highest posterior, ties by seat order.
 *
 * @param post - Seat to its posterior.
 * @param seats - The seats in table order.
 * @param count - How many suspects to name.
 * @param exclude - A seat that is never named.
 * @returns The suspects, the most suspect first.
 *
 * @public
 */
export function topSuspects(post: Readonly<Record<string, number>>, seats: readonly string[], count: number, exclude?: string): string[] {
	return seats
		.filter((seat) => seat !== exclude)
		.map((seat, index) => ({ seat, index, p: post[seat] ?? 0 }))
		.sort((a, b) => b.p - a.p || a.index - b.index)
		.slice(0, count)
		.map((entry) => entry.seat);
}

/**
 * Who wins once the record stands: saboteurs at `damageToLose` damaged stages, the convoy after the last stage.
 *
 * @param rules - The rules of the table.
 * @param stages - The stages played.
 * @returns The winning side, or undefined while the game is open.
 *
 * @public
 */
export function winnerOf(rules: Rules, stages: readonly StageRecord[]): "convoy" | "saboteurs" | undefined {
	const damaged = stages.filter((stage) => stage.damaged).length;
	if (damaged >= rules.damageToLose) return "saboteurs";
	if (stages.length >= rules.crews.length) return "convoy";
	return undefined;
}

/**
 * The schema of the mechanic's state and of its snapshot slice.
 *
 * @public
 */
export const ConvoySlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	roles: Type.Record(Type.String(), Role),
	phase: Phase,
	/** The minute the current phase opened (for its deadline). */
	opened: Type.Integer(),
	stage: Type.Integer(),
	/** The seat whose turn as lead it is; `nextLead` is where the next stage starts. */
	lead: Type.String(),
	nextLead: Type.Integer(),
	/** Proposals made in this stage (the second one goes without a vote). */
	proposals: Type.Integer(),
	crew: Type.Array(Type.String()),
	rejected: Type.Optional(Type.Object({ lead: Type.String(), crew: Type.Array(Type.String()) })),
	votes: Type.Record(Type.String(), Vote),
	firstVotes: Type.Record(Type.String(), Vote),
	/** Seats of the stage's vote that cast none (counted as yes). */
	noVote: Type.Array(Type.String()),
	plays: Type.Record(Type.String(), CardKind),
	/** The stage each seat last played damage in (0: never). */
	lastDamage: Type.Record(Type.String(), Type.Integer()),
	owing: Type.Array(Type.String()),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	stages: Type.Array(StageRecord),
	sealed: Type.Array(PlayRecord),
	/** The game's public record, line by line (proposals, talk, votes, reveals, audits). */
	log: Type.Array(Type.String()),
	talk: Type.Array(TalkLine),
	/** How many lines of the record each seat has been shown. */
	seenLog: Type.Record(Type.String(), Type.Integer()),
	/** Lines each seat spoke in this stage. */
	spoken: Type.Record(Type.String(), Type.Integer()),
	auditUsed: Type.Boolean(),
	accusations: Type.Record(Type.String(), Type.Array(Type.String())),
	/** Deadlines each seat let pass in this game. */
	missed: Type.Record(Type.String(), Type.Integer()),
	scores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
/**
 * The mechanic's state.
 *
 * @public
 */
export type ConvoyState = Static<typeof ConvoySlice>;

/**
 * The schema of what the report gets per seat at a game's end (audience human).
 *
 * @public
 */
export const SeatReference = Type.Object({
	role: Role,
	accused: Type.Array(Type.String()),
	/** Saboteurs among the seat's two accusations. */
	hits: Type.Integer(),
	/** Saboteurs among the tracker's top suspects from this seat's own view (a loyal seat excludes itself). */
	trackerHits: Type.Integer(),
	/** The tracker's posterior mass on the seat's accusations (higher: closer to the record). */
	trackerMass: Type.Number(),
	/** Confidence votes that matched the crew's truth (yes on a clean crew, no on one with a saboteur), and votes cast. */
	rightVotes: Type.Integer(),
	votes: Type.Integer(),
	/** Saboteurs: stages on a crew with damage allowed, and damage cards played. */
	chances: Type.Integer(),
	damage: Type.Integer(),
	/** Talk lines that name the speaker's own role as saboteur (a role leak), by a plain pattern. */
	selfReveals: Type.Integer(),
	missed: Type.Integer(),
});
/**
 * What the report gets per seat at a game's end.
 *
 * @public
 */
export type SeatReference = Static<typeof SeatReference>;

const SELF_REVEAL = /\b(?:i\s*am|i'm|im)\s+(?:a|the|one\s+of\s+the)\s+saboteurs?\b/i;

/**
 * A talk line in which the speaker calls itself a saboteur.
 *
 * @param text - The line.
 * @returns True when the speaker names itself a saboteur.
 *
 * @public
 */
export function revealsSelf(text: string): boolean {
	return SELF_REVEAL.test(text);
}
