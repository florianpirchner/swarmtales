/**
 * The arena's options and the story's turn policy as the old composer gave them to `Arena`
 * (apps/cli/src/compose.ts, the step-17 mapping): the run's effective settings (the story's `run`
 * with the command line's overrides, `blockSize: "auto"` resolved) go in, the arena's options and
 * the `turns` of the core story come out.
 */
import type { Static } from "typebox";
import { Parse } from "typebox/value";
import type { AnyStory, TurnPolicy } from "@swarmtales/contracts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { ArenaOptions } from "./head.ts";

/** The effective run settings the old composer computed (`EffectiveRun`), and what the app adds. */
export interface ArenaRun {
	/** The first level played (`--level`, else 1): the tribunal's act when its spec names none. */
	readonly startLevel: number;
	readonly activation: "always" | "onNovelty";
	readonly passesPerMinute: number;
	/** Resolved: `"auto"` is one per six residents, at least one. */
	readonly blockSize: number;
	readonly stopWhenDone: boolean;
	readonly stopWhenSeatsDecided: boolean;
	/** Only when the app tracks the spend (old: `budget` given and a limit set). */
	readonly budgetUsd?: number;
	readonly meta?: Readonly<Record<string, string>>;
	readonly snapshot?: { readonly afterLevel: number; readonly atMinute?: number; readonly stop: boolean; readonly file: string };
}

export function arenaFromStory(story: Pick<AnyStory, "id" | "levels" | "acts" | "tribunal">, run: ArenaRun): { readonly options: Static<typeof ArenaOptions>; readonly turns: TurnPolicy } {
	const options = Parse(ArenaOptions, {
		story: story.id,
		...(run.meta === undefined ? {} : { meta: { ...run.meta } }),
		stopWhenDone: run.stopWhenDone,
		stopWhenSeatsDecided: run.stopWhenSeatsDecided,
		rewards: story.levels.map((level) => ({ level: level.number, reward: level.reward })),
		acts: (story.acts ?? []).map((act) => ({ title: act.title, fromLevel: act.fromLevel, ...(act.maxMinutes === undefined ? {} : { maxMinutes: act.maxMinutes }) })),
		...(story.tribunal === undefined ? {} : { tribunalAct: story.tribunal.act ?? run.startLevel }),
		...(run.budgetUsd === undefined ? {} : { budgetUsd: run.budgetUsd }),
		...(run.snapshot === undefined ? {} : { snapshot: { ...run.snapshot } }),
	});
	return { options, turns: legacyTurns(run) };
}
