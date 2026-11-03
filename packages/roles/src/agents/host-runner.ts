/**
 * One resident on the new host (step 18, team R1): the old `AgentRunner` (deleted after step 18; its
 * differential is recorded in `test/fixtures/old-engine/agents-host-runner.json.gz`) with the host in place
 * of `World` and the `EventBus`. A persistent pi {@link Agent} session for the whole run; every tool
 * the run binds reaches the model in every request, so the cached prefix stays the same all run
 * (P46); a call runs through the host's pipeline as this resident (`Turn.call`), which answers a
 * locked one with `TOOL_LOCKED`.
 *
 * The runner writes the old app events through the host (`Host.record`), in the old order and text:
 * `turn_input` and `request` when the turn starts (before any member of the block acts, as the old
 * runner wrote them when the arena handed it its inputs), then per model message `thinking`,
 * `text`, `tool_call`, `usage` once the turn's `ready` resolved, per tool result `tool_result`, and
 * `turn_error` when the model failed; `souffleur_rewrite` before a refused step is tried again. The
 * host declares them with {@link RESIDENT_APP_EVENTS}.
 *
 * A step's inputs are the app's leading lines (the figure cues), the mechanics' turn inputs, the
 * tools notice when the open set changed (sorted as the old catalog, `TOOL_NAMES`), and the inner
 * voices last.
 */
