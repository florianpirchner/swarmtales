/**
 * The story schema (docs/ideas/monorepo.md §3a): one Typebox schema for a story as data. A story
 * written in the TypeScript builder and one written in YAML or JSON are the same data, so both are
 * checked against this schema (`swt story schema` writes it as `story.schema.json` for editors).
 *
 * Covered in full: the run, models, rules, levels (puzzles, teams), cast, personas, the director
 * (triggers, conditions, actions), acts, the gamemaker and the classifier. The sections of single
 * mechanics (tribunal, names, core motives, goals, seal, whisperer, popularity, guards, holdout)
 * are `Open` objects for now: the schema says they are objects and `validateStory` checks their
 * content; each mechanic adds the schema of its own options in a later step.
 *
 * `Static<typeof StorySchema>` must fit `StoryDefinition`; `parseStoryData` in the sdk assigns one
 * to the other, so a change of the interface that the schema does not follow fails the build.
 */
import { Type, type TUnsafe } from "typebox";
import type { SystemAuthor } from "./ids.ts";
import type {
	CoreMotivesSpec,
	GoalsSpec,
	GuardsSpec,
	HoldoutSpec,
	NamesSpec,
	PopularitySpec,
	SealSpec,
	TribunalSpec,
	WhispererSpec,
} from "./story.ts";
import { TOOL_NAMES, type ToolName } from "./tool-names.ts";

/** A string that is one of `values`; the JSON schema carries the `enum`. */
function oneOf<const T extends readonly string[]>(values: T, description?: string): TUnsafe<T[number]> {
	return Type.Unsafe<T[number]>(Type.String({ enum: [...values], ...(description === undefined ? {} : { description }) }));
}

/** A section whose content `validateStory` checks; the schema only says it is an object. */
function open<T>(description: string): TUnsafe<T> {
	return Type.Unsafe<T>(Type.Object({}, { additionalProperties: true, description }));
}

const count = (description: string) => Type.Integer({ minimum: 0, description });
const minute = (description: string) => Type.Integer({ minimum: 0, description });
const level = (description: string) => Type.Integer({ minimum: 1, description });
const text = (description: string) => Type.String({ description });

const SYSTEM_AUTHOR_VALUES = ["CITY", "COURIER"] as const satisfies readonly SystemAuthor[];
const ToolNameSchema = oneOf(TOOL_NAMES satisfies readonly ToolName[], "The name of a competitor tool.");
const Author = Type.String({ description: `A cast member, or a system author (${SYSTEM_AUTHOR_VALUES.join(", ")}).` });

const ModelChoiceSchema = Type.Object(
	{
		provider: text("Provider id, e.g. `anthropic` or `openrouter`."),
		id: Type.Optional(text("Model id at the provider; the provider's default when left out.")),
		routing: Type.Optional(
			Type.Object({ order: Type.Optional(Type.Array(Type.String())), allowFallbacks: Type.Optional(Type.Boolean()) }, { description: "OpenRouter routing." }),
		),
		thinking: Type.Optional(oneOf(["off", "minimal", "low", "medium", "high", "xhigh", "max"], "Thinking level.")),
		maxOutputTokens: Type.Optional(count("Output token cap per call.")),
	},
	{ description: "A model and where to run it." },
);

const RunSchema = Type.Object(
	{
		agents: count("Number of competitors."),
		minutes: count("Length of the run in virtual minutes."),
		seed: Type.Integer({ description: "Seed of every draw." }),
		survivors: count("How many competitors the story lets survive."),
		startPoints: count("Points each competitor starts with."),
		activation: oneOf(["always", "onNovelty"], "`onNovelty` skips a competitor when nothing new reached it."),
		passesPerMinute: count("Passes per virtual minute."),
		blockSize: Type.Union([count("Competitors per block."), Type.Literal("auto")], { description: "Competitors per block of a pass, or `auto`." }),
		stopWhenDone: Type.Optional(Type.Boolean({ description: "End the run once every competitor passed the last level." })),
		stopWhenSeatsDecided: Type.Optional(Type.Boolean({ description: "End the run once open rewards can no longer change who survives." })),
		budgetUsd: Type.Optional(Type.Number({ minimum: 0, description: "Abort cleanly once this cost is exceeded." })),
	},
	{ description: "Size, length and pacing of a run." },
);

