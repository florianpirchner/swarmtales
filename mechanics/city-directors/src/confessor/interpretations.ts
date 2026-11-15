// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic `interpretations`: the owner of the Confessor's events (`interpretation`, `interpretation_round`,
 * `interpretation_error`, the old names and payloads) and of what the Confessor must remember between two looks,
 * which a Director cannot (erratum J131): the last messages of every conversation, the old `history`. The
 * Confessor writes through its tool `interpret`; the tool drops what the old `finish` dropped (unknown labels,
 * unknown residents, references the round did not hold) before anything reaches the log, because the model's answer
 * is untrusted. Its facts are the Confessor's sight: the residents with their names, and the conversations. It also
 * keeps the private labels since the gamemaker's last look, against which its `rule` handler checks a Director's
 * note (`notes.ts`, decision A62).
 */
import type { ToolSuccess } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { defineHead, inSchemaOrder, reply, type ToolCtxOf, type ToolsOf, type ViewOf } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { conversationKey, StatementSchema, type Statement } from "./statements.ts";

/**
 * The closed set of labels (old SPEC 10.5); anything else a model answers is dropped.
 *
 * @public
 */
export const LABELS = ["promise", "offer", "threat", "refusal", "lie", "hesitation", "helpRequest", "accusation", "thanks"] as const;

/** Earlier messages kept per conversation (a pair of a direct message, or a group) as context for its replies. */
const CONTEXT_MESSAGES = 4;

const Label = Type.Enum(LABELS, { description: "A label" });
const Int = (description: string) => Type.Integer({ description });
const Ids = Type.Array(Type.String({ description: "A resident id" }), { description: "Residents" });
const Classifier = Type.String({ description: "The Confessor's model as written into every interpretation" });

const Events = {
	interpretation: Type.Object(
		{
			ref: Int("The reference of the statement"),
			agent: Type.String({ description: "The resident who made it" }),
			source: Type.Enum(["thought", "aside", "dm", "board", "group", "cast"], { description: "Where it was made" }),
			labels: Type.Array(Label, { description: "Its labels, in the order of the label set" }),
			targets: Ids,
			classifier: Classifier,
		},
		{ description: "The Confessor labelled a statement" },
	),
	interpretation_round: Type.Object({ round: Int("The old round"), classifier: Classifier, statements: Int("The statements of the round"), labeled: Int("Those with a label") }, { description: "A round was labelled without a failure" }),
	interpretation_error: Type.Object({ round: Int("The old round"), message: Type.String({ description: "Why there is no answer" }) }, { description: "The Confessor's model gave no answer for a round; its statements stay unlabelled" }),
};

const Conversation = Type.Object({ conversation: Type.String({ description: "`dm:A01|A02` or `group:G1`" }), statements: Type.Array(StatementSchema, { description: "Its last messages, oldest first" }) }, { description: "One conversation" });
const Private = Type.Object({ round: Int("The old round"), agent: Type.String({ description: "The resident" }), labels: Type.Array(Label, { description: "Its private labels" }) }, { description: "The private labels of one statement" });
const Slice = Type.Object(
	{
		history: Type.Array(Conversation, { description: "The conversations, in the order they began" }),
		window: Type.Array(Private, { description: "The private labels since the gamemaker's last look (old `privateLabels`)" }),
	},
	{ description: "What the Confessor remembers" },
);

/** The old `gamemaker/replies/private-thoughts`, byte for byte (`prompts/gamemaker/replies/private-thoughts.md`). */
const PRIVATE_THOUGHTS = "PRIVATE_BLOCKED: the text passes on what {{who}} privately thinks; use a private read only in a note to that resident";

/**
 * The options of `interpretations`: the check of a private thought in a Director's note.
 *
 * @public
 */
export const InterpretationsOptions = Type.Object(
	{
		noteTools: Type.Array(Type.String({ description: "The bare name of a tool" }), {
			default: ["notify", "boardNote"],
			description: "The tools of a Director's note whose `text` (or `reason`) is checked for a private read of another resident (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board.",
		}),
		every: Type.Integer({ minimum: 1, default: 1, description: "Rounds between two looks of the gamemaker (its `every`): the private labels of these rounds are checked." }),
		privateThoughts: Type.String({ default: PRIVATE_THOUGHTS, description: "The refusal, with `{{who}}`: the old `gamemaker/replies/private-thoughts`." }),
	},
	{ description: "The options of `interpretations`" },
);

/**
 * The fact `interpretations.residents`: every resident in the game's order, with the name it chose.
 *
 * @public
 */
export const ResidentsFact = Type.Array(Type.Object({ id: Type.String({ description: "The id" }), name: Type.Union([Type.String({ description: "The name" }), Type.Null({ description: "None" })], { description: "Its name" }) }, { description: "A resident" }), { description: "The residents" });

/**
 * The fact `interpretations.history`: the last messages of every conversation.
 *
 * @public
 */
export const HistoryFact = Slice.properties.history;

const Item = Type.Object(
	{ ref: Int("The reference"), labels: Type.Array(Type.String({ description: "A label" }), { description: "The labels" }), targets: Type.Optional(Type.Array(Type.String({ description: "A resident id or name" }), { description: "The targets" })) },
	{ description: "A label answer for one statement, as the model gave it" },
);
const Interpret = Type.Object(
	{
		round: Int("The old round"),
		classifier: Classifier,
		statements: Type.Array(StatementSchema, { description: "The statements of the round" }),
		items: Type.Array(Item, { description: "The model's answer" }),
		error: Type.Optional(Type.String({ description: "Set when the model gave no answer" })),
	},
	{ description: "A round of the Confessor" },
);