import { Agent, type AgentMessage, type AgentTool, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { TOOL_NAMES, type EventSchemas, type ResidentId, type Souffleur, type ThinkingLevel, type ToolOutcome, type ToolSpec, type Turn } from "@swarmtales/contracts";
import { withRequestDefaults, type ModelBinding } from "@swarmtales/models";
import { SOUFFLEUR_ID } from "../interpret/souffleur.ts";
import { render, text } from "@swarmtales/prompts";

const Usage = Type.Object({
	agent: Type.String(),
	provider: Type.String(),
	model: Type.String(),
	input: Type.Number(),
	output: Type.Number(),
	cacheRead: Type.Number(),
	cacheWrite: Type.Number(),
	costUsd: Type.Number(),
});

/** The app events the resident runner writes; the host must declare them (`HostOptions.app.events`). */
export const RESIDENT_APP_EVENTS = {
	turn_input: Type.Object({ agent: Type.String(), inputs: Type.Array(Type.String()), pass: Type.Integer(), block: Type.Integer() }),
	request: Type.Object({ agent: Type.String(), tools: Type.Array(Type.String()), pass: Type.Integer(), block: Type.Integer() }),
	thinking: Type.Object({ agent: Type.String(), text: Type.String() }),
	text: Type.Object({ agent: Type.String(), text: Type.String() }),
	tool_call: Type.Object({ agent: Type.String(), tool: Type.String(), args: Type.Unknown() }),
	tool_result: Type.Object({ agent: Type.String(), tool: Type.String(), isError: Type.Boolean(), text: Type.String() }),
	turn_error: Type.Object({ agent: Type.String(), message: Type.String() }),
	souffleur_rewrite: Type.Object({ agent: Type.String(), inputs: Type.Array(Type.String()), error: Type.Optional(Type.String()) }),
	usage: Usage,
	agent_profile: Type.Object({ agent: Type.String(), provider: Type.String(), model: Type.String(), persona: Type.Optional(Type.String()) }),
} satisfies EventSchemas;

export type ResidentAppEvent = keyof typeof RESIDENT_APP_EVENTS;

/** A tool list in the old catalog's order (`TOOL_NAMES`); names the catalog does not know follow in their own order. */
export function inCatalogOrder(tools: readonly string[]): readonly string[] {
	const rank = (tool: string): number => {
		const at = TOOL_NAMES.findIndex((name) => name === tool);
		return at < 0 ? TOOL_NAMES.length : at;
	};
	return [...tools].sort((a, b) => rank(a) - rank(b));
}

/** The text a model reads for a tool's outcome: the reply, or `CODE: detail` (the bare code without a detail), as the old gateway answered. */
export function outcomeText(outcome: ToolOutcome): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

function toolResult(outcome: ToolOutcome): AgentToolResult<undefined> {
	const content: AgentToolResult<undefined>["content"] = [{ type: "text", text: outcomeText(outcome) }];
	return outcome.ok ? { content, details: undefined } : { content, details: undefined, isError: true };
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
export function lastAnnounced(messages: readonly AgentMessage[]): string | undefined {
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

export interface HostRunnerOptions {
	readonly id: ResidentId;
	readonly systemPrompt: string;
	/** The tools the model sees from the start (every granted one, or a story-scoped subset). */
	readonly tools: readonly ToolSpec[];
	readonly binding: ModelBinding;
	readonly thinking: ThinkingLevel;
	/** Writes an app event as this resident now (`Host.record`); the runner calls it only where the old runner wrote. */
	readonly record: (type: ResidentAppEvent, payload: unknown) => void;
	/** The tools open to this resident now (`Host.openTools`), in any order; the runner sorts them as the old catalog. */
	readonly openTools: () => readonly string[];
	/** Rewrites a step the provider's safeguards refused, so it can be tried again at once (P44). */
	readonly souffleur?: Souffleur;
	/** Lines due once at the end of the next step's inputs (the weaver's inner voices). */
	readonly innerVoice?: InnerVoice;
	/**
	 * A story that shows only its own tools (`toolScope: "story"`): the spec of a tool the city
	 * opens later. It joins the context before the next request (pi declares it in a system message), once.
	 */
	readonly lateTool?: (name: string) => ToolSpec | undefined;
	/** Reports a model reply's cost to the host's referee (`Host.recordCost`). */
	readonly recordCost?: (usd: number) => void;
}

export class HostResidentRunner {
	readonly id: ResidentId;
	readonly #agent: Agent;
	#systemPrompt: string;
	readonly #options: HostRunnerOptions;
	/** The unlocked tools the last notice named; unset until the first step. */
	#announced: string | undefined;
	/** The turn of the step running now; tool calls go through it. */
	#turn: Turn | undefined;

	constructor(options: HostRunnerOptions) {
		this.id = options.id;
		this.#options = options;
		this.#systemPrompt = options.systemPrompt;
		const requestDefaults = options.binding.requestDefaults;
		this.#agent = new Agent({
			initialState: {
				systemPrompt: options.systemPrompt,
				model: options.binding.model,
				thinkingLevel: options.thinking,
				tools: options.tools.map((spec) => this.#tool(spec)),
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
			if (event.message.role === "assistant") await this.#ready();
			this.#recordMessage(event.message);
		});
	}

	get systemPrompt(): string {
		return this.#systemPrompt;
	}

	/** Replaces the prompt of the leading system message (the weaver's hard shift); the tool declarations stay. */
	rewriteSystemPrompt(prompt: string): void {
		if (prompt === this.#systemPrompt) return;
		this.#systemPrompt = prompt;
		const [first, ...rest] = this.#agent.state.messages;
		if (first?.role === "system") this.#agent.state.messages = [{ ...first, content: prompt }, ...rest];
	}

	/** Whether the context ends with tool results the model has not answered yet (`HostOptions.awaitsAnswer`). */
	get awaitsAnswer(): boolean {
		return this.#agent.state.messages.at(-1)?.role === "toolResult";
	}

	/** Number of messages in this resident's context. */
	get contextSize(): number {
		return this.#agent.state.messages.length;
	}

	/** The names of the tools this resident's model sees. */
	get boundTools(): readonly string[] {
		return this.#agent.state.tools.map((tool) => tool.name);
	}

	/** The persistent context for a run snapshot: every message but the system messages. */
	snapshot(): readonly ContextMessage[] {
		return this.#agent.state.messages.filter((message): message is ContextMessage => message.role !== "system");
	}

	/** Continues a snapshot's context after this run's leading system message. */
	restore(messages: readonly ContextMessage[]): void {
		const system = this.#agent.state.messages.filter((message) => message.role === "system");
		this.#agent.state.messages = [...system, ...messages];
		this.#announced = lastAnnounced(this.#agent.state.messages);
	}

	/**
	 * One step of the host's turn: `leading` (the figure cues) before the turn's inputs. The
	 * `turn_input` and `request` lines are written before the first await, so in a block they come
	 * in the block's order before any member acts.
	 */
	async step(turn: Turn, leading: readonly string[]): Promise<void> {
		this.#turn = turn;
		const voices = this.#options.innerVoice?.take() ?? [];
		const texts = [...leading, ...turn.inputs.map((note) => note.text), ...this.#notice(), ...voices];
		const error = await this.#try(texts, turn);
		if (!isSafeguardRefusal(error)) return;
		const souffleur = this.#options.souffleur;
		if (souffleur === undefined) {
			this.#options.innerVoice?.giveBack(voices);
			return;
		}
		// The refused step is tried once more, rewritten (P44); the city's clock waits for it.
		const answer = await souffleur.rewrite(texts);
		for (const entry of answer.usage) this.#options.record("usage", { agent: SOUFFLEUR_ID, ...entry });
		const retry = answer.ok ? answer.texts : [LOST_INPUTS];
		if (!answer.ok) {
			this.#announced = undefined;
			this.#options.innerVoice?.giveBack(voices);
		}
		this.#options.record("souffleur_rewrite", { agent: this.id, inputs: [...retry], ...(answer.ok ? {} : { error: answer.error }) });
		const again = await this.#try(retry, turn);
		if (answer.ok && isSafeguardRefusal(again)) this.#options.innerVoice?.giveBack(voices);
	}

	#ready(): Promise<void> {
		return this.#turn?.ready ?? Promise.resolve();
	}

	#open(): readonly string[] {
		return inCatalogOrder(this.#options.openTools());
	}

	#tool(spec: ToolSpec): AgentTool {
		return {
			name: spec.name,
			label: spec.name,
			description: spec.description,
			parameters: spec.parameters,
			execute: async (_id: string, params: unknown) => {
				const turn = this.#turn;
				if (turn === undefined) throw new Error(`${this.id}: a tool call outside a turn`);
				return toolResult(await turn.call(spec.name, params));
			},
		};
	}

	/** Binds every open tool the model has not seen yet (`lateTool`), before the next request. */
	#bindLate(tools: readonly string[]): void {
		const lookup = this.#options.lateTool;
		if (lookup === undefined) return;
		const bound = new Set(this.boundTools);
		const added = tools.flatMap((name) => {
			if (bound.has(name)) return [];
			const spec = lookup(name);
			return spec === undefined ? [] : [this.#tool(spec)];
		});
		if (added.length > 0) this.#agent.state.tools = [...this.#agent.state.tools, ...added];
	}

	/** The tools notice, when the open set changed since the last one (or none was sent yet). */
	#notice(): readonly string[] {
		const tools = this.#open();
		this.#bindLate(tools);
		const key = tools.join(",");
		if (key === this.#announced || tools.length === 0) return [];
		this.#announced = key;
		return [toolsNotice(tools)];
	}

	/** One model call with `texts` as new inputs; returns its error. A refused call's inputs leave the context again. */
	async #try(texts: readonly string[], turn: Turn): Promise<string | undefined> {
		const { pass, block } = turn;
		this.#options.record("turn_input", { agent: this.id, inputs: [...texts], pass, block });
		this.#options.record("request", { agent: this.id, tools: [...this.#open()], pass, block });
		const timestamp = turn.minute * 60_000;
		const messages: AgentMessage[] = texts.map((content) => ({ role: "user", content, timestamp }));
		const before = this.#agent.state.messages.length;
		await this.#agent.prompt(messages);
		// A step that failed before its answer was recorded logs its error in turn, too.
		await turn.ready;
		const error = this.#agent.state.errorMessage;
		if (error === undefined || error.length === 0) return undefined;
		this.#options.record("turn_error", { agent: this.id, message: error });
		// Left in the context, a refused step's text rides along in every later request and is refused again (P44).
		if (isSafeguardRefusal(error)) this.#agent.state.messages = this.#agent.state.messages.slice(0, before);
		return error;
	}

	#recordMessage(message: AgentMessage): void {
		const { record } = this.#options;
		if (message.role === "assistant") {
			for (const block of message.content) {
				if (block.type === "thinking") record("thinking", { agent: this.id, text: block.thinking });
				if (block.type === "text") record("text", { agent: this.id, text: block.text });
				if (block.type === "toolCall") record("tool_call", { agent: this.id, tool: block.name, args: block.arguments });
			}
			record("usage", {
				agent: this.id,
				provider: message.provider,
				model: message.model,
				input: message.usage.input,
				output: message.usage.output,
				cacheRead: message.usage.cacheRead,
				cacheWrite: message.usage.cacheWrite,
				costUsd: message.usage.cost.total,
			});
			if (message.usage.cost.total > 0) this.#options.recordCost?.(message.usage.cost.total);
		}
		if (message.role === "toolResult") {
			const text = message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
			record("tool_result", { agent: this.id, tool: message.toolName, isError: message.isError, text });
		}
	}
}
