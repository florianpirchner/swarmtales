// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Whispers: six residents of ECHO open seven doors together, every door's password split into six fragments, one
 * per resident; one seeded resident, the whisperer, wants only discord. A port of the old `stories/whispers` with
 * its two variants as a param (`receipts: false` is `whispers-rumours`, word against word) and the old run dials as
 * params: the default params give the old story's run (45 minutes, three passes, `onNews`), the oracle files' dials
 * give theirs. The story data is carried (`src/story.ts`); `src/compose.ts` gives every mechanic its options.
 */
import { SwtError } from "@swarmtales/contracts";
import { confessor, confessorOptions, defineGamemaker, DIRECTION_LEVELS, GAMEMAKER_EVENTS, gamemakerOptions, guard, guardOptions, interpretations, judge, judgeOptions, type DirectionLevel, type GamemakerFact } from "@swarmtales/city-directors";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGame, defineGameFamily, paramOverride } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { mechanicsOf, NOTE_TOOLS, type WhispersData } from "./src/compose.ts";
import { whispersData } from "./src/story.ts";

/** The tools a resident is shown, in the old order (`setup.residentTools` of the oracle files); the rumours have no forgery. */
const RESIDENT_TOOLS = ["transferPoints", "chooseName", "readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "defy", "signPetition", "listPetitions", "showReceipt", "blame", "forgeReceipt", "nameFavourite", "getStatus", "activeTools", "getProblem", "submitSolution", "listAgents", "claimPiece", "payRansom", "lastWill", "tribunalVote"] as const;

/** The tools every resident starts with locked: those of the level-managed tools no door lists (`setup.locked`). */
const LOCKED = ["depositGroup", "withdrawGroup", "setTreasurer", "showReceipt", "signPetition", "listPetitions", "blame"] as const;

/** The residents a run of M5 may have: six (no larger run before Act II works with six, `12-m5-spec.md` 3.1). */
const RESIDENTS = 6;

const flag = (value: boolean, description: string) => Type.Boolean({ default: value, description });

/**
 * The params of the family: the variant and the old run dials (`setup.definition.effective` of the oracle files).
 *
 * @public
 */
export const WhispersParams = Type.Object(
	{
		receipts: flag(true, "Real receipts for everyone and forgeries for the whisperer; false is `whispers-rumours`."),
		agents: Type.Integer({ minimum: 1, default: RESIDENTS, description: "The residents; only six play at M5." }),
		minutes: Type.Integer({ minimum: 1, default: 45, description: "The run's length in minutes (ticks)." }),
		lastLevel: Type.Integer({ minimum: 1, maximum: 7, default: 7, description: "The highest playable door." }),
		passesPerMinute: Type.Integer({ minimum: 1, default: 3, description: "Passes per minute." }),
		activation: Type.Union([Type.Literal("onNews"), Type.Literal("always")], { default: "onNews", description: "Who is woken in a pass (the old `onNovelty` is `onNews`)." }),
		stopWhenDone: flag(false, "End the run once every resident has passed the last door."),
		stopWhenSeatsDecided: flag(false, "End the run once the open rewards cannot change who survives."),
		gamemaker: flag(true, "The gamemaker plays (and with it the holdout tribunal)."),
		classifier: flag(true, "The Confessor labels what residents say."),
		names: flag(true, "Residents choose names."),
		coreMotives: flag(true, "Residents have core motives."),
		whisperer: flag(true, "The whisperer plays; false is the control run."),
		guards: flag(true, "The city's guard checks the board, groups, group names and transfer memos."),
		figureDirection: Type.Integer({ minimum: 0, maximum: 10, default: 4, description: "How strongly the whisperer's prompt steers it." }),
		gmDirection: Type.Integer({ minimum: 0, maximum: 10, default: 4, description: "How strongly the gamemaker steers." }),
	},
	{ description: "The variants and the run dials of Whispers." },
);

/**
 * The params of one run.
 *
 * @public
 */
export type WhispersParams = Static<typeof WhispersParams>;

// The old `directionLevel`: the defined level at or below the dial.
const levelOf = (dial: number): DirectionLevel => DIRECTION_LEVELS.filter((level) => level <= dial).at(-1) ?? 0;

// The gamemaker's report: the facts and events of the loaded mechanics.
const FACTS: readonly GamemakerFact[] = ["progression.section", "motives.lines", "motives.coreMotives", "whispers.section", "standoff-tribunal.section", "puzzles.needs", "standoff.section", "puzzles.secrets"];

function gamemakerUse(story: WhispersData, params: WhispersParams) {
	const prompts = createPromptLookup();
	const { gamemaker, holdout, city, run } = story;
	const options = gamemakerOptions(
		{ city, agents: params.agents, survivors: run.survivors, rules: story.rules, spec: gamemaker, labels: params.classifier, characters: params.coreMotives, direction: levelOf(params.gmDirection), holdout, ...(params.whisperer ? { whisperer: true } : {}) },
		prompts,
	);
	const events = GAMEMAKER_EVENTS.filter((event) => params.classifier || event !== "interpretations.interpretation");
	const director = defineGamemaker({ facts: FACTS.filter((fact) => params.coreMotives || !fact.startsWith("motives.")), events, every: gamemaker.every });
	const { provider, id, thinking, maxOutputTokens } = gamemaker.model;
	return { use: director, options, model: { id: `${provider}/${id}`, thinking, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) } } as const;
}

