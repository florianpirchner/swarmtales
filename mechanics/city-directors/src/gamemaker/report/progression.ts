// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The progression's part of the gamemaker's report, carried from old `mechanics/progression/src/section.ts`: the
 * header with the rules and the "Residents:" lines, word for word as the old `describeSituation` and
 * `residentLine`, written from the fact `progression.section` and the gamemaker's tracks. The schema is the old
 * `ProgressionSectionFact`; the mechanic that computes the fact computes this shape (erratum of M5-34).
 */
import { Type, type Static } from "typebox";
import { Id, Int, Standing } from "./schema.ts";

/**
 * The value of the fact `progression.section` (old `ProgressionSectionFact`).
 *
 * @public
 */
export const ProgressionSectionSchema = Type.Object(
	{
		minute: Int("The tick of the report"),
		rules: Type.Object(
			{
				penalty: Type.Union([Type.Integer({ description: "One price" }), Type.Array(Type.Integer({ description: "A step" }), { description: "A ladder" })], { description: "The price of a wrong code" }),
				maxAttemptsPerWindow: Int("Wrong attempts per window"),
				attemptWindowMinutes: Int("The window in ticks"),
				rewards: Type.Array(Type.Object({ level: Int("The level"), reward: Type.Number({ description: "Its reward" }) }, { description: "One level" }), { description: "The reward of every played level" }),
				survivors: Int("Who remains at the end"),
				residents: Int("Every resident of the run"),
			},
			{ description: "The rules the header names" },
		),
		ranking: Type.Array(
			Type.Object(
				{
					agent: Id(),
					points: Type.Number({ description: "Its points" }),
					rank: Int("Its rank"),
					level: Int("Its level"),
					standing: Standing,
					finished: Type.Boolean({ description: "Passed every level" }),
					waiting: Type.Union([Int("The level it passed"), Type.Null({ description: "Not held" })], { description: "The level it waits after while the door is shut" }),
					nextPenalty: Type.Number({ description: "The price of its next wrong code" }),
					open: Type.Number({ description: "The rewards still open to it" }),
				},
				{ description: "One resident's line" },
			),
			{ description: "The ranking" },
		),
		alive: Type.Array(Id(), { description: "The residents in the city, in the run's order" }),
		standing: Type.Array(Type.Object({ agent: Id(), level: Int("Its level"), teamPlaceholders: Type.Boolean({ description: "The level's task names teammates" }) }, { description: "One resident" }), {
			description: "Who stands on a level and may wait on teammates there",
		}),
	},
	{ description: "The progression's part of the gamemaker's report" },
);

/**
 * The value of the fact `progression.section`.
 *
 * @public
 */
export type ProgressionSection = Static<typeof ProgressionSectionSchema>;

/**
 * What the gamemaker tracks per resident across its looks (old `ResidentTrack`).
 *
 * @public
 */
export interface ResidentTrack {
	/** The tick the resident entered its current level. */
	readonly levelSince: number;
	/** Wrong submissions on the current level. */
	readonly wrongOnLevel: number;
	/** The last tick the resident called a tool, if ever. */
	readonly lastActive?: number;
}

// "2, 4, 6, then 8 points" or "8 points" (old `ladderText`).
function ladderText(ladder: ProgressionSection["rules"]["penalty"]): string {
	const steps = typeof ladder === "number" ? [ladder] : ladder;
	const last = steps.at(-1) ?? 0;
	if (steps.length <= 1) return `${String(last)} ${last === 1 ? "point" : "points"}`;
	return `${steps.slice(0, -1).join(", ")}, then ${String(last)} points`;
}

/**
 * The report's first two lines (old `describeSituation`), after round `round`.
 *
 * @param section - The fact's value.
 * @param round - The round the look follows.
 * @returns The two lines.
 */
export function renderProgressionHeader(section: ProgressionSection, round: number): readonly string[] {
	const { rules } = section;
	const rewards = rules.rewards.map((entry) => `L${String(entry.level)} +${String(entry.reward)}`);
	return [
		`Minute ${String(section.minute)} (after round ${String(round)}). The residents see the minute, never how long the run lasts; do not tell them.`,
		`Rules: a wrong password or code costs ${ladderText(rules.penalty)} (the n-th of a resident in the act; the report shows each one's next price); at most ${String(rules.maxAttemptsPerWindow)} wrong attempts per ` +
			`${String(rules.attemptWindowMinutes)} minutes. Rewards: ${rewards.join(", ")}. Only ${String(rules.survivors)} of ` +
			`${String(rules.residents)} residents remain at the end.`,
	];
}

// The line of a resident who is gone, at the gate, finished or held at a door; undefined for one on its level.
function apartLine(entry: ProgressionSection["ranking"][number], active: string): string | undefined {
	const points = String(entry.points);
	const rank = String(entry.rank);
	if (entry.standing.kind === "exiled") return `- ${entry.agent}: exiled, no seat and no more turns`;
	if (entry.standing.kind === "gate") return `- ${entry.agent}: at the gate until minute ${String(entry.standing.until)}, ${points} points, ${active}`;
	if (entry.finished) return `- ${entry.agent}: passed every level, ${points} points, rank ${rank}, ${active}`;
	if (entry.waiting !== null) return `- ${entry.agent}: passed level ${String(entry.waiting)}, waits at the door until every resident has, ${points} points, rank ${rank}, ${active}`;
	return undefined;
}

// One resident's line (old `residentLine`).
function residentLine(section: ProgressionSection, entry: ProgressionSection["ranking"][number], track: ResidentTrack | undefined): string {
	const active = track?.lastActive === undefined ? "has not acted yet" : `last acted minute ${String(track.lastActive)}`;
	const apart = apartLine(entry, active);
	if (apart !== undefined) return apart;
	const points = String(entry.points);
	const rank = String(entry.rank);
	const since = track?.levelSince ?? 0;
	return (
		`- ${entry.agent}: level ${String(entry.level)} since minute ${String(since)} (${String(section.minute - since)} min), ${points} points, rank ${rank}, ` +
		`${String(track?.wrongOnLevel ?? 0)} wrong on this level (next wrong code costs ${String(entry.nextPenalty)}), ${String(entry.open)} points still open, ${active}`
	);
}

/**
 * The "Residents:" block (old `residentLine` per ranking entry), with its heading and without the blank line after it.
 *
 * @param section - The fact's value.
 * @param tracks - The gamemaker's tracks per resident.
 * @returns The lines.
 */
export function renderResidents(section: ProgressionSection, tracks: ReadonlyMap<string, ResidentTrack>): readonly string[] {
	return ["Residents:", ...section.ranking.map((entry) => residentLine(section, entry, tracks.get(entry.agent)))];
}
