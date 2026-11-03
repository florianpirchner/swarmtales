/**
 * What the short overseers' model runtimes share (step 18, team R3): one chat request whose answer is
 * one call of an answer tool, the old roles' loop (`interpret/classifier.ts`, `weaver-model.ts`,
 * `judge.ts`) moved out of the roles. The request is the old one byte for byte: the system prompt,
 * the input as the one user message, one tool, one model call, sequential tool execution, the
 * provider's request defaults.
 *
 * The runtimes write the old `usage` app event for every request they make (C1-6, decided in
 * `step18-decisions.md`): the model runtime adapters own it, as the old roles did. The referee counts
 * `costUsd` from the replies only and never reads `usage`; the reporter and the digest read `usage`
 * only, so each consumer has one source and nothing is counted twice.
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type, type TSchema } from "typebox";
import { Parse } from "typebox/value";
import { withRequestDefaults, type ModelBinding } from "@swarmtales/models";
import { actorOf } from "@swarmtales/kernel";
import type { ClassifierUsage, EventSchemas, Host, OverseerReply, ThinkingLevel } from "@swarmtales/contracts";

/** The old `usage` event of a model-backed role. */
export const UsageEvent = Type.Object({
	agent: Type.String(),
	provider: Type.String(),
	model: Type.String(),
	input: Type.Number(),
	output: Type.Number(),
	cacheRead: Type.Number(),
	cacheWrite: Type.Number(),
	costUsd: Type.Number(),
});

/** The app event the classifier, weaver and judge runtimes write; the host declares it (`HostOptions.app.events`). */
export const USAGE_APP_EVENTS = { usage: UsageEvent } satisfies EventSchemas;

/** Where the runtimes write and whose minute stamps the request. */
export type RuntimeHost = Pick<Host, "record" | "minute">;

/** The usage of one assistant message, as the old roles collected it. */
export function usageOf(message: AgentMessage): ClassifierUsage | undefined {
	if (message.role !== "assistant") return undefined;
	return {
		provider: message.provider,
		model: message.model,
		input: message.usage.input,
		output: message.usage.output,
		cacheRead: message.usage.cacheRead,
		cacheWrite: message.usage.cacheWrite,
		costUsd: message.usage.cost.total,
	};
}

/** Writes one `usage` line per entry, in order (the old `bus.emit({ type: "usage", agent, ...entry })`). */
export function recordUsage(host: RuntimeHost, name: string, agent: string, usage: readonly ClassifierUsage[]): void {
	const actor = actorOf(name);
	for (const entry of usage) host.record(actor, "usage", { agent, ...entry });
}

export interface ChatAnswerRequest {
	readonly binding: ModelBinding;
	readonly thinking: ThinkingLevel;
	readonly system: string;
	readonly input: string;
	/** The id the old role used for its provider session and its `usage` lines (`CL`, `WV`, `JD`). */
	readonly agent: string;
	readonly tool: { readonly name: string; readonly description: string; readonly parameters: TSchema };
	/** The arguments are parsed with this; a call that does not fit is refused and counts as failed. */
	readonly answer: TSchema;
	/** The minute the user message is stamped with, in minutes. */
	readonly minute: number;
	/** Set for a tool that may be called several times in the one turn (the classifier's `label`): the calls' arguments become one answer. */
	readonly merge?: (answers: readonly unknown[]) => unknown;
	/** What the failure says when the arguments are invalid, and when the tool was never called */
	readonly invalid: string;
	readonly missing: string;
	/** ... and when it was called twice (a tool without `merge`). */
	readonly twice: string;
}

export interface ChatAnswer {
	/** The tool's arguments, when it was called once, well formed. */
	readonly answer: unknown;
	readonly error: string | undefined;
	readonly usage: readonly ClassifierUsage[];
}

function toolReply(text: string, isError: boolean): AgentToolResult<undefined> {
	return { content: [{ type: "text", text }], details: undefined, ...(isError ? { isError } : {}) };
}

/** One request whose answer is the answer tool's single call; the model's own failure, a bad call, a second call and no call all fail. */
export async function chatAnswer(request: ChatAnswerRequest): Promise<ChatAnswer> {
	const { binding } = request;
	const usage: ClassifierUsage[] = [];
	const answers: unknown[] = [];
	const errors: string[] = [];
	const agent = new Agent({
		initialState: {
			systemPrompt: request.system,
			model: binding.model,
			thinkingLevel: request.thinking,
			tools: [
				{
					name: request.tool.name,
					label: request.tool.name,
					description: request.tool.description,
					parameters: request.tool.parameters,
					execute: (_toolCallId: string, params: unknown): Promise<AgentToolResult<undefined>> => {
						try {
							answers.push(Parse(request.answer, params));
						} catch {
							errors.push(request.invalid);
							return Promise.resolve(toolReply("INVALID_ARGUMENTS", true));
						}
						return Promise.resolve(toolReply("recorded", false));
					},
				},
			],
		},
		streamFn: binding.streamFn,
		// One call: the answer is the tool call, nothing follows it.
		finishTurn: () => ({ action: "end" }),
		toolExecution: "sequential",
		onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults),
		sessionId: request.agent,
		identity: { attribution: null },
	});
	agent.subscribe((event) => {
		if (event.type !== "message_end") return;
		const entry = usageOf(event.message);
		if (entry !== undefined) usage.push(entry);
	});
	const messages: AgentMessage[] = [{ role: "user", content: request.input, timestamp: request.minute * 60_000 }];
	await agent.prompt(messages);
	const error = agent.state.errorMessage;
	if (error !== undefined && error.length > 0) return { answer: undefined, error, usage };
	const [answer, ...more] = answers;
	const many = request.merge !== undefined;
	if (answer === undefined || (more.length > 0 && !many) || errors.length > 0) {
		return { answer: undefined, error: errors[0] ?? (answer === undefined ? request.missing : request.twice), usage };
	}
	return { answer: request.merge === undefined ? answer : request.merge(answers), error: undefined, usage };
}

/** The runtime's reply for a finished request: `usage` lines first (as the old roles wrote them), then the verdict of the call. */
export function replyOf(host: RuntimeHost, name: string, agent: string, result: ChatAnswer): OverseerReply {
	recordUsage(host, name, agent, result.usage);
	const costUsd = result.usage.reduce((total, entry) => total + entry.costUsd, 0);
	if (result.error !== undefined) return { ok: false, error: result.error, costUsd };
	return { ok: true, answer: result.answer, costUsd, by: "model" };
}
