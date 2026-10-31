/**
 * Statement classifiers (SPEC 10.5). Two backends share one contract:
 *
 * - {@link ChatStatementClassifier}: a chat model (Haiku by default) labels the
 *   whole round in one call through a `label` tool;
 * - {@link DeciderStatementClassifier}: a structured classifier model (e.g.
 *   OpenRouter's `perplexity/pplx-decider-v1.2`) answers one yes/no question
 *   per label for every statement.
 *
 * Answers are untrusted: the interpreter drops unknown references, labels and
 * residents before anything reaches the log.
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import type { ClassifierApi, ClassifierModel, ClassifierQuestion, Models } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { type ModelBinding, withRequestDefaults } from "@swarmtales/models";
import type { CompetitorId } from "@swarmtales/kernel";
import type { ClassifierUsage, ThinkingLevel } from "@swarmtales/contracts";

export type { ClassifierUsage };
import { labelMeaning, STATEMENT_LABELS } from "@swarmtales/engine";
import { statementLine, type Statement } from "./statements.ts";
import { render, text } from "@swarmtales/prompts";

/** ID of the classifier in usage records. */
export const CLASSIFIER_ID = "CL";

export interface StatementBatch {
	readonly round: number;
	readonly minute: number;
	readonly agents: readonly CompetitorId[];
	/** Names of the residents (v08): statements mention them, targets stay IDs. */
	readonly names?: ReadonlyMap<CompetitorId, string>;
	readonly statements: readonly Statement[];
	/** Earlier messages of the conversations this round continues; context only, never labelled. */
	readonly context: readonly Statement[];
}

/** Raw labels for one statement, before validation. */
export interface Verdict {
	readonly seq: number;
	readonly labels: readonly string[];
	readonly targets: readonly string[];
}

export interface Classification {
	readonly verdicts: readonly Verdict[];
	readonly usage: readonly ClassifierUsage[];
	/** Failed requests; the statements they covered stay unlabelled. */
	readonly errors: readonly string[];
}

export interface StatementClassifier {
	/** e.g. `anthropic/claude-haiku-5-5`, written into every interpretation. */
	readonly label: string;
	classify(batch: StatementBatch): Promise<Classification>;
}

/** Characters of one statement shown to the classifier. */
export const DEFAULT_STATEMENT_CHARS = 1_500;

export function classifierSystemPrompt(): string {
	const labels = STATEMENT_LABELS.map((label) => `- ${label}: ${labelMeaning(label)}`).join("\n");
	return render("classifier/system", { labels });
}

/** `A03 (called Mira)`: messages name residents by name, targets use the ID. */
function residentLine(agent: CompetitorId, names: ReadonlyMap<CompetitorId, string> | undefined): string {
	const name = names?.get(agent);
	return name === undefined ? agent : render("classifier/resident-named", { agent, name });
}

export function classifierPrompt(batch: StatementBatch, maxChars: number): string {
	const context =
		batch.context.length === 0
			? []
			: [text("classifier/context-heading"), ...batch.context.map((statement) => statementLine(statement, maxChars)), ""];
	return [
		render("classifier/round", { round: batch.round, minute: batch.minute, residents: batch.agents.map((agent) => residentLine(agent, batch.names)).join(", ") }),
		"",
		...context,
		text("classifier/statements-heading"),
		...batch.statements.map((statement) => statementLine(statement, maxChars)),
	].join("\n");
}

const LabelParams = Type.Object({
	items: Type.Array(
		Type.Object({
			ref: Type.Integer({ description: "Reference number of the statement, e.g. 12 for #12" }),
			labels: Type.Array(Type.String({ description: STATEMENT_LABELS.join(", ") })),
			targets: Type.Optional(Type.Array(Type.String({ description: "Resident ID, e.g. A03" }))),
		}),
	),
});

