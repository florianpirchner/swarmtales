/**
 * What a resumed run does with the levels of its snapshot (old `World#restore` of
 * packages/engine/src/world.ts): a level nobody reached yet is dealt again from the story, and
 * announced when it differs from the saved deal; a level somebody reached must still match the
 * story; a level not saved and not behind a shut door is dealt. It runs in `runResumed`, after the
 * progression mechanic's door, act starts and locks, at the snapshot's minute.
 */
import { ProgressionApi } from "@swarmtales/mechanic-shared";
import { announceDeal, drawLevel, lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { snapshotOfLevel } from "./model.ts";

/** A reached level from a snapshot must still be the story's: same puzzle kind, same teams, residents of this run. */
function checkReached(ctx: PuzzlesCtx, level: number): void {
	const saved = ctx.state.levels.get(level);
	if (saved === undefined) return;
	const definition = ctx.options.levels.find((entry) => entry.number === level);
	if (definition?.puzzle.kind !== saved.puzzle.kind) throw new Error(`Level ${level} changed its puzzle since the snapshot, and competitors have reached it already`);
	if (JSON.stringify(ctx.state.planner.teamsOf(level)) !== JSON.stringify(saved.teams)) throw new Error(`Level ${level} changed its teams since the snapshot, and competitors have reached it already`);
	for (const team of saved.teams) {
		for (const member of team.members) if (!ctx.residents.has(member)) throw new Error(`Level ${level}: unknown team member ${member}`);
	}
	if (saved.puzzle.kind === "fragments" && saved.puzzle.puzzles.length !== saved.teams.length) throw new Error(`Level ${level}: ${saved.puzzle.puzzles.length} puzzles for ${saved.teams.length} teams`);
}

export function repairAfterResume(ctx: PuzzlesCtx): void {
	const reached = Math.max(0, ...ctx.residents.ids.map((resident) => ctx.tryCall(ProgressionApi, "levelOf", { resident }) ?? 0));
	const door = ctx.tryCall(ProgressionApi, "door", {}) ?? null;
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		if (door !== null && level > door) {
			// Behind a shut door a level is dealt only when it opens; a saved deal is dropped.
			ctx.state.levels.delete(level);
			ctx.state.planner.teamsOf(level);
			continue;
		}
		const saved = ctx.state.levels.get(level);
		if (saved !== undefined && level <= reached) {
			checkReached(ctx, level);
			continue;
		}
		const dealt = drawLevel(ctx, level);
		ctx.state.levels.set(level, dealt);
		if (saved === undefined || JSON.stringify(snapshotOfLevel(level, dealt)) !== JSON.stringify(snapshotOfLevel(level, saved))) announceDeal(ctx, level, dealt);
	}
}
