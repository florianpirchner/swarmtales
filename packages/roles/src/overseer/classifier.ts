/**
 * The statement classifier (SPEC 10.5) as an overseer (docs/design/overseer-api.md §1.5): a short
 * overseer in the `between` slot, before the weaver and the gamemaker, so the gamemaker reads the
 * labels of the round it looks at. It replaces the old interpreter and its chat classifier.
 *
 * - **Statements.** At each firing it reads the log since its last look (a cursor in its state),
 *   keeps the statements of the minute (thoughts, asides, DMs, board, group and cast posts) and
 *   cuts them into batches of at most {@link BATCH_MAX}; each batch is one call, with the earlier
 *   messages of its conversations as context. The model answers through the `label` tool.
 * - **Events.** `settle` collects the answers; after the last batch it writes one
 *   `interpretation` per labelled statement and, when no batch failed, `interpretation_round`;
 *   a failed batch writes `interpretation_error` at once. Unknown labels, unknown residents and
 *   references the round did not hold are dropped before anything reaches the log (the model's
 *   answer is untrusted).
 * - **Fail open.** A failed batch leaves its statements unlabelled; the round is not marked as
 *   classified, and the digest keeps its text rules for it. Without a runtime nothing is written.
 *
 * The decider backend (one yes/no per label) is a second `OverseerRuntime` adapter for this very
 * definition; it answers in the same `items` shape.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import type { EventEnvelope } from "@swarmtales/contracts";
import { defineOverseer } from "@swarmtales/kernel";
import { OVERSEER_ORDER } from "./order.ts";
import { conversationKey, statementOf, StatementSchema, type Statement } from "./statements.ts";

/** The closed set of labels (SPEC 10.5); anything else a model answers is dropped. */
export const LABELS = ["promise", "offer", "threat", "refusal", "lie", "hesitation", "helpRequest", "accusation", "thanks"] as const;
export type Label = (typeof LABELS)[number];

/** Earlier messages kept per conversation (DM pair or group) as context for its replies. */
const CONTEXT_MESSAGES = 4;
/** Most statements in one call (v08, scale): a round of 48 residents can hold a hundred and more. */
const BATCH_MAX = 60;

const Items = Type.Object({
	items: Type.Array(
		Type.Object({
			ref: Type.Integer({ description: "Reference number of the statement, e.g. 12 for #12" }),
			labels: Type.Array(Type.String({ description: LABELS.join(", ") })),
			targets: Type.Optional(Type.Array(Type.String({ description: "Resident ID, e.g. A03" }))),
		}),
	),
});
type Answer = Static<typeof Items>;

const Events = {
	interpretation: Type.Object({
		ref: Type.Integer(),
		agent: Type.String(),
		source: Type.Enum(["thought", "aside", "dm", "board", "group", "cast"] as const),
		labels: Type.Array(Type.Enum(LABELS)),
		targets: Type.Array(Type.String()),
		classifier: Type.String(),
	}),
	interpretation_round: Type.Object({ round: Type.Integer(), classifier: Type.String(), statements: Type.Integer(), labeled: Type.Integer() }),
	interpretation_error: Type.Object({ round: Type.Integer(), message: Type.String() }),
};

/** A raw label answer for one statement, before validation. */
interface Verdict {
	readonly seq: number;
	readonly labels: readonly string[];
	readonly targets: readonly string[];
}

/** The round being classified: its statements, and what the answers of its batches gave so far. */
interface Round {
	readonly number: number;
	readonly statements: readonly Statement[];
	readonly names: ReadonlyMap<string, string>;
	readonly batches: number;
	readonly verdicts: Verdict[];
	answered: number;
	failed: boolean;
}

interface State {
	/** The last log seq already read. */
	cursor: number;
	/** The last messages of every conversation, from earlier rounds. */
	readonly history: Map<string, Statement[]>;
	round: Round | undefined;
}

const Slice = Type.Object({
	cursor: Type.Integer(),
	history: Type.Array(Type.Object({ conversation: Type.String(), statements: Type.Array(StatementSchema) })),
});

const OverseerAnswered = Type.Object({ overseer: Type.String(), ok: Type.Boolean(), error: Type.Optional(Type.String()), by: Type.String() });

