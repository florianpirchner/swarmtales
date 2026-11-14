// SPDX-License-Identifier: Apache-2.0
/**
 * The resident session: one persistent agent of the provider library for one resident, and one model request per
 * activation. A port of the old resident runner's turn: the tool calls of an answer run in order through
 * `activation.call`, the next activation answers their results, a failed request is recorded and the run goes on,
 * and a step the provider's safeguards refused leaves the context again (P44). The tools notice and the late
 * tools are the assembly's; they reach a step through {@link StepFrame} and {@link ResidentSession.declare}.
 */
import { Agent, type AgentMessage, type AgentTool, type AgentToolResult } from "@earendil-works/pi-agent-core";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { Activation, ActorId, DriverResult, Redact, ToolOutcome, ToolSpec } from "@swarmtales/contracts";
import { callOutsideActivation, thrown } from "../errors.ts";
import type { CostMeter } from "../meter.ts";
import { RESIDENT_RECORDS, residentRecord, type ResidentRecords } from "../records.ts";
import { withRequestDefaults } from "../request.ts";
import type { ThinkingLevel } from "../settings.ts";
import type { ModelBinding } from "../source.ts";

/**
 * The kind of an input line that asks for a context reset: the conversation is dropped (the system prompt stays)
 * before the inputs of that activation enter it.
 *
 * @public
 */
export const CONTEXT_RESET_KIND = "context-reset";

/**
 * The text a model reads for a tool's outcome: the reply, or `CODE: detail`, or the bare code without a detail.
 *
 * @param outcome - What the kernel answered.
 * @returns The text of the tool result.
 *
 * @public
 */
export function outcomeText(outcome: ToolOutcome): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/**
 * Tells whether an error text is a refusal of the provider's safeguards, not a failure of the game.
 *
 * @param error - The error text of a request; `undefined` for none.
 * @returns True when the text names the safeguards.
 *
 * @public
 */
export function isSafeguardRefusal(error: string | undefined): boolean {
	return error !== undefined && /safeguards/i.test(error);
}

/**
 * Tells whether an activation asks for a context reset.
 *
 * @param activation - The activation.
 * @returns True when one of its input lines has the kind {@link CONTEXT_RESET_KIND}.
 *
 * @public
 */
export function asksReset(activation: Activation): boolean {
	return activation.inputs.some((note) => note.kind === CONTEXT_RESET_KIND);
}

/**
 * What a session is made of.
 *
 * @public
 */
export interface SessionInput {
	/** The resident; its id is the session id a provider keys its cache by. */
	readonly actor: ActorId;
	/** The system prompt, fixed for the run. */
	readonly systemPrompt: string;
	/** The tools declared to the model at the start. */
	readonly tools: readonly ToolSpec[];
	/** The model and its stream function. */
	readonly binding: ModelBinding;
	/** How much the model thinks. */
	readonly thinking: ThinkingLevel;
	/** The cost meter: every answer is counted there, and nothing is sent once its cap is reached. */
	readonly meter: CostMeter;
	/** Takes secrets out of the error text of a failed request. */
	readonly redact: Redact;
}

/**
 * What the assembly adds to one step.
 *
 * @public
 */
export interface StepFrame {
	/** The shown names of the tools open now, in grant order; written to the `request` record. */
	readonly open: readonly string[];
	/** Texts sent after the activation's inputs (the tools notice); left out: none. */
	readonly notice?: readonly string[];
}

/**
 * One resident's conversation with its model, for the whole run.
 *
 * @public
 */
export interface ResidentSession {
	/** True when the context ends with tool results the model has not answered. */
	readonly pending: boolean;
	/** The length of the context, without the system messages. */
	readonly messages: number;
	/** The names of the tools the model was declared, in the order declared. */
	readonly declared: readonly string[];
	/**
	 * Declares tools that opened later; the model sees them from the next request on.
	 *
	 * @param specs - The tools; one that is declared already is left out.
	 */
	declare(specs: readonly ToolSpec[]): void;
	/**
	 * Plays one activation: at most one model request, with all tool calls of its answer awaited, so nothing is
	 * called after the activation closed. Without an input, a notice or an unanswered tool result nothing is sent
	 * and nothing is recorded (P76); at or above the cost cap nothing is sent either.
	 *
	 * @param activation - The activation; its input texts are the new inputs, its `call` runs the tools.
	 * @param frame - The open tools and the notice of this step.
	 * @returns Whether the model still has tool results to answer.
	 * @throws SwtError `SWT-X040` when a record does not match its schema, `SWT-R017` when the record source is not declared.
	 */
	step(activation: Activation, frame: StepFrame): Promise<DriverResult>;
}

// The mutable part of a session: the activation of the running step; tool calls and records go through it.
interface Live {
	activation: Activation | undefined;
}

type Recorder = <Type extends keyof ResidentRecords>(type: Type, payload: ResidentRecords[Type]) => void;

const isSystem = (message: AgentMessage): boolean => message.role === "system";

function toolResult(outcome: ToolOutcome): AgentToolResult<undefined> {
	const content: AgentToolResult<undefined>["content"] = [{ type: "text", text: outcomeText(outcome) }];
	return outcome.ok ? { content, details: undefined } : { content, details: undefined, isError: true };
}

function agentTool(spec: ToolSpec, input: SessionInput, live: Live): AgentTool {
	return {
		name: spec.name,
		label: spec.name,
		description: spec.description,
		parameters: spec.parameters,
		execute: async (_id: string, params: unknown) => {
			// Erratum O18: a call never leaves a session whose activation has closed.
			if (live.activation === undefined) throw thrown(callOutsideActivation(input.actor), input.redact);
			return toolResult(await live.activation.call(spec.name, params));
		},
	};
}

