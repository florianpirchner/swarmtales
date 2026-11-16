// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The City of Keys: six residents of NEXUS pass ten doors. Act I (levels 1 to 7) teaches them to talk, every door
 * opening one more channel; Act II, the wall (levels 8 to 10), gives each a personal code whose parts sit with
 * others, with tribunals, factions, the black seal, secret goals and the feast of STEWARD. A port of the old
 * `stories/cityofkeys` with the old run dials as params: the default params give the old story's run (80 minutes,
 * three passes, `onNews`), the oracle files' dials give theirs. The story data is carried (`src/story.ts`);
 * `src/compose.ts` gives every mechanic its options.
 */
import { SwtError } from "@swarmtales/contracts";
import { confessor, confessorOptions, defineGamemaker, DIRECTION_LEVELS, FigureSchema, GAMEMAKER_EVENTS, gamemakerOptions, interpretations, judge, judgeOptions, type DirectionLevel, type GamemakerFact } from "@swarmtales/city-directors";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGame, defineGameFamily, paramOverride } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { FULL_DIRECTION, mechanicsOf, NOTE_TOOLS, type CityData } from "./src/compose.ts";
import { CITY } from "./src/story.ts";

/**
 * The tools a resident is shown, in the old order (`setup.residentTools` of the oracle files). The bare name
 * `permaDeath` stands for the seal's tool alone: the City loads no `standoff-tribunal` (J207).
 */
const RESIDENT_TOOLS = ["transferPoints", "chooseName", "readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "defy", "signPetition", "listPetitions", "showReceipt", "blame", "getStatus", "activeTools", "getProblem", "submitSolution", "listAgents", "claimPiece", "payRansom", "lastWill", "vote", "nominate", "join", "refuse", "bid", "permaDeath"] as const;

/** The tools of the black seal, granted only where the story has one. */
const SEAL_TOOLS: readonly string[] = ["bid", "permaDeath"];

/** The tools every resident starts with locked: the level-managed tools the first door does not list (`setup.locked`). */
const LOCKED = ["readBoard", "postBoard", "sendDM", "transferPoints", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "showReceipt", "blame", "signPetition", "listPetitions"] as const;

/** The residents a run of M5 may have: six (no larger run before Act II works with six, `12-m5-spec.md` 3.1). */
const RESIDENTS = 6;

const flag = (value: boolean, description: string) => Type.Boolean({ default: value, description });

/**
 * The params of the family: the old run dials (`setup.definition.effective` of the oracle files).
 *
 * @public
 */
export const CityParams = Type.Object(
	{
		agents: Type.Integer({ minimum: 1, default: RESIDENTS, description: "The residents; only six play at M5." }),
		minutes: Type.Integer({ minimum: 1, default: 80, description: "The run's length in minutes (ticks)." }),
		startLevel: Type.Integer({ minimum: 1, maximum: 10, default: 1, description: "The level every resident starts on." }),
		lastLevel: Type.Integer({ minimum: 1, maximum: 10, default: 10, description: "The highest playable door." }),
		passesPerMinute: Type.Integer({ minimum: 1, default: 3, description: "Passes per minute." }),
		activation: Type.Union([Type.Literal("onNews"), Type.Literal("always")], { default: "onNews", description: "Who is woken in a pass (the old `onNovelty` is `onNews`)." }),
		stopWhenDone: flag(true, "End the run once every resident has passed the last door."),
		stopWhenSeatsDecided: flag(true, "End the run once the open rewards cannot change who survives."),
		personas: flag(true, "Every resident plays a persona (in its system text, issue M5-81)."),
		gamemaker: flag(true, "The gamemaker plays."),
		classifier: flag(true, "The Confessor labels what residents say."),
		names: flag(true, "Residents choose names."),
		coreMotives: flag(true, "Residents have core motives."),
		gmDirection: Type.Integer({ minimum: 0, maximum: 10, default: 4, description: "How strongly the gamemaker steers." }),
	},
	{ description: "The run dials of the City." },
);

/**
 * The params of one run.
 *
 * @public
 */
export type CityParams = Static<typeof CityParams>;

// The old `directionLevel`: the defined level at or below the dial.
const levelOf = (dial: number): DirectionLevel => DIRECTION_LEVELS.filter((level) => level <= dial).at(-1) ?? 0;

// The gamemaker's report: the facts of the loaded mechanics (old `hostSituation` of the City).
const FACTS: readonly GamemakerFact[] = ["progression.section", "motives.lines", "motives.coreMotives", "goals.texts", "tribunal.section", "seal.section", "puzzles.needs", "standoff.section", "puzzles.secrets"];

function gamemakerUse(story: CityData, params: CityParams) {
	const { gamemaker, city, run, tribunal } = story;
	const input = { city, agents: params.agents, survivors: run.survivors, rules: story.rules, spec: gamemaker, labels: params.classifier, tribunal: { factions: "factions" in tribunal }, characters: true, seal: story.seal !== undefined, direction: levelOf(params.gmDirection) };
	const options = gamemakerOptions(input, createPromptLookup(), story.coreMotives.figures.map((figure) => Value.Parse(FigureSchema, figure)));
	const events = GAMEMAKER_EVENTS.filter((event) => params.classifier || event !== "interpretations.interpretation");
	// The facts of the mechanics the story loads: no motives without core motives, no goals or seal in a reduced City.
	const loaded = (fact: GamemakerFact): boolean => (params.coreMotives || !fact.startsWith("motives.")) && (story.goals !== undefined || !fact.startsWith("goals.")) && (story.seal !== undefined || !fact.startsWith("seal."));
	const director = defineGamemaker({ facts: FACTS.filter(loaded), events, every: gamemaker.every });
	const { provider, id, thinking, maxOutputTokens } = gamemaker.model;
	return { use: director, options, model: { id: `${provider}/${id}`, thinking, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) } } as const;
}

