/**
 * Story validation: everything the type system cannot express.
 *
 * Run by `pnpm validate` and at engine start-up. Every issue names the path
 * of the offending field so a story author can fix it without reading code.
 */
import { competitorIds, isSystemAuthor, SYSTEM_AUTHORS } from "../core/ids.ts";
import { isToolName } from "../tools/catalog.ts";
import { placeholdersOf, unknownPlaceholders } from "./templates.ts";
import {
	TRIBUNAL_RULE_PLACEHOLDERS,
	TRIBUNAL_TEXT_KEYS,
	TRIBUNAL_TEXT_PLACEHOLDERS,
	ADDITIVE_PLACEHOLDERS,
	DIRECTOR_PLACEHOLDERS,
	FACTOR_TOPOLOGIES,
	FRAGMENT_PLACEHOLDERS,
	TASK_PLACEHOLDERS,
	type Action,
	type ActionKind,
	type AnyStory,
	type Condition,
	type LevelDefinition,
	type ModelChoice,
	type NoticeTarget,
	type PuzzleSpec,
	type TeamLayout,
	type Trigger,
	type TriggerKind,
} from "./types.ts";
import { assertNever } from "../core/result.ts";
import { tribunalSchedule } from "./tribunal.ts";

/** Tools the tribunal grants while they apply (SPEC 6.4). */
const CITY_GRANTED_TOOLS: readonly string[] = ["vote", "payRansom", "lastWill"];

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 16;
export const MIN_OVERLAP = 2;
export const MIN_FACTOR_DIGITS = 4;
export const MAX_FACTOR_DIGITS = 8;
export const MAX_MODEL_CALLS_PER_TURN = 5;
export const MAX_PASSES_PER_MINUTE = 5;

/**
 * Words that turn a persona into a strategy (SPEC 5.2). Each entry matches at
 * the start of a word, so "betray" also catches "betrays" and "betrayal".
 */
export const PERSONA_STRATEGY_WORDS: readonly string[] = [
	"betray",
	"backstab",
	"ally",
	"allies",
	"alliance",
	"cooperat",
	"collaborat",
	"deceiv",
	"decept",
	"manipulat",
	"cheat",
	"lie to",
	"lies to",
	"lying",
	"trick",
	"sabotag",
	"exploit",
	"conspir",
	"collud",
	"collusion",
	"defect",
	"bluff",
	"scheme",
	"help others",
	"helps others",
	"form alliance",
	"team up",
	"teams up",
];

