/**
 * The classifier overseer's model runtimes (step 18, team R3). Two backends answer one definition
 * (`classifier`, `overseer/classifier.ts`) in the same `items` shape (`ref`, `labels`, `targets`):
 *
 * - {@link classifierRuntime}: a chat model labels one batch through the `label` tool, the old
 *   `ChatStatementClassifier`.
 * - {@link deciderRuntime}: a structured classifier model answers one yes/no question per label for
 *   every statement of the batch, the old `DeciderStatementClassifier`. The call carries the batch as
 *   text only, so the runtime reads the statements back from the host log by the `#seq` of each line
 *   (everything after the statements heading is the batch, the lines between the context heading
 *   and the statements heading are context).
 *
 * Both write the old `usage` lines (agent `CL`) through `host.record`. An answer is whole or failed
 * (C1-7): when any request of the decider failed, the call fails and the round is retried as before;
 * the old classifier labelled the other statements and wrote one `interpretation_error` per failure.
 */
import type { ClassifierApi, ClassifierModel, ClassifierQuestion, Models } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { ModelBinding } from "@swarmtales/models";
import type { Host, OverseerCall, OverseerReply, OverseerRuntime, ThinkingLevel, ClassifierUsage } from "@swarmtales/contracts";
import { render, text, type PlainPromptId } from "@swarmtales/prompts";
import { LABELS, type Label } from "./classifier.ts";
import { chatAnswer, recordUsage, replyOf, type RuntimeHost } from "./chat-answer.ts";
import { conversationKey, statementOf, type Statement } from "./statements.ts";

/** ID of the classifier in usage records (the old `CLASSIFIER_ID`). */
export const CLASSIFIER_AGENT = "CL";
/** The definition both runtimes answer. */
const CLASSIFIER = "classifier";

const Items = Type.Object({ items: Type.Array(Type.Unknown()) });

export interface ClassifierRuntimeOptions {
	readonly host: RuntimeHost;
	readonly binding: ModelBinding;
	readonly thinking: ThinkingLevel;
}

/** The label a model is written under in every `interpretation` (`<provider>/<model>`), from the model the binding resolved. */
export function classifierLabel(binding: ModelBinding): string {
	return `${binding.model.provider}/${binding.model.id}`;
}

function refused(call: OverseerCall): OverseerReply {
	return { ok: false, error: `the classifier runtime does not run ${call.definition}`, costUsd: 0 };
}

/** One chat call per batch; the model answers through the `label` tool. Several calls of the tool in one turn are one answer. */
export function classifierRuntime(options: ClassifierRuntimeOptions): OverseerRuntime {
	const { host, binding } = options;
	return {
		async ask(call: OverseerCall): Promise<OverseerReply> {
			if (call.definition !== CLASSIFIER) return refused(call);
			const result = await chatAnswer({
				binding,
				thinking: options.thinking,
				system: call.system,
				input: call.input,
				agent: CLASSIFIER_AGENT,
				tool: { name: "label", description: text("classifier/tool-label"), parameters: call.answerSchema },
				answer: call.answerSchema,
				merge: (answers) => {
					const items = answers.flatMap((answer) => (Check(Items, answer) ? answer.items : []));
					const [first] = answers;
					return typeof first === "object" && first !== null ? { ...first, items } : { items };
				},
				minute: host.minute,
				invalid: "the label call had invalid arguments",
				missing: "the model answered without calling label",
				twice: "the classifier answered twice",
			});
			return replyOf(host, call.name, CLASSIFIER_AGENT, result);
		},
	};
}

/** Probability from which a decider's yes counts. */
export const DECIDER_THRESHOLD = 0.5;
/** Decider requests in flight at once. */
const DECIDER_CONCURRENCY = 4;
/** Characters of one statement shown to the decider (the story's `classifier.maxChars`). */
export const DEFAULT_DECIDER_CHARS = 1_500;

export interface DeciderRuntimeOptions {
	/** The log is where the statements of a batch are read back from. */
	readonly host: Pick<Host, "record" | "minute" | "log" | "residents">;
	readonly models: Models;
	readonly model: ClassifierModel<ClassifierApi>;
	readonly maxChars?: number;
	readonly timeoutMs?: number;
}

const LABEL_PROMPTS = {
	promise: "classifier/label-promise",
	offer: "classifier/label-offer",
	threat: "classifier/label-threat",
	refusal: "classifier/label-refusal",
	lie: "classifier/label-lie",
	hesitation: "classifier/label-hesitation",
	helpRequest: "classifier/label-helpRequest",
	accusation: "classifier/label-accusation",
	thanks: "classifier/label-thanks",
} as const satisfies Record<Label, PlainPromptId>;

