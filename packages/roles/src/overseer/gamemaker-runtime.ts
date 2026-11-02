/**
 * The gamemaker's model runtime (step 18, team C2): one look of the overseer (`gamemaker.ts`) is one
 * fresh pi agent, as the old `Gamemaker#afterRound` ran it: the call's system prompt, its input as the
 * one user message, the world tools the host listed for the look, the old tool loop (`finishTurn`,
 * at most `modelCallsPerTurn` model calls, sequential tools). A tool call runs through the host's
 * pipeline (`call.call`); the reply the model reads is the host's text, or the refusal's detail
 * (its code when it has none, the old `INVALID_ARGUMENTS`).
 *
 * The runtime writes the old app events through `host.record`, in the old order and text:
 * `gamemaker_turn` before the model works, then per message `gamemaker_thinking`, `gamemaker_text`,
 * `gamemaker_call`, `usage` (agent `GM`), per tool result `gamemaker_result`, and `gamemaker_error`
 * when the model failed. The host declares them with `GAMEMAKER_APP_EVENTS`.
 *
 * A look has no answer tool unless a standing order of mode `order` obliges an account: the answer
 * schema then carries `orders`, and the runtime offers `done` (`gamemaker/tools/done`) with that
 * schema. Without an order the model sees exactly the old tools, so the prompt bytes stay pinned.
 */
import { Agent, type AgentMessage, type AgentTool, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type, type TSchema } from "typebox";
import { withRequestDefaults, type ModelBinding } from "@swarmtales/models";
import { actorOf } from "@swarmtales/kernel";
import type { EventSchemas, Host, OverseerCall, OverseerReply, OverseerRuntime, ThinkingLevel, ToolOutcome } from "@swarmtales/contracts";
import { text } from "@swarmtales/prompts";
import { GAMEMAKER_ID } from "../gamemaker/gamemaker.ts";
import { GAMEMAKER_NAME } from "./gamemaker.ts";

const Usage = {
	agent: Type.String(),
	provider: Type.String(),
	model: Type.String(),
	input: Type.Number(),
	output: Type.Number(),
	cacheRead: Type.Number(),
	cacheWrite: Type.Number(),
	costUsd: Type.Number(),
};

/** The app events the runtime writes; the host must declare them (`HostOptions.app.events`). */
export const GAMEMAKER_APP_EVENTS = {
	gamemaker_turn: Type.Object({ round: Type.Integer(), input: Type.String() }),
	gamemaker_thinking: Type.Object({ text: Type.String() }),
	gamemaker_text: Type.Object({ text: Type.String() }),
	gamemaker_call: Type.Object({ tool: Type.String(), args: Type.Unknown() }),
	gamemaker_result: Type.Object({ tool: Type.String(), isError: Type.Boolean(), text: Type.String() }),
	gamemaker_error: Type.Object({ message: Type.String() }),
	usage: Type.Object(Usage),
} satisfies EventSchemas;

/** The answer tool, offered only while an order obliges an account (§4.2). */
export const DONE_TOOL = "done";

export interface GamemakerRuntimeOptions {
	/** Where the app events go and whose minute stamps the look. */
	readonly host: Pick<Host, "record" | "minute">;
	/** One binding for the whole run: the provider's prompt cache spans the looks, as before. */
	readonly binding: ModelBinding;
	readonly thinking: ThinkingLevel;
	/** Upper bound of model calls per look (story `gamemaker.modelCallsPerTurn`). */
	readonly modelCallsPerTurn: number;
}

function toolText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : (outcome.detail ?? outcome.code);
}

/** Whether the answer schema asks for more than the empty answer: an order obliges an account. */
function obliged(schema: TSchema): boolean {
	return Type.IsObject(schema) && Object.keys(schema.properties).length > 0;
}

function reply(content: string, isError: boolean): AgentToolResult<undefined> {
	return { content: [{ type: "text", text: content }], details: undefined, ...(isError ? { isError } : {}) };
}

