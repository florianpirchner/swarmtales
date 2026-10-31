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
import type { CompetitorId } from "@swarmtales/kernel";
import type { Competitor, Souffleur, StepSlot, ThinkingLevel, TurnInput } from "@swarmtales/contracts";
import type { BoundTool, EventBus } from "@swarmtales/engine";
import { type ModelBinding, withRequestDefaults } from "@swarmtales/models";
import { render, text } from "@swarmtales/prompts";

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
	/** Lines due once at the end of the next step's inputs (the weaver's inner voices). */
	readonly innerVoice?: InnerVoice;
	/**
	 * A story that shows only its own tools (`toolScope: "story"`): the bound
	 * tool for a name the city opens later. It joins the context before the
	 * next request (pi declares it in a system message), once.
	 */
	readonly lateTool?: (name: string) => BoundTool | undefined;
}

/** The weaver's queue of inner voices for one resident. */
export interface InnerVoice {
	/** Takes the voices due now; taking them empties the queue. */
	take(): readonly string[];
	/** Puts back voices a step took but the model never kept (a refused step, or inputs the souffleur lost). */
	giveBack(voices: readonly string[]): void;
}

/** Whether a step's error is a refusal of the provider's safeguards, not a failure of the game. */
export function isSafeguardRefusal(error: string | undefined): boolean {
	return error !== undefined && /safeguards/i.test(error);
}

/** What a refused step gets when its inputs cannot be rewritten: the resident's tools still read everything. */
export const LOST_INPUTS = text("competitor/input/lost-inputs");

/** The notice that opens a step whose unlocked tools changed since the last one. */
export function toolsNotice(tools: readonly string[]): string {
	return render("competitor/input/tools-notice", { tools: tools.join(", ") });
}

/** The fixed text before and after the tool list in the notice, so a resumed run can read the list back. */
const [TOOLS_NOTICE_HEAD = "", TOOLS_NOTICE_TAIL = ""] = render("competitor/input/tools-notice", { tools: "\u0000" }).split("\u0000");

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
	readonly #agent: Agent;
	/** Base prompt plus persona block; fixed unless the weaver rewrites who the resident is. */
	#systemPrompt: string;
	readonly #bus: EventBus;
	readonly #enabledTools: () => readonly string[];
	readonly #minute: () => number;
	readonly #souffleur: Souffleur | undefined;
	readonly #innerVoice: InnerVoice | undefined;
	readonly #lateTool: ((name: string) => BoundTool | undefined) | undefined;
	/** The unlocked tools the last notice named; unset until the first step. */
	#announced: string | undefined;
	/** Resolves once the current step may apply its answer. */
	#turn: Promise<void> = Promise.resolve();

	constructor(options: RunnerOptions) {
		this.id = options.id;
		this.#systemPrompt = options.systemPrompt;
		this.#bus = options.bus;
		this.#enabledTools = options.enabledTools;
		this.#minute = options.minute;
		this.#souffleur = options.souffleur;
		this.#innerVoice = options.innerVoice;
		this.#lateTool = options.lateTool;
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

	get systemPrompt(): string {
		return this.#systemPrompt;
	}

	/**
	 * Replaces the prompt of the leading system message (the weaver's hard
	 * shift). The tool declarations stay; the cached prefix misses once. A
	 * snapshot keeps no system messages, so a resumed run rewrites it again
	 * from the same facts.
	 */
	rewriteSystemPrompt(prompt: string): void {
		if (prompt === this.#systemPrompt) return;
		this.#systemPrompt = prompt;
		const [first, ...rest] = this.#agent.state.messages;
		if (first?.role === "system") this.#agent.state.messages = [{ ...first, content: prompt }, ...rest];
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
		// The tools notice and the inner voice come last, after everything the city shows.
		const voices = this.#innerVoice?.take() ?? [];
		const texts = [...inputs.map((input) => input.text), ...this.#notice(), ...voices];
		const error = await this.#try(texts, pass, block);
		if (!isSafeguardRefusal(error)) return;
		// A refused step's inputs left the context again: its inner voices are heard with a later step.
		if (this.#souffleur === undefined) {
			this.#innerVoice?.giveBack(voices);
			return;
		}
		// The refused step is tried once more, rewritten (P44); the city's clock waits for it.
		const answer = await this.#souffleur.rewrite(texts);
		const retry = answer.ok ? answer.texts : [LOST_INPUTS];
		// A lost tools notice and lost inner voices are sent again with the next step.
		if (!answer.ok) {
			this.#announced = undefined;
			this.#innerVoice?.giveBack(voices);
		}
		this.#bus.emit({ type: "souffleur_rewrite", agent: this.id, inputs: retry, ...(answer.ok ? {} : { error: answer.error }) });
		const again = await this.#try(retry, pass, block);
		if (answer.ok && isSafeguardRefusal(again)) this.#innerVoice?.giveBack(voices);
	}

	/** The names of the tools this resident's model sees. */
	get boundTools(): readonly string[] {
		return this.#agent.state.tools.map((tool) => tool.name);
	}

	/**
	 * Binds every unlocked tool the model has not seen yet (`lateTool`). pi
	 * declares the additions before the next request, so the cached prefix
	 * stays as it was up to there.
	 */
	#bindLate(tools: readonly string[]): void {
		const lookup = this.#lateTool;
		if (lookup === undefined) return;
		const bound = new Set(this.boundTools);
		const added = tools.filter((name) => !bound.has(name)).flatMap((name) => {
			const tool = lookup(name);
			return tool === undefined ? [] : [tool];
		});
		if (added.length > 0) this.#agent.state.tools = [...this.#agent.state.tools, ...added];
	}

	/** The tools notice, when the unlocked set changed since the last one (or none was sent yet). */
	#notice(): readonly string[] {
		const tools = this.#enabledTools();
		this.#bindLate(tools);
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
