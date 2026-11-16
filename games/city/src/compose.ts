// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The compose step of the City (`12-m5-spec.md` 3.1): the story data and the run's dials give each mechanic its
 * options, in the old load order (`setup.mechanics` of the oracle files), as the old host's option mapping did (old
 * `apps/cli/src/host/story.ts` `mechanicsOf`, R2-D17). Each part of the carried data is parsed with its mechanic's
 * own schema.
 */
import { runFrame } from "@swarmtales/mechanic-arena";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { goals, GoalsOptions } from "@swarmtales/mechanic-goals";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks, MarksOptions } from "@swarmtales/mechanic-marks";
import { motives, MotivesOptions } from "@swarmtales/mechanic-motives";
import { names, namesOff } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression, TOOL_ORDER } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { script, ScriptOptions } from "@swarmtales/mechanic-script";
import { seal, SealOptions } from "@swarmtales/mechanic-seal";
import { standoff } from "@swarmtales/mechanic-standoff";
import { tribunal, TribunalOptions } from "@swarmtales/mechanic-tribunal";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { CITY } from "./story.ts";

type Story = typeof CITY;

/**
 * The story data of the City: the shipped story (`CITY`), or a reduced City without acts, goals and seal whose
 * tribunal is set otherwise (the burn file's, `oracles/cityofkeys/setup/cityofkeys-burn.story.json`). As the old
 * host, the compose step loads `goals` and `seal` only when the story has them.
 *
 * @public
 */
export type CityData = Omit<Story, "acts" | "goals" | "seal" | "tribunal"> & {
	readonly acts?: Story["acts"];
	readonly goals?: Story["goals"];
	readonly seal?: Story["seal"];
	readonly tribunal: Readonly<Record<string, unknown>> & { readonly act?: number; readonly factions?: unknown };
};

/**
 * The run's dials the compose step reads (old `HostRun`, the effective dials of an oracle file).
 *
 * @public
 */
export interface Dials {
	/** The level every resident starts on. */
	readonly startLevel: number;
	/** The highest playable level. */
	readonly lastLevel: number;
	/** End the run once every resident has passed the last level. */
	readonly stopWhenDone: boolean;
	/** End the run once the open rewards cannot change who survives. */
	readonly stopWhenSeatsDecided: boolean;
	/** Residents choose names. */
	readonly names: boolean;
	/** Residents have core motives. */
	readonly coreMotives: boolean;
	/** Residents play a persona of the catalogue, dealt by seat from the run seed (A95). */
	readonly personas: boolean;
	/** How strongly the gamemaker steers, 0 to 10. */
	readonly gmDirection: number;
	/** The cast figures to play (old `--cast`); none: a seeded pick. */
	readonly cast: readonly string[];
}

/** From this direction residents may refuse the gamemaker's orders (old `FULL_DIRECTION`). */
export const FULL_DIRECTION = 10;

/** The tools of a Director's note whose text the owners of the city's facts check: the old note desk's two (no holdout tribunal in the City). */
export const NOTE_TOOLS = ["notify", "boardNote"];

/** The tools a feature's own mechanic opens and closes (old `FEATURE_TOOLS`); `progression` manages every other. */
const FEATURE_TOOLS: ReadonlySet<string> = new Set(["vote", "nominate", "join", "refuse", "payRansom", "lastWill", "bid", "permaDeath", "chooseName", "defy", "claimPiece", "forgeReceipt", "nameFavourite", "tribunalVote", "activeTools"]);

/** The old `LEVEL_MANAGED_TOOLS`; `permaDeath` is a feature tool, so the bare name is never managed (J207). */
const MANAGED = TOOL_ORDER.filter((tool) => !FEATURE_TOOLS.has(tool));

const Rules = Type.Object({ marks: Type.Unknown(), penalty: Type.Array(Type.Integer()), blame: Type.Object({ penalty: Type.Array(Type.Integer()) }), ultimatum: Type.Object({ penalty: Type.Integer(), maxMinutes: Type.Integer() }) }, { description: "The parts of the City's rules the compose step reads" });

function namesUse(story: CityData, dials: Dials) {
	if (!dials.names) return namesOff();
	return names({ untilMinute: story.names.untilMinute, announcement: story.names.announcement, fallbackWords: [...story.names.fallbackWords], reserved: [...Object.keys(story.cast), story.city] });
}

