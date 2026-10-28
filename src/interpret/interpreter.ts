/**
 * The interpreter (SPEC 10.5): collects every statement and thought of a
 * round and, after the round, labels them in one classifier batch. Results
 * are new `interpretation` events that reference the original event by
 * `seq`; the log stays append-only. It runs before the game master's look,
 * so the game master reads the labels of the round it looks at.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { EventBus, EventSink, RecordedEvent } from "../engine/events.ts";
import type { RoundObserver } from "../engine/arena.ts";
import { CLASSIFIER_ID, conversationKey, type Classification, type StatementClassifier } from "./classifier.ts";
import { isStatementLabel, STATEMENT_LABELS, type StatementLabel } from "./labels.ts";
import { statementOf, type Statement } from "./statements.ts";

/** Earlier messages kept per conversation (DM pair or group) as context for its replies. */
export const CONTEXT_MESSAGES = 4;

export interface InterpreterOptions {
	readonly classifier: StatementClassifier;
	readonly bus: EventBus;
	readonly competitors: readonly CompetitorId[];
	readonly minute: () => number;
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
		const context = this.#contextFor(statements);
		this.#remember(statements);
		const { classifier, bus } = this.#options;
		let classification: Classification;
		try {
			classification = await classifier.classify({ round, minute: this.#options.minute(), agents: this.#options.competitors, statements, context });
		} catch (error) {
			bus.emit({ type: "interpretation_error", round, message: error instanceof Error ? error.message : String(error) });
			return;
		}
		for (const entry of classification.usage) bus.emit({ type: "usage", agent: CLASSIFIER_ID, ...entry });
		for (const message of classification.errors) bus.emit({ type: "interpretation_error", round, message });

		const bySeq = new Map(statements.map((statement) => [statement.seq, statement]));
		const merged = new Map<number, { labels: Set<StatementLabel>; targets: Set<CompetitorId> }>();
		for (const verdict of classification.verdicts) {
			const statement = bySeq.get(verdict.seq);
			if (statement === undefined) continue;
			const entry = merged.get(verdict.seq) ?? { labels: new Set<StatementLabel>(), targets: new Set<CompetitorId>() };
			for (const label of verdict.labels) if (isStatementLabel(label)) entry.labels.add(label);
			for (const target of verdict.targets) if (this.#competitors.has(target) && target !== statement.agent) entry.targets.add(target);
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
		if (classification.errors.length === 0) {
			bus.emit({ type: "interpretation_round", round, classifier: classifier.label, statements: statements.length, labeled });
		}
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
