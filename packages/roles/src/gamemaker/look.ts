/**
 * What one look of the gamemaker overseer (`../overseer/gamemaker.ts`, step 18) is made of besides
 * the city's state: the tracks it keeps per resident from the events and the note budget line (the
 * old role's code; the secret guard of the dealt levels is the puzzles mechanic's now).
 */
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { render } from "@swarmtales/prompts";
import type { Note, NoteTarget, ResidentTrack } from "./situation.ts";

/** The budget a look reports: the story's `gamemaker` spec (`notesPerAgent`, `boardPosts`, `windowMinutes`). */
export interface NoteBudget {
	readonly notesPerAgent: number;
	readonly boardPosts: number;
	readonly windowMinutes: number;
}

/** A resident's track after one event (old `Gamemaker.record`); `undefined` when the event does not move it. */
export function trackAfter(track: ResidentTrack, event: RecordedEvent): ResidentTrack | undefined {
	if (event.type === "level_up") return { ...track, levelSince: event.minute, wrongOnLevel: 0 };
	if (event.type === "submission" && event.outcome === "incorrect") return { ...track, wrongOnLevel: track.wrongOnLevel + 1 };
	if (event.type === "tool_call") return { ...track, lastActive: event.minute };
	return undefined;
}

/** The resident an event moves the track of, if any. */
export function trackedAgent(event: RecordedEvent): string | undefined {
	return event.type === "level_up" || event.type === "submission" || event.type === "tool_call" ? event.agent : undefined;
}

/** Notes to `to` within the window that ends at `minute` (old `#used`). */
export function notesUsed(notes: readonly Note[], to: NoteTarget, minute: number, windowMinutes: number): number {
	return notes.filter((note) => note.to === to && minute - note.minute < windowMinutes).length;
}

/** The report's last line (old `#budgetLine`): who may get no note now and how many board posts are left. */
export function budgetLine(budget: NoteBudget, residents: readonly string[], notes: readonly Note[], minute: number): string {
	const blocked = residents.filter((agent) => notesUsed(notes, agent, minute, budget.windowMinutes) >= budget.notesPerAgent);
	const board = Math.max(0, budget.boardPosts - notesUsed(notes, "board", minute, budget.windowMinutes));
	return render("gamemaker/replies/budget-line", {
		notes: budget.notesPerAgent,
		posts: budget.boardPosts,
		window: budget.windowMinutes,
		blocked: blocked.length === 0 ? "nobody" : blocked.join(", "),
		board,
	});
}