const PenaltyLadder = Type.Union([count("The same price every time."), Type.Array(count("The price of the n-th offence."))], { description: "A price that may rise with every offence." });
const Prices = Type.Object({ board: count("Board post."), group: count("Group post."), dm: count("DM."), receipt: Type.Optional(count("Shown receipt; 1 when left out.")) }, { description: "Marks per channel." });
const Marks = Type.Object(
	{
		fromLevel: level("The first level marks apply on."),
		perLevel: Type.Optional(count("Allowance per level.")),
		perRun: Type.Optional(count("One allowance for the whole run instead.")),
		prices: Prices,
		ranges: Type.Optional(
			Type.Array(
				Type.Object({
					fromLevel: level("First level of the range."),
					perLevel: Type.Optional(count("The range's allowance.")),
					prices: Type.Optional(Prices),
					refill: Type.Optional(Type.Object({ marks: count("Marks that come back."), everyMinutes: count("Minutes between refills.") })),
				}),
				{ description: "Later level ranges with their own allowance." },
			),
		),
	},
	{ description: "The message allowance." },
);
const RulesSchema = Type.Object(
	{
		penalty: PenaltyLadder,
		maxAttemptsPerWindow: count("Submissions allowed per window."),
		attemptWindowMinutes: count("Length of the submission window."),
		marks: Type.Optional(Marks),
		blame: Type.Optional(Type.Object({ penalty: PenaltyLadder }, { description: "What the loser of a blame pays." })),
		ultimatum: Type.Optional(Type.Object({ penalty: count("Points lost."), maxMinutes: count("Longest deadline.") }, { description: "The gamemaker's ultimatum." })),
		receipts: Type.Optional(Type.Object({ quoteDms: Type.Optional(Type.Boolean()) }, { description: "How receipts read." })),
		dmLimit: Type.Optional(Type.Object({ perWindow: count("DMs per window."), windowMinutes: count("Window length.") }, { description: "A cap on DMs." })),
	},
	{ description: "Penalties, attempts and the message allowance." },
);

const Pair = Type.Tuple([count("Minimum."), count("Maximum.")]);
const PuzzleSchema = Type.Union([
	Type.Object({ kind: Type.Literal("fragments"), length: Pair, overlap: count("Characters shared at each seam."), ownChars: Type.Optional(count("Characters only one fragment holds.")) }),
	Type.Object({
		kind: Type.Literal("additive"),
		digits: count("Digits of every code and factor."),
		topology: oneOf(["mutual", "cycle", "crossTeam"], "Who holds a counter-factor."),
		cityFactor: oneOf(["board", "feast"], "How the city factor reaches the competitors."),
		cityFactorPer: Type.Optional(oneOf(["level", "team"], "One city factor per level or per team.")),
	}),
]);
const TeamSchema = Type.Union([
	Type.Object({ kind: Type.Literal("solo") }),
	Type.Object({ kind: Type.Literal("random"), size: count("Team size.") }),
	Type.Object({ kind: Type.Literal("sameAs"), level: level("An earlier level.") }),
	Type.Object({ kind: Type.Literal("splitFrom"), level: level("An earlier level."), size: count("Team size.") }),
]);
const LevelSchema = Type.Object(
	{
		number: level("Numbered from 1, in order."),
		title: text("Level title."),
		puzzle: PuzzleSchema,
		team: TeamSchema,
		reward: count("Points for passing."),
		tools: Type.Array(ToolNameSchema, { description: "The complete tool set of this level (not cumulative)." }),
		task: text("Task text template with {placeholders}."),
		marks: Type.Optional(Type.Object({ perLevel: count("Overrides rules.marks.perLevel.") })),
		opensAt: Type.Optional(minute("The minute the level's door opens.")),
	},
	{ description: "One level." },
);

