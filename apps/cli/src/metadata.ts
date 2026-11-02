/** Contents of `000-run.json` (SPEC §14): run metadata and the full serialized story. */
import type { AgentProfile } from "@swarmtales/engine";
import type { AnyStory } from "@swarmtales/contracts";
import type { EffectiveRun } from "./compose.ts";

export interface RunMetadataInput {
	readonly run: string;
	readonly number: number;
	readonly startedAt: string;
	readonly provider: string;
	readonly model: string;
	readonly story: AnyStory;
	readonly effective: EffectiveRun;
	/** Model and persona per competitor. */
	readonly profiles: readonly AgentProfile[];
	/** The snapshot a resumed run continues (SPEC 17). */
	readonly resumedFrom?: ResumedFrom;
}

export interface ResumedFrom {
	readonly file: string;
	/** Run that took the snapshot, from its meta. */
	readonly run?: string;
	readonly level: number;
	readonly round: number;
	readonly minute: number;
	readonly events: number;
}

export function runMetadata(input: RunMetadataInput): Readonly<Record<string, unknown>> {
	return {
		run: input.run,
		number: input.number,
		startedAt: input.startedAt,
		provider: input.provider,
		model: input.model,
		storyId: input.story.id,
		effective: input.effective,
		...(input.resumedFrom === undefined ? {} : { resumedFrom: input.resumedFrom }),
		agents: input.profiles.map((profile) => ({
			agent: profile.agent,
			provider: profile.model.provider,
			model: profile.model.id ?? "-",
			persona: profile.persona?.name ?? null,
		})),
		story: input.story,
	};
}