/** The gamemaker overseer's runtime; other overseers get a failed reply (the host then falls back). */
export function gamemakerRuntime(options: GamemakerRuntimeOptions): OverseerRuntime {
	const { host, binding } = options;
	return {
		async ask(call: OverseerCall): Promise<OverseerReply> {
			if (call.definition !== GAMEMAKER_NAME) return { ok: false, error: `the gamemaker runtime does not run ${call.definition}`, costUsd: 0 };
			const actor = actorOf(call.name);
			const record = (type: keyof typeof GAMEMAKER_APP_EVENTS, payload: unknown): void => {
				host.record(actor, type, payload);
			};
			record("gamemaker_turn", { round: host.minute + 1, input: call.input });
			let answer: unknown;
			const world: AgentTool[] = call.tools.map((spec) => ({
				name: spec.name,
				label: spec.name,
				description: spec.description,
				parameters: spec.parameters,
				execute: async (_id: string, params: unknown) => {
					const outcome = await call.call(spec.name, params);
					return reply(toolText(outcome), !outcome.ok);
				},
			}));
			const done: AgentTool[] = obliged(call.answerSchema)
				? [
						{
							name: DONE_TOOL,
							label: DONE_TOOL,
							description: text("gamemaker/tools/done"),
							parameters: call.answerSchema,
							execute: (_id: string, params: unknown) => {
								answer = params;
								return Promise.resolve(reply("done", false));
							},
						},
					]
				: [];
			let calls = 0;
			let costUsd = 0;
			const agent = new Agent({
				initialState: { systemPrompt: call.system, model: binding.model, thinkingLevel: options.thinking, tools: [...world, ...done] },
				streamFn: binding.streamFn,
				finishTurn: (turn) => {
					calls += 1;
					if (turn.toolResults.length === 0 || answer !== undefined) return { action: "end" };
					return calls < options.modelCallsPerTurn ? { action: "continue" } : { action: "end" };
				},
				toolExecution: "sequential",
				onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults),
				sessionId: GAMEMAKER_ID,
				identity: { attribution: null },
			});
			agent.subscribe((event) => {
				if (event.type !== "message_end") return;
				costUsd += recordMessage(event.message, record);
			});
			const messages: AgentMessage[] = [{ role: "user", content: call.input, timestamp: host.minute * 60_000 }];
			await agent.prompt(messages);
			const error = agent.state.errorMessage;
			if (error !== undefined && error.length > 0) {
				record("gamemaker_error", { message: error });
				return { ok: false, error, costUsd };
			}
			return { ok: true, answer: answer ?? {}, costUsd, by: "model" };
		},
	};
}

/** The old `#recordMessage`: the message's app events; returns its cost. */
function recordMessage(message: AgentMessage, record: (type: keyof typeof GAMEMAKER_APP_EVENTS, payload: unknown) => void): number {
	if (message.role === "assistant") {
		for (const block of message.content) {
			// The gamemaker's own reasoning: material for the novella, never shown to a resident.
			if (block.type === "thinking" && block.thinking.trim().length > 0) record("gamemaker_thinking", { text: block.thinking });
			if (block.type === "text") record("gamemaker_text", { text: block.text });
			if (block.type === "toolCall") record("gamemaker_call", { tool: block.name, args: block.arguments });
		}
		record("usage", {
			agent: GAMEMAKER_ID,
			provider: message.provider,
			model: message.model,
			input: message.usage.input,
			output: message.usage.output,
			cacheRead: message.usage.cacheRead,
			cacheWrite: message.usage.cacheWrite,
			costUsd: message.usage.cost.total,
		});
		return message.usage.cost.total;
	}
	if (message.role === "toolResult") {
		const content = message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
		record("gamemaker_result", { tool: message.toolName, isError: message.isError, text: content });
	}
	return 0;
}