const PROMPTS = {
	"classifier/system-plain": [],
	"classifier/input": ["batch", "standingOrders"],
	"classifier/tool-label": [],
	"classifier/round": ["round", "minute", "residents"],
	"classifier/resident-named": ["agent", "name"],
	"classifier/context-heading": [],
	"classifier/statements-heading": [],
	"classifier/where-thought": [],
	"classifier/where-aside": [],
	"classifier/where-dm": ["to"],
	"classifier/where-board": [],
	"classifier/where-group": ["group"],
} as const;

function isLabel(value: string): value is Label {
	return LABELS.some((label) => label === value);
}

function chunked(statements: readonly Statement[]): readonly (readonly Statement[])[] {
	return Array.from({ length: Math.ceil(statements.length / BATCH_MAX) }, (_unused, index) => statements.slice(index * BATCH_MAX, (index + 1) * BATCH_MAX));
}

/** The newest `overseer_answered` of `self`: whether the model answered, and why not. */
function lastAnswer(events: readonly EventEnvelope[], self: string): Static<typeof OverseerAnswered> | undefined {
	for (let index = events.length - 1; index >= 0; index--) {
		const payload = events[index]?.payload;
		if (Check(OverseerAnswered, payload) && payload.overseer === self) return payload;
	}
	return undefined;
}

function emptyState(): State {
	return { cursor: 0, history: new Map(), round: undefined };
}

export const classifierOverseer = defineOverseer(
	{
		id: "classifier",
		summary: "Labels what residents say and think each minute (promise, threat, lie, ...), for the digest and the gamemaker.",
		options: Type.Object({
			label: Type.String({ default: "", description: "The classifier model's name as written into every interpretation, e.g. anthropic/claude-haiku-5-5 (the app fills it from the resolved model)" }),
			maxChars: Type.Integer({ default: 1_500, minimum: 20, description: "Characters of one statement shown to the classifier" }),
		}),
		state: emptyState,
		events: Events,
		prompts: PROMPTS,
		system: "classifier/system-plain",
		input: "classifier/input",
		output: Items,
		answer: { tool: "label", description: "classifier/tool-label" },
		model: { slot: "classifier" },
		lifetime: "short",
		triggers: [{ hook: "between", order: OVERSEER_ORDER.classifier }],
	},
	(kit) => {
		const cut = (text: string, maxChars: number): string => {
			const flat = text.replace(/\s+/g, " ").trim();
			return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 3)}...`;
		};

		return {
			calls(_fired, ctx) {
				const state = ctx.state;
				if (state.round !== undefined) finish(ctx);
				const events: readonly EventEnvelope[] = ctx.log.since(state.cursor);
				const last = events.at(-1);
				if (last !== undefined) state.cursor = last.seq;
				const competitors = new Set(ctx.residents.ids);
				const statements = events.flatMap((event) => statementOf(event, (id) => competitors.has(id)) ?? []);
				if (statements.length === 0) return [];
				const chunks = chunked(statements);
				// Context is read before this round is remembered, per batch.
				const contexts = chunks.map((chunk) => {
					const keys = new Set(chunk.flatMap((statement) => conversationKey(statement) ?? []));
					return [...keys].flatMap((key) => state.history.get(key) ?? []).sort((a, b) => a.seq - b.seq);
				});
				for (const statement of statements) {
					const key = conversationKey(statement);
					if (key === undefined) continue;
					const list = state.history.get(key) ?? [];
					list.push(statement);
					state.history.set(key, list.slice(-CONTEXT_MESSAGES));
				}
				const names = new Map<string, string>();
				for (const id of ctx.residents.ids) {
					const name = ctx.display(id);
					if (name !== id) names.set(id, name);
				}
				const round = ctx.minute + 1;
				state.round = { number: round, statements, names, batches: chunks.length, verdicts: [], answered: 0, failed: false };
				const where = (statement: Statement): string => {
					switch (statement.source) {
						case "thought":
							return ctx.prompt("classifier/where-thought", {});
						case "aside":
							return ctx.prompt("classifier/where-aside", {});
						case "dm":
						case "cast":
							return ctx.prompt("classifier/where-dm", { to: statement.to.join(", ") });
						case "board":
							return ctx.prompt("classifier/where-board", {});
						case "group":
							return ctx.prompt("classifier/where-group", { group: statement.group ?? "?" });
					}
				};
				const line = (statement: Statement): string => `#${String(statement.seq)} ${statement.agent} ${where(statement)}: ${JSON.stringify(cut(statement.text, ctx.options.maxChars))}`;
				const resident = (id: string): string => {
					const name = names.get(id);
					return name === undefined ? id : ctx.prompt("classifier/resident-named", { agent: id, name });
				};
				return chunks.map((chunk, index) => {
					const context = contexts[index] ?? [];
					const prompt = [
						ctx.prompt("classifier/round", { round, minute: ctx.minute, residents: ctx.residents.ids.map(resident).join(", ") }),
						"",
						...(context.length === 0 ? [] : [ctx.prompt("classifier/context-heading", {}), ...context.map(line), ""]),
						ctx.prompt("classifier/statements-heading", {}),
						...chunk.map(line),
					].join("\n");
					return { batch: prompt };
				});
			},

			// A failed batch answers nothing; `settle` sees it in the log (`overseer_answered`, ok false) and writes the error.
			fallback: () => ({ items: [] }),

			settle(output: Answer, _call, ctx) {
				const round = ctx.state.round;
				if (round === undefined) return;
				const payload = lastAnswer(ctx.log.ofType("core", "overseer_answered"), ctx.self);
				round.answered += 1;
				if (payload !== undefined && !payload.ok) {
					// Without a runtime (`by: none`) there is no classifier: nothing is written.
					if (payload.by === "none") {
						ctx.state.round = undefined;
						return;
					}
					ctx.emit("interpretation_error", { round: round.number, message: payload.error ?? "the classifier gave no answer" });
					round.failed = true;
				} else {
					for (const item of output.items) round.verdicts.push({ seq: item.ref, labels: item.labels, targets: item.targets ?? [] });
				}
				if (round.answered >= round.batches) finish(ctx);
			},

			snapshot: kit.snapshot({
				version: 1,
				schema: Slice,
				save: (state) => ({
					cursor: state.cursor,
					history: [...state.history].map(([conversation, statements]) => ({ conversation, statements: statements.map((statement) => ({ ...statement, to: [...statement.to] })) })),
				}),
				load: (data) => ({
					cursor: data.cursor,
					history: new Map(data.history.map((entry) => [entry.conversation, entry.statements.map((statement) => ({ ...statement, to: [...statement.to] }))])),
					round: undefined,
				}),
			}),
		};
	},
);

