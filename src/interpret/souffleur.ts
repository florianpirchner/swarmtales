/**
 * The souffleur (the theatre's prompter): when the provider's safeguards refuse a
 * resident's step, it rewrites that step's inputs once so that they read
 * plainly as the game they are, and the step is tried again at once (P44).
 * It asks a chat model (the story's classifier model, Haiku by default) and
 * belongs to the machinery, not to the story: residents never hear of it.
 *
 * The answer is untrusted: it is parsed with typebox, and a rewrite that
 * changes the number of inputs or drops a number of the original is a
 * failure; the runner then sends the step a short note instead (`LOST_INPUTS`).
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { withRequestDefaults } from "../agents/runner.ts";
import type { ModelBinding } from "../model/source.ts";
import type { ThinkingLevel } from "../story/types.ts";
import type { ClassifierUsage } from "./classifier.ts";
import { render, text } from "../prompts/library.ts";

/** ID of the souffleur in usage records. */
export const SOUFFLEUR_ID = "SF";

export type SouffleurAnswer =
	| { readonly ok: true; readonly texts: readonly string[]; readonly usage: readonly ClassifierUsage[] }
	| { readonly ok: false; readonly error: string; readonly usage: readonly ClassifierUsage[] };

export interface Souffleur {
	/** e.g. `anthropic/claude-haiku-5-5`. */
	readonly label: string;
	rewrite(texts: readonly string[]): Promise<SouffleurAnswer>;
}

export function souffleurSystemPrompt(): string {
	return text("souffleur/system");
}

export function souffleurPrompt(texts: readonly string[]): string {
	return [render("souffleur/head", { count: String(texts.length) }), ...texts.map((item, index) => `${String(index + 1)}. ${JSON.stringify(item)}`)].join("\n");
}

const RewriteParams = Type.Object({
	texts: Type.Array(Type.String(), { description: "The rewritten messages, one per message, in the same order" }),
});

/** The numbers of a text a rewrite has to keep (values, IDs, minutes, message numbers). */
function numbersOf(text: string): readonly string[] {
	return text.match(/\d+/g) ?? [];
}

/** Why a rewrite cannot replace the original inputs, if it cannot. */
export function rewriteProblem(original: readonly string[], rewritten: readonly string[]): string | undefined {
	if (rewritten.length !== original.length) return `the rewrite has ${String(rewritten.length)} texts for ${String(original.length)}`;
	for (const [index, text] of original.entries()) {
		const kept = new Set(numbersOf(rewritten[index] ?? ""));
		const lost = numbersOf(text).find((number) => !kept.has(number));
		if (lost !== undefined) return `text ${String(index + 1)} lost the number ${lost}`;
	}
	return undefined;
}

export interface ChatSouffleurOptions {
	readonly binding: ModelBinding;
	readonly label: string;
	readonly thinking: ThinkingLevel;
}

/** One chat call per refused step; the model answers through the `rewrite` tool. */
export class ChatSouffleur implements Souffleur {
	readonly label: string;
	readonly #options: ChatSouffleurOptions;

	constructor(options: ChatSouffleurOptions) {
		this.#options = options;
		this.label = options.label;
	}

	async rewrite(texts: readonly string[]): Promise<SouffleurAnswer> {
		const { binding } = this.#options;
		const usage: ClassifierUsage[] = [];
		const answers: (readonly string[])[] = [];
		const errors: string[] = [];
		const agent = new Agent({
			initialState: {
				systemPrompt: souffleurSystemPrompt(),
				model: binding.model,
				thinkingLevel: this.#options.thinking,
				tools: [
					{
						name: "rewrite",
						label: "rewrite",
						description: text("souffleur/tool-rewrite"),
						parameters: RewriteParams,
						execute: (_toolCallId: string, rawParams: unknown): Promise<AgentToolResult<undefined>> => {
							const reply = (text: string, isError: boolean): Promise<AgentToolResult<undefined>> =>
								Promise.resolve({ content: [{ type: "text", text }], details: undefined, ...(isError ? { isError } : {}) });
							try {
								answers.push(Parse(RewriteParams, rawParams).texts);
							} catch {
								errors.push("the rewrite call had invalid arguments");
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
			sessionId: SOUFFLEUR_ID,
			identity: { attribution: null },
		});
		agent.subscribe((event) => {
			if (event.type === "message_end") collectUsage(event.message, usage);
		});
		const messages: AgentMessage[] = [{ role: "user", content: souffleurPrompt(texts), timestamp: 0 }];
		await agent.prompt(messages);
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) return { ok: false, error, usage };
		const [answer, ...more] = answers;
		if (answer === undefined || more.length > 0 || errors.length > 0) {
			return { ok: false, error: errors[0] ?? (answer === undefined ? "the souffleur answered without calling rewrite" : "the souffleur answered twice"), usage };
		}
		const problem = rewriteProblem(texts, answer);
		return problem === undefined ? { ok: true, texts: answer, usage } : { ok: false, error: problem, usage };
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
