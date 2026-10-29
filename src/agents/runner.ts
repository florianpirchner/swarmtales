/**
 * One competitor: a persistent pi {@link Agent} session for the whole run.
 *
 * All tools are bound and every schema reaches the model in every request, so
 * the cached prefix stays the same all run (P46); a locked call is answered
 * with `TOOL_LOCKED`. Whenever the unlocked set changes, the step's inputs
 * start with a notice that names it.
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
import type { Souffleur } from "../interpret/souffleur.ts";
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
	/** Unlocked tool names at request time; the gateway's set, announced on every change. */
	readonly enabledTools: () => readonly string[];
	/** Virtual minute; message timestamps derive from it, never from the wall clock. */
	readonly minute: () => number;
	/** Rewrites a step the provider's safeguards refused, so it can be tried again at once (P44). */
	readonly souffleur?: Souffleur;
}

/** Whether a step's error is a refusal of the provider's safeguards, not a failure of the game. */
export function isSafeguardRefusal(error: string | undefined): boolean {
	return error !== undefined && /safeguards/i.test(error);
}

/** What a refused step gets when its inputs cannot be rewritten: the resident's tools still read everything. */
export const LOST_INPUTS = "[status] The city's news for this step could not be shown. Read your status, the board and your messages with your tools.";

/** The notice that opens a step whose unlocked tools changed since the last one. */
export function toolsNotice(tools: readonly string[]): string {
	return `${TOOLS_NOTICE_HEAD}${tools.join(", ")}${TOOLS_NOTICE_TAIL}`;
}

const TOOLS_NOTICE_HEAD = "[tools] Open to you now: ";
const TOOLS_NOTICE_TAIL = ". Every other tool answers TOOL_LOCKED until a level or a phase opens it.";

/** The tools the last notice in `messages` named, as the key `#announced` keeps; a resumed run goes on from it. */
function lastAnnounced(messages: readonly AgentMessage[]): string | undefined {
	for (let at = messages.length - 1; at >= 0; at -= 1) {
		const message = messages[at];
		if (message?.role !== "user" || typeof message.content !== "string") continue;
		const { content } = message;
		if (content.startsWith(TOOLS_NOTICE_HEAD) && content.endsWith(TOOLS_NOTICE_TAIL)) {
			return content.slice(TOOLS_NOTICE_HEAD.length, -TOOLS_NOTICE_TAIL.length).split(", ").join(",");
		}
	}
	return undefined;
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
	readonly #souffleur: Souffleur | undefined;
	/** The unlocked tools the last notice named; unset until the first step. */
	#announced: string | undefined;
	/** Resolves once the current step may apply its answer. */
	#turn: Promise<void> = Promise.resolve();

	constructor(options: RunnerOptions) {
		this.id = options.id;
		this.systemPrompt = options.systemPrompt;
		this.#bus = options.bus;
		this.#enabledTools = options.enabledTools;
		this.#minute = options.minute;
		this.#souffleur = options.souffleur;
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
			onPayload: (payload) => withRequestDefaults(payload, requestDefaults),
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
		this.#announced = lastAnnounced(this.#agent.state.messages);
	}

	async step(inputs: readonly TurnInput[], slot: StepSlot): Promise<void> {
		const { pass, block } = slot;
		this.#turn = slot.turn;
		const texts = [...inputs.map((input) => input.text), ...this.#notice()];
		const error = await this.#try(texts, pass, block);
		if (!isSafeguardRefusal(error) || this.#souffleur === undefined) return;
		// The refused step is tried once more, rewritten (P44); the city's clock waits for it.
		const answer = await this.#souffleur.rewrite(texts);
		const retry = answer.ok ? answer.texts : [LOST_INPUTS];
		// A lost tools notice is sent again with the next step.
		if (!answer.ok) this.#announced = undefined;
		this.#bus.emit({ type: "souffleur_rewrite", agent: this.id, inputs: retry, ...(answer.ok ? {} : { error: answer.error }) });
		await this.#try(retry, pass, block);
	}

	/** The tools notice, when the unlocked set changed since the last one (or none was sent yet). */
	#notice(): readonly string[] {
		const tools = this.#enabledTools();
		const key = tools.join(",");
		if (key === this.#announced || tools.length === 0) return [];
		this.#announced = key;
		return [toolsNotice(tools)];
	}

	/** One model call with `texts` as new inputs; returns its error. A refused call's inputs leave the context again. */
	async #try(texts: readonly string[], pass: number, block: number): Promise<string | undefined> {
		this.#bus.emit({ type: "turn_input", agent: this.id, inputs: texts, pass, block });
		this.#bus.emit({ type: "request", agent: this.id, tools: this.#enabledTools(), pass, block });
		const timestamp = this.#minute() * 60_000;
		const messages: AgentMessage[] = texts.map((text) => ({ role: "user", content: text, timestamp }));
		const before = this.#agent.state.messages.length;
		await this.#agent.prompt(messages);
		// A step that failed before its answer was recorded logs its error in turn, too.
		await this.#turn;
		const error = this.#agent.state.errorMessage;
		if (error === undefined || error.length === 0) return undefined;
		this.#bus.emit({ type: "turn_error", agent: this.id, message: error });
		// Left in the context, a refused step's text rides along in every later request and is refused again (P44).
		if (isSafeguardRefusal(error)) this.#agent.state.messages = this.#agent.state.messages.slice(0, before);
		return error;
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

/** Merges fixed request fields (e.g. OpenRouter routing) over the provider payload. */
export function withRequestDefaults(payload: unknown, defaults: Readonly<Record<string, unknown>> | undefined): unknown {
	if (defaults === undefined || !isRecord(payload)) return payload;
	return { ...payload, ...defaults };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