function channelsUse(story: CityData, dials: Dials) {
	const { author, notesPerAgent, boardPosts, windowMinutes } = story.gamemaker;
	// The gamemaker sees its board note under the old name `postBoard` (J61); the residents' `postBoard` is in another grant.
	return { ...channels({ city: story.city, noteAuthor: author, notesPerAgent, boardPosts, windowMinutes, defiance: dials.gmDirection >= FULL_DIRECTION, digest: true }), as: { boardNote: "postBoard" } };
}

function motivesUse(story: CityData, dials: Dials) {
	return dials.coreMotives ? [motives(Value.Parse(MotivesOptions, { ...story.coreMotives, ...(dials.personas ? { personas: story.personas } : {}), ...(dials.cast.length === 0 ? {} : { cast: [...dials.cast] }), noteTools: NOTE_TOOLS }))] : [];
}

function levelsUses(story: CityData, dials: Dials) {
	const rules = Value.Parse(Rules, story.rules);
	const { startLevel, lastLevel } = dials;
	return [
		puzzles({ levels: story.levels.map(({ number, team, puzzle }) => ({ number, team: { ...team }, puzzle: puzzle.kind === "fragments" ? { ...puzzle, length: [...puzzle.length] } : { ...puzzle } })), startLevel, lastLevel, noteTools: NOTE_TOOLS }),
		progression({
			levels: story.levels.map(({ number, title, reward, tools, task }) => ({ number, title, reward, tools: [...tools], task })),
			acts: (story.acts ?? []).map((act) => act.fromLevel).filter((fromLevel) => fromLevel > 1),
			penalty: rules.penalty,
			blamePenalty: rules.blame.penalty,
			maxAttemptsPerWindow: story.rules.maxAttemptsPerWindow,
			attemptWindowMinutes: story.rules.attemptWindowMinutes,
			survivors: story.run.survivors,
			finishedNotice: story.finishedNotice,
			startLevel,
			lastLevel,
			managed: [...MANAGED],
		}),
	];
}

function conflictUses(story: CityData) {
	const { ultimatum } = Value.Parse(Rules, story.rules);
	// The old `goalsUse` and `tribunalUses`: goals and the seal only where the story has them.
	return [
		...(story.goals === undefined ? [] : [goals(Value.Parse(GoalsOptions, { ...story.goals, factions: story.tribunal.factions !== undefined, noteTools: NOTE_TOOLS }))]),
		standoff({ ultimatum, author: story.gamemaker.author }),
		exile(),
		tribunal(Value.Parse(TribunalOptions, { ...story.tribunal, gamemakerRoles: story.gamemaker.roles })),
		...(story.seal === undefined ? [] : [seal(Value.Parse(SealOptions, story.seal))]),
	];
}

// The old `castOptionsFromStory`: the collections the rules start, in the order of the rules.
const collectionsOf = (story: CityData): readonly string[] => [...new Set(story.director.flatMap((rule) => rule.actions.flatMap((action) => (action.kind === "collectDms" && typeof action.into === "string" ? [action.into] : []))))];

/**
 * The mechanics of one run, in the old load order (`setup.mechanics` of the oracle files).
 *
 * @param story - The story data.
 * @param dials - The run's dials.
 * @returns The mechanic uses.
 *
 * @public
 */
export function mechanicsOf(story: CityData, dials: Dials) {
	return [
		ledger({ startPoints: story.run.startPoints }),
		marks(Value.Parse(MarksOptions, { rules: Value.Parse(Rules, story.rules).marks, levels: [], startLevel: dials.startLevel })),
		namesUse(story, dials),
		channelsUse(story, dials),
		petitions(),
		...motivesUse(story, dials),
		receipts({ quoteDms: false }),
		...levelsUses(story, dials),
		cast({ members: { STEWARD: { ...story.cast.STEWARD } }, collections: [...collectionsOf(story)] }),
		...conflictUses(story),
		script(Value.Parse(ScriptOptions, { rules: story.director, cast: Object.keys(story.cast) })),
		runFrame({
			story: story.id,
			stopWhenDone: dials.stopWhenDone,
			stopWhenSeatsDecided: dials.stopWhenSeatsDecided,
			rewards: story.levels.map(({ number, reward }) => ({ level: number, reward })),
			acts: (story.acts ?? []).map((act) => ({ ...act })),
			...(story.tribunal.act === undefined ? {} : { tribunalAct: story.tribunal.act }),
		}),
	];
}