export interface ChatClassifierOptions {
	readonly binding: ModelBinding;
	readonly label: string;
	readonly thinking: ThinkingLevel;
	readonly maxChars?: number;
}

/** One chat call per round; the model answers through the `label` tool. */
export class ChatStatementClassifier implements StatementClassifier {
	readonly label: string;
	readonly #options: ChatClassifierOptions;

	constructor(options: ChatClassifierOptions) {
		this.#options = options;
		this.label = options.label;
	}

	async classify(batch: StatementBatch): Promise<Classification> {
		const { binding } = this.#options;
		const verdicts: Verdict[] = [];
		const usage: ClassifierUsage[] = [];
		const errors: string[] = [];
		const answer = { called: false };
		const agent = new Agent({
			initialState: {
				systemPrompt: classifierSystemPrompt(),
				model: binding.model,
				thinkingLevel: this.#options.thinking,
				tools: [
					{
						name: "label",
						label: "label",
						description: "Record the labels of every statement that has at least one.",
						parameters: LabelParams,
						execute: (_toolCallId: string, rawParams: unknown): Promise<AgentToolResult<undefined>> => {
							const reply = (text: string, isError: boolean): Promise<AgentToolResult<undefined>> =>
								Promise.resolve({ content: [{ type: "text", text }], details: undefined, ...(isError ? { isError } : {}) });
							let params;
							try {
								params = Parse(LabelParams, rawParams);
							} catch {
								errors.push("the label call had invalid arguments");
								return reply("INVALID_ARGUMENTS", true);
							}
							answer.called = true;
							for (const item of params.items) verdicts.push({ seq: item.ref, labels: item.labels, targets: item.targets ?? [] });
							return reply("recorded", false);
						},
					},
				],
			},
			streamFn: binding.streamFn,
			// One call: the answer is the tool call, nothing follows it.
			finishTurn: () => ({ action: "end" }),
			toolExecution: "sequential",
			onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults),
			sessionId: CLASSIFIER_ID,
			identity: { attribution: null },
		});
		agent.subscribe((event) => {
			if (event.type === "message_end") collectUsage(event.message, usage);
		});
		const prompt = classifierPrompt(batch, this.#options.maxChars ?? DEFAULT_STATEMENT_CHARS);
		const messages: AgentMessage[] = [{ role: "user", content: prompt, timestamp: batch.minute * 60_000 }];
		await agent.prompt(messages);
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) errors.push(error);
		else if (!answer.called && errors.length === 0) errors.push("the model answered without calling label");
		return { verdicts, usage, errors };
	}
}

function collectUsage(message: AgentMessage, usage: ClassifierUsage[]): void {
	if (message.role !== "assistant") return;
	usage.push({
		provider: message.provider,
		model: message.model,
		input: message.usage.input,
		output: message.usage.output,
		cacheRead: message.usage.cacheRead,
		cacheWrite: message.usage.cacheWrite,
		costUsd: message.usage.cost.total,
	});
}

/** Probability from which a decider's yes counts. */
export const DECIDER_THRESHOLD = 0.5;
/** Decider requests in flight at once. */
const DECIDER_CONCURRENCY = 4;

export interface DeciderClassifierOptions {
	readonly models: Models;
	readonly model: ClassifierModel<ClassifierApi>;
	readonly label: string;
	readonly maxChars?: number;
	readonly timeoutMs?: number;
}

/**
 * One structured request per statement: the state is the statement and the
 * speaker's own thoughts of the round, the questions are one yes/no per
 * label. Deciders name no targets; a DM's recipient is its target.
 */
export class DeciderStatementClassifier implements StatementClassifier {
	readonly label: string;
	readonly #options: DeciderClassifierOptions;

	constructor(options: DeciderClassifierOptions) {
		this.#options = options;
		this.label = options.label;
	}

