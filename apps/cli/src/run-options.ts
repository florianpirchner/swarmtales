/**
 * The run's parameters after the CLI's overrides (`--agents`, `--minutes`, `--level`, the dials,
 * ...): what the old composer and the host path share. Moved out of the old composer (step 18, deleted with the engine) so the
 * host path needs nothing of the old `World`.
 */
import type { RequestLimits } from "@swarmtales/models";
import { SnapshotError } from "@swarmtales/chronicle";
import { assertValidStory } from "@swarmtales/sdk";
import { DEFAULT_DIRECTION, DIRECTOR_SUPPORT, directionLevel, type Activation, type AnyStory, type DirectionLevel } from "@swarmtales/contracts";

/** CLI-level overrides of the story's run parameters. */
export interface RunOverrides {
	readonly agents?: number;
	readonly minutes?: number;
	readonly seed?: number;
	/** Start every competitor on this level; the run continues afterwards. */
	readonly level?: number;
	/** Play only this level and stop once everyone has passed it. */
	readonly only?: number;
	/** Highest playable level (tests); defaults to `only` or the story's last level. */
	readonly lastLevel?: number;
	readonly stopWhenDone?: boolean;
	readonly stopWhenSeatsDecided?: boolean;
	readonly activation?: Activation;
	readonly passesPerMinute?: number;
	readonly blockSize?: number;
	/** `false` plays without personas (control group). */
	readonly personas?: boolean;
	/** `true` plays with the story's gamemaker; it needs `gamemakerModels`. */
	readonly gamemaker?: boolean;
	/** `true` labels every round with the story's classifier; it needs `classifier`. */
	readonly classifier?: boolean;
	/** `false` keeps IDs although the story has names (v08); a resumed run keeps the snapshot's. */
	readonly names?: boolean;
	/** `false` plays without core motives although the story has them (v09, `--no-core-motives`). */
	readonly coreMotives?: boolean;
	/** The cast figures to play, by ID (`--cast`); seeded from the story's cast when omitted. */
	readonly cast?: readonly string[];
	/** How strongly a figure's prompt steers it, 0-10 (`--figure-direction`, apps/cli/src/host/direction.ts). */
	readonly figureDirection?: number;
	/** How strongly the gamemaker steers, 0-10 (`--gm-direction`). */
	readonly gmDirection?: number;
	/** `true` lets the weaver change who residents are (`--weaver`); it needs the `weaver` option. */
	readonly weaver?: boolean;
	/** The run's spending cap in USD (`--budget`), instead of the story's `run.budgetUsd` (P47). */
	readonly budgetUsd?: number;
	/** `false` plays without the story's whisperer, the control run (Whispers, `--no-whisperer`). */
	readonly whisperer?: boolean;
	/** `false` plays without the story's tool guards (`--no-guards`). */
	readonly guards?: boolean;
}

/** The parameters a run actually uses after overrides. */
export interface EffectiveRun {
	readonly agents: number;
	readonly minutes: number;
	readonly seed: number;
	readonly startLevel: number;
	readonly lastLevel: number;
	readonly stopWhenDone: boolean;
	readonly stopWhenSeatsDecided: boolean;
	readonly activation: Activation;
	readonly passesPerMinute: number;
	readonly blockSize: number;
	readonly personas: boolean;
	/** Whether the story's gamemaker plays along. */
	readonly gamemaker: boolean;
	/** Whether the story's classifier labels every round. */
	readonly classifier: boolean;
	/** Whether residents choose names: the story has them and the run starts on its first level (v08). */
	readonly names: boolean;
	/** Whether residents have core motives: the story has them and the run does not turn them off (v09). */
	readonly coreMotives: boolean;
	/** The direction levels the run plays (default 4 each, as v12). */
	readonly figureDirection: DirectionLevel;
	readonly gmDirection: DirectionLevel;
	/** Whether the story's whisperer plays (Whispers); off in a control run. */
	readonly whisperer: boolean;
	/** Whether the story's tool guards check residents' calls (SPEC 20). */
	readonly guards: boolean;
}

export const DEFAULT_LIMITS: RequestLimits = { maxOutputTokens: 4_000, timeoutMs: 120_000 };

