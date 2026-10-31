/**
 * The story's whisperer, read from the log. `whisperer_chosen` is written once, at the start of a
 * run; a resumed run restores the log and does not write it again, so the log is the one source
 * that holds for a fresh and for a resumed run (and for a file converted from the old engine).
 */
import { Parse } from "typebox/value";
import type { EventLogView } from "@swarmtales/contracts";
import { WhispersEvents } from "@swarmtales/mechanic-shared";

/** The resident the whispers mechanic chose, or undefined when it chose none (or is not loaded). */
export function whispererOf(ctx: { readonly log: EventLogView }): string | undefined {
	const chosen = ctx.log.ofType("whispers", "whisperer_chosen").at(0);
	return chosen === undefined ? undefined : Parse(WhispersEvents.events.whisperer_chosen, chosen.payload).agent;
}
