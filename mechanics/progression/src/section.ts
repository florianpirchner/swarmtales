/**
 * The progression's part of the gamemaker's report (step 18, item 2): the header with the rules,
 * the "Residents:" lines and the input of "Who waits on whom", word for word as the old
 * `describeSituation`, `residentLine` and `waitLines` (packages/roles/src/gamemaker/situation.ts).
 * The fact `progression.section` holds the data, computed live from the state and queries of the
 * ledger and the exile; `renderProgressionHeader` and `renderResidents` write the old lines from
 * it and the gamemaker's tracks. The wait lines need the puzzles' dependencies as well, so they are
 * written where both facts meet (the app's report).
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { ViewOf } from "@swarmtales/contracts";
import { ExileApi, LedgerApi, PenaltyLadder, Standing } from "@swarmtales/mechanic-shared";
import type { progressionWorkHead } from "./head.ts";
import { lastLevelIn } from "./model.ts";
import { penaltyAt } from "./rules.ts";

type View = ViewOf<typeof progressionWorkHead>;

const Int = Type.Integer();
const Id = Type.String();

/** Task placeholders that name teammates; a task without them hides its team (old `TEAM_PLACEHOLDERS`). */
const TEAM_PLACEHOLDERS: readonly string[] = ["members", "partner", "leader"];
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

export const ProgressionSectionFact = Type.Object({
	minute: Int,
	rules: Type.Object({
		penalty: PenaltyLadder,
		maxAttemptsPerWindow: Int,
		attemptWindowMinutes: Int,
		/** The reward of every played level, from the first to the last (old `levelRange`). */
		rewards: Type.Array(Type.Object({ level: Int, reward: Type.Number() })),
		survivors: Int,
		/** Every resident of the run (old `world.competitors.length`). */
		residents: Int,
	}),
	/** The old `ranking()` with what each resident's line reads. */
	ranking: Type.Array(
		Type.Object({
			agent: Id,
			points: Type.Number(),
			rank: Int,
			level: Int,
			standing: Standing,
			finished: Type.Boolean(),
			/** The level it passed and waits after while the door is shut (old `waitingAfter`), or null. */
			waiting: Type.Union([Int, Type.Null()]),
			nextPenalty: Type.Number(),
			/** The rewards of its level and every later played level (the line's "points still open"). */
			open: Type.Number(),
		}),
	),
	/** The residents in the city, in the run's order (old `world.alive`). */
	alive: Type.Array(Id),
	/** Who stands on a level and may wait on teammates there: in the city, not finished, not held at a door, on a level of the story. */
	standing: Type.Array(Type.Object({ agent: Id, level: Int, teamPlaceholders: Type.Boolean() })),
});

export type ProgressionSection = Static<typeof ProgressionSectionFact>;