	async classify(batch: StatementBatch): Promise<Classification> {
		const verdicts: Verdict[] = [];
		const usage: ClassifierUsage[] = [];
		const errors: string[] = [];
		const queue = [...batch.statements];
		const worker = async (): Promise<void> => {
			for (let statement = queue.shift(); statement !== undefined; statement = queue.shift()) {
				await this.#classifyOne(batch, statement, verdicts, usage, errors);
			}
		};
		await Promise.all(Array.from({ length: Math.min(DECIDER_CONCURRENCY, queue.length) }, () => worker()));
		verdicts.sort((a, b) => a.seq - b.seq);
		return { verdicts, usage, errors };
	}

	async #classifyOne(batch: StatementBatch, statement: Statement, verdicts: Verdict[], usage: ClassifierUsage[], errors: string[]): Promise<void> {
		const { models, model } = this.#options;
		const maxChars = this.#options.maxChars ?? DEFAULT_STATEMENT_CHARS;
		const conversation = conversationOf(statement, [...batch.context, ...batch.statements.filter((other) => other.seq < statement.seq)]).map(
			(other) => `${other.agent}: ${cut(other.text, maxChars)}`,
		);
		const ownThoughts = batch.statements
			.filter((other) => other.agent === statement.agent && other.seq !== statement.seq && other.source === "thought")
			.map((other) => cut(other.text, maxChars));
		const result = await models.classify(
			model,
			{
				state: {
					game: text("classifier/game"),
					speaker: statement.agent,
					where: statement.source,
					to: [...statement.to],
					text: cut(statement.text, maxChars),
					earlierMessagesOfThisConversation: conversation,
					speakerThoughtsThisRound: ownThoughts,
				},
				questions: deciderQuestions(),
			},
			this.#options.timeoutMs === undefined ? {} : { timeoutMs: this.#options.timeoutMs },
		);
		if (result.usage !== undefined) {
			usage.push({
				provider: result.provider,
				model: result.model,
				input: result.usage.input,
				output: result.usage.output,
				cacheRead: result.usage.cacheRead,
				cacheWrite: result.usage.cacheWrite,
				costUsd: result.usage.cost.total,
			});
		}
		if (result.stopReason !== "stop") {
			errors.push(`#${statement.seq}: ${result.errorMessage ?? result.stopReason}`);
			return;
		}
		const labels = STATEMENT_LABELS.filter((label) => {
			const answer = result.answers[label];
			return answer?.type === "bool" && answer.probability >= DECIDER_THRESHOLD;
		});
		if (labels.length > 0) verdicts.push({ seq: statement.seq, labels, targets: statement.source === "dm" ? statement.to : [] });
	}
}

/** Earlier messages of the same DM pair or group, oldest first. */
export function conversationOf(statement: Statement, earlier: readonly Statement[]): readonly Statement[] {
	const key = conversationKey(statement);
	if (key === undefined) return [];
	return earlier.filter((other) => other.seq < statement.seq && conversationKey(other) === key).sort((a, b) => a.seq - b.seq);
}

/** `dm:A01|A03` for a DM pair, `group:G1` for a group; private text and the board have none. */
export function conversationKey(statement: Statement): string | undefined {
	if (statement.source === "group") return statement.group === undefined ? undefined : `group:${statement.group}`;
	if (statement.source !== "dm" && statement.source !== "cast") return undefined;
	const other = statement.to[0];
	if (other === undefined) return undefined;
	return `dm:${[statement.agent, other].sort().join("|")}`;
}

function deciderQuestions(): Record<string, ClassifierQuestion> {
	const questions: Record<string, ClassifierQuestion> = {};
	for (const label of STATEMENT_LABELS) {
		questions[label] = {
			type: "bool",
			instructions: render("classifier/question-instructions", { meaning: labelMeaning(label) }),
			criteria: { true: render("classifier/question-true", { meaning: labelMeaning(label) }), false: text("classifier/question-false") },
		};
	}
	return questions;
}

function cut(text: string, maxChars: number): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 3)}...`;
}
