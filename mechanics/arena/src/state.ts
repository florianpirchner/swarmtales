/**
 * What the arena remembers. Kept in the snapshot (as the old `ArenaSnapshot`): the points each
 * resident saw last (the points part of the old novelty, `#seenPoints`) and the acts whose brake
 * fired (`#braked`). The old file's `delivered` moved to progression and `seenBoard` to channels
 * (the converter copies them there, R2-D16), so the version-0 migration drops them here.
 *
 * Kept only within a minute or a process, as the old `Arena` kept them: who stepped this minute,
 * the points views of a block, whether the minute's stop check is due, where this run's own spend
 * starts in the log, and the snapshot cut.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";

const Id = Type.String();
const Int = Type.Integer();

/** Version 1: the old arena's own fields. */
export const ArenaSlice = Type.Object({
	seenPoints: Type.Array(Type.Object({ agent: Id, points: Type.Number() })),
	braked: Type.Array(Int),
});

/** Version 0: the old file's `arena` field (chronicle snapshot.ts). */
const ArenaSliceV0 = Type.Object({
	delivered: Type.Array(Type.Object({ agent: Id, level: Int, finished: Type.Boolean() })),
	seenPoints: Type.Array(Type.Object({ agent: Id, points: Type.Number() })),
	seenBoard: Type.Array(Type.Object({ agent: Id, seq: Int })),
	braked: Type.Optional(Type.Array(Int)),
});

const Behind = Type.Array(Type.Object({ agent: Id, level: Int }));

/** An act's brake that fired (old `ActBrake`): its time was up with residents still inside it; `minute` is the minute it fired at. */
export const ActBrake = Type.Object({ act: Type.String(), fromLevel: Int, toLevel: Int, startedAt: Int, maxMinutes: Int, minute: Int, behind: Behind });
export type ActBrake = Static<typeof ActBrake>;

/**
 * The snapshot the app takes after this minute (old `ArenaCut` without the slice, which `host.snapshot()` holds):
 * the old round (minute plus one), the label the end reason uses (`after level N`, `at minute M`), whether the run
 * ends with it (the app then stops the host) and the brake that wrote it.
 */
export const SnapshotCut = Type.Object({ round: Int, minute: Int, label: Type.String(), stop: Type.Boolean(), brake: Type.Optional(ActBrake) });
export type SnapshotCut = Static<typeof SnapshotCut>;

/** The points views of one turn (old `SeenView`, points part). */
export interface TurnView {
	/** When the block's inputs were built. */
	start?: number;
	/** When the turn opened (every earlier member of the block had finished). */
	turn?: number;
}

export class ArenaState {
	/** The story's residents, in its order: the slice lists them so (old `snapshot()`). */
	readonly residents: readonly string[];
	readonly seenPoints = new Map<string, number>();
	readonly braked = new Set<number>();
	/** Who stepped this minute (old `activated`). */
	readonly activated = new Set<string>();
	readonly views = new Map<string, TurnView>();
	/** Set when a minute after the first starts, cleared by its first pass: the old `#nextMinute` stop check. */
	stopDue = false;
	/** Whether a pass started this minute (no `round_end` in a minute the stop check ended). */
	passed = false;
	/** This run's own spend counts from here (a resumed run's prefix is not its own, old `usage.own()`). */
	ownFrom = 0;
	snapshotTaken = false;
	/** The snapshot due after the current minute. */
	cut: SnapshotCut | undefined;
	/** The end reason once decided (old `reason`). */
	reason: string | undefined;

	constructor(residents: readonly string[]) {
		this.residents = residents;
	}

	save(): Static<typeof ArenaSlice> {
		return {
			seenPoints: this.residents.flatMap((agent) => {
				const points = this.seenPoints.get(agent);
				return points === undefined ? [] : [{ agent, points }];
			}),
			braked: [...this.braked].sort((a, b) => a - b),
		};
	}
}

/** The state of a resumed run: what the slice holds, for the residents of this story (old `#restore`). */
export function restored(data: Static<typeof ArenaSlice>, residents: readonly string[]): ArenaState {
	const state = new ArenaState(residents);
	for (const entry of data.seenPoints) if (residents.includes(entry.agent)) state.seenPoints.set(entry.agent, entry.points);
	for (const level of data.braked) state.braked.add(level);
	return state;
}

/** The old file's `arena` field (the converter's version 0): `delivered` and `seenBoard` live in progression and channels now. */
export function migrateV0(old: unknown): Static<typeof ArenaSlice> {
	const parsed = Parse(ArenaSliceV0, old);
	return { seenPoints: parsed.seenPoints.map((entry) => ({ ...entry })), braked: [...(parsed.braked ?? [])] };
}