// The Directors in the old `OVERSEER_ORDER`: the Confessor before the gamemaker; the judge answers the review of `blame`.
function directorsOf(story: CityData, params: CityParams) {
	const prompts = createPromptLookup();
	const haiku = { id: "anthropic/claude-haiku-5-5", thinking: "off" } as const;
	return [
		...(params.classifier ? [{ use: confessor, options: confessorOptions(prompts, { maxChars: story.classifier.maxChars }), model: haiku }] : []),
		...(params.gamemaker ? [gamemakerUse(story, params)] : []),
		{ use: judge, options: judgeOptions(prompts), model: haiku },
	];
}

/**
 * The game of one run.
 *
 * @param params - The dials; the defaults of {@link CityParams} for the rest.
 * @returns The game in its builder form.
 * @throws SwtError `SWT-G041` when `agents` is not six.
 *
 * @public
 */
export function cityGame(params: CityParams) {
	return cityGameOf(CITY, params);
}

/**
 * The game of one run of a given story data: the shipped City, or a reduced City such as the burn file's
 * (`oracles/cityofkeys/setup/cityofkeys-burn.story.json`, set up by the oracle test). A story without a seal grants
 * no seal tool.
 *
 * @param story - The story data.
 * @param params - The dials.
 * @returns The game in its builder form.
 * @throws SwtError `SWT-G041` when `agents` is not six.
 *
 * @public
 */
export function cityGameOf(story: CityData, params: CityParams) {
	if (params.agents !== RESIDENTS) throw new SwtError(paramOverride({ name: "agents", problem: "mismatch", message: `must be ${String(RESIDENTS)} at M5, got ${String(params.agents)}` }));
	const confessed = params.classifier ? [interpretations({ noteTools: NOTE_TOOLS, every: story.gamemaker.every })] : [];
	return defineGame({
		id: "city",
		title: story.title,
		seed: story.run.seed,
		residents: RESIDENTS,
		mechanics: [...mechanicsOf(story, params), ...confessed],
		directors: directorsOf(story, params),
		grants: {
			// The resident's tools in the old order (the kernel's load order puts `exile` and `standoff` elsewhere); the
			// gamemaker has no ultimatum below direction 10 (old `grantsUltimatum`).
			resident: story.seal === undefined ? RESIDENT_TOOLS.filter((tool) => !SEAL_TOOLS.includes(tool)) : RESIDENT_TOOLS,
			...(params.gmDirection >= FULL_DIRECTION ? {} : { gamemaker: { drop: ["ultimatum"] as const } }),
			...(params.classifier ? { confessor: ["interpret"] } : {}),
		},
		locked: LOCKED,
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
		model: { id: `${story.model.provider}/${story.model.id}`, thinking: story.model.thinking },
		prompt: promptOf(story, params),
	});
}

// The City order of the system text (A89, M5-81): the city with its names deadline and every tool, the character and
// the seeded persona `motives` deals (A95). Without core motives `motives` is not loaded: no character, no persona.
function promptOf(story: CityData, params: CityParams) {
	const city = { name: story.city, survivors: story.run.survivors, tools: "all" as const, ...(params.names ? { namesUntil: story.names.untilMinute } : {}) };
	if (!params.coreMotives) return { city };
	return { frame: story.coreMotives.frame, character: "motives.prose", city, ...(params.personas ? { persona: "motives.personas" } : {}) };
}

/**
 * The City as a game family: the default params give the old story's run; the oracle files' dials give theirs.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: cityFamily, params: { minutes: 12 }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const cityFamily = defineGameFamily(CityParams, cityGame);

export default cityFamily;