// The Directors in the old `OVERSEER_ORDER`: the Confessor before the gamemaker; the guard and the judge answer reviews.
function directorsOf(story: WhispersData, params: WhispersParams) {
	const prompts = createPromptLookup();
	const haiku = { id: "anthropic/claude-haiku-5-5", thinking: "off" } as const;
	return [
		...(params.classifier ? [{ use: confessor, options: confessorOptions(prompts, { maxChars: story.classifier.maxChars }), model: haiku }] : []),
		...(params.gamemaker ? [gamemakerUse(story, params)] : []),
		...(params.guards ? [{ use: guard, options: guardOptions(prompts), model: haiku }] : []),
		{ use: judge, options: judgeOptions(prompts), model: haiku },
	];
}

/**
 * The game of one run.
 *
 * @param params - The variant and the dials; the defaults of {@link WhispersParams} for the rest.
 * @returns The game in its builder form.
 * @throws SwtError `SWT-G041` when `agents` is not six.
 *
 * @public
 */
export function whispersGame(params: WhispersParams) {
	if (params.agents !== RESIDENTS) throw new SwtError(paramOverride({ name: "agents", problem: "mismatch", message: `must be ${String(RESIDENTS)} at M5, got ${String(params.agents)}` }));
	const story = whispersData(params.receipts);
	const confessed = params.classifier ? [interpretations({ noteTools: NOTE_TOOLS, every: story.gamemaker.every })] : [];
	return defineGame({
		id: "whispers",
		title: story.title,
		seed: story.run.seed,
		residents: RESIDENTS,
		mechanics: [...mechanicsOf(story, params), ...confessed],
		directors: directorsOf(story, params),
		grants: {
			// The old `storyToolNames`: forgery only where the story has it, in the old order; the gamemaker has no ultimatum below direction 10.
			resident: RESIDENT_TOOLS.filter((tool) => params.receipts || tool !== "forgeReceipt"),
			gamemaker: { drop: ["ultimatum"] as const },
			...(params.classifier ? { confessor: ["interpret"] } : {}),
		},
		locked: LOCKED.filter((tool) => !params.receipts || tool !== "showReceipt"),
		scheduler: {
			id: "turns",
			options: {
				passes: params.passesPerMinute,
				blockSize: 1,
				activation: params.activation,
				order: "arena",
				afterBlocks: ["director"],
				inputs: [{ source: "script" }, { kind: "status", join: " · " }, { kind: "task", join: "\n" }, { source: "progression" }, { source: "channels" }],
			},
		},
		end: { ticks: params.minutes },
		model: { id: `${story.model.provider}/${story.model.id}`, thinking: "low" },
		prompt: { frame: story.coreMotives.frame, character: "motives.prose" },
	});
}

/**
 * Whispers as a game family: the default params give the old story's run; `{ receipts: false }` is the rumours
 * variant, `{ whisperer: false }` the control run.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: whispersFamily, params: { receipts: false }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const whispersFamily = defineGameFamily(WhispersParams, whispersGame);

export default whispersFamily;
