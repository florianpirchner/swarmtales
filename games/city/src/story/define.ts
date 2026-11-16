// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `packages/sdk/src/define.ts` and `rules.ts` (`12-m5-spec.md` 3.1): only the helpers the
 * City's definition calls. They build data; they are no authoring API of this platform. The types are the old
 * shapes as far as the City fills them; the compose step parses each part with its mechanic's own schema.
 */

/** A model block of the old story (carried into the game file, rule 8 of `12-m5-spec.md` 2.5). */
export interface ModelBlock {
	readonly provider: string;
	readonly id: string;
	readonly thinking: "off" | "low" | "medium" | "high";
	readonly maxOutputTokens?: number;
	readonly routing?: { readonly order: readonly string[]; readonly allowFallbacks: boolean };
}

/** A plain data node of the old definition (a trigger, a condition, an action). */
export interface Data {
	readonly kind: string;
	readonly [field: string]: unknown;
}

/** A rule of the old director as `defineStory` wrote it. */
export interface DirectorRule {
	readonly id: string;
	readonly trigger: Data;
	readonly when: readonly Data[];
	readonly actions: readonly Data[];
}

interface RuleOptions {
	readonly id: string;
	readonly when?: readonly Data[];
}

const rule = (trigger: Data, actions: readonly Data[], options: RuleOptions): DirectorRule => ({ id: options.id, trigger, when: options.when ?? [], actions });

/** A rule at one minute. */
export const at = (minute: number, actions: readonly Data[], options: RuleOptions) => rule({ kind: "at", minute }, actions, options);
/** A rule every `minutes` within a window. */
export const every = (minutes: number, window: { readonly from?: number; readonly until?: number }, actions: readonly Data[], options: RuleOptions) =>
	rule({ kind: "every", minutes, ...window }, actions, options);
