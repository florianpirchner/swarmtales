/** An oracle from a scripted agent: a registry story with a seed, played by a hand-written player. */
import type { Host, TurnTaker } from "@swarmtales/contracts";
import { createPromptLookup } from "@swarmtales/prompts";
import { coreStoryFor } from "../../apps/cli/src/host/core-run.ts";
import { findCoreStory } from "../../stories/index.ts";
import type { Oracle } from "./format.ts";
import { recordOracle, type OracleCut } from "./record.ts";

export interface ScriptedOptions {
	readonly game: string;
	/** The registry name of the story. */
	readonly variant: string;
	readonly seed: number;
	/** The script's name (the export in `players.ts`) and what it does. */
	readonly script: string;
	readonly note: string;
	readonly player: (host: Host) => TurnTaker;
	readonly cut?: OracleCut;
}

export function scriptedOracle(options: ScriptedOptions): Promise<Oracle> {
	const entry = findCoreStory(options.variant);
	if (entry === undefined) throw new Error(`"${options.variant}" is not a core story of the registry`);
	return recordOracle({
		game: options.game,
		variant: options.variant,
		source: { kind: "scripted", from: `scripts/oracles/players.ts#${options.script}`, note: options.note },
		host: { story: coreStoryFor(entry.story, { seed: options.seed }), prompts: createPromptLookup(entry.prompts === undefined ? {} : { story: entry.prompts }) },
		agent: (host) => ({ take: options.player(host) }),
		...(options.cut === undefined ? {} : { cut: options.cut }),
	});
}
