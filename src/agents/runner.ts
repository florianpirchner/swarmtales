/**
 * One competitor: a persistent pi {@link Agent} session for the whole run.
 *
 * All tools are bound so a locked call is answered with `TOOL_LOCKED`; only
 * unlocked schemas reach the model (`onPayload` filters every request).
 *
 * A step (SPEC §3) is one model call and that call's tool executions. The
 * answer is recorded, and its tools run, only once the step's turn has come:
 * within a block the model calls run concurrently, and the turn puts what
 * they do back into the seeded order.
 */
import { Agent, type AgentMessage } from "@earendil-works/pi-agent-core";
import type { CompetitorId } from "../core/ids.ts";
import type { Competitor, StepSlot } from "../engine/arena.ts";
import type { EventBus } from "../engine/events.ts";
import type { TurnInput } from "../engine/turn-input.ts";
import type { ModelBinding } from "../model/source.ts";
import type { ThinkingLevel } from "../story/types.ts";
import type { BoundTool } from "../tools/tool.ts";

export interface RunnerOptions {
	readonly id: CompetitorId;
	readonly systemPrompt: string;
	readonly tools: readonly BoundTool[];
	readonly binding: ModelBinding;
	readonly bus: EventBus;
	readonly thinking: ThinkingLevel;
	/** Unlocked tool names at request time. */
	readonly enabledTools: () => readonly string[];
	/** Virtual minute; message timestamps derive from it, never from the wall clock. */
	readonly minute: () => number;
}

/** A message of a competitor's persistent context, as a run snapshot keeps it: anything but a system message. */
export type ContextMessage = Exclude<AgentMessage, { readonly role: "system" }>;

function isContextMessage(message: AgentMessage): message is ContextMessage {
	return message.role !== "system";
}

export class AgentRunner implements Competitor {
	readonly id: CompetitorId;
	/** Base prompt plus persona block; fixed for the whole run. */
	readonly systemPrompt: string;
	readonly #agent: Agent;
	readonly #bus: EventBus;
	readonly #enabledTools: () => readonly string[];
	readonly #minute: () => number;
	/** Resolves once the current step may apply its answer. */
	#turn: Promise<void> = Promise.resolve();

	constructor(options: RunnerOptions) {
		this.id = options.id;
		this.systemPrompt = options.systemPrompt;
		this.#bus = options.bus;
		this.#enabledTools = options.enabledTools;
		this.#minute = options.minute;
		const requestDefaults = options.binding.requestDefaults;
		this.#agent = new Agent({
			initialState: {
				systemPrompt: options.systemPrompt,
				model: options.binding.model,
				thinkingLevel: options.thinking,
				tools: [...options.tools],
			},
			streamFn: options.binding.streamFn,
			// One model call per step; the next step answers its tool results.
			finishTurn: () => ({ action: "end" }),
			// Tool calls of one step run in order (determinism).
			toolExecution: "sequential",
			onPayload: (payload) => filterToolPayload(withRequestDefaults(payload, requestDefaults), new Set(this.#enabledTools())),
			sessionId: options.id,
			identity: { attribution: null },
		});
		// pi awaits its listeners before it runs the answer's tools, so they wait for the turn, too.
		this.#agent.subscribe(async (event) => {
			if (event.type !== "message_end") return;
			if (event.message.role === "assistant") await this.#turn;
			this.#recordMessage(event.message);
		});
	}

	/** Whether the context ends with tool results the model has not answered yet. */
	get awaitsAnswer(): boolean {
		return this.#agent.state.messages.at(-1)?.role === "toolResult";
	}

	/** Number of messages in this competitor's context. */
	get contextSize(): number {
		return this.#agent.state.messages.length;
	}

	/**
	 * The persistent context for a run snapshot (SPEC 17): every message but
	 * the system messages, which carry the prompt and the tool declarations
	 * and are rebuilt from this run's own prompt and tools.
	 */
	snapshot(): readonly ContextMessage[] {
		return this.#agent.state.messages.filter(isContextMessage);
	}

	/** Continues a snapshot's context after this run's leading system message. */
	restore(messages: readonly ContextMessage[]): void {
		const system = this.#agent.state.messages.filter((message) => message.role === "system");
		this.#agent.state.messages = [...system, ...messages.filter(isContextMessage)];
	}

	async step(inputs: readonly TurnInput[], slot: StepSlot): Promise<void> {
		const { pass, block } = slot;
		this.#turn = slot.turn;
		this.#bus.emit({ type: "turn_input", agent: this.id, inputs: inputs.map((input) => input.text), pass, block });
		this.#bus.emit({ type: "request", agent: this.id, tools: this.#enabledTools(), pass, block });
		const timestamp = this.#minute() * 60_000;
		const messages: AgentMessage[] = inputs.map((input) => ({ role: "user", content: input.text, timestamp }));
		await this.#agent.prompt(messages);
		// A step that failed before its answer was recorded logs its error in turn, too.
		await this.#turn;
		const error = this.#agent.state.errorMessage;
		if (error !== undefined && error.length > 0) this.#bus.emit({ type: "turn_error", agent: this.id, message: error });
	}

	#recordMessage(message: AgentMessage): void {
		if (message.role === "assistant") {
			for (const block of message.content) {
				if (block.type === "thinking") this.#bus.emit({ type: "thinking", agent: this.id, text: block.thinking });
				if (block.type === "text") this.#bus.emit({ type: "text", agent: this.id, text: block.text });
				if (block.type === "toolCall") {
					this.#bus.emit({ type: "tool_call", agent: this.id, tool: block.name, args: block.arguments });
				}
			}
			this.#bus.emit({
				type: "usage",
				agent: this.id,
				provider: message.provider,
				model: message.model,
				input: message.usage.input,
				output: message.usage.output,
				cacheRead: message.usage.cacheRead,
				cacheWrite: message.usage.cacheWrite,
				costUsd: message.usage.cost.total,
			});
		}
		if (message.role === "toolResult") {
			const text = message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
			this.#bus.emit({ type: "tool_result", agent: this.id, tool: message.toolName, isError: message.isError, text });
		}
	}
}

/** Removes locked tool schemas from a request, so they never leave the process. */
export function filterToolPayload(payload: unknown, enabled: ReadonlySet<string>): unknown {
	if (!isRecord(payload)) return payload;
	const tools = payload.tools;
	if (!Array.isArray(tools)) return payload;
	const kept = tools.filter((entry: unknown) => {
		const name = toolNameOf(entry);
		return name !== undefined && enabled.has(name);
	});
	return { ...payload, tools: kept };
}

/** Merges fixed request fields (e.g. OpenRouter routing) over the provider payload. */
export function withRequestDefaults(payload: unknown, defaults: Readonly<Record<string, unknown>> | undefined): unknown {
	if (defaults === undefined || !isRecord(payload)) return payload;
	return { ...payload, ...defaults };
}

function toolNameOf(entry: unknown): string | undefined {
	if (!isRecord(entry)) return undefined;
	const fn = entry.function;
	if (isRecord(fn) && typeof fn.name === "string") return fn.name;
	return typeof entry.name === "string" ? entry.name : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
