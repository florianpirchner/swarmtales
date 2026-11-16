// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The asker: the model port `AskModel` of a Director. One request per question, without a memory; the answer is the
 * JSON in the model's text (`readAnswer`), or, for a question with an answer tool, the arguments of its one call of
 * that tool, the only tool it is offered (runtime revision 8, B2). Every answer is counted on the cost meter of the run, as
 * the resident session counts (a cost that cannot be counted closes the meter), and nothing is sent once the
 * meter's limit or the actor's own limit is reached.
 */
import { normalizeContext, type AssistantMessage, type Context } from "@earendil-works/pi-ai";
import { redactSecrets, type ActorId, type AskModel, type ModelAnswer, type ModelQuestion, type RecordSource } from "@swarmtales/contracts";
import { readAnswer, readArguments } from "./answer.ts";
import { closeOnLog, isSafeguardRefusal } from "./driver/session.ts";
import type { CostMeter } from "./meter.ts";
import { RESIDENT_RECORDS, residentRecord, type ResidentRecords } from "./records.ts";
import { REQUEST_TIMEOUT_MS, withRequestDefaults } from "./request.ts";
import { MODEL_DEFAULTS } from "./settings.ts";
import type { ModelBinding, ModelSource } from "./source.ts";

/**
 * The record source of the asker: the record shapes of `RESIDENT_RECORDS` under the Director's own id. The asker
 * writes `request`, `thinking`, `text`, `response` and `request_failed`.
 *
 * @public
 */
export const DIRECTOR_MODEL_RECORDS: RecordSource = Object.freeze({ id: "@swarmtales/models/director", events: RESIDENT_RECORDS.events });

// The line after the Director's system prompt; the schema of the answer follows it.
const ANSWER_FORMAT = "Answer with one JSON value that fits this JSON schema, and with nothing else:";

type Recorder = <Type extends keyof ResidentRecords>(type: Type, payload: ResidentRecords[Type]) => void;

const none = (reason: "limit" | "invalid" | "error", detail: string): ModelAnswer => ({ ok: false, reason, detail });

/**
 * The detail of the answer to a question whose input is empty: the asker sends no request and writes no record.
 *
 * @internal
 */
export const EMPTY_QUESTION = "the question is empty: nothing was sent";

/**
 * Why nothing may be sent: the meter's limit (the cap, or a closed meter), then the actor's own limit. A limit that
 * is no amount lets nothing through.
 *
 * @param meter - The cost meter of the run.
 * @param actor - The actor that would ask.
 * @param maxCostUsd - Its own limit; left out: only the meter's.
 * @returns The reason, or undefined when a request may be sent.
 *
 * @internal
 */
export function over(meter: CostMeter, actor: ActorId, maxCostUsd: number | undefined): string | undefined {
	const run = meter.limit.check();
	if (run !== undefined || maxCostUsd === undefined) return run;
	const spent = meter.byActor[actor]?.costUsd ?? 0;
	return spent < maxCostUsd ? undefined : `cost ${spent.toFixed(4)} USD of ${actor} reached its limit of ${String(maxCostUsd)} USD`;
}

// Writes the thinking and the text of one answer.
function blocks(message: AssistantMessage, record: Recorder): void {
	for (const block of message.content) {
		if (block.type === "thinking") record("thinking", { text: block.thinking });
		if (block.type === "text") record("text", { text: block.text });
	}
}

// Counts one answer on the meter and writes `response`; false when its cost is not known, and the meter is closed
// then. The rule of the resident session: a failed request with a cost of zero was not billed, and an answer of a
// model with a price that costs zero came without its usage.
function counted(message: AssistantMessage, actor: ActorId, binding: ModelBinding, meter: CostMeter, record: Recorder): boolean {
	const { input, output, cacheRead, cacheWrite, cost } = message.usage;
	const usage = { input, output, cacheRead, cacheWrite, costUsd: cost.total };
	if (usage.costUsd === 0) {
		if (message.stopReason === "error") return true;
		const price = binding.model.cost;
		if (message.stopReason !== "aborted" && (price.input > 0 || price.output > 0)) {
			closeOnLog(meter, `an answer to ${actor} of a model with a price came without a cost`, record);
			return false;
		}
	}
	try {
		meter.add(actor, usage);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;
		if (meter.closed !== undefined) record("cost_unknown", { reason: meter.closed });
		return false;
	}
	record("response", { provider: message.provider, model: message.model, stopReason: message.stopReason, ...usage });
	return true;
}

// The value of an answer (read by `readAnswer`: the whole text, else the last object that fits the output). With an
// answer tool, the arguments of its one call are the answer; without a call the text is read as before, and a second
// call is no answer, as the old guard had it (runtime revision 8, B2).
function valueOf(message: AssistantMessage, question: ModelQuestion, costUsd: number): ModelAnswer {
	const calls = message.content.flatMap((block) => (block.type === "toolCall" && block.name === question.answerTool?.name ? [block.arguments] : []));
	if (calls.length > 1) return { ...none("invalid", `the answer called the tool ${String(question.answerTool?.name)} more than once`), costUsd };
	const read = calls.length === 1 ? readArguments(calls[0], question.output) : readAnswer(message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""), question.output);
	// An answer that cannot be read was paid for all the same (P482).
	return read.ok ? { ok: true, value: read.value, costUsd } : { ...none("invalid", read.detail), costUsd };
}

// The answer of one message: its error, or its value. `known` is false when its cost could not be counted.
function answerOf(message: AssistantMessage, question: ModelQuestion, known: boolean, failed: (message: string) => ModelAnswer): ModelAnswer {
	if (message.stopReason === "error" || message.stopReason === "aborted") return failed(redactSecrets(message.errorMessage ?? `the request ended with ${message.stopReason}`));
	if (!known) return none("error", "the cost of the answer is not known, so the answer is not used");
	return valueOf(message, question, message.usage.cost.total);
}

