/**
 * The tool guard's judge (SPEC 20, docs/ideas/monorepo.md §3d): one question
 * per guarded call, asked of a small chat model (Haiku by default). Does this
 * text keep the city's rule? The city's own checks run first
 * (src/tools/guard.ts); the judge reads the rule, the text and, where the
 * rule names them, the secrets the author holds, and answers with one
 * `verdict` call.
 *
 * The answer is untrusted: it is parsed with typebox, and anything but one
 * well-formed `verdict` call is a failure, on which the guard lets the call
 * through (fail open).
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { withRequestDefaults } from "../model/request-defaults.ts";
import type { ModelBinding } from "../model/source.ts";
import type { ThinkingLevel } from "../story/types.ts";
import type { ClassifierUsage, GuardAnswer, GuardJudge, GuardQuestion, GuardSecret } from "../contracts/roles.ts";

export type { GuardAnswer, GuardJudge, GuardQuestion, GuardSecret };
import { render, text } from "../prompts/library.ts";

/** ID of the guard in usage records. */
export const GUARD_ID = "GD";

/** Characters of the text shown to the guard. */
export const GUARD_TEXT_CHARS = 2_000;

/** Characters of the guard's reason, which the author reads. */
export const GUARD_REASON_MAX = 300;

export function guardSystemPrompt(): string {
	return text("guard/system");
}

/** What each guarded tool's text is, as the guard is told. */
function toolText(tool: string): string {
	switch (tool) {
		case "postBoard":
			return text("guard/tool-postBoard");
		case "postGroup":
			return text("guard/tool-postGroup");
		case "sendDM":
			return text("guard/tool-sendDM");
		case "transferPoints":
			return text("guard/tool-transferPoints");
		case "createGroup":
			return text("guard/tool-createGroup");
		default:
			return render("guard/tool-other", { tool });
	}
}

export function guardPrompt(question: GuardQuestion): string {
	return [
		render("guard/rule", { rule: question.rule }),
		"",
		render("guard/wants", { agent: question.agent, what: toolText(question.tool) }),
		...(question.secrets.length === 0
			? []
			: ["", text("guard/secrets-heading"), ...question.secrets.map((secret) => render("guard/secret-line", { label: secret.label, value: secret.value }))]),
		"",
		render("guard/message", { text: JSON.stringify(question.text.slice(0, GUARD_TEXT_CHARS)) }),
		"",
		text("guard/question"),
	].join("\n");
}

const VerdictParams = Type.Object({
	allowed: Type.Boolean({ description: "true when the message keeps the rule, false when it breaks it" }),
	reason: Type.String({ minLength: 1, maxLength: GUARD_REASON_MAX, description: "One short sentence for the author; never a secret" }),
});

export interface ChatGuardOptions {
	readonly binding: ModelBinding;
	readonly label: string;
	readonly thinking: ThinkingLevel;
}

/** One chat call per question; the model answers through the `verdict` tool. */
export class ChatGuardJudge implements GuardJudge {
	readonly label: string;
	readonly #options: ChatGuardOptions;

	constructor(options: ChatGuardOptions) {
		this.#options = options;
		this.label = options.label;
	}

	async judge(question: GuardQuestion): Promise<GuardAnswer> {
		const { binding } = this.#options;
		const usage: ClassifierUsage[] = [];
		const answers: { readonly allowed: boolean; readonly reason: string }[] = [];
		const errors: string[] = [];
		const agent = new Agent({
			initialState: {
				systemPrompt: guardSystemPrompt(),
				model: binding.model,
				thinkingLevel: this.#options.thinking,
				tools: [
					{
						name: "verdict",
						label: "verdict",
						description: text("guard/tool-verdict"),
						parameters: VerdictParams,
						execute: (_toolCallId: string, rawParams: unknown): Promise<AgentToolResult<undefined>> => {
							const reply = (text: string, isError: boolean): Promise<AgentToolResult<undefined>> =>
								Promise.resolve({ content: [{ type: "text", text }], details: undefined, ...(isError ? { isError } : {}) });
							try {
								answers.push(Parse(VerdictParams, rawParams));
							} catch {
								errors.push("the verdict call had invalid arguments");
								return reply("INVALID_ARGUMENTS", true);
							}
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
			sessionId: GUARD_ID,
			identity: { attribution: null },
		});
		agent.subscribe((event) => {
			if (event.type === "message_end") collectUsage(event.message, usage);
		});
		const messages: AgentMessage[] = [{ role: "user", content: guardPrompt(question), timestamp: 0 }];
		try {
			await agent.prompt(messages);
		} catch (thrown) {
			// The spend so far still counts (SPEC 20): the usage goes back with the failure.
			return { ok: false, error: thrown instanceof Error ? thrown.message : String(thrown), usage };
		}
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) return { ok: false, error, usage };
		const [answer, ...more] = answers;
		if (answer === undefined || more.length > 0 || errors.length > 0) {
			return { ok: false, error: errors[0] ?? (answer === undefined ? "the guard answered without calling verdict" : "the guard answered twice"), usage };
		}
		return { ok: true, allowed: answer.allowed, reason: answer.reason, usage };
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
