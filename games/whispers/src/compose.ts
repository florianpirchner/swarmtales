// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The compose step of Whispers (`12-m5-spec.md` 3.1): the story data and the run's dials give each mechanic its
 * options, in the old load order, as the old host's option mapping did (old `apps/cli/src/host/story.ts`
 * `mechanicsOf`, R2-D17). What the recut moved (the hand-over guard of `puzzles`, the note checks of `whispers`,
 * `motives` and `puzzles`) gets its options here too.
 */
import { runFrame } from "@swarmtales/mechanic-arena";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { motives, MotivesOptions } from "@swarmtales/mechanic-motives";
import { names, namesOff } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression, TOOL_ORDER } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { script, ScriptOptions } from "@swarmtales/mechanic-script";
import { standoff } from "@swarmtales/mechanic-standoff";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { whispers } from "@swarmtales/mechanic-whispers";
import { Value } from "typebox/value";
import type { whispersData } from "./story.ts";

/** The story data of one variant. */
export type WhispersData = ReturnType<typeof whispersData>;

/**
 * The run's dials the compose step reads (old `HostRun`, the effective dials of an oracle file).
 *
 * @public
 */
export interface Dials {
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
	/** The story's whisperer plays (false: the control run). */
	readonly whisperer: boolean;
	/** The story's guard checks the guarded tools. */
	readonly guards: boolean;
	/** The story's gamemaker plays. */
	readonly gamemaker: boolean;
	/** How strongly the whisperer's prompt steers it, 0 to 10. */
	readonly figureDirection: number;
	/** How strongly the gamemaker steers, 0 to 10. */
	readonly gmDirection: number;
}

/** From this direction residents may refuse the gamemaker's orders (old `FULL_DIRECTION`). */
const FULL_DIRECTION = 10;

/** The tools of a Director's note whose text the owners of the city's facts check (decisions A78, A81). */
export const NOTE_TOOLS = ["notify", "boardNote", "callTribunal", "announceTribunal", "permaDeath"];

/** The tools a feature's own mechanic opens and closes (old `FEATURE_TOOLS`); `progression` manages every other. */
const FEATURE_TOOLS: ReadonlySet<string> = new Set(["vote", "nominate", "join", "refuse", "payRansom", "lastWill", "bid", "permaDeath", "chooseName", "defy", "claimPiece", "forgeReceipt", "nameFavourite", "tribunalVote", "activeTools"]);

/** The old `LEVEL_MANAGED_TOOLS`. */
const MANAGED = TOOL_ORDER.filter((tool) => !FEATURE_TOOLS.has(tool));

function whispersUse(story: WhispersData, dials: Dials) {
	const { forgery, duty, direction } = story.whisperer;
	return whispers({
		whisperer: { forgery, duty: { ...duty }, quota: { ...direction.quota, report: { ...direction.quota.report } } },
		popularity: { rounds: story.popularity.rounds.map((round) => ({ ...round })), texts: { ...story.popularity.texts } },
		control: !dials.whisperer,
		direction: { level: dials.figureDirection, defies: dials.gamemaker },
		noteTools: NOTE_TOOLS,
	});
}

function marksUse(story: WhispersData) {
	const rules = "marks" in story.rules ? story.rules.marks : undefined;
	return marks({ ...(rules === undefined ? {} : { rules: { ...rules, prices: { ...rules.prices } } }), levels: [] });
}

function namesUse(story: WhispersData, dials: Dials) {
	if (!dials.names) return namesOff();
	return names({ untilMinute: story.names.untilMinute, announcement: story.names.announcement, fallbackWords: [...story.names.fallbackWords], reserved: [...Object.keys(story.cast), story.city] });
}

function channelsUse(story: WhispersData, dials: Dials) {
	const { author, notesPerAgent, boardPosts, windowMinutes } = story.gamemaker;
	return channels({ dmLimit: { ...story.rules.dmLimit }, city: story.city, noteAuthor: author, notesPerAgent, boardPosts, windowMinutes, defiance: dials.gamemaker && dials.gmDirection >= FULL_DIRECTION, digest: true });
}

function motivesUse(story: WhispersData, dials: Dials) {
	if (!dials.coreMotives) return [];
	const { coreMotive } = story.whisperer;
	// The carried catalogue is literal data; the mechanic's own schema gives it its option types.
	return [motives(Value.Parse(MotivesOptions, { ...story.coreMotives, whispererCoreMotive: coreMotive, ...(dials.whisperer ? { whisperer: {} } : {}), noteTools: NOTE_TOOLS }))];
}

function levelsUses(story: WhispersData, dials: Dials) {
	const guards = dials.guards ? story.guards.rules.map(({ id, rule, tools, secrets }) => ({ id, rule, tools: [...tools], minRun: secrets.minRun })) : [];
	return [
		puzzles({ levels: story.levels.map(({ number, team, puzzle, opensAt }) => ({ number, team: { ...team }, puzzle: { ...puzzle, length: [...puzzle.length] }, ...(opensAt === undefined ? {} : { opensAt }) })), lastLevel: dials.lastLevel, guards, noteTools: NOTE_TOOLS }),
		progression({
			levels: story.levels.map(({ number, title, reward, tools, task, opensAt }) => ({ number, title, reward, tools: [...tools], task, ...(opensAt === undefined ? {} : { opensAt }) })),
			lastLevel: dials.lastLevel,
			penalty: [...story.rules.penalty],
			maxAttemptsPerWindow: story.rules.maxAttemptsPerWindow,
			attemptWindowMinutes: story.rules.attemptWindowMinutes,
			survivors: story.run.survivors,
			finishedNotice: story.finishedNotice,
			managed: [...MANAGED],
		}),
	];
}

function conflictUses(story: WhispersData, dials: Dials) {
	return [
		standoff({ author: story.gamemaker.author }),
		exile(),
		...(dials.gamemaker ? [standoffTribunal({ ...structuredClone(story.holdout), author: story.gamemaker.author })] : []),
	];
}

/**
 * The mechanics of one variant and run, in the old load order (`setup.mechanics` of the oracle files).
 *
 * @param story - The story data of the variant.
 * @param dials - The run's dials.
 * @returns The mechanic uses.
 *
 * @public
 */
export function mechanicsOf(story: WhispersData, dials: Dials) {
	const minRun = dials.guards ? story.guards.rules.find((rule) => rule.tools.includes("postBoard"))?.secrets.minRun : undefined;
	return [
		ledger({ startPoints: story.run.startPoints }),
		marksUse(story),
		namesUse(story, dials),
		channelsUse(story, dials),
		petitions(),
		receipts({ quoteDms: "receipts" in story.rules && story.rules.receipts.quoteDms, ...(minRun === undefined ? {} : { minRun }) }),
		whispersUse(story, dials),
		...motivesUse(story, dials),
		...levelsUses(story, dials),
		cast({ members: {}, collections: [] }),
		...conflictUses(story, dials),
		script(Value.Parse(ScriptOptions, { rules: story.director, cast: [] })),
		runFrame({ story: story.id, stopWhenDone: dials.stopWhenDone, stopWhenSeatsDecided: dials.stopWhenSeatsDecided, rewards: story.levels.map(({ number, reward }) => ({ level: number, reward })), acts: [] }),
	];
}
