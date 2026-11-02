/**
 * Test support of team R1: a started host of the production story mapping (`hostStoryOf`) with the
 * resident runner's app events declared, and the old composer's effective run as a `HostRun`.
 */
import { fileURLToPath } from "node:url";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { createHost } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { RESIDENT_APP_EVENTS } from "@swarmtales/roles";
import type { EffectiveRun } from "../../../apps/cli/src/run-options.ts";
import { hostStoryOf, type HostRun } from "../../../apps/cli/src/host/story.ts";

/** The old composer's effective run as the host mapping's run. */
export function hostRunOf(effective: EffectiveRun, residents: readonly string[]): HostRun {
	return {
		residents: [...residents],
		seed: effective.seed,
		minutes: effective.minutes,
		arena: {
			startLevel: effective.startLevel,
			activation: effective.activation,
			passesPerMinute: effective.passesPerMinute,
			blockSize: effective.blockSize,
			stopWhenDone: effective.stopWhenDone,
			stopWhenSeatsDecided: effective.stopWhenSeatsDecided,
		},
		lastLevel: effective.lastLevel,
		names: effective.names,
		coreMotives: effective.coreMotives,
		whisperer: effective.whisperer,
		guards: effective.guards,
		gamemaker: effective.gamemaker,
		figureDirection: effective.figureDirection,
		gmDirection: effective.gmDirection,
	};
}

/** A story with rivals: each directed figure faces the next three figures of the cast (the stories have none yet). */
export function withRivals(story: AnyStory): AnyStory {
	const spec = story.coreMotives;
	if (spec?.figures === undefined) throw new Error(`${story.id} has no cast`);
	const figures = spec.figures;
	const rivalled = figures.map((figure, at) => {
		if (figure.direction === undefined) return figure;
		const rivals = [1, 2, 3].flatMap((step) => {
			const other = figures[(at + step) % figures.length];
			return other === undefined || other.id === figure.id ? [] : [{ figure: other.id, text: `You never trust ${other.id}.` }];
		});
		return { ...figure, direction: { ...figure.direction, rivals } };
	});
	return { ...story, coreMotives: { ...spec, figures: rivalled } };
}

/** A started host of the story and run, with the resident runner's app events; `before` runs before the start (a sink). */
export function startedHost(story: AnyStory, run: HostRun, awaitsAnswer?: (resident: string) => boolean, before?: (host: Host) => void): Host {
	const { definition } = hostStoryOf(story, run);
	const host = createHost({
		story: definition,
		prompts: createPromptLookup({ story: fileURLToPath(new URL("../../mechanics/t2/prompts", import.meta.url)) }),
		app: { events: RESIDENT_APP_EVENTS },
		...(awaitsAnswer === undefined ? {} : { awaitsAnswer }),
	});
	before?.(host);
	host.start();
	return host;
}