function deciderQuestions(): Record<string, ClassifierQuestion> {
	const questions: Record<string, ClassifierQuestion> = {};
	for (const label of LABELS) {
		const meaning = text(LABEL_PROMPTS[label]);
		questions[label] = {
			type: "bool",
			instructions: render("classifier/question-instructions", { meaning }),
			criteria: { true: render("classifier/question-true", { meaning }), false: text("classifier/question-false") },
		};
	}
	return questions;
}

function cut(value: string, maxChars: number): string {
	const flat = value.replace(/\s+/g, " ").trim();
	return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 3)}...`;
}

/** The `#seq` a batch line starts with. */
function refOf(line: string): number | undefined {
	const found = /^#(\d+) /.exec(line);
	return found?.[1] === undefined ? undefined : Number(found[1]);
}

/** The batch of a call: its context and its statements, read from the call's text and the host log. */
function batchOf(options: DeciderRuntimeOptions, input: string): { readonly context: readonly Statement[]; readonly statements: readonly Statement[] } | undefined {
	const heading = text("classifier/statements-heading");
	const contextHeading = text("classifier/context-heading");
	const lines = input.split("\n");
	const at = lines.indexOf(heading);
	if (at < 0) return undefined;
	const competitors = new Set(options.host.residents);
	const bySeq = new Map(options.host.log.all().map((event) => [event.seq, event]));
	const read = (selected: readonly string[]): Statement[] =>
		selected.flatMap((line) => {
			const ref = refOf(line);
			const event = ref === undefined ? undefined : bySeq.get(ref);
			const statement = event === undefined ? undefined : statementOf(event, (id) => competitors.has(id));
			return statement === undefined ? [] : [statement];
		});
	const contextAt = lines.indexOf(contextHeading);
	return { context: contextAt >= 0 && contextAt < at ? read(lines.slice(contextAt + 1, at)) : [], statements: read(lines.slice(at + 1)) };
}

/** Earlier messages of the same DM pair or group, oldest first. */
function conversationOf(statement: Statement, earlier: readonly Statement[]): readonly Statement[] {
	const key = conversationKey(statement);
	if (key === undefined) return [];
	return earlier.filter((other) => other.seq < statement.seq && conversationKey(other) === key).sort((a, b) => a.seq - b.seq);
}

/**
 * One structured request per statement: the state is the statement and the speaker's own thoughts of
 * the round, the questions are one yes/no per label. Deciders name no targets; a DM's recipient is
 * its target.
 */
export function deciderRuntime(options: DeciderRuntimeOptions): OverseerRuntime {
	const { host, models, model } = options;
	const maxChars = options.maxChars ?? DEFAULT_DECIDER_CHARS;
	return {
		async ask(call: OverseerCall): Promise<OverseerReply> {
			if (call.definition !== CLASSIFIER) return refused(call);
			const batch = batchOf(options, call.input);
			if (batch === undefined) return { ok: false, error: "the classifier call holds no statements heading", costUsd: 0 };
			const items: { ref: number; labels: string[]; targets: string[] }[] = [];
			const usage: ClassifierUsage[] = [];
			const errors: string[] = [];
			const queue = [...batch.statements];
			const classifyOne = async (statement: Statement): Promise<void> => {
				const conversation = conversationOf(statement, [...batch.context, ...batch.statements.filter((other) => other.seq < statement.seq)]).map((other) => `${other.agent}: ${cut(other.text, maxChars)}`);
				const ownThoughts = batch.statements.filter((other) => other.agent === statement.agent && other.seq !== statement.seq && other.source === "thought").map((other) => cut(other.text, maxChars));
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
					options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs },
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
					errors.push(`#${String(statement.seq)}: ${result.errorMessage ?? result.stopReason}`);
					return;
				}
				const labels = LABELS.filter((label) => {
					const answer = result.answers[label];
					return answer?.type === "bool" && answer.probability >= DECIDER_THRESHOLD;
				});
				if (labels.length > 0) items.push({ ref: statement.seq, labels: [...labels], targets: statement.source === "dm" ? [...statement.to] : [] });
			};
			const worker = async (): Promise<void> => {
				for (let statement = queue.shift(); statement !== undefined; statement = queue.shift()) {
					try {
						await classifyOne(statement);
					} catch (error) {
						errors.push(`#${String(statement.seq)}: ${error instanceof Error ? error.message : String(error)}`);
					}
				}
			};
			await Promise.all(Array.from({ length: Math.min(DECIDER_CONCURRENCY, queue.length) }, () => worker()));
			items.sort((a, b) => a.ref - b.ref);
			recordUsage(host, call.name, CLASSIFIER_AGENT, usage);
			const costUsd = usage.reduce((total, entry) => total + entry.costUsd, 0);
			if (errors.length > 0) return { ok: false, error: errors.join("; "), costUsd };
			return { ok: true, answer: { items }, costUsd, by: "model" };
		},
	};
}
