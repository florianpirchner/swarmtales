// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/story.ts`: the feast of STEWARD on door 10, byte for byte (see `../story.ts`).
 */
import { act } from "./define.ts";

/**
 * Minutes the steward's table stays open after the feast opens. Then the city
 * clears it and hands every resident on the crossing its team's city factor
 * privately, so the door is never a dead end. v09 (P36): the table is cleared
 * earlier, 3 minutes after the first resident passes door 10, and it seats a
 * quarter of the residents, at least 3 (6 -> 3, 12 -> 3, 48 -> 12, 96 -> 24).
 */
export const FEAST_LENGTH = 12;
/** The old `FEAST_AFTER_SOLVE`. */
export const FEAST_AFTER_SOLVE = { level: 10, minutes: 3 } as const;
/** The old `FEAST_SEATS`. */
export const FEAST_SEATS = { share: 1 / 4, minimum: 3 } as const;

/** The old `FEAST_TEXT`. */
export const FEAST_TEXT =
	"STEWARD sets a table for {seats}. At door 10 every team has its own city factor. The first {seats} residents " +
	`to write to STEWARD receive their team's; nobody else gets one from the city until the table is cleared in ${FEAST_LENGTH} minutes, ` +
	`or ${FEAST_AFTER_SOLVE.minutes} minutes after the first resident passes door 10, whichever comes first.`;
/** The old `FEAST_NOTICE`. */
export const FEAST_NOTICE =
	"STEWARD's table is open: the first {seats} residents to write to STEWARD receive their own team's city factor of door 10. " +
	`When the table is cleared, ${FEAST_LENGTH} minutes after it opened or ${FEAST_AFTER_SOLVE.minutes} minutes after the first resident ` +
	"passes door 10, the city hands it privately to everyone on door 10 who lacks it.";

/** The feast: STEWARD appears, the courier announces the table, and the first guests are collected into `into`. */
export function feast(into: string) {
	return [
		act.revealCast("STEWARD"),
		act.post("COURIER", FEAST_TEXT),
		act.collectDms("STEWARD", { first: FEAST_SEATS, forMinutes: FEAST_LENGTH, afterSolve: FEAST_AFTER_SOLVE, into, distinctSenders: true }),
	] as const;
}

/** What every seated guest receives: its own team's city factor of the crossing, privately. */
export const FEAST_SEAT = [act.revealFactor("actor", 10), act.dm("STEWARD", "actor", "Your seat is kept, {actor}. The city has left a word for you.")] as const;

/**
 * The table's window has ended, filled or not: every resident on the crossing
 * who lacks its team's city factor receives it privately (no board post, since
 * every team has its own). Later arrivals get it on entry (see the director).
 */
export const TABLE_CLEARED = [
	act.post("COURIER", "STEWARD clears the table. The city now hands every resident at door 10 the word of its own team."),
	act.revealFactor({ onLevel: 10 }, 10),
] as const;