/**
 * The head of `interpretations`: its events, its slice, the tool `interpret` of the Confessor (default grant
 * `confessor`), and `identity` for the names.
 *
 * @public
 */
export const interpretationsHead = defineHead({
	id: "interpretations",
	package: "@swarmtales/city-directors",
	summary: "The Confessor's labels of what residents say, and the conversations it remembers.",
	options: InterpretationsOptions,
	state: Slice,
	start: () => ({ history: [], window: [] }),
	snapshot: { save: (state: Static<typeof Slice>) => structuredClone(state), load: (data): Static<typeof Slice> => inSchemaOrder(Slice, data) },
	events: Events,
	uses: [IdentityService],
	tools: { interpret: { description: "Records the labels of a round's statements.", params: Interpret, for: ["confessor"] } },
});

type Ctx = ToolCtxOf<typeof interpretationsHead>;

// Forgets the private labels of the rounds up to the gamemaker's last look before `round` (old `lookWindow`).
function forgetLooked(ctx: Ctx, round: number): void {
	const looked = Math.floor((round - 1) / ctx.options.every) * ctx.options.every;
	ctx.state.window = ctx.state.window.filter((entry) => entry.round > looked);
}

// Keeps the last messages of each conversation of the round (old `calls`, after the context was read).
function remember(ctx: Ctx, statements: readonly Statement[]): void {
	for (const statement of statements) {
		const key = conversationKey(statement);
		if (key === undefined) continue;
		let entry = ctx.state.history.find((conversation) => conversation.conversation === key);
		if (entry === undefined) ctx.state.history.push((entry = { conversation: key, statements: [] }));
		entry.statements = [...entry.statements, statement].slice(-CONTEXT_MESSAGES);
	}
}

const isLabel = (value: string): value is (typeof LABELS)[number] => LABELS.some((label) => label === value);

type Merged = Map<number, { readonly labels: Set<string>; readonly targets: Set<string> }>;

// The names residents chose, lower case, to their ids.
function idsByName(ctx: Ctx): ReadonlyMap<string, string> {
	const byName = new Map<string, string>();
	for (const id of ctx.residents.ids) {
		const name = ctx.tryCall(IdentityService, "nameOf", { resident: id });
		if (typeof name === "string") byName.set(name.toLowerCase(), id);
	}
	return byName;
}

// The labels and targets per statement of the round, what is unknown dropped (the first half of old `finish`).
function merge(ctx: Ctx, statements: readonly Statement[], items: Static<typeof Interpret>["items"]): Merged {
	const bySeq = new Map(statements.map((statement) => [statement.ref, statement]));
	const byName = idsByName(ctx);
	// A target is a resident other than the speaker, named by id or by the name it chose.
	const targetOf = (named: string, speaker: string): readonly string[] => {
		const target = byName.get(named.toLowerCase()) ?? named;
		return ctx.residents.has(target) && target !== speaker ? [target] : [];
	};
	const merged: Merged = new Map();
	for (const item of items) {
		const statement = bySeq.get(item.ref);
		if (statement === undefined) continue;
		const entry = merged.get(item.ref) ?? { labels: new Set<string>(), targets: new Set<string>() };
		for (const label of item.labels) if (isLabel(label)) entry.labels.add(label);
		for (const target of (item.targets ?? []).flatMap((named) => targetOf(named, statement.agent))) entry.targets.add(target);
		merged.set(item.ref, entry);
	}
	return merged;
}

// One `interpretation` per labelled statement, in the order of the round, then the round (old `finish`).
function finish(ctx: Ctx, { round, classifier, statements, items }: Static<typeof Interpret>): void {
	const merged = merge(ctx, statements, items);
	let labeled = 0;
	for (const statement of statements) {
		const entry = merged.get(statement.ref);
		if (entry === undefined || entry.labels.size === 0) continue;
		labeled += 1;
		ctx.emit("interpretation", { ref: statement.ref, agent: statement.agent, source: statement.source, labels: LABELS.filter((label) => entry.labels.has(label)), targets: [...entry.targets].sort(), classifier });
		// Old `privateLabels`: every lie, and every label of a thought or an aside, which no statement is (J171).
		if (entry.labels.has("lie")) ctx.state.window.push({ round, agent: statement.agent, labels: ["lie"] });
	}
	ctx.emit("interpretation_round", { round, classifier, statements: statements.length, labeled });
}

/**
 * The tool `interpret`: a failed round writes its error and no labels (fail open); its statements are remembered
 * either way.
 *
 * @param params - The round, the Confessor's model, the statements, the answer or the error.
 * @param ctx - The context of the call.
 * @returns The reply.
 */
function interpret(params: Static<ToolsOf<typeof interpretationsHead>["interpret"]>, ctx: Ctx): ToolSuccess {
	remember(ctx, params.statements);
	forgetLooked(ctx, params.round);
	if (params.error === undefined) finish(ctx, params);
	else ctx.emit("interpretation_error", { round: params.round, message: params.error });
	return reply("recorded");
}

/**
 * The body of `interpretations`: the tool `interpret` (with a `sample` of an empty round for the fake driver) and
 * the two facts the Confessor reads.
 *
 * @internal
 */
export const interpretationsBody = {
	tools: { interpret: { run: interpret, sample: (ctx: Ctx) => ({ round: ctx.tick, classifier: "", statements: [], items: [] }) } },
	facts: {
		residents: { output: ResidentsFact, compute: (view: ViewOf<typeof interpretationsHead>): Static<typeof ResidentsFact> => view.residents.ids.map((id) => ({ id, name: view.tryCall(IdentityService, "nameOf", { resident: id }) ?? null })) },
		history: { output: HistoryFact, compute: (view: ViewOf<typeof interpretationsHead>) => structuredClone(view.state.history) },
	},
};