// The one tool of a question with an answer tool: its parameters are the output schema without its title and description.
function toolsOf(question: ModelQuestion): Pick<Context, "tools"> {
	const { answerTool, output } = question;
	if (answerTool === undefined || typeof output !== "object" || output === null) return {};
	return { tools: [{ ...answerTool, parameters: Object.fromEntries(Object.entries(output).filter(([key]) => key !== "title" && key !== "description")) }] };
}

// One request: the system prompt, with the schema of the answer when it is answered in the text, then the input; the
// fixed fields of the resident session.
async function send(binding: ModelBinding, actor: ActorId, question: ModelQuestion, tick: number): Promise<AssistantMessage> {
	const systemPrompt = question.answerTool === undefined ? `${question.system}\n\n${ANSWER_FORMAT}\n${JSON.stringify(question.output)}` : question.system;
	const context = normalizeContext({ systemPrompt, messages: [{ role: "user", content: question.input, timestamp: tick * 60_000 }], ...toolsOf(question) });
	const stream = await binding.streamFn(binding.model, context, { sessionId: actor, identity: { attribution: null }, onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults) });
	return stream.result();
}

/**
 * The asker of a live or a scripted source. An actor is bound to its model at its first question. A question whose
 * input is empty is answered `{ ok: false, reason: "error", detail: EMPTY_QUESTION }` without a request or a record
 * (the old runtime sent nothing for an empty batch). A question with `answerTool` is sent with its system text alone
 * and that one tool, whose parameters are `output` without its `title` and `description`; its answer is the
 * arguments of the call when they fit `output`, the text as without the tool when the model called none, and
 * `invalid` for two calls. A question is refused with `reason: "limit"`, and nothing is sent, when the meter's limit is breached (the cap is reached or
 * the meter is closed) or the actor has spent its `maxCostUsd`; one answer can still overshoot a limit, because a
 * cost is known only once the answer is in. An answer whose cost is not known closes the meter and is not used.
 *
 * @param source - The model source; every actor that asks is bound once.
 * @param meter - The cost meter of the run; a Director's cost counts into the run's cap.
 * @param limits - The limits of one actor; `maxCostUsd` left out: only the run's cap holds.
 * @returns The asker. It rejects only for what `bind` throws (`SWT-X007`) and for a record the kernel refuses
 * (`SWT-R017`, `SWT-X040`).
 * @example
 * ```ts
 * const ask = createAsker(source, meter, (actor) => ({ maxCostUsd: actor === "director:warden" ? 0.05 : undefined }));
 * const drivers = createDirectorDrivers({ game, ask });
 * ```
 *
 * @public
 */
export function createAsker(source: ModelSource, meter: CostMeter, limits: (actor: ActorId) => { readonly maxCostUsd?: number }): AskModel {
	const bindings = new Map<ActorId, ModelBinding>();
	return async (activation, question) => {
		const { actor } = activation;
		// An empty input is no question: a Director with nothing to ask this time, as the Confessor in a round without statements (P481).
		if (question.input === "") return none("error", EMPTY_QUESTION);
		const reached = over(meter, actor, limits(actor).maxCostUsd);
		if (reached !== undefined) return none("limit", reached);
		const binding = bindings.get(actor) ?? source.bind(actor, { maxOutputTokens: MODEL_DEFAULTS.maxOutputTokens, timeoutMs: REQUEST_TIMEOUT_MS });
		bindings.set(actor, binding);
		const record: Recorder = (type, payload) => {
			activation.record(DIRECTOR_MODEL_RECORDS.id, type, residentRecord(type, payload));
		};
		record("request", { inputs: [question.input], tools: question.answerTool === undefined ? [] : [question.answerTool.name], messages: 0 });
		const failed = (message: string): ModelAnswer => {
			record("request_failed", { message, refusal: isSafeguardRefusal(message) });
			return none("error", message);
		};
		let message: AssistantMessage;
		try {
			message = await send(binding, actor, question, activation.tick);
		} catch (error) {
			// A request that ended outside the protocol may have been paid for: fail closed.
			closeOnLog(meter, `a request of ${actor} ended without an answer that can be counted`, record);
			return failed(redactSecrets(error instanceof Error ? error.message : String(error)));
		}
		blocks(message, record);
		return answerOf(message, question, counted(message, actor, binding, meter, record), failed);
	};
}

/**
 * The offline asker: the answers of each actor in order, by the count of its questions. It asks no model, writes
 * no record and costs nothing; the value is given as it is written, so the caller's check against `output` decides.
 * The detail of a missing answer holds no count, so an actor without a list answers the same in a process resumed
 * from a snapshot as in the straight one (J235): only the answers of a list are counted, per process.
 *
 * @param script - Actor id to its answers, in order.
 * @returns The asker; an actor without a list, and a question after the last answer, get `{ ok: false, reason: "error" }`
 * with the detail `the script of <actor> has no answer`.
 * @example
 * ```ts
 * const ask = scriptedAsker({ "director:warden": [{ line: "The city has heard the proposal." }] });
 * ```
 *
 * @public
 */
export function scriptedAsker(script: Readonly<Record<string, readonly unknown[]>>): AskModel {
	const calls = new Map<ActorId, number>();
	return (activation) => {
		const { actor } = activation;
		const answers = Object.hasOwn(script, actor) ? (script[actor] ?? []) : [];
		const call = calls.get(actor) ?? 0;
		if (call >= answers.length) return Promise.resolve(none("error", `the script of ${actor} has no answer`));
		calls.set(actor, call + 1);
		return Promise.resolve({ ok: true, value: answers[call], costUsd: 0 });
	};
}
