/** Hosts for the tests of team T4: a story of stand-ins and the mechanic under test, and the golden gate over its legacy lines. */
import { fileURLToPath } from "node:url";
import { createPromptLookup } from "@swarmtales/prompts";
import { createHost, defineCoreStory, type HostOptions } from "@swarmtales/kernel";
import { ownedBy, parseLegacyLog } from "@swarmtales/testkit";
import { LegacyEventAdapter, legacyLine, type LegacyOwner } from "@swarmtales/chronicle";
import type { EventEnvelope, Host, MechanicUse } from "@swarmtales/contracts";

export const SUPPORT_PROMPTS = fileURLToPath(new URL("prompts", import.meta.url));

export interface TestStory {
	readonly mechanics: readonly MechanicUse[];
	readonly residents?: number | readonly string[];
	readonly minutes?: number;
	readonly seed?: number;
	/** Tools the residents may use (the script always has `probe`). */
	readonly residentTools?: readonly string[];
	readonly gamemakerTools?: readonly string[];
}

export function storyOptions(story: TestStory): HostOptions {
	return {
		story: defineCoreStory({
			id: "t4-test",
			seed: story.seed ?? 7,
			minutes: story.minutes ?? 40,
			residents: story.residents ?? 6,
			mechanics: story.mechanics,
			grants: { resident: story.residentTools ?? [], gamemaker: story.gamemakerTools ?? [], script: ["probe"] },
		}),
		prompts: createPromptLookup({ mechanics: { probe: SUPPORT_PROMPTS } }),
	};
}

export function startHost(story: TestStory): Host {
	const host = createHost(storyOptions(story));
	host.start();
	return host;
}

/** The legacy lines the adapter writes for these envelopes, parsed. */
export function legacyLines(events: readonly EventEnvelope[]) {
	const adapter = new LegacyEventAdapter();
	return parseLegacyLog(events.flatMap((event) => adapter.write(event)).map((event) => legacyLine(event)).join("\n"));
}

/** What the mechanics `owners` wrote, as golden lines (no seq, no wall clock). */
export function ownLines(host: Host, owners: readonly LegacyOwner[]): readonly string[] {
	return ownedBy(legacyLines(host.log.all()), owners);
}