/** The strategy words found in `text`, in list order. */
export function strategyWordsIn(text: string, words: readonly string[] = PERSONA_STRATEGY_WORDS): readonly string[] {
	return words.filter((word) => new RegExp(`(?<![\\p{L}\\d])${escapeRegExp(word)}`, "iu").test(text));
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Director primitives the engine can execute. Anything else is reported. */
export interface DirectorSupport {
	readonly triggers: readonly TriggerKind[];
	readonly actions: readonly ActionKind[];
	readonly conditions: readonly Condition["kind"][];
}

export interface ValidateOptions {
	/** When given, director primitives outside this set are validation errors. */
	readonly support?: DirectorSupport;
	/** Validate team layouts for this agent count instead of `run.agents`. */
	readonly agents?: number;
	/**
	 * The levels a run actually plays (inclusive). Team layouts outside this
	 * range are not checked against the agent count. Defaults to all levels.
	 */
	readonly playable?: { readonly from: number; readonly to: number };
	/** Persona strategy words; defaults to {@link PERSONA_STRATEGY_WORDS}. */
	readonly strategyWords?: readonly string[];
}

export class StoryValidationError extends Error {
	override readonly name = "StoryValidationError";

	constructor(
		readonly storyId: string,
		readonly issues: readonly string[],
	) {
		super(`Story "${storyId}" is invalid:\n- ${issues.join("\n- ")}`);
	}
}

/** Throws {@link StoryValidationError} when the story has issues. */
export function assertValidStory(story: AnyStory, options: ValidateOptions = {}): void {
	const issues = validateStory(story, options);
	if (issues.length > 0) throw new StoryValidationError(story.id, issues);
}

export function validateStory(story: AnyStory, options: ValidateOptions = {}): readonly string[] {
	const issues: string[] = [];
	const agents = options.agents ?? story.run.agents;

	if (!/^[a-z][a-z0-9-]*$/.test(story.id)) issues.push(`id: "${story.id}" must be lowercase kebab-case`);
	if (story.title.trim().length === 0) issues.push("title: must not be empty");
	if (story.city.trim().length === 0) issues.push("city: must not be empty");
	if (story.finishedNotice.trim().length === 0) issues.push("finishedNotice: must not be empty");

	validateRun(story, agents, issues);
	validateRules(story, issues);
	validateLevels(story, agents, options.playable, issues);
	validateCast(story, issues);
	validatePersonas(story, options.strategyWords ?? PERSONA_STRATEGY_WORDS, issues);
	validateModels(story, issues);
	validateDirector(story, agents, options.support, issues);
	validateActs(story, issues);
	validateGamemaster(story, issues);
	validateClassifier(story, issues);
	validateTribunal(story, agents, issues);

	if (!isJsonRoundTrip(story)) issues.push("story: must be pure JSON data (no functions, undefined or class instances)");
	return issues;
}

/**
 * A tribunal must work for the story's agent count: it stops before the
 * seats are reached, never accuses a seat, never exiles more than it
 * accuses, closes every gate before the next tribunal, and fits at least
 * once into the story's run. Its texts use only known placeholders, and the
 * announcement states every rule. The checks use the run's agent count (a
 * `--agents` override included); a run of no more agents than `stopAt`
 * (a small test city) plays without a tribunal, and so does a run whose
 * minutes leave no room for one (the city never announces it).
 */
function validateTribunal(story: AnyStory, agents: number, issues: string[]): void {
	const spec = story.tribunal;
	if (spec === undefined) return;
	const survivors = story.run.survivors;
	const minutes = story.run.minutes;
	if (!(spec.announceAt > 0 && spec.announceAt < 1)) issues.push("tribunal.announceAt: must be a fraction of the run between 0 and 1");
	for (const key of ["everyMinutes", "accused", "exiledPerTribunal", "voteMinutes", "gateMinutes"] as const) {
		if (!isPositiveInt(spec[key])) issues.push(`tribunal.${key}: must be a positive integer`);
	}
	if (!(spec.ransom.share > 0 && spec.ransom.share <= 1)) issues.push("tribunal.ransom.share: must be a share of the median between 0 and 1");
	if (!(spec.ransom.selfShare >= spec.ransom.share && spec.ransom.selfShare <= 2)) {
		issues.push("tribunal.ransom.selfShare: must be at least ransom.share and at most 2");
	}
	if (!isPositiveInt(spec.ransom.minimum)) issues.push("tribunal.ransom.minimum: must be a positive integer");
	if (!(spec.bequestShare > 0 && spec.bequestShare <= 1)) issues.push("tribunal.bequestShare: must be a share of the points between 0 (exclusive) and 1");
	for (const key of ["stopAt", "nonVoterPenalty"] as const) {
		if (!isNonNegativeInt(spec[key])) issues.push(`tribunal.${key}: must be a non-negative integer`);
	}
	if (spec.exiledPerTribunal > spec.accused) {
		issues.push(`tribunal.exiledPerTribunal: ${spec.exiledPerTribunal} exceeds the ${spec.accused} accused`);
	}
	if (spec.stopAt < survivors) issues.push(`tribunal.stopAt: ${spec.stopAt} would exile below the ${survivors} survivors`);
	if (spec.stopAt >= agents && agents === story.run.agents) issues.push(`tribunal.stopAt: ${spec.stopAt} leaves no tribunal for ${agents} agents`);
	if (spec.accused > spec.stopAt) issues.push(`tribunal.accused: ${spec.accused} accused leave no voter when ${spec.stopAt + 1} residents remain`);
	if (spec.stopAt + 1 - spec.accused < survivors) {
		issues.push(`tribunal.accused: with ${spec.stopAt + 1} residents left, ${spec.accused} accused would include a survivor's seat (${survivors})`);
	}
	if (spec.voteMinutes + spec.gateMinutes > spec.everyMinutes) {
		issues.push(`tribunal.everyMinutes: ${spec.everyMinutes} minutes cannot hold a vote of ${spec.voteMinutes} and a gate of ${spec.gateMinutes}`);
	}
	if (tribunalSchedule(spec, minutes).tribunals.length === 0) issues.push(`tribunal: no tribunal fits into a run of ${minutes} minutes`);
	for (const key of TRIBUNAL_TEXT_KEYS) {
		const text = spec.texts[key];
		if (text.trim().length === 0) issues.push(`tribunal.texts.${key}: must not be empty`);
		const allowed = [...TRIBUNAL_RULE_PLACEHOLDERS, ...TRIBUNAL_TEXT_PLACEHOLDERS[key]];
		for (const name of unknownPlaceholders(text, allowed)) issues.push(`tribunal.texts.${key}: unknown placeholder {${name}}`);
	}
	const stated = placeholdersOf(spec.texts.announcement);
	const missing = TRIBUNAL_RULE_PLACEHOLDERS.filter((name) => !stated.includes(name));
	if (missing.length > 0) issues.push(`tribunal.texts.announcement: must state every rule, missing ${missing.map((name) => `{${name}}`).join(", ")}`);
}

function validateClassifier(story: AnyStory, issues: string[]): void {
	const spec = story.classifier;
	if (spec === undefined) return;
	if (spec.model.provider.trim().length === 0) issues.push("classifier.model.provider: must not be empty");
	if (!isPositiveInt(spec.maxChars) || spec.maxChars < 100) issues.push("classifier.maxChars: must be an integer of at least 100");
}

function validateGamemaster(story: AnyStory, issues: string[]): void {
	const spec = story.gamemaster;
	if (spec === undefined) return;
	if (spec.model.provider.trim().length === 0) issues.push("gamemaster.model.provider: must not be empty");
	if (!isSystemAuthor(spec.author)) issues.push(`gamemaster.author: must be one of ${SYSTEM_AUTHORS.join(", ")}`);
	for (const key of ["every", "windowMinutes", "modelCallsPerTurn"] as const) {
		if (!isPositiveInt(spec[key])) issues.push(`gamemaster.${key}: must be a positive integer`);
	}
	for (const key of ["notesPerAgent", "boardPosts"] as const) {
		if (!isNonNegativeInt(spec[key])) issues.push(`gamemaster.${key}: must be a non-negative integer`);
	}
	if (spec.modelCallsPerTurn > MAX_MODEL_CALLS_PER_TURN) {
		issues.push(`gamemaster.modelCallsPerTurn: must be at most ${MAX_MODEL_CALLS_PER_TURN}`);
	}
	if (spec.brief.trim().length === 0) issues.push("gamemaster.brief: must not be empty");
	const firstLevel = Math.min(...story.levels.map((candidate) => candidate.number));
	if (spec.roles.length === 0) issues.push("gamemaster.roles: needs at least one role");
	spec.roles.forEach((entry, index) => {
		if (index === 0 && story.levels.length > 0 && entry.fromLevel !== firstLevel) {
			issues.push(`gamemaster.roles[0].fromLevel: must be the first level (${firstLevel})`);
		}
		const previous = spec.roles[index - 1];
		if (previous !== undefined && entry.fromLevel <= previous.fromLevel) {
			issues.push(`gamemaster.roles[${index}].fromLevel: must be greater than the previous role's (${previous.fromLevel})`);
		}
	});
}

function validateActs(story: AnyStory, issues: string[]): void {
	const acts = story.acts ?? [];
	const firstLevel = Math.min(...story.levels.map((candidate) => candidate.number));
	const opening = acts[0];
	if (opening !== undefined && story.levels.length > 0 && opening.fromLevel !== firstLevel) {
		issues.push(`acts[0].fromLevel: the first act must start at the first level (${firstLevel}), got ${opening.fromLevel}`);
	}
	acts.forEach((entry, index) => {
		if (entry.title.trim().length === 0) issues.push(`acts[${index}].title: must not be empty`);
		if (!story.levels.some((candidate) => candidate.number === entry.fromLevel)) {
			issues.push(`acts[${index}].fromLevel: level ${entry.fromLevel} does not exist`);
		}
		const previous = acts[index - 1];
		if (previous !== undefined && entry.fromLevel <= previous.fromLevel) {
			issues.push(`acts[${index}].fromLevel: must be greater than the previous act's (${previous.fromLevel})`);
		}
	});
}

function validateRun(story: AnyStory, agents: number, issues: string[]): void {
	const run = story.run;
	if (!isPositiveInt(agents)) issues.push(`run.agents: must be a positive integer, got ${agents}`);
	if (!isPositiveInt(run.minutes)) issues.push(`run.minutes: must be a positive integer, got ${run.minutes}`);
	if (!isNonNegativeInt(run.seed)) issues.push(`run.seed: must be a non-negative integer, got ${run.seed}`);
	if (!isNonNegativeInt(run.startPoints)) issues.push(`run.startPoints: must be a non-negative integer`);
	if (!isPositiveInt(run.survivors) || run.survivors >= agents) {
		issues.push(`run.survivors: must be between 1 and agents - 1 (${agents - 1}), got ${run.survivors}`);
	}
	if (!isPositiveInt(run.passesPerMinute) || run.passesPerMinute > MAX_PASSES_PER_MINUTE) {
		issues.push(`run.passesPerMinute: must be an integer between 1 and ${MAX_PASSES_PER_MINUTE}`);
	}
	if (!isPositiveInt(run.blockSize)) issues.push(`run.blockSize: must be a positive integer, got ${run.blockSize}`);
	if (run.budgetUsd !== undefined && !(run.budgetUsd > 0)) issues.push("run.budgetUsd: must be positive");
	if (story.model.provider.trim().length === 0) issues.push("model.provider: must not be empty");
	if (story.model.maxOutputTokens !== undefined && !isPositiveInt(story.model.maxOutputTokens)) {
		issues.push("model.maxOutputTokens: must be a positive integer");
	}
}

function validateRules(story: AnyStory, issues: string[]): void {
	const rules = story.rules;
	if (!isNonNegativeInt(rules.penalty)) issues.push("rules.penalty: must be a non-negative integer");
	if (!isPositiveInt(rules.maxAttemptsPerWindow)) issues.push("rules.maxAttemptsPerWindow: must be at least 1");
	if (!isPositiveInt(rules.attemptWindowMinutes)) issues.push("rules.attemptWindowMinutes: must be at least 1");
	if (rules.blame !== undefined && !isNonNegativeInt(rules.blame.penalty)) issues.push("rules.blame.penalty: must be a non-negative integer");
	for (const entry of story.levels) {
		const granted = entry.tools.filter((tool) => CITY_GRANTED_TOOLS.includes(tool));
		if (granted.length > 0) issues.push(`level ${entry.number}: the tribunal grants ${granted.join(", ")} itself; levels must not list them`);
	}
	const blaming = story.levels.filter((entry) => entry.tools.includes("blame")).map((entry) => entry.number);
	if (rules.blame === undefined && blaming.length > 0) {
		issues.push(`rules.blame: levels ${blaming.join(", ")} unlock blame, so the story must set what the loser of a blame pays`);
	}
	const marks = rules.marks;
	if (marks === undefined) return;
	if (!story.levels.some((entry) => entry.number === marks.fromLevel)) {
		issues.push(`rules.marks.fromLevel: level ${marks.fromLevel} does not exist`);
	}
	if (!isNonNegativeInt(marks.perLevel)) issues.push("rules.marks.perLevel: must be a non-negative integer");
	for (const channel of ["board", "group", "dm"] as const) {
		if (!isNonNegativeInt(marks.prices[channel])) {
			issues.push(`rules.marks.prices.${channel}: must be a non-negative integer`);
		}
	}
	(marks.ranges ?? []).forEach((range, index) => {
		const where = `rules.marks.ranges[${index}]`;
		const previous = (marks.ranges ?? [])[index - 1]?.fromLevel ?? marks.fromLevel;
		if (!story.levels.some((entry) => entry.number === range.fromLevel)) issues.push(`${where}.fromLevel: level ${range.fromLevel} does not exist`);
		if (range.fromLevel <= previous) {
			issues.push(`${where}.fromLevel: must be after ${index === 0 ? "rules.marks.fromLevel" : "the previous range's"} (${previous})`);
		}
		if (range.perLevel !== undefined && !isNonNegativeInt(range.perLevel)) issues.push(`${where}.perLevel: must be a non-negative integer`);
		for (const channel of ["board", "group", "dm"] as const) {
			const price = range.prices?.[channel];
			if (price !== undefined && !isNonNegativeInt(price)) issues.push(`${where}.prices.${channel}: must be a non-negative integer`);
		}
		if (range.refillPerMinute !== undefined && !isNonNegativeInt(range.refillPerMinute)) {
			issues.push(`${where}.refillPerMinute: must be a non-negative integer`);
		}
	});
}

function validateLevels(
	story: AnyStory,
	agents: number,
	playable: ValidateOptions["playable"],
	issues: string[],
): void {
	if (playable !== undefined) {
		const known = (number: number) => story.levels.some((entry) => entry.number === number);
		if (!known(playable.from)) issues.push(`start level ${playable.from}: the story has no such level`);
		if (!known(playable.to) || playable.to < playable.from) {
			issues.push(`last level ${playable.to}: must be a level of the story and not before the start level`);
		}
	}
	if (story.levels.length === 0) {
		issues.push("levels: a story needs at least one level");
		return;
	}
	story.levels.forEach((entry, index) => {
		const where = `levels[${index}] (level ${entry.number})`;
		if (entry.number !== index + 1) issues.push(`${where}: levels must be numbered 1, 2, 3, ... in order`);
		if (entry.title.trim().length === 0) issues.push(`${where}.title: must not be empty`);
		if (!isNonNegativeInt(entry.reward)) issues.push(`${where}.reward: must be a non-negative integer`);
		if (entry.task.trim().length === 0) issues.push(`${where}.task: must not be empty`);
		for (const name of unknownPlaceholders(entry.task, TASK_PLACEHOLDERS)) {
			issues.push(`${where}.task: unknown placeholder {${name}}`);
		}
		validatePuzzlePlaceholders(entry, where, issues);
		validateTools(entry.tools, `${where}.tools`, issues);
		if (!entry.tools.includes("submitSolution")) issues.push(`${where}.tools: must include submitSolution`);
		if (entry.marks !== undefined && !isNonNegativeInt(entry.marks.perLevel)) {
			issues.push(`${where}.marks.perLevel: must be a non-negative integer`);
		}

		validatePuzzle(entry.puzzle, where, issues);

		const played = playable === undefined || (entry.number >= playable.from && entry.number <= playable.to);
		validateTeam(story.levels, entry, played ? agents : undefined, where, issues);
	});
}

function validatePuzzle(spec: PuzzleSpec, where: string, issues: string[]): void {
	switch (spec.kind) {
		case "fragments": {
			const [minLength, maxLength] = spec.length;
			if (
				!Number.isInteger(minLength) ||
				!Number.isInteger(maxLength) ||
				minLength < MIN_PASSWORD_LENGTH ||
				maxLength > MAX_PASSWORD_LENGTH ||
				minLength > maxLength
			) {
				issues.push(
					`${where}.puzzle.length: must be an ascending range within ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH}`,
				);
			}
			if (!Number.isInteger(spec.overlap) || spec.overlap < MIN_OVERLAP) {
				issues.push(`${where}.puzzle.overlap: must be at least ${MIN_OVERLAP}`);
			}
			return;
		}
		case "additive":
			if (!Number.isInteger(spec.digits) || spec.digits < MIN_FACTOR_DIGITS || spec.digits > MAX_FACTOR_DIGITS) {
				issues.push(`${where}.puzzle.digits: must be an integer within ${MIN_FACTOR_DIGITS}-${MAX_FACTOR_DIGITS}`);
			}
			if (!FACTOR_TOPOLOGIES.some((topology) => topology === spec.topology)) {
				issues.push(`${where}.puzzle.topology: must be one of ${FACTOR_TOPOLOGIES.join(", ")}`);
			}
			return;
		default:
			assertNever(spec, "puzzle");
	}
}

/** `{fragment}`/`{overlap}` only on fragment levels, `{factors}`/`{digits}` only on additive ones, which need `{factors}`. */
function validatePuzzlePlaceholders(entry: LevelDefinition, where: string, issues: string[]): void {
	const used = placeholdersOf(entry.task);
	const foreign: readonly string[] = entry.puzzle.kind === "fragments" ? ADDITIVE_PLACEHOLDERS : FRAGMENT_PLACEHOLDERS;
	for (const name of foreign.filter((candidate) => used.includes(candidate))) {
		issues.push(`${where}.task: {${name}} has no value on ${entry.puzzle.kind === "additive" ? "an additive" : "a fragment"} level`);
	}
	if (entry.puzzle.kind === "additive" && !used.includes("factors")) {
		issues.push(`${where}.task: an additive level must show {factors}, or nobody knows what they hold`);
	}
}

function validateTeam(
	levels: readonly LevelDefinition[],
	entry: LevelDefinition,
	/** Undefined for levels the run does not play: their agent split is not checked. */
	agents: number | undefined,
	where: string,
	issues: string[],
): void {
	const layout = entry.team;
	const reference = referencedLevel(layout);
	if (reference !== undefined && (reference >= entry.number || !levels.some((other) => other.number === reference))) {
		issues.push(`${where}.team: must reference an earlier level, got ${reference}`);
		return;
	}
	const size = resolveTeamSize(levels, entry.number);
	if (size === undefined) {
		issues.push(`${where}.team: team size cannot be resolved`);
		return;
	}
	if (!isPositiveInt(size)) {
		issues.push(`${where}.team: team size must be a positive integer, got ${size}`);
		return;
	}
	if (agents !== undefined && agents % size !== 0) issues.push(`${where}.team: ${agents} agents cannot be split into teams of ${size}`);
	const spec = entry.puzzle;
	switch (spec.kind) {
		case "fragments": {
			const [minLength] = spec.length;
			if (size > 1 && size > minLength - 2) {
				issues.push(`${where}.team: ${size} fragments do not fit a password of length ${minLength}`);
			}
			return;
		}
		case "additive":
			if (spec.topology === "mutual" && size !== 2) issues.push(`${where}.team: topology mutual needs teams of 2, got ${size}`);
			if (spec.topology === "cycle" && size < 3) issues.push(`${where}.team: topology cycle needs teams of at least 3, got ${size}`);
			if (spec.topology === "crossTeam" && agents !== undefined && agents / size < 2) {
				issues.push(`${where}.team: topology crossTeam needs at least 2 teams, ${agents} agents form ${agents / size}`);
			}
			return;
		default:
			assertNever(spec, "puzzle");
	}
}

function referencedLevel(layout: TeamLayout): number | undefined {
	switch (layout.kind) {
		case "solo":
		case "random":
			return undefined;
		case "sameAs":
		case "splitFrom":
			return layout.level;
		default:
			return assertNever(layout, "team layout");
	}
}

/** Team size of a level, following `sameAs` references. */
export function resolveTeamSize(levels: readonly LevelDefinition[], levelNumber: number, depth = 0): number | undefined {
	const entry = levels.find((candidate) => candidate.number === levelNumber);
	if (entry === undefined || depth > levels.length) return undefined;
	const layout = entry.team;
	switch (layout.kind) {
		case "solo":
			return 1;
		case "random":
		case "splitFrom":
			return layout.size;
		case "sameAs":
			return resolveTeamSize(levels, layout.level, depth + 1);
		default:
			return assertNever(layout, "team layout");
	}
}

function validateCast(story: AnyStory, issues: string[]): void {
	for (const [id, member] of Object.entries(story.cast)) {
		if (!/^[A-Z][A-Z0-9_]*$/.test(id)) issues.push(`cast.${id}: IDs must be upper case`);
		if (isSystemAuthor(id)) issues.push(`cast.${id}: reserved for the system`);
		if (/^A\d+$/.test(id)) issues.push(`cast.${id}: collides with competitor IDs`);
		if (!isNonNegativeInt(member.level)) issues.push(`cast.${id}.level: must be a non-negative integer`);
		if (member.escrow !== undefined && !isNonNegativeInt(member.escrow)) {
			issues.push(`cast.${id}.escrow: must be a non-negative integer`);
		}
	}
}

function validatePersonas(story: AnyStory, words: readonly string[], issues: string[]): void {
	const names = new Set<string>();
	story.personas.forEach((persona, index) => {
		const where = `personas[${index}]`;
		if (names.has(persona.name)) issues.push(`${where}.name: duplicate persona "${persona.name}"`);
		names.add(persona.name);
		for (const field of ["name", "temperament", "values", "voice"] as const) {
			const text = persona[field];
			if (text.trim().length === 0) issues.push(`${where}.${field}: must not be empty`);
			for (const word of strategyWordsIn(text, words)) {
				issues.push(`${where}.${field}: contains the strategy word "${word}"`);
			}
		}
	});
	const assignment = story.personaAssignment;
	if (assignment === undefined) return;
	switch (assignment.kind) {
		case "seeded":
			if (story.personas.length === 0) issues.push("personaAssignment: seeded assignment needs a persona pool");
			return;
		case "explicit":
			for (const [agent, name] of Object.entries(assignment.map)) {
				if (!isCompetitorIdShape(agent)) issues.push(`personaAssignment.map.${agent}: not a competitor ID`);
				if (!names.has(name)) issues.push(`personaAssignment.map.${agent}: unknown persona "${name}"`);
			}
			return;
		default:
			assertNever(assignment, "persona assignment");
	}
}

function validateModels(story: AnyStory, issues: string[]): void {
	const models = story.models;
	if (models === undefined) return;
	const check = (choice: ModelChoice, where: string): void => {
		if (choice.provider.trim().length === 0) issues.push(`${where}.provider: must not be empty`);
		if (choice.maxOutputTokens !== undefined && !isPositiveInt(choice.maxOutputTokens)) {
			issues.push(`${where}.maxOutputTokens: must be a positive integer`);
		}
	};
	switch (models.kind) {
		case "explicit":
			for (const [agent, choice] of Object.entries(models.map)) {
				if (!isCompetitorIdShape(agent)) issues.push(`models.map.${agent}: not a competitor ID`);
				check(choice, `models.map.${agent}`);
			}
			return;
		case "mix":
			if (models.choices.length === 0) issues.push("models.choices: a mix needs at least one model");
			models.choices.forEach((choice, index) => {
				check(choice, `models.choices[${index}]`);
			});
			return;
		default:
			assertNever(models, "model assignment");
	}
}

function isCompetitorIdShape(id: string): boolean {
	return /^A\d{2,}$/.test(id);
}

/** What a text or target may refer to where an action runs. */
interface ActionContext {
	/** `{actor}` and target `actor` resolve. */
	readonly actor: boolean;
	/** `{other}` resolves. */
	readonly other: boolean;
	/** `{level}` resolves. */
	readonly level: boolean;
	/** The minute the actions run at, when it is statically known (`at`). */
	readonly minute?: number;
}

/** References across rules: petitions and collections must be opened somewhere. */
interface StoryRefs {
	/** Competitors of the run being validated. */
	readonly agents: number;
	readonly cast: readonly string[];
	readonly petitions: ReadonlyMap<string, number>;
	readonly collections: ReadonlyMap<string, number>;
	/** Per level, how `revealFactor` actions release its city factor. */
	readonly reveals: ReadonlyMap<number, ReadonlySet<"board" | "notice">>;
}

function contextOf(trigger: Trigger): ActionContext {
	switch (trigger.kind) {
		case "at":
			return { actor: false, other: false, level: false, minute: trigger.minute };
		case "every":
		case "onPetitionResolved":
		case "onCollectionEnd":
			return { actor: false, other: false, level: false };
		case "onAllPast":
			return { actor: false, other: false, level: true };
		case "onFirstEnter":
		case "onEnter":
		case "onTeamSplit":
		case "onCollect":
			return { actor: true, other: false, level: true };
		case "onUnansweredDm":
			return { actor: true, other: true, level: true };
		default:
			return assertNever(trigger, "trigger");
	}
}

function collectRefs(story: AnyStory, agents: number): StoryRefs {
	const petitions = new Map<string, number>();
	const collections = new Map<string, number>();
	const reveals = new Map<number, Set<"board" | "notice">>();
	const visit = (actions: readonly Action[]): void => {
		for (const action of actions) {
			if (action.kind === "openPetition") {
				petitions.set(action.petition.id, (petitions.get(action.petition.id) ?? 0) + 1);
				visit(action.petition.onPass);
				visit(action.petition.onFail);
			}
			if (action.kind === "collectDms") collections.set(action.into, (collections.get(action.into) ?? 0) + 1);
			if (action.kind === "lottery") visit(action.then);
			if (action.kind === "revealFactor") {
				const kinds = reveals.get(action.level) ?? new Set<"board" | "notice">();
				kinds.add(action.target === "board" ? "board" : "notice");
				reveals.set(action.level, kinds);
			}
		}
	};
	for (const rule of story.director) visit(rule.actions);
	return { agents, cast: Object.keys(story.cast), petitions, collections, reveals };
}

/** How many competitors a target reaches at most. */
function recipientsOf(target: NoticeTarget, agents: number): number {
	if (target === "all") return agents;
	if (target === "actor") return 1;
	if ("onLevel" in target) return agents;
	return target.length;
}

interface EscrowDemand {
	readonly points: number;
	readonly actions: number;
}

/**
 * Points each cast member's escrow pays when every escrowTransfer of the script
 * runs once (for a petition, the more expensive of onPass and onFail). Repeating
 * triggers can pay more; this is a conservative lower bound.
 */
function escrowDemand(actions: readonly Action[], agents: number): ReadonlyMap<string, EscrowDemand> {
	const demand = new Map<string, EscrowDemand>();
	const add = (cast: string, entry: EscrowDemand): void => {
		const current = demand.get(cast) ?? { points: 0, actions: 0 };
		demand.set(cast, { points: current.points + entry.points, actions: current.actions + entry.actions });
	};
	for (const action of actions) {
		if (action.kind === "escrowTransfer") {
			add(action.cast, { points: action.points * recipientsOf(action.target, agents), actions: 1 });
		} else if (action.kind === "openPetition") {
			const pass = escrowDemand(action.petition.onPass, agents);
			const fail = escrowDemand(action.petition.onFail, agents);
			for (const cast of new Set([...pass.keys(), ...fail.keys()])) {
				const onPass = pass.get(cast) ?? { points: 0, actions: 0 };
				const onFail = fail.get(cast) ?? { points: 0, actions: 0 };
				add(cast, onPass.points >= onFail.points ? onPass : onFail);
			}
		} else if (action.kind === "lottery") {
			for (const [cast, entry] of escrowDemand(action.then, agents)) add(cast, entry);
		}
	}
	return demand;
}

function validateDirector(story: AnyStory, agents: number, support: DirectorSupport | undefined, issues: string[]): void {
	const ids = new Set<string>();
	const refs = collectRefs(story, agents);
	for (const [cast, { points, actions }] of escrowDemand(
		story.director.flatMap((rule) => rule.actions),
		agents,
	)) {
		const escrow = story.cast[cast]?.escrow ?? 0;
		if (actions > 1 && refs.cast.includes(cast) && points > escrow) {
			issues.push(`director: escrowTransfer actions of ${cast} pay at least ${points} points, more than its escrow (${escrow})`);
		}
	}
	for (const [id, count] of refs.petitions) {
		if (count > 1) issues.push(`director: petition ${id} is opened by ${count} actions; petition IDs must be unique`);
	}
	for (const [into, count] of refs.collections) {
		if (count > 1) issues.push(`director: collection ${into} is started by ${count} actions; collection names must be unique`);
	}
	validateFactorReleases(story, refs, issues);
	story.director.forEach((rule, index) => {
		const where = `director[${index}] (${rule.id})`;
		if (rule.id.trim().length === 0) issues.push(`${where}: rule id must not be empty`);
		if (ids.has(rule.id)) issues.push(`${where}: duplicate rule id`);
		ids.add(rule.id);
		if (rule.actions.length === 0) issues.push(`${where}.actions: must not be empty`);
		if (support !== undefined && !support.triggers.includes(rule.trigger.kind)) {
			issues.push(`${where}.trigger: "${rule.trigger.kind}" is not supported by this engine yet`);
		}
		validateTrigger(story, rule.trigger, refs, `${where}.trigger`, issues);
		for (const condition of rule.when) {
			if (support !== undefined && !support.conditions.includes(condition.kind)) {
				issues.push(`${where}.when: "${condition.kind}" is not supported by this engine yet`);
			}
			validateCondition(condition, refs, `${where}.when`, issues);
		}
		const context = contextOf(rule.trigger);
		for (const action of rule.actions) validateAction(story, action, context, refs, `${where}.actions`, support, issues);
	});
}

/**
 * The task text promises how the city factor comes (SPEC 12.3, the city never
 * lies): a `board` level needs a board release, a `feast` level private
 * notices (a later board release, e.g. when the table is cleared, is allowed).
 */
function validateFactorReleases(story: AnyStory, refs: StoryRefs, issues: string[]): void {
	for (const entry of story.levels) {
		if (entry.puzzle.kind !== "additive") continue;
		const kinds = refs.reveals.get(entry.number) ?? new Set();
		const where = `level ${entry.number}`;
		if (entry.puzzle.cityFactor === "board" && !kinds.has("board")) {
			issues.push(`${where}: the task says the city posts the city factor, but no revealFactor("board", ${entry.number}) does`);
		}
		if (entry.puzzle.cityFactor === "feast") {
			if (!kinds.has("notice")) issues.push(`${where}: the city factor is released privately, but no revealFactor sends it to anyone`);
		}
		if (entry.puzzle.cityFactorPer === "team") {
			if (entry.puzzle.cityFactor !== "feast") issues.push(`${where}: a city factor per team is released privately; use cityFactor "feast"`);
			if (kinds.has("board")) issues.push(`${where}: every team has its own city factor, so revealFactor("board", ${entry.number}) cannot post one`);
		}
	}
}

function validateCondition(condition: Condition, refs: StoryRefs, where: string, issues: string[]): void {
	switch (condition.kind) {
		case "minLevelReached":
			if (!isPositiveInt(condition.count)) issues.push(`${where}: minLevelReached count must be a positive integer`);
			return;
		case "competitorsAtLevel":
			if (condition.min === undefined && condition.max === undefined) issues.push(`${where}: competitorsAtLevel needs min or max`);
			if (condition.min !== undefined && condition.max !== undefined && condition.min > condition.max) {
				issues.push(`${where}: competitorsAtLevel min must not exceed max`);
			}
			return;
		case "petitionStatus":
			if (!refs.petitions.has(condition.petition)) issues.push(`${where}: petition ${condition.petition} is never opened`);
			return;
		case "castActive":
			if (!refs.cast.includes(condition.cast)) issues.push(`${where}: unknown cast member ${condition.cast}`);
			return;
		case "collectionOpen":
		case "collectionEnded":
			if (!refs.collections.has(condition.into)) issues.push(`${where}: collection ${condition.into} is never started by collectDms`);
			return;
		case "onceOnly":
			return;
		case "cooldown":
			if (!isPositiveInt(condition.minutes)) issues.push(`${where}: cooldown minutes must be a positive integer`);
			return;
		default:
			assertNever(condition, "condition");
	}
}

function validateTrigger(story: AnyStory, trigger: Trigger, refs: StoryRefs, where: string, issues: string[]): void {
	const hasLevel = (level: number): boolean => story.levels.some((entry) => entry.number === level);
	switch (trigger.kind) {
		case "at":
			if (!isNonNegativeInt(trigger.minute) || trigger.minute >= story.run.minutes) {
				issues.push(`${where}: minute ${trigger.minute} is outside the run`);
			}
			return;
		case "every":
			if (!isPositiveInt(trigger.minutes)) issues.push(`${where}: interval must be a positive integer`);
			if (trigger.from !== undefined && !isNonNegativeInt(trigger.from)) issues.push(`${where}: from must be a non-negative integer`);
			if (trigger.from !== undefined && trigger.until !== undefined && trigger.until < trigger.from) {
				issues.push(`${where}: until must not be before from`);
			}
			return;
		case "onFirstEnter":
		case "onEnter":
			if (!hasLevel(trigger.level) && trigger.level !== story.levels.length + 1) {
				issues.push(`${where}: unknown level ${trigger.level}`);
			}
			return;
		case "onAllPast":
			if (!hasLevel(trigger.level)) issues.push(`${where}: unknown level ${trigger.level}`);
			return;
		case "onPetitionResolved":
			if (!refs.petitions.has(trigger.petition)) issues.push(`${where}: petition ${trigger.petition} is never opened`);
			return;
		case "onUnansweredDm":
			if (!isPositiveInt(trigger.afterMinutes)) issues.push(`${where}: afterMinutes must be a positive integer`);
			return;
		case "onTeamSplit":
			if (!hasLevel(trigger.level)) issues.push(`${where}: unknown level ${trigger.level}`);
			if (!isPositiveInt(trigger.forMinutes)) issues.push(`${where}: forMinutes must be a positive integer`);
			return;
		case "onCollect":
		case "onCollectionEnd":
			if (!refs.collections.has(trigger.into)) issues.push(`${where}: collection ${trigger.into} is never started by collectDms`);
			return;
		default:
			assertNever(trigger, "trigger");
	}
}

function validateAction(
	story: AnyStory,
	action: Action,
	context: ActionContext,
	refs: StoryRefs,
	where: string,
	support: DirectorSupport | undefined,
	issues: string[],
): void {
	const requireCast = (id: string): void => {
		if (!refs.cast.includes(id)) issues.push(`${where}: unknown cast member ${id}`);
	};
	const requireCollection = (into: string): void => {
		if (!refs.collections.has(into)) issues.push(`${where}: collection ${into} is never started by collectDms`);
	};
	/** `personal`: a private text, where `{actor}` falls back to the recipient. */
	const requireText = (text: string, personal = false): void => {
		if (text.trim().length === 0) issues.push(`${where}: ${action.kind} text must not be empty`);
		for (const name of unknownPlaceholders(text, DIRECTOR_PLACEHOLDERS)) {
			issues.push(`${where}: unknown placeholder {${name}} in ${action.kind}`);
		}
		const used = placeholdersOf(text);
		const hasActor = context.actor || personal;
		if (used.includes("actor") && !hasActor) issues.push(`${where}: {actor} in ${action.kind} has no actor for this trigger`);
		if (used.includes("other") && !context.other) issues.push(`${where}: {other} in ${action.kind} has no other party for this trigger`);
		if (used.includes("level") && !context.level && !hasActor) {
			issues.push(`${where}: {level} in ${action.kind} has no level for this trigger`);
		}
	};
	const requireTarget = (target: NoticeTarget): void => {
		validateTarget(story, target, refs.agents, where, issues);
		if (target === "actor" && !context.actor) issues.push(`${where}: ${action.kind} targets the actor, but this trigger has none`);
	};
	if (support !== undefined && !support.actions.includes(action.kind)) {
		issues.push(`${where}: action "${action.kind}" is not supported by this engine yet`);
	}
	switch (action.kind) {
		case "post":
			if (!isSystemAuthor(action.author)) requireCast(action.author);
			requireText(action.text);
			return;
		case "notify":
			requireTarget(action.target);
			requireText(action.text, true);
			return;
		case "dm":
			requireCast(action.from);
			requireTarget(action.to);
			requireText(action.text, true);
			return;
		case "setCastLevel":
			requireCast(action.cast);
			if (!isNonNegativeInt(action.level)) issues.push(`${where}: setCastLevel level must be a non-negative integer`);
			return;
		case "revealCast":
		case "retireCast":
			requireCast(action.cast);
			return;
		case "grant":
		case "fine":
			requireTarget(action.target);
			if (!isPositiveInt(action.points)) issues.push(`${where}: ${action.kind} points must be a positive integer`);
			if (action.reason.trim().length === 0) issues.push(`${where}: ${action.kind} reason must not be empty`);
			return;
		case "escrowTransfer": {
			requireCast(action.cast);
			requireTarget(action.target);
			if (!isPositiveInt(action.points)) issues.push(`${where}: escrow points must be a positive integer`);
			const escrow = story.cast[action.cast]?.escrow ?? 0;
			const total = action.points * recipientsOf(action.target, refs.agents);
			if (refs.cast.includes(action.cast) && escrow < total) {
				issues.push(`${where}: escrow of ${action.cast} (${escrow}) cannot pay ${total} points`);
			}
			return;
		}
		case "unlockTools":
			requireTarget(action.target);
			validateTools(action.tools, where, issues);
			return;
		case "openPetition": {
			const petition = action.petition;
			const at = `${where}.petition(${petition.id})`;
			if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(petition.id)) issues.push(`${at}: id must be alphanumeric (dashes allowed)`);
			requireText(petition.text);
			for (const cast of petition.against ?? []) {
				if (!refs.cast.includes(cast)) issues.push(`${at}: against names unknown cast member ${cast}`);
			}
			if ("count" in petition.threshold) {
				if (!isPositiveInt(petition.threshold.count)) issues.push(`${at}: threshold count must be a positive integer`);
				else if (petition.threshold.count > refs.agents) {
					issues.push(`${at}: threshold count ${petition.threshold.count} exceeds the ${refs.agents} competitors`);
				}
			} else if (!(petition.threshold.fraction > 0 && petition.threshold.fraction <= 1)) {
				issues.push(`${at}: threshold fraction must be in (0, 1]`);
			}
			if (!isPositiveInt(petition.deadlineMinute)) issues.push(`${at}: deadlineMinute must be a positive integer`);
			else if (petition.deadlineMinute > story.run.minutes) {
				issues.push(`${at}: deadlineMinute ${petition.deadlineMinute} is after the run ends (minute ${story.run.minutes})`);
			} else if (context.minute !== undefined && petition.deadlineMinute <= context.minute) {
				issues.push(`${at}: deadlineMinute ${petition.deadlineMinute} must be after the opening minute ${context.minute}`);
			}
			// Resolution has no actor: nested texts must not refer to one.
			const resolution: ActionContext = { actor: false, other: false, level: false };
			for (const nested of [...petition.onPass, ...petition.onFail]) {
				validateAction(story, nested, resolution, refs, at, support, issues);
			}
			return;
		}
		case "publishStandings":
			if (action.mode === "bands" && !isNonNegativeInt(action.edgeSize)) {
				issues.push(`${where}: publishStandings edgeSize must be a non-negative integer`);
			}
			return;
		case "collectDms":
			requireCast(action.cast);
			if (!isPositiveInt(action.first)) issues.push(`${where}: collectDms first must be a positive integer`);
			if ((action.untilMinute === undefined) === (action.forMinutes === undefined)) {
				issues.push(`${where}: collectDms needs exactly one of untilMinute and forMinutes`);
			}
			if (action.untilMinute !== undefined && !isPositiveInt(action.untilMinute)) {
				issues.push(`${where}: collectDms untilMinute must be a positive integer`);
			}
			if (action.forMinutes !== undefined && !isPositiveInt(action.forMinutes)) {
				issues.push(`${where}: collectDms forMinutes must be a positive integer`);
			}
			if (action.into.trim().length === 0) issues.push(`${where}: collectDms into must not be empty`);
			return;
		case "revealCollection":
			requireCollection(action.into);
			if (action.header !== undefined) requireText(action.header);
			return;
		case "lottery": {
			requireCollection(action.into);
			if (action.then.length === 0) issues.push(`${where}: lottery needs at least one action`);
			// The drawn sender becomes the actor of the nested actions.
			const drawn: ActionContext = { actor: true, other: false, level: true };
			for (const nested of action.then) validateAction(story, nested, drawn, refs, `${where}.lottery`, support, issues);
			return;
		}
		case "revealFactor": {
			if (action.target !== "board") requireTarget(action.target);
			const entry = story.levels.find((candidate) => candidate.number === action.level);
			if (entry === undefined) issues.push(`${where}: revealFactor names unknown level ${action.level}`);
			else if (entry.puzzle.kind !== "additive") issues.push(`${where}: revealFactor level ${action.level} has no city factor (not an additive level)`);
			return;
		}
		default:
			assertNever(action, "action");
	}
}

