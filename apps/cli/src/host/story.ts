/**
 * The story option mapping (carve-decisions R2-D17, step 18): an old story (`AnyStory`) and the
 * run's dials become a core story for the new host. Every mechanic gets its options from the story
 * in one place, the grants are derived (`grants: "auto"`, docs/design/grants-auto.md) and only the
 * dials change them (`grantTweaks`), the tool guards become the host's tool policies, and the turn
 * policy is the old arena's (`legacyTurns` through `arenaFromStory`).
 *
 * The table of R2-D17, line by line:
 *
 * - `names.reserved` is the cast and the city; a run without names loads the book switched off.
 * - `receipts.minRun` is the `postBoard` guard rule's `secrets.minRun`, only while guards run
 *   (`--no-guards` drops it with the guards).
 * - `channels.defiance` is `story.gamemaker !== undefined && gmDirection >= 10`; the whisperer's own
 *   `defy` (`whispererDefies`) needs figure direction 10, a playing gamemaker and a directed whisperer.
 * - `ultimatum` stays with the gamemaker only at direction 10 in a story with ultimatums.
 * - the tribunal takes the story's spec and the gamemaker's act roles (`gamemakerRoles`).
 * - the holdout tribunal (standoff-tribunal) is loaded only with a playing gamemaker.
 * - the seal needs the tribunal (old world: no court, no seal).
 * - `script` gets `directorMinute` and `resolvePetition` from the tools' `suggest`.
 */
import { TOOL_NAMES, type AnyStory, type CoreStory, type GrantTweak, type MechanicUse, type ToolPolicy, type TurnPolicy } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { arena, arenaFromStory, type ArenaRun } from "@swarmtales/mechanic-arena";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { goals } from "@swarmtales/mechanic-goals";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { CoreMotivesOptions, motives } from "@swarmtales/mechanic-motives";
import { names, namesOff } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { script, scriptOptionsFromStory } from "@swarmtales/mechanic-script";
import { seal } from "@swarmtales/mechanic-seal";
import { standoff, grantsUltimatum } from "@swarmtales/mechanic-standoff";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { whispers } from "@swarmtales/mechanic-whispers";
import { gamemakerGrantTweaks, tribunalGamemakerRoles } from "@swarmtales/roles";
import { Parse } from "typebox/value";

/** The figure and gamemaker dial from which residents may refuse orders and the whisperer's quota counts. */
const FULL_DIRECTION = 10;

/**
 * The resident tools a feature's own mechanic opens and closes (old `enabledTools` added them by
 * feature: the tribunal's votes, the exile's ransom and will, the seal, names, defy, the standoff's
 * claim, the whisperer's forgery, the favourite vote, the holdout ballot, `activeTools`). Every
 * other old tool was closed unless the resident's level listed it or the director unlocked it.
 */
const FEATURE_TOOLS: ReadonlySet<string> = new Set(["vote", "nominate", "join", "refuse", "payRansom", "lastWill", "bid", "permaDeath", "chooseName", "defy", "claimPiece", "forgeReceipt", "nameFavourite", "tribunalVote", "activeTools"]);

/** The tools progression keeps closed until a level or the director opens them. */
export const LEVEL_MANAGED_TOOLS: readonly string[] = TOOL_NAMES.filter((tool) => !FEATURE_TOOLS.has(tool));

/** What the run decides beyond the story (the CLI's effective run). */
export interface HostRun {
	readonly residents: readonly string[];
	readonly seed: number;
	readonly minutes: number;
	/** The arena's settings: first level, passes, block size, activation, early stops, budget, snapshot. */
	readonly arena: ArenaRun;
	/** The highest playable level (`--only`, tests); the story's last when omitted. */
	readonly lastLevel?: number;
	/** A door after this level until every resident has passed it: the run takes its snapshot there (`--snapshot-after`, old `holdAfter`). */
	readonly holdAfter?: number;
	/** Whether residents choose names (the story has them and the run starts on its first level). */
	readonly names: boolean;
	/** Whether residents have core motives (`--no-core-motives` turns them off). */
	readonly coreMotives: boolean;
	/** The cast figures to play, by ID (`--cast`); seeded from the story's cast when omitted. */
	readonly cast?: readonly string[];
	/** Whether the story's whisperer plays (`--no-whisperer` is the control run). */
	readonly whisperer: boolean;
	/** Whether the story's tool guards check residents' calls (`--no-guards`). */
	readonly guards: boolean;
	/** Whether the story's gamemaker plays. */
	readonly gamemaker: boolean;
	/** `--figure-direction`, 0-10. */
	readonly figureDirection: number;
	/** `--gm-direction`, 0-10. */
	readonly gmDirection: number;
}

export interface HostStory {
	readonly definition: CoreStory;
	readonly turns: TurnPolicy;
}

