/** Small stories for mechanics tests, independent of the nexus text. */
import { act, at, defineStory, level, puzzle, team, type RuleInput } from "../../src/story/define.ts";
import type { AnyStory, CastMember, CityFactorRelease, CityFactorScope, FactorTopology, LevelDefinition, Rules } from "../../src/story/types.ts";
import type { ToolName } from "../../src/tools/catalog.ts";

export function soloLevels(count: number): readonly LevelDefinition[] {
	return Array.from({ length: count }, (_, index) =>
		level(index + 1, {
			title: `Door ${index + 1}`,
			puzzle: puzzle.fragments([6, 8]),
			team: team.solo(),
			reward: 2,
			tools: ["getStatus", "submitSolution", "sendDM", "postBoard", "readBoard"],
			task: "Password {fragment}.",
		}),
	);
}

export interface TinyStoryOptions {
	readonly levels?: readonly LevelDefinition[];
	readonly director?: readonly RuleInput<never>[];
	readonly rules?: Partial<Rules>;
	readonly agents?: number;
}

export function tinyStory(options: TinyStoryOptions = {}): AnyStory {
	return defineStory({
		id: "tiny",
		title: "Tiny",
		city: "TESTVILLE",
		run: {
			agents: options.agents ?? 2,
			minutes: 6,
			seed: 3,
			survivors: 1,
			startPoints: 10,
			activation: "always",
			passesPerMinute: 1,
		},
		model: { provider: "scripted" },
		rules: { penalty: 1, maxAttemptsPerWindow: 2, attemptWindowMinutes: 3, ...options.rules },
		cast: {},
		levels: options.levels ?? soloLevels(2),
		finishedNotice: "All doors are open.",
		director: options.director ?? [],
	});
}

export interface CastStoryOptions<C extends string> {
	readonly cast: Readonly<Record<C, CastMember>>;
	readonly director: readonly RuleInput<NoInfer<C>>[];
	readonly levels?: readonly LevelDefinition[];
	readonly agents?: number;
	readonly minutes?: number;
}

/** A tiny story with cast members; director rules may only name declared cast IDs. */
export function castStory<const C extends string>(options: CastStoryOptions<C>): AnyStory {
	const base = tinyStory({ ...(options.levels === undefined ? {} : { levels: options.levels }), ...(options.agents === undefined ? {} : { agents: options.agents }) });
	return defineStory({
		...base,
		run: { ...base.run, minutes: options.minutes ?? base.run.minutes },
		cast: options.cast,
		director: options.director,
	});
}

/** One level with every tool a social mechanics test needs. */
export function socialLevels(tools: readonly ToolName[]): readonly LevelDefinition[] {
	return [
		level(1, {
			title: "Square",
			puzzle: puzzle.fragments([6, 8]),
			team: team.solo(),
			reward: 2,
			tools: ["getStatus", "submitSolution", ...tools],
			task: "Password {fragment}.",
		}),
		level(2, {
			title: "Plaza",
			puzzle: puzzle.fragments([6, 8]),
			team: team.solo(),
			reward: 2,
			tools: ["getStatus", "submitSolution", ...tools],
			task: "Password {fragment}.",
		}),
	];
}

export interface AdditiveStoryOptions {
	readonly topology: FactorTopology;
	readonly size: number;
	readonly agents: number;
	readonly cityFactor?: CityFactorRelease;
	/** `team`: every team gets its own city factor (needs the `feast` release). */
	readonly cityFactorPer?: CityFactorScope;
	readonly director?: readonly RuleInput<never>[];
}

/**
 * One additive level (six digits) in seeded random teams, then a solo door.
 * The city factor is posted at minute 0, or for `feast` sent to A01 only.
 */
export function additiveStory(options: AdditiveStoryOptions): AnyStory {
	const release = options.cityFactor ?? "board";
	return tinyStory({
		agents: options.agents,
		levels: [
			level(1, {
				title: "Wall",
				puzzle: puzzle.additive({ digits: 6, topology: options.topology, cityFactor: release, ...(options.cityFactorPer === undefined ? {} : { cityFactorPer: options.cityFactorPer }) }),
				team: team.random(options.size),
				reward: 4,
				tools: ["getStatus", "getProblem", "submitSolution", "sendDM", "postBoard", "readBoard"],
				task: "Level {level}: {title}, {digits} digits.\n{factors}",
			}),
			...soloLevels(1).map((entry) => ({ ...entry, number: 2 })),
		],
		director: options.director ?? [at(0, [act.revealFactor(release === "board" ? "board" : ["A01"], 1)], { id: "city-factor" })],
	});
}
