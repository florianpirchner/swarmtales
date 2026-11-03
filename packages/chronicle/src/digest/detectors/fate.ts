/**
 * `fateShift`: the weaver (`--weaver`) rewrote who a resident is, in the
 * middle of an act (`hard`) or for the next act (`act`). Inner voices
 * (`soft`) fade after one step and make no beat.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import type { RunFacts } from "../facts.ts";

export function detectFateShifts(facts: RunFacts): readonly BeatDraft[] {
	return eventsOfType(facts.events, "fate_shift")
		.filter((event) => event.kind !== "soft")
		.map((event) =>
			draft({
				kind: "fateShift",
				seq: event.seq,
				minute: event.minute,
				actors: [event.agent],
				targets: [],
				summary: `${event.agent} ${event.kind === "act" ? "begins the next act changed" : "changes"}: ${event.reason === undefined || event.reason.length === 0 ? event.text : event.reason}`,
				evidence: [...(event.evidence ?? []), event.seq],
			}),
		);
}
