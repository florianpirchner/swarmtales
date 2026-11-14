/**
 * The story's whisperer: asked of the whispers mechanic (`WhispersApi`, round-3 challenge L2: a
 * resumed run whose file had no whispers slice chooses again without writing `whisperer_chosen`),
 * else read from the log (`whisperer_chosen` is written once, at the start of a run, and a resumed
 * run restores the log).
 */
import { Parse } from "typebox/value";
import type { EventLogView } from "@swarmtales/contracts";
import { WhispersApi, WhispersEvents } from "@swarmtales/mechanic-shared";

interface WhispererReads {
	readonly log: EventLogView;
	readonly has: (api: typeof WhispersApi) => boolean;
	readonly tryCall: (api: typeof WhispersApi, method: "whisperer", input: Record<string, never>) => string | null | undefined;
}

/** The resident the whispers mechanic chose, or undefined when it chose none (or is not loaded). */
export function whispererOf(ctx: WhispererReads): string | undefined {
	if (ctx.has(WhispersApi)) return ctx.tryCall(WhispersApi, "whisperer", {}) ?? undefined;
	const chosen = ctx.log.ofType("whispers", "whisperer_chosen").at(0);
	return chosen === undefined ? undefined : Parse(WhispersEvents.events.whisperer_chosen, chosen.payload).agent;
}
