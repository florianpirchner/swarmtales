/**
 * The interpreter (SPEC 10.5): collects every statement and thought of a
 * round and, after the round, labels them in classifier batches (one per
 * {@link MAX_BATCH_STATEMENTS} statements). Results
 * are new `interpretation` events that reference the original event by
 * `seq`; the log stays append-only. It runs before the gamemaker's look,
 * so the gamemaker reads the labels of the round it looks at.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { EventBus, EventSink, RecordedEvent } from "../engine/events.ts";
import type { RoundObserver } from "../engine/arena.ts";
import { CLASSIFIER_ID, conversationKey, type Classification, type StatementClassifier, type Verdict } from "./classifier.ts";
import { isStatementLabel, STATEMENT_LABELS, type StatementLabel } from "../engine/labels.ts";
import { statementOf, type Statement } from "./statements.ts";

/** Earlier messages kept per conversation (DM pair or group) as context for its replies. */
export const CONTEXT_MESSAGES = 4;
/**
 * Most statements in one classifier call (v08, scale): a round of 48
 * residents can hold a hundred and more, so it is labelled in chunks; each
 * chunk carries the context of its own conversations.
 */
export const MAX_BATCH_STATEMENTS = 60;

export interface InterpreterOptions {
	readonly classifier: StatementClassifier;
	readonly bus: EventBus;
	readonly competitors: readonly CompetitorId[];
	readonly minute: () => number;
	/** The name of a resident (v08); targets given by name are mapped back to IDs. */
	readonly nameOf?: (agent: CompetitorId) => string | undefined;
}

/** Unlabelled statements and the conversation context, for run snapshots (SPEC 17). */
export interface InterpreterSnapshot {
	readonly pending: readonly Statement[];
	readonly history: readonly { readonly conversation: string; readonly statements: readonly Statement[] }[];
}

export class Interpreter implements EventSink, RoundObserver {
	readonly #options: InterpreterOptions;
	readonly #competitors: ReadonlySet<string>;
	#pending: Statement[] = [];
	/** The last messages of every conversation, from earlier rounds. */
	readonly #history = new Map<string, Statement[]>();

	constructor(options: InterpreterOptions) {
		this.#options = options;
		this.#competitors = new Set(options.competitors);
	}

	snapshot(): InterpreterSnapshot {
		return {
			pending: [...this.#pending],
			history: [...this.#history].map(([conversation, statements]) => ({ conversation, statements: [...statements] })),
		};
	}

	restore(state: InterpreterSnapshot): void {
		this.#pending = [...state.pending];
		this.#history.clear();
		for (const entry of state.history) this.#history.set(entry.conversation, [...entry.statements]);
	}

	record(event: RecordedEvent): void {
		const statement = statementOf(event, (id) => this.#competitors.has(id));
		if (statement !== undefined) this.#pending.push(statement);
	}

	async afterRound(round: number): Promise<void> {
		const statements = this.#pending;
		this.#pending = [];
		if (statements.length === 0) return;
		const chunks = Array.from({ length: Math.ceil(statements.length / MAX_BATCH_STATEMENTS) }, (_, index) =>
			statements.slice(index * MAX_BATCH_STATEMENTS, (index + 1) * MAX_BATCH_STATEMENTS),
		);
		const contexts = chunks.map((chunk) => this.#contextFor(chunk));
		this.#remember(statements);
		const { classifier, bus } = this.#options;
		const classification: { verdicts: Verdict[]; failed: boolean } = { verdicts: [], failed: false };
		const names = this.#names();
		for (const [index, chunk] of chunks.entries()) {
			let result: Classification;
			try {
				result = await classifier.classify({ round, minute: this.#options.minute(), agents: this.#options.competitors, statements: chunk, context: contexts[index] ?? [], ...(names.size === 0 ? {} : { names }) });
			} catch (error) {
				bus.emit({ type: "interpretation_error", round, message: error instanceof Error ? error.message : String(error) });
				classification.failed = true;
				continue;
			}
			for (const entry of result.usage) bus.emit({ type: "usage", agent: CLASSIFIER_ID, ...entry });
			for (const message of result.errors) bus.emit({ type: "interpretation_error", round, message });
			if (result.errors.length > 0) classification.failed = true;
			classification.verdicts.push(...result.verdicts);
		}

		const bySeq = new Map(statements.map((statement) => [statement.seq, statement]));
		const byName = new Map([...names].map(([agent, name]) => [name.toLowerCase(), agent]));
		const merged = new Map<number, { labels: Set<StatementLabel>; targets: Set<CompetitorId> }>();
		for (const verdict of classification.verdicts) {
			const statement = bySeq.get(verdict.seq);
			if (statement === undefined) continue;
			const entry = merged.get(verdict.seq) ?? { labels: new Set<StatementLabel>(), targets: new Set<CompetitorId>() };
			for (const label of verdict.labels) if (isStatementLabel(label)) entry.labels.add(label);
			for (const named of verdict.targets) {
				const target = byName.get(named.toLowerCase()) ?? named;
				if (this.#competitors.has(target) && target !== statement.agent) entry.targets.add(target);
			}
			merged.set(verdict.seq, entry);
		}
		let labeled = 0;
		for (const statement of statements) {
			const entry = merged.get(statement.seq);
			if (entry === undefined || entry.labels.size === 0) continue;
			labeled += 1;
			bus.emit({
				type: "interpretation",
				ref: statement.seq,
				agent: statement.agent,
				source: statement.source,
				labels: STATEMENT_LABELS.filter((label) => entry.labels.has(label)),
				targets: [...entry.targets].sort(),
				classifier: classifier.label,
			});
		}
		// Only a clean batch marks the round as classified; the digest keeps its text rules for the others.
		if (!classification.failed) {
			bus.emit({ type: "interpretation_round", round, classifier: classifier.label, statements: statements.length, labeled });
		}
	}

	#names(): ReadonlyMap<CompetitorId, string> {
		const nameOf = this.#options.nameOf;
		const names = new Map<CompetitorId, string>();
		if (nameOf === undefined) return names;
		for (const agent of this.#options.competitors) {
			const name = nameOf(agent);
			if (name !== undefined) names.set(agent, name);
		}
		return names;
	}

	/** Earlier messages of every conversation this round continues, oldest first. */
	#contextFor(statements: readonly Statement[]): readonly Statement[] {
		const keys = new Set(statements.flatMap((statement) => conversationKey(statement) ?? []));
		return [...keys].flatMap((key) => this.#history.get(key) ?? []).sort((a, b) => a.seq - b.seq);
	}

	#remember(statements: readonly Statement[]): void {
		for (const statement of statements) {
			const key = conversationKey(statement);
			if (key === undefined) continue;
			const list = this.#history.get(key) ?? [];
			list.push(statement);
			this.#history.set(key, list.slice(-CONTEXT_MESSAGES));
		}
	}
}