/** What `finish` needs of the overseer's context. */
interface FinishPort {
	readonly state: State;
	readonly options: { readonly label: string };
	readonly residents: { has(id: string): boolean };
	emit(type: "interpretation", payload: Static<typeof Events.interpretation>): void;
	emit(type: "interpretation_round", payload: Static<typeof Events.interpretation_round>): void;
}

/** Merges the answers of the round and writes its events (the old interpreter's tail). */
function finish(ctx: FinishPort): void {
	const round = ctx.state.round;
	if (round === undefined) return;
	ctx.state.round = undefined;
	const bySeq = new Map(round.statements.map((statement) => [statement.seq, statement]));
	const byName = new Map([...round.names].map(([agent, name]) => [name.toLowerCase(), agent]));
	const merged = new Map<number, { readonly labels: Set<Label>; readonly targets: Set<string> }>();
	for (const verdict of round.verdicts) {
		const statement = bySeq.get(verdict.seq);
		if (statement === undefined) continue;
		const entry = merged.get(verdict.seq) ?? { labels: new Set<Label>(), targets: new Set<string>() };
		for (const label of verdict.labels) if (isLabel(label)) entry.labels.add(label);
		for (const named of verdict.targets) {
			const target = byName.get(named.toLowerCase()) ?? named;
			if (ctx.residents.has(target) && target !== statement.agent) entry.targets.add(target);
		}
		merged.set(verdict.seq, entry);
	}
	let labeled = 0;
	for (const statement of round.statements) {
		const entry = merged.get(statement.seq);
		if (entry === undefined || entry.labels.size === 0) continue;
		labeled += 1;
		ctx.emit("interpretation", {
			ref: statement.seq,
			agent: statement.agent,
			source: statement.source,
			labels: LABELS.filter((label) => entry.labels.has(label)),
			targets: [...entry.targets].sort(),
			classifier: ctx.options.label,
		});
	}
	// Only a clean round is marked as classified; the digest keeps its text rules for the others.
	if (!round.failed) ctx.emit("interpretation_round", { round: round.number, classifier: ctx.options.label, statements: round.statements.length, labeled });
}