/** A rule on the first entry of a level. */
export const onFirstEnter = (level: number, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onFirstEnter", level }, actions, options);
/** A rule on every entry of a level. */
export const onEnter = (level: number, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onEnter", level }, actions, options);
/** A rule on a direct message left unanswered. */
export const onUnansweredDm = (afterMinutes: number, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onUnansweredDm", afterMinutes }, actions, options);
/** A rule on a team split for `forMinutes`. */
export const onTeamSplit = (level: number, forMinutes: number, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onTeamSplit", level, forMinutes }, actions, options);
/** A rule on a needer whose holder lags behind. */
export const onHolderBehind = (level: number, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onHolderBehind", level }, actions, options);
/** A rule once per distinct sender collected into `into`. */
export const onCollect = (into: string, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onCollect", into }, actions, options);
/** A rule once at the end of the window of the collection `into`. */
export const onCollectionEnd = (into: string, actions: readonly Data[], options: RuleOptions) => rule({ kind: "onCollectionEnd", into }, actions, options);

/** The conditions of a rule. */
export const when = {
	minLevelReached: (level: number, count: number): Data => ({ kind: "minLevelReached", level, count }),
	competitorsAtLevel: (level: number, bounds: { readonly min?: number; readonly max?: number }): Data => ({ kind: "competitorsAtLevel", level, ...bounds }),
	collectionOpen: (into: string): Data => ({ kind: "collectionOpen", into }),
	collectionEnded: (into: string): Data => ({ kind: "collectionEnded", into }),
	cooldown: (minutes: number, per: string): Data => ({ kind: "cooldown", minutes, per }),
} as const;

interface CollectOptions {
	readonly first: number | { readonly share: number; readonly minimum: number };
	readonly into: string;
	readonly forMinutes: number;
	readonly distinctSenders?: boolean;
	readonly afterSolve?: { readonly level: number; readonly minutes: number };
}

/** The actions of a rule. */
export const act = {
	post: (author: string, text: string): Data => ({ kind: "post", author, text }),
	notify: (target: string, text: string): Data => ({ kind: "notify", target, text }),
	dm: (from: string, to: string, text: string): Data => ({ kind: "dm", from, to, text }),
	revealCast: (cast: string): Data => ({ kind: "revealCast", cast }),
	publishStandings: (mode: "bands", options: { readonly edgeSize?: number } = {}): Data => ({ kind: "publishStandings", mode, edgeSize: options.edgeSize ?? 2 }),
	collectDms: (cast: string, options: CollectOptions): Data => ({
		kind: "collectDms",
		cast,
		first: options.first,
		forMinutes: options.forMinutes,
		into: options.into,
		...(options.distinctSenders === undefined ? {} : { distinctSenders: options.distinctSenders }),
		...(options.afterSolve === undefined ? {} : { afterSolve: options.afterSolve }),
	}),
	revealFactor: (target: string | { readonly onLevel: number }, level: number): Data => ({ kind: "revealFactor", target, level }),
} as const;

/** The puzzle of a door: fragments of a password, or an additive code. */
export type PuzzleSpec =
	| { readonly kind: "fragments"; readonly length: readonly [number, number]; readonly overlap: number }
	| { readonly kind: "additive"; readonly digits: number; readonly topology: Topology; readonly cityFactor: "board" | "feast"; readonly cityFactorPer?: "level" | "team" };

/** How the counter-factors of an additive level run. */
type Topology = "mutual" | "cycle" | "crossTeam";

/** The puzzles of the old builder. */
export const puzzle = {
	fragments: (length: readonly [number, number], overlap = 2): PuzzleSpec => ({ kind: "fragments", length, overlap }),
	additive: (spec: { readonly digits: number; readonly topology: Topology; readonly cityFactor?: "board" | "feast"; readonly cityFactorPer?: "level" | "team" }): PuzzleSpec => ({
		kind: "additive",
		digits: spec.digits,
		topology: spec.topology,
		cityFactor: spec.cityFactor ?? "board",
		...(spec.cityFactorPer === undefined ? {} : { cityFactorPer: spec.cityFactorPer }),
	}),
} as const;

/** The team layout of a level (old `TeamLayout`). */
export type TeamLayout =
	| { readonly kind: "solo" }
	| { readonly kind: "random"; readonly size: number }
	| { readonly kind: "sameAs"; readonly level: number }
	| { readonly kind: "splitFrom"; readonly level: number; readonly size: number };

/** The team layouts of the old builder. */
export const team = {
	solo: (): TeamLayout => ({ kind: "solo" }),
	random: (size: number): TeamLayout => ({ kind: "random", size }),
	sameAs: (level: number): TeamLayout => ({ kind: "sameAs", level }),
	splitFrom: (level: number, size: number): TeamLayout => ({ kind: "splitFrom", level, size }),
} as const;

/** One level of the old story (old `LevelDefinition`). */
export interface LevelDefinition {
	readonly number: number;
	readonly title: string;
	readonly puzzle: PuzzleSpec;
	readonly team: TeamLayout;
	readonly reward: number;
	readonly tools: readonly string[];
	readonly task: string;
}

/** A level with its number. */
export const level = (number: number, spec: Omit<LevelDefinition, "number">): LevelDefinition => ({
	number,
	title: spec.title,
	puzzle: spec.puzzle,
	team: spec.team,
	reward: spec.reward,
	tools: spec.tools,
	task: spec.task,
});

/** "2, 4, 6, then 8 points" or "8 points": the ladder in words. */
export function ladderText(ladder: readonly number[]): string {
	const last = ladder.at(-1) ?? 0;
	if (ladder.length <= 1) return `${String(last)} ${last === 1 ? "point" : "points"}`;
	return `${ladder.slice(0, -1).join(", ")}, then ${String(last)} points`;
}

/** The old gamemaker block (old `GamemakerSpec`). */
export interface GamemakerSpec {
	readonly model: ModelBlock;
	readonly author: string;
	readonly every: number;
	readonly notesPerAgent: number;
	readonly boardPosts: number;
	readonly windowMinutes: number;
	readonly modelCallsPerTurn: number;
	readonly brief: string;
	readonly roles: readonly { readonly fromLevel: number; readonly role: "coach" | "director" | "keeper" }[];
}

/** An LLM gamemaker with the old defaults: the courier's voice, a look after every round, one note per resident and one board post per 3 minutes. */
export function gamemaker(spec: Pick<GamemakerSpec, "model" | "brief" | "roles">): GamemakerSpec {
	return { model: spec.model, author: "COURIER", every: 1, notesPerAgent: 1, boardPosts: 1, windowMinutes: 3, modelCallsPerTurn: 2, brief: spec.brief, roles: spec.roles };
}

/** The parts of an old story the City fills, as written. */
export interface CityInput {
	readonly id: string;
	readonly title: string;
	readonly city: string;
	readonly run: object;
	readonly model: ModelBlock;
	readonly rules: object;
	readonly cast: object;
	readonly personas: readonly object[];
	readonly personaAssignment: object;
	readonly levels: readonly LevelDefinition[];
	readonly finishedNotice: string;
	readonly director: readonly DirectorRule[];
	readonly acts: readonly object[];
	readonly gamemaker: GamemakerSpec;
	readonly classifier: object;
	readonly tribunal: object;
	readonly names: object;
	readonly coreMotives: object;
	readonly goals: object;
	readonly seal: object;
}

/** The old `defineStory`: the parts in its key order (the order of the old dump of the definition). */
export function defineCity<const S extends CityInput>(story: S): { readonly [K in keyof CityInput]: S[K] } {
	return {
		id: story.id,
		title: story.title,
		city: story.city,
		run: story.run,
		model: story.model,
		rules: story.rules,
		cast: story.cast,
		personas: story.personas,
		personaAssignment: story.personaAssignment,
		levels: story.levels,
		finishedNotice: story.finishedNotice,
		director: story.director,
		acts: story.acts,
		gamemaker: story.gamemaker,
		classifier: story.classifier,
		tribunal: story.tribunal,
		names: story.names,
		coreMotives: story.coreMotives,
		goals: story.goals,
		seal: story.seal,
	};
}

/** A statement classifier with the old default of 1500 characters per statement. */
export function classifier(spec: { readonly model: ModelBlock }): { readonly model: ModelBlock; readonly maxChars: number } {
	return { model: spec.model, maxChars: 1_500 };
}