// What a cost of exactly zero means. A failed request: not billed. An answer of a model with a price (every live
// one has, `SWT-X007`; a scripted one has none): the usage is missing. A cost that is no amount is never "zero".
function zeroCost(message: AssistantMessage, binding: ModelBinding): "none" | "unbilled" | "missing" {
	if (message.usage.cost.total !== 0) return "none";
	if (message.stopReason === "error") return "unbilled";
	const { input, output } = binding.model.cost;
	return message.stopReason !== "aborted" && (input > 0 || output > 0) ? "missing" : "none";
}

// The records of one answer: its thinking and text blocks, then its usage, which also goes to the meter. A failed
// request is "answered" only when the provider billed it.
function recordAnswer(message: AgentMessage, input: SessionInput, record: Recorder): void {
	if (message.role !== "assistant") return;
	for (const block of message.content) {
		if (block.type === "thinking") record("thinking", { text: block.thinking });
		if (block.type === "text") record("text", { text: block.text });
	}
	const { input: tokens, output, cacheRead, cacheWrite, cost } = message.usage;
	const zero = zeroCost(message, input.binding);
	if (zero === "unbilled") return;
	// A paid answer without a cost: the meter closes (fail closed). A cost that is no amount closes it in `add`.
	if (zero === "missing") {
		input.meter.close(`an answer to ${input.actor} of a model with a price came without a cost`);
		return;
	}
	const usage = { input: tokens, output, cacheRead, cacheWrite, costUsd: cost.total };
	input.meter.add(input.actor, usage);
	record("response", { provider: message.provider, model: message.model, stopReason: message.stopReason, ...usage });
}

function createAgent(input: SessionInput, live: Live, record: Recorder): Agent {
	const { binding } = input;
	const agent = new Agent({
		initialState: { systemPrompt: input.systemPrompt, model: binding.model, thinkingLevel: input.thinking, tools: input.tools.map((spec) => agentTool(spec, input, live)) },
		streamFn: binding.streamFn,
		// One model request per activation; the next activation answers its tool results.
		finishTurn: () => ({ action: "end" }),
		// The tool calls of one answer run in order (determinism).
		toolExecution: "sequential",
		onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults),
		sessionId: input.actor,
		identity: { attribution: null },
	});
	agent.subscribe((event) => {
		if (event.type === "message_end") recordAnswer(event.message, input, record);
	});
	return agent;
}

// One model request with `texts` as the new inputs. A refused request's inputs leave the context again: left in,
// the refused text rides along in every later request and is refused again (P44).
async function request(agent: Agent, texts: readonly string[], activation: Activation, input: SessionInput, record: Recorder): Promise<void> {
	const timestamp = activation.tick * 60_000;
	const before = agent.state.messages.length;
	await agent.prompt(texts.map((content): AgentMessage => ({ role: "user", content, timestamp })));
	const error = agent.state.errorMessage;
	if (error === undefined || error.length === 0) return;
	const refusal = isSafeguardRefusal(error);
	record("request_failed", { message: input.redact(error), refusal });
	if (refusal) agent.state.messages = agent.state.messages.slice(0, before);
}

/**
 * The session of one resident. The fixed fields of the old runner are carried: the session id is the resident's
 * id, no attribution is sent, and the binding's fixed request fields are merged over every payload.
 *
 * @param input - The resident, its prompt, its first tools, its model, the meter and the redaction.
 * @returns The session.
 * @example
 * ```ts
 * const session = createResidentSession({ actor, systemPrompt, tools, binding: source.bind(actor, limits), thinking: "medium", meter, redact });
 * const driver: ActorDriver = (activation) => session.step(activation, { open: kernel.openTools(actor) });
 * ```
 *
 * @public
 */
export function createResidentSession(input: SessionInput): ResidentSession {
	const live: Live = { activation: undefined };
	const record: Recorder = (type, payload) => {
		live.activation?.record(RESIDENT_RECORDS.id, type, residentRecord(type, payload));
	};
	const agent = createAgent(input, live, record);
	const context = (): number => agent.state.messages.filter((message) => !isSystem(message)).length;
	const pending = (): boolean => agent.state.messages.at(-1)?.role === "toolResult";
	const step = async (activation: Activation, frame: StepFrame): Promise<DriverResult> => {
		// The one place of the cap is the meter (4.3): at or above it nothing is sent, and the kernel ends the run.
		if (input.meter.limit.check() !== undefined) return { pending: pending() };
		live.activation = activation;
		try {
			if (asksReset(activation)) {
				record("context_reset", { messages: context() });
				agent.state.messages = agent.state.messages.filter(isSystem);
			}
			const texts = [...activation.inputs.map((note) => note.text), ...(frame.notice ?? [])];
			// No new input and no tool result to answer: the context ends with the resident's own answer, and a provider refuses such a request (P76).
			if (texts.length === 0 && !pending()) return { pending: false };
			record("request", { inputs: texts, tools: [...frame.open], messages: context() });
			await request(agent, texts, activation, input, record);
			return { pending: pending() };
		} finally {
			live.activation = undefined;
		}
	};
	return Object.freeze({
		get pending(): boolean {
			return pending();
		},
		get messages(): number {
			return context();
		},
		get declared(): readonly string[] {
			return agent.state.tools.map((tool) => tool.name);
		},
		declare: (specs: readonly ToolSpec[]): void => {
			const known = new Set(agent.state.tools.map((tool) => tool.name));
			const added = specs.filter((spec) => !known.has(spec.name)).map((spec) => agentTool(spec, input, live));
			if (added.length > 0) agent.state.tools = [...agent.state.tools, ...added];
		},
		step,
	});
}