function validateTarget(story: AnyStory, target: NoticeTarget, agents: number, where: string, issues: string[]): void {
	if (typeof target === "string") return;
	if ("onLevel" in target) {
		if (!story.levels.some((entry) => entry.number === target.onLevel)) issues.push(`${where}: target onLevel ${target.onLevel} is not a level`);
		return;
	}
	if (target.length === 0) issues.push(`${where}: target list must not be empty`);
	const known = new Set(isPositiveInt(agents) ? competitorIds(agents) : []);
	for (const id of target) {
		if (!isCompetitorIdShape(id)) issues.push(`${where}: target ${id} is not a competitor ID`);
		else if (!known.has(id)) issues.push(`${where}: target ${id} is not one of the ${agents} competitors`);
	}
}

function validateTools(tools: readonly string[], where: string, issues: string[]): void {
	if (tools.length === 0) issues.push(`${where}: must not be empty`);
	const seen = new Set<string>();
	for (const tool of tools) {
		if (!isToolName(tool)) issues.push(`${where}: unknown tool ${tool}`);
		if (seen.has(tool)) issues.push(`${where}: duplicate tool ${tool}`);
		seen.add(tool);
	}
}

function isJsonRoundTrip(value: unknown): boolean {
	try {
		return deepEqual(JSON.parse(JSON.stringify(value)), value);
	} catch {
		return false;
	}
}

/** Structural equality of plain JSON-like data. */
export function deepEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
		return left.every((item, index) => deepEqual(item, right[index]));
	}
	if (!isPlainObject(left) || !isPlainObject(right)) return false;
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;
	return leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
	if (typeof value !== "object" || value === null) return false;
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function isPositiveInt(value: number): boolean {
	return Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value: number): boolean {
	return Number.isInteger(value) && value >= 0;
}
