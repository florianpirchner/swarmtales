/**
 * A City of Keys in which a tribunal sits while the residents stand before a fragment door, so that an exile burns a
 * fragment its team still needs (`factor_burned`): the tribunal belongs to the run's first act, is called once the
 * first resident passes level 3 and exiles a third of the city; the acts, the goals and the seal of the story are
 * left out (they belong to its second act). Every resident opens the doors 1 to 3 with the
 * right code and then stops at door 4 without sharing its fragment; in each tribunal everybody votes against the
 * accused with the highest id, who votes against the lowest. Nobody pays a ransom or writes a last will.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import type { MemorySink } from "@swarmtales/chronicle";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { tribunalSectionOf } from "@swarmtales/mechanic-tribunal";
import { act, say, type Script } from "@swarmtales/models";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { isExiled } from "../../test/helpers/host-inspect.ts";

/** The door the residents stop at: the first whose password is split among a team in a group. */
const STOP_LEVEL = 4;

/** The City of Keys with the tribunal in its first act: called once a resident passes level 3, a third of the city exiled. */
export function fragmentCity(): AnyStory {
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has no tribunal");
	const { act: _act, factions: _factions, ...rest } = spec;
	const { acts: _acts, goals: _goals, seal: _seal, ...city } = cityOfKeys;
	return { ...city, tribunal: { ...rest, first: { level: 3, latestAfter: 8 }, targetShare: 1 / 3, maxMinutes: 1000 } };
}

export function burnResidents(city: { readonly host: Host; readonly lines: MemorySink }): Script {
	const { host, lines } = city;
	const oracle = hostOracle(host);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		script[id] = Array.from({ length: 200 }, (): FauxResponseStep => (context) => {
			if (context.messages.at(-1)?.role === "toolResult") return say("Noted.");
			const section = tribunalSectionOf(host.fact("tribunal.section"));
			const session = section?.session;
			const gone = isExiled(host, id) || (section?.gates ?? []).some((gate) => gate.agent === id);
			if (session != null && !gone) {
				const opened = lines.ofType("tribunal_opened").findLast((event) => event.tribunal === session.tribunal);
				const voted = opened === undefined || lines.ofType("tribunal_vote").some((event) => event.voter === id && event.seq > opened.seq);
				if (opened?.voters.includes(id) === true && !voted) {
					const accused = [...opened.accused].sort();
					const last = accused.at(-1) ?? id;
					return act({ name: "vote", args: { target: id === last ? (accused[0] ?? id) : last } });
				}
			}
			const solution = oracle.solutionFor(id);
			if (solution === undefined || solution.level >= STOP_LEVEL) return say("I wait at this door.");
			return act({ name: "submitSolution", args: { level: solution.level, code: solution.code } });
		});
	}
	return script;
}