export function effectiveRun(story: AnyStory, overrides: RunOverrides = {}): EffectiveRun {
	if (overrides.only !== undefined && overrides.level !== undefined) {
		throw new Error("Use either --level (start level, keeps running) or --only (just this level), not both");
	}
	const startLevel = overrides.only ?? overrides.level ?? 1;
	return {
		agents: overrides.agents ?? story.run.agents,
		minutes: overrides.minutes ?? story.run.minutes,
		seed: overrides.seed ?? story.run.seed,
		startLevel,
		lastLevel: overrides.lastLevel ?? overrides.only ?? story.levels.length,
		stopWhenDone: overrides.only !== undefined || (overrides.stopWhenDone ?? story.run.stopWhenDone ?? false),
		// A run of one level plays it out; deciding seats needs the whole run.
		stopWhenSeatsDecided: overrides.only === undefined && (overrides.stopWhenSeatsDecided ?? story.run.stopWhenSeatsDecided ?? false),
		activation: overrides.activation ?? story.run.activation,
		passesPerMinute: overrides.passesPerMinute ?? story.run.passesPerMinute,
		blockSize: overrides.blockSize ?? resolveBlockSize(story.run.blockSize, overrides.agents ?? story.run.agents),
		personas: overrides.personas ?? true,
		gamemaker: overrides.gamemaker === true && story.gamemaker !== undefined,
		classifier: overrides.classifier === true && story.classifier !== undefined,
		names: story.names !== undefined && startLevel === 1 && (overrides.names ?? true),
		coreMotives: story.coreMotives !== undefined && (overrides.coreMotives ?? true),
		figureDirection: overrides.figureDirection === undefined ? DEFAULT_DIRECTION : directionLevel(overrides.figureDirection),
		gmDirection: overrides.gmDirection === undefined ? DEFAULT_DIRECTION : directionLevel(overrides.gmDirection),
		whisperer: story.whisperer !== undefined && (overrides.whisperer ?? true),
		guards: story.guards !== undefined && (overrides.guards ?? true),
	};
}

/** A block size, with `"auto"` resolved for `agents` competitors: one per six, at least one (v08). */
export function resolveBlockSize(blockSize: number | "auto", agents: number): number {
	return blockSize === "auto" ? Math.max(1, Math.ceil(agents / 6)) : blockSize;
}

/**
 * Checks that the story can be played with these effective parameters
 * (agent count, team layouts of the played levels, level range). Throws
 * {@link StoryValidationError} with every issue otherwise.
 */
export function assertPlayable(story: AnyStory, effective: EffectiveRun): void {
	// The scheduler's overrides are checked like the story's own run settings.
	const scheduled = { ...story, run: { ...story.run, passesPerMinute: effective.passesPerMinute, blockSize: effective.blockSize } };
	assertValidStory(scheduled, {
		support: DIRECTOR_SUPPORT,
		agents: effective.agents,
		playable: { from: effective.startLevel, to: effective.lastLevel },
	});
}


/** What a resumed run must keep of the run that took its snapshot. */
export interface ResumedRun {
	readonly agents: number;
	readonly seed: number;
	readonly run: { readonly startLevel: number; readonly personas: boolean };
	/** Whether the residents' core motives were dealt already. */
	readonly coresDealt: boolean;
}

/**
 * The overrides of a run that resumes a snapshot: its competitors, seed, first level and personas,
 * plus whatever else the caller overrides (minutes, stop-when-done, the gamemaker and the
 * classifier). A conflicting override is refused with a {@link SnapshotError}.
 */
export function resumedOverrides(snapshot: ResumedRun, overrides: RunOverrides = {}): RunOverrides {
	if (overrides.agents !== undefined && overrides.agents !== snapshot.agents) {
		throw new SnapshotError(`The snapshot was taken with ${String(snapshot.agents)} agents; this run asks for ${String(overrides.agents)}`);
	}
	if (overrides.seed !== undefined && overrides.seed !== snapshot.seed) {
		throw new SnapshotError(`The snapshot was taken with seed ${String(snapshot.seed)}; this run asks for seed ${String(overrides.seed)}`);
	}
	if (overrides.level !== undefined || overrides.only !== undefined) {
		throw new SnapshotError("A resumed run continues where the snapshot stopped; --level and --only do not apply");
	}
	if (overrides.personas !== undefined && overrides.personas !== snapshot.run.personas) {
		throw new SnapshotError(`The snapshot was taken ${snapshot.run.personas ? "with" : "without"} personas; a resumed run keeps them`);
	}
	if (overrides.cast !== undefined && snapshot.coresDealt) {
		throw new SnapshotError("The snapshot's residents already have their core motives; --cast applies only to a fresh run");
	}
	return { ...overrides, agents: snapshot.agents, seed: snapshot.seed, level: snapshot.run.startLevel, personas: snapshot.run.personas };
}