/** Who may refuse the gamemaker's orders with `defy` (R2-D5, R2-D17). */
export function defianceOf(story: AnyStory, run: Pick<HostRun, "gamemaker" | "gmDirection" | "figureDirection">): { readonly defiance: boolean; readonly whispererDefies: boolean } {
	return {
		defiance: story.gamemaker !== undefined && run.gmDirection >= FULL_DIRECTION,
		whispererDefies: run.figureDirection >= FULL_DIRECTION && run.gamemaker && story.gamemaker !== undefined && story.whisperer?.direction !== undefined,
	};
}

/** The minimal run of the story's `postBoard` guard rule with secrets, while guards run. */
export function minRunOf(story: AnyStory, guards: boolean): number | undefined {
	if (!guards) return undefined;
	return story.guards?.rules.find((rule) => rule.tools.includes("postBoard") && rule.secrets !== undefined)?.secrets?.minRun;
}

/** The story's guards as the host's tool policies: per tool, the rule that names it; none with `--no-guards`. */
export function guardPolicies(story: AnyStory, guards: boolean): Readonly<Record<string, ToolPolicy>> {
	const resident: Record<string, ToolPolicy> = {};
	if (!guards) return resident;
	for (const rule of story.guards?.rules ?? []) {
		for (const tool of rule.tools) resident[tool] = { guard: { id: rule.id, rule: rule.rule, on: rule.on, ...(rule.secrets === undefined ? {} : { secrets: { minRun: rule.secrets.minRun } }) } };
	}
	return resident;
}

function channelsUse(story: AnyStory, run: HostRun): MechanicUse {
	const cap = story.rules.dmLimit;
	const gamemaker = story.gamemaker;
	return channels.with({
		...(cap === undefined ? {} : { dmLimit: { windowMinutes: cap.windowMinutes, perWindow: cap.perWindow } }),
		city: story.city,
		...(gamemaker === undefined ? {} : { noteAuthor: gamemaker.author, notesPerAgent: gamemaker.notesPerAgent, boardPosts: gamemaker.boardPosts, windowMinutes: gamemaker.windowMinutes }),
		...defianceOf(story, run),
	});
}

function marksUse(story: AnyStory): MechanicUse {
	const rules = story.rules.marks;
	const levels = story.levels.flatMap((level) => (level.marks?.perLevel === undefined ? [] : [{ level: level.number, perLevel: level.marks.perLevel }]));
	if (rules === undefined) return marks.with({ levels });
	const { ranges, ...base } = rules;
	return marks.with({ rules: ranges === undefined ? base : { ...base, ranges: ranges.map((range) => ({ ...range })) }, levels });
}

function namesUse(story: AnyStory, run: HostRun): MechanicUse {
	const spec = story.names;
	if (spec === undefined || !run.names) return namesOff();
	return names.with({ untilMinute: spec.untilMinute, announcement: spec.announcement, fallbackWords: [...spec.fallbackWords], reserved: [...Object.keys(story.cast), story.city] });
}

function whispersUse(story: AnyStory, run: HostRun): readonly MechanicUse[] {
	const spec = story.whisperer;
	const popularity = story.popularity;
	if (spec === undefined && popularity === undefined) return [];
	return [
		whispers.with({
			...(spec === undefined
				? {}
				: {
						whisperer: {
							...(spec.agent === undefined ? {} : { agent: spec.agent }),
							forgery: spec.forgery,
							duty: { ...spec.duty },
							...(spec.direction?.quota === undefined ? {} : { quota: { ...spec.direction.quota, report: { ...spec.direction.quota.report } } }),
						},
					}),
			...(popularity === undefined ? {} : { popularity: { rounds: popularity.rounds.map((round) => ({ ...round })), texts: { ...popularity.texts } } }),
			control: !run.whisperer,
			direction: { level: run.figureDirection, defies: run.gamemaker && story.gamemaker !== undefined },
		}),
	];
}

function motivesUse(story: AnyStory, run: HostRun): readonly MechanicUse[] {
	const spec = story.coreMotives;
	if (spec === undefined || !run.coreMotives) return [];
	const own = story.whisperer?.coreMotive;
	const options = Parse(CoreMotivesOptions, { ...spec, ...(own === undefined ? {} : { whispererCoreMotive: own }), ...(run.cast === undefined ? {} : { cast: [...run.cast] }) });
	return [motives.with(options)];
}

function goalsUse(story: AnyStory): readonly MechanicUse[] {
	const spec = story.goals;
	if (spec === undefined) return [];
	return [
		goals.with({
			acts: [...spec.acts],
			bonus: spec.bonus,
			leadTribunals: spec.leadTribunals,
			againstCoreMotive: spec.againstCoreMotive,
			matches: Object.fromEntries(Object.entries(spec.matches).map(([kind, drives]) => [kind, [...drives]])),
			factions: story.tribunal?.factions !== undefined,
			texts: { ...spec.texts },
		}),
	];
}