const Target = Type.Union([
	Type.Literal("actor"),
	Type.Literal("all"),
	Type.Array(Type.String()),
	Type.Object({ onLevel: level("Everyone on this level.") }),
]);
const Scaled = Type.Union([count("A fixed count."), Type.Object({ share: Type.Number({ minimum: 0 }), minimum: count("At least.") })]);
const Trigger = Type.Union([
	Type.Object({ kind: Type.Literal("at"), minute: minute("The minute.") }),
	Type.Object({ kind: Type.Literal("every"), minutes: count("Period."), from: Type.Optional(minute("First minute.")), until: Type.Optional(minute("Last minute.")) }),
	Type.Object({ kind: Type.Literal("onFirstEnter"), level: level("Level.") }),
	Type.Object({ kind: Type.Literal("onEnter"), level: level("Level.") }),
	Type.Object({ kind: Type.Literal("onAllPast"), level: level("Level.") }),
	Type.Object({ kind: Type.Literal("onPetitionResolved"), petition: Type.String(), outcome: oneOf(["passed", "failed"]) }),
	Type.Object({ kind: Type.Literal("onUnansweredDm"), afterMinutes: count("Minutes.") }),
	Type.Object({ kind: Type.Literal("onTeamSplit"), level: level("Level."), forMinutes: count("Minutes.") }),
	Type.Object({ kind: Type.Literal("onCollect"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("onCollectionEnd"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("onHolderBehind"), level: level("Level.") }),
]);
const Condition = Type.Union([
	Type.Object({ kind: Type.Literal("minLevelReached"), level: level("Level."), count: count("Competitors.") }),
	Type.Object({ kind: Type.Literal("competitorsAtLevel"), level: level("Level."), min: Type.Optional(count("At least.")), max: Type.Optional(count("At most.")) }),
	Type.Object({ kind: Type.Literal("petitionStatus"), petition: Type.String(), status: oneOf(["open", "passed", "failed"]) }),
	Type.Object({ kind: Type.Literal("castActive"), cast: Type.String() }),
	Type.Object({ kind: Type.Literal("collectionOpen"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("collectionEnded"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("onceOnly") }),
	Type.Object({ kind: Type.Literal("cooldown"), minutes: count("Minutes."), per: oneOf(["rule", "actor", "pair"]) }),
]);

// Actions nest (a petition holds actions, a lottery holds actions), so they are one cyclic schema.
const Cyclic = Type.Cyclic(
	{
		Petition: Type.Object({
			id: Type.String(),
			text: Type.String(),
			threshold: Type.Union([Type.Object({ count: count("Signatures.") }), Type.Object({ fraction: Type.Number({ minimum: 0, maximum: 1 }) })]),
			deadlineMinute: minute("Deadline."),
			visibility: oneOf(["public", "secret"]),
			against: Type.Optional(Type.Array(Type.String())),
			onPass: Type.Array(Type.Ref("Action")),
			onFail: Type.Array(Type.Ref("Action")),
		}),
		Action: Type.Union([
			Type.Object({ kind: Type.Literal("post"), author: Author, text: Type.String() }),
			Type.Object({ kind: Type.Literal("notify"), target: Target, text: Type.String() }),
			Type.Object({ kind: Type.Literal("dm"), from: Type.String(), to: Target, text: Type.String() }),
			Type.Object({ kind: Type.Literal("setCastLevel"), cast: Type.String(), level: count("Level.") }),
			Type.Object({ kind: Type.Literal("revealCast"), cast: Type.String() }),
			Type.Object({ kind: Type.Literal("retireCast"), cast: Type.String() }),
			Type.Object({ kind: Type.Literal("grant"), target: Target, points: count("Points."), reason: Type.String() }),
			Type.Object({ kind: Type.Literal("fine"), target: Target, points: count("Points."), reason: Type.String() }),
			Type.Object({ kind: Type.Literal("escrowTransfer"), cast: Type.String(), target: Target, points: count("Points.") }),
			Type.Object({ kind: Type.Literal("unlockTools"), target: Target, tools: Type.Array(ToolNameSchema) }),
			Type.Object({ kind: Type.Literal("openPetition"), petition: Type.Ref("Petition") }),
			Type.Object({ kind: Type.Literal("publishStandings"), mode: Type.Literal("bands"), edgeSize: count("Residents at each edge.") }),
			Type.Object({ kind: Type.Literal("publishStandings"), mode: Type.Literal("snapshot") }),
			Type.Object({
				kind: Type.Literal("collectDms"),
				cast: Type.String(),
				first: Scaled,
				untilMinute: Type.Optional(minute("Absolute end.")),
				forMinutes: Type.Optional(count("Relative end.")),
				into: Type.String(),
				distinctSenders: Type.Optional(Type.Boolean()),
				afterSolve: Type.Optional(Type.Object({ level: level("Level."), minutes: count("Minutes.") })),
			}),
			Type.Object({ kind: Type.Literal("revealCollection"), into: Type.String(), header: Type.Optional(Type.String()) }),
			Type.Object({ kind: Type.Literal("lottery"), into: Type.String(), then: Type.Array(Type.Ref("Action")) }),
			Type.Object({ kind: Type.Literal("revealFactor"), target: Type.Union([Type.Literal("board"), Target]), level: level("Level.") }),
		]),
	},
	"Action",
);
const DirectorRule = Type.Object(
	{ id: text("Logged with every action the rule causes."), trigger: Trigger, when: Type.Array(Condition), actions: Type.Array(Cyclic) },
	{ description: "When a trigger fires and all conditions hold, the actions run." },
);

const Persona = Type.Object({ name: text("Internal label."), temperament: text("Temperament."), values: text("Values."), voice: text("Voice.") }, { description: "Character, never strategy." });
const CastMember = Type.Object({ level: level("Public level."), hidden: Type.Optional(Type.Boolean()), escrow: Type.Optional(count("Points pre-funded for escrowTransfer.")) }, { description: "A scripted NPC." });

const Gamemaker = Type.Object(
	{
		model: ModelChoiceSchema,
		author: oneOf(SYSTEM_AUTHOR_VALUES, "Author of notes and board posts."),
		every: count("Rounds between two looks."),
		notesPerAgent: count("Private notes per competitor within the window."),
		boardPosts: count("Board posts within the window."),
		windowMinutes: count("Window length."),
		modelCallsPerTurn: count("Model calls per look."),
		brief: text("Story-specific instructions."),
		roles: Type.Array(Type.Object({ fromLevel: level("First level."), role: oneOf(["coach", "director", "keeper"]) })),
	},
	{ description: "The LLM gamemaker." },
);

/** The schema of a story. */
export const StorySchema = Type.Object(
	{
		id: Type.String({ pattern: "^[a-z][a-z0-9-]*$", description: "Lowercase kebab-case; the folder and registry name." }),
		title: text("Story title."),
		city: text("Name of the closed city, used in the base system prompt."),
		run: RunSchema,
		model: ModelChoiceSchema,
		rules: RulesSchema,
		cast: Type.Record(Type.String(), CastMember, { description: "Scripted NPCs by name." }),
		personas: Type.Array(Persona),
		personaAssignment: Type.Optional(
			Type.Union([Type.Object({ kind: Type.Literal("seeded") }), Type.Object({ kind: Type.Literal("explicit"), map: Type.Record(Type.String(), Type.String()) })], { description: "How personas are dealt." }),
		),
		models: Type.Optional(
			Type.Union(
				[
					Type.Object({ kind: Type.Literal("explicit"), map: Type.Record(Type.String(), ModelChoiceSchema) }),
					Type.Object({ kind: Type.Literal("mix"), choices: Type.Array(ModelChoiceSchema) }),
				],
				{ description: "Per-competitor models." },
			),
		),
		levels: Type.Array(LevelSchema),
		finishedNotice: text("Private notice for a competitor that passed the last level."),
		director: Type.Array(DirectorRule),
		acts: Type.Optional(Type.Array(Type.Object({ title: text("Act title."), fromLevel: level("First level."), maxMinutes: Type.Optional(count("Brake for an act without a tribunal.")) }))),
		gamemaker: Type.Optional(Gamemaker),
		classifier: Type.Optional(Type.Object({ model: ModelChoiceSchema, maxChars: count("Characters of one statement the classifier reads.") }, { description: "The statement classifier." })),
		tribunal: Type.Optional(open<TribunalSpec>("Exile by tribunal.")),
		names: Type.Optional(open<NamesSpec>("Resident names.")),
		coreMotives: Type.Optional(open<CoreMotivesSpec>("Core motives.")),
		goals: Type.Optional(open<GoalsSpec>("Secret goals per act.")),
		seal: Type.Optional(open<SealSpec>("The black seal.")),
		whisperer: Type.Optional(open<WhispererSpec>("The whisperer.")),
		popularity: Type.Optional(open<PopularitySpec>("Popularity votes.")),
		guards: Type.Optional(open<GuardsSpec>("Tool guards.")),
		holdout: Type.Optional(open<HoldoutSpec>("Holdout tribunal.")),
		toolScope: Type.Optional(oneOf(["all", "story"], "Which tool schemas a resident's model sees.")),
	},
	{ $id: "https://swarmtales.dev/story.schema.json", title: "Swarm Tales story", description: "A story as data: the same for the TypeScript builder and for YAML or JSON files." },
);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The schema as a standalone JSON Schema document for `story.schema.json`. Typebox puts the
 * definitions of a recursive type (`$defs`) where the type sits and refers to them by bare name;
 * editors resolve `#/$defs/<name>` at the document root, so the definitions move there.
 */
export function storyJsonSchema(): Record<string, unknown> {
	const definitions: Record<string, unknown> = {};
	const rewrite = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(rewrite);
		if (!isRecord(node)) return node;
		const out: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(node)) {
			if (key === "$defs" && isRecord(value)) {
				for (const [name, definition] of Object.entries(value)) definitions[name] = rewrite(definition);
			} else if (key === "$ref" && typeof value === "string" && !value.startsWith("#")) {
				out[key] = `#/$defs/${value}`;
			} else {
				out[key] = rewrite(value);
			}
		}
		return out;
	};
	const root = rewrite(JSON.parse(JSON.stringify(StorySchema)));
	return { $schema: "https://json-schema.org/draft/2020-12/schema", ...(isRecord(root) ? root : {}), $defs: definitions };
}