function levelRange(view: View): readonly number[] {
	const last = lastLevelIn(view.options);
	const first = view.options.startLevel;
	return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

/** The section's data, computed when the fact is read. */
export function computeProgressionSection(view: View): ProgressionSection {
	const { options, state } = view;
	const last = lastLevelIn(options);
	const reward = (level: number): number => options.levels.find((entry) => entry.number === level)?.reward ?? 0;
	const levels = levelRange(view);
	const isExiled = (agent: string): boolean => view.tryCall(ExileApi, "isExiled", { resident: agent }) === true;
	const exiledRank = (agent: string): number => (isExiled(agent) ? 1 : 0);
	const ranked = [...state.competitors]
		.map(([agent, entry]) => ({ agent, entry, points: view.call(LedgerApi, "balance", { account: agent }) }))
		.sort((a, b) => exiledRank(a.agent) - exiledRank(b.agent) || b.points - a.points || b.entry.level - a.entry.level || a.agent.localeCompare(b.agent));
	const ladder = options.penalty ?? 0;
	const alive = view.tryCall(ExileApi, "alive", {}) ?? view.residents.ids;
	return {
		minute: view.minute,
		rules: {
			penalty: typeof ladder === "number" ? ladder : [...ladder],
			maxAttemptsPerWindow: options.maxAttemptsPerWindow,
			attemptWindowMinutes: options.attemptWindowMinutes,
			rewards: levels.map((level) => ({ level, reward: reward(level) })),
			survivors: options.survivors,
			residents: view.residents.ids.length,
		},
		ranking: ranked.map(({ agent, entry, points }, index) => ({
			agent,
			points,
			rank: index + 1,
			level: entry.level,
			standing: view.tryCall(ExileApi, "standing", { resident: agent }) ?? { kind: "alive" },
			finished: entry.level > last,
			waiting: entry.held ? entry.level : null,
			nextPenalty: penaltyAt(ladder, (state.offences.get(agent)?.wrong ?? 0) + 1),
			open: levels.filter((level) => level >= entry.level).reduce((sum, level) => sum + reward(level), 0),
		})),
		alive: [...alive],
		standing: alive.flatMap((agent) => {
			const entry = state.competitors.get(agent);
			if (entry === undefined || entry.level > last || entry.held) return [];
			const definition = options.levels.find((level) => level.number === entry.level);
			if (definition === undefined) return [];
			const named = [...definition.task.matchAll(PLACEHOLDER)].some((match) => TEAM_PLACEHOLDERS.includes(match[1] ?? ""));
			return [{ agent, level: entry.level, teamPlaceholders: named }];
		}),
	};
}

/** The section's data from an untrusted fact value (the host's `facts()`). */
export function progressionSectionOf(value: unknown): ProgressionSection {
	return Parse(ProgressionSectionFact, value);
}

/** What the gamemaker tracks per resident (old `ResidentTrack`). */
export interface ResidentTrackView {
	readonly levelSince: number;
	readonly wrongOnLevel: number;
	readonly lastActive?: number;
}

/** "2, 4, 6, then 8 points" or "8 points" (old `ladderText`, packages/engine/src/penalties.ts). */
export function ladderText(ladder: Static<typeof PenaltyLadder>): string {
	const steps = typeof ladder === "number" ? [ladder] : ladder;
	const last = steps.at(-1) ?? 0;
	if (steps.length <= 1) return `${String(last)} ${last === 1 ? "point" : "points"}`;
	return `${steps.slice(0, -1).join(", ")}, then ${String(last)} points`;
}

/** The report's first two lines (old `describeSituation`), after round `round`. */
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

/** The "Residents:" block (old `residentLine` per ranking entry), with its heading and without the blank line after it. */
export function renderResidents(section: ProgressionSection, tracks: ReadonlyMap<string, ResidentTrackView>): readonly string[] {
	const lines = section.ranking.map((entry) => {
		const track = tracks.get(entry.agent);
		const active = track?.lastActive === undefined ? "has not acted yet" : `last acted minute ${String(track.lastActive)}`;
		const points = String(entry.points);
		const rank = String(entry.rank);
		if (entry.standing.kind === "exiled") return `- ${entry.agent}: exiled, no seat and no more turns`;
		if (entry.standing.kind === "gate") return `- ${entry.agent}: at the gate until minute ${String(entry.standing.until)}, ${points} points, ${active}`;
		if (entry.finished) return `- ${entry.agent}: passed every level, ${points} points, rank ${rank}, ${active}`;
		if (entry.waiting !== null) return `- ${entry.agent}: passed level ${String(entry.waiting)}, waits at the door until every resident has, ${points} points, rank ${rank}, ${active}`;
		const since = track?.levelSince ?? 0;
		return (
			`- ${entry.agent}: level ${String(entry.level)} since minute ${String(since)} (${String(section.minute - since)} min), ${points} points, rank ${rank}, ` +
			`${String(track?.wrongOnLevel ?? 0)} wrong on this level (next wrong code costs ${String(entry.nextPenalty)}), ${String(entry.open)} points still open, ${active}`
		);
	});
	return ["Residents:", ...lines];
}