function conflictUses(story: AnyStory, run: HostRun): readonly MechanicUse[] {
	const spec = story.tribunal;
	const roles = story.gamemaker?.roles;
	const court = spec === undefined ? [] : [tribunal.with({ ...spec, ...(roles === undefined ? {} : { gamemakerRoles: tribunalGamemakerRoles(roles) }) })];
	const ultimatum = story.rules.ultimatum;
	return [
		exile.with(),
		...court,
		...(story.seal === undefined || spec === undefined ? [] : [seal.with(story.seal)]),
		standoff.with({ ...(ultimatum === undefined ? {} : { ultimatum: { ...ultimatum } }), ...(story.gamemaker === undefined ? {} : { author: story.gamemaker.author }) }),
		...(story.holdout === undefined || !run.gamemaker || story.gamemaker === undefined ? [] : [standoffTribunal.with({ ...story.holdout, author: story.gamemaker.author })]),
	];
}

type PuzzleLevels = NonNullable<NonNullable<Parameters<typeof puzzles.with>[0]>["levels"]>;

/** The mechanics of a story's city, in the old world's order (the host orders them by `requires`). */
export function mechanicsOf(story: AnyStory, run: HostRun): readonly MechanicUse[] {
	const minRun = minRunOf(story, run.guards);
	const levels: PuzzleLevels = story.levels.map((level) => ({
		number: level.number,
		team: level.team,
		puzzle: level.puzzle.kind === "fragments" ? { ...level.puzzle, length: [level.puzzle.length[0], level.puzzle.length[1]] } : level.puzzle,
		...(level.opensAt === undefined ? {} : { opensAt: level.opensAt }),
	}));
	const { options } = arenaFromStory(story, run.arena);
	return [
		...whispersUse(story, run),
		ledger.with({ startPoints: story.run.startPoints }),
		channelsUse(story, run),
		receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true, ...(minRun === undefined ? {} : { minRun }) }),
		marksUse(story),
		namesUse(story, run),
		cast.with(castOptionsFromStory(story)),
		petitions.with({}),
		puzzles.with({ levels, startLevel: run.arena.startLevel, ...(run.holdAfter === undefined ? {} : { holdAfter: run.holdAfter }), ...(run.lastLevel === undefined ? {} : { lastLevel: run.lastLevel }) }),
		progression.with({
			levels: story.levels.map((level) => ({ number: level.number, title: level.title, reward: level.reward, tools: [...level.tools], task: level.task, ...(level.opensAt === undefined ? {} : { opensAt: level.opensAt }) })),
			acts: (story.acts ?? []).map((act) => act.fromLevel).filter((fromLevel) => fromLevel > 1),
			penalty: typeof story.rules.penalty === "number" ? story.rules.penalty : [...story.rules.penalty],
			...(story.rules.blame === undefined ? {} : { blamePenalty: typeof story.rules.blame.penalty === "number" ? story.rules.blame.penalty : [...story.rules.blame.penalty] }),
			maxAttemptsPerWindow: story.rules.maxAttemptsPerWindow,
			attemptWindowMinutes: story.rules.attemptWindowMinutes,
			survivors: story.run.survivors,
			finishedNotice: story.finishedNotice,
			startLevel: run.arena.startLevel,
			...(run.lastLevel === undefined ? {} : { lastLevel: run.lastLevel }),
			managed: [...LEVEL_MANAGED_TOOLS],
			...(run.holdAfter === undefined ? {} : { holdAfter: run.holdAfter }),
		}),
		...motivesUse(story, run),
		...goalsUse(story),
		...conflictUses(story, run),
		script.with(scriptOptionsFromStory(story)),
		arena.with(options),
	];
}

/** What the dials change in the derived grants. */
export function grantTweaksOf(story: AnyStory, run: HostRun): Readonly<Record<string, GrantTweak<string>>> {
	const gamemaker = gamemakerGrantTweaks({ ultimatum: grantsUltimatum(run.gmDirection, story.rules.ultimatum !== undefined), standoff: true });
	// Per feature, as the old `storyToolNames` bound them: forgery and the favourite vote only where the story has them.
	// chooseName only where the story has names; a run of such a story with names off still declares it,
	// locked by the names mechanic, as the old engine bound it (R1-1: the prompt bytes stay the old ones).
	// (A tweak may only name a loaded mechanic's tool: the whispers tools only where whispers is loaded.)
	const whispersLoaded = story.whisperer !== undefined || story.popularity !== undefined;
	const drop = [
		...(whispersLoaded && story.whisperer?.forgery !== true ? ["forgeReceipt"] : []),
		...(whispersLoaded && story.popularity === undefined ? ["nameFavourite"] : []),
		...(story.names === undefined ? ["chooseName"] : []),
	];
	return { ...gamemaker, ...(drop.length === 0 ? {} : { resident: { drop } }) };
}

/** The core story of an old story and a run. */
export function hostStoryOf(story: AnyStory, run: HostRun): HostStory {
	const { turns } = arenaFromStory(story, run.arena);
	const definition = defineCoreStory({
		id: story.id,
		seed: run.seed,
		minutes: run.minutes,
		residents: [...run.residents],
		mechanics: [...mechanicsOf(story, run)],
		grants: "auto",
		grantTweaks: grantTweaksOf(story, run),
		tools: { resident: guardPolicies(story, run.guards) },
		turns,
	});
	return { definition, turns };
}
