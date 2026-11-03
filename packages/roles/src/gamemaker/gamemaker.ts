/**
 * The gamemaker's id and the shape of its state in an old run snapshot (SPEC 17). The old LLM
 * gamemaker role (`Gamemaker`, SPEC 10.4) that ran on the old `World` was replaced by the gamemaker
 * overseer (`../overseer/gamemaker.ts`) and the note desk of the channels mechanic, and deleted with
 * the engine (step 18, item 8).
 */
import type { CompetitorId } from "@swarmtales/kernel";
import type { Note, ResidentTrack } from "./situation.ts";

/** ID of the gamemaker in usage records and transcripts. */
export const GAMEMAKER_ID = "GM";

/**
 * What the gamemaker carried from look to look in an old run snapshot (SPEC 17), which `--resume`
 * still reads. The events since its last look are not copied: they are the prefix events from
 * `recentFrom` on.
 */
export interface GamemakerSnapshot {
	readonly tracks: readonly ({ readonly agent: CompetitorId } & ResidentTrack)[];
	readonly notes: readonly Note[];
	/** Sequence number of the first event since the last look. */
	readonly recentFrom: number;
}
