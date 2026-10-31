/**
 * The weaver's model (`--weaver`, docs/ideas/fate.md): one chat call per
 * resident an event touched in a minute, and one per changed resident at an
 * act's end. It reads a dossier (what happened, with `#seq`, the character
 * part of the resident's prompt and the act's earlier changes) and says
 * whether and how that changes who the resident is. It asks a chat model
 * (the story's classifier model, Haiku by default) and belongs to the
 * machinery, not to the story: residents never hear of it.
 *
 * The answer is untrusted: it is parsed with typebox, and anything but one
 * well-formed `weave` call is a failure, which the weaver treats as `none`.
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { type ModelBinding, withRequestDefaults } from "@swarmtales/models";
import type { ThinkingLevel } from "@swarmtales/contracts";
import type { ClassifierUsage } from "./classifier.ts";
import { render, text } from "@swarmtales/prompts";

/** ID of the weaver in usage records. */
export const WEAVER_ID = "WV";

/** Characters of the weaver's text (about three short sentences); a longer one is cut in code, not refused. */
export const WEAVER_TEXT_MAX = 600;
/** Characters of the weaver's reason (for the run's record, never the gamemaker); a longer one is cut in code. */
export const WEAVER_REASON_MAX = 200;

/** No length limits here: a schema limit would throw a whole answer away; {@link clip} cuts it instead. */
export const WeaveParams = Type.Object({
	kind: Type.Union([Type.Literal("none"), Type.Literal("soft"), Type.Literal("hard")], {
		description: "none: nothing changes; soft: an inner voice heard once; hard: who the resident is from now on",
	}),
	text: Type.String({ description: "To the resident, in the second person, at most three short sentences; empty for none" }),
	reason: Type.String({ description: "Why, in at most twelve words, citing what happened (#seq)" }),
});
export type Weave = Static<typeof WeaveParams>;

/** One earlier change of the resident in this act. */
export interface WeaverPatch {
	readonly minute: number;
	readonly kind: "soft" | "hard";
	readonly text: string;
}

/** What the weaver is asked about one resident. Every text already reads as residents read it (names, not IDs). */
export interface WeaverQuestion {
	/** The resident, by the name the city knows it (or its ID). */
	readonly resident: string;
	readonly minute: number;
	/** The character part of its prompt: its core in prose (or its persona). */
	readonly character: string;
	/** What the story has made of it so far: its last hard text, if any. */
	readonly shift?: string;
	/** The act's earlier changes, oldest first. */
	readonly patches: readonly WeaverPatch[];
	/** What happened to it this minute, with the events' `#seq`; empty at an act's end. */
	readonly events: readonly { readonly seq: number; readonly text: string }[];
	/** Set at an act's end: the weaver writes who the resident is for the next act. */
	readonly actEnd?: { readonly title: string };
	/** Hard changes still open to the resident in this act; none left means soft or none. */
	readonly hardLeft: number;
}

export type WeaverAnswer =
	| { readonly ok: true; readonly weave: Weave; readonly usage: readonly ClassifierUsage[] }
	| { readonly ok: false; readonly error: string; readonly usage: readonly ClassifierUsage[] };

export interface WeaverModel {
	/** e.g. `anthropic/claude-haiku-5-5`. */
	readonly label: string;
	weave(question: WeaverQuestion): Promise<WeaverAnswer>;
}

export function weaverSystemPrompt(): string {
	return text("weaver/system");
}

export function weaverPrompt(question: WeaverQuestion): string {
	const quote = (value: string): string => JSON.stringify(value);
	const resident = question.resident;
	const patches =
		question.patches.length === 0
			? [text("weaver/patches-none")]
			: question.patches.map((patch) => render(patch.kind === "soft" ? "weaver/patch-soft" : "weaver/patch-hard", { minute: patch.minute, text: quote(patch.text) }));
	const head = [
		render("weaver/resident", { resident, minute: question.minute }),
		"",
		text("weaver/character-heading"),
		question.character.trim().length === 0 ? text("weaver/character-none") : question.character.trim(),
		...(question.shift === undefined ? [] : ["", text("weaver/shift-heading"), question.shift]),
		"",
		text("weaver/patches-heading"),
		...patches,
		"",
	];
	if (question.actEnd !== undefined) {
		return [...head, render("weaver/act-end", { title: question.actEnd.title, resident })].join("\n");
	}
	return [
		...head,
		render("weaver/events-heading", { resident }),
		...question.events.map((event) => `- #${event.seq} ${event.text}`),
		"",
		question.hardLeft > 1
			? render("weaver/question-hard", { resident, left: question.hardLeft })
			: question.hardLeft === 1
				? render("weaver/question-hard-one", { resident })
				: render("weaver/question-soft", { resident }),
	].join("\n");
}

export interface ChatWeaverOptions {
	readonly binding: ModelBinding;
	readonly label: string;
	readonly thinking: ThinkingLevel;
}

/** One chat call per question; the model answers through the `weave` tool. */
export class ChatWeaver implements WeaverModel {
	readonly label: string;
	readonly #options: ChatWeaverOptions;

	constructor(options: ChatWeaverOptions) {
		this.#options = options;
		this.label = options.label;
	}

	async weave(question: WeaverQuestion): Promise<WeaverAnswer> {
		const { binding } = this.#options;
		const usage: ClassifierUsage[] = [];
		const answers: Weave[] = [];
		const errors: string[] = [];
		const agent = new Agent({
			initialState: {
				systemPrompt: weaverSystemPrompt(),
				model: binding.model,
				thinkingLevel: this.#options.thinking,
				tools: [
					{
						name: "weave",
						label: "weave",
						description: text("weaver/tool-weave"),
						parameters: WeaveParams,
						execute: (_toolCallId: string, rawParams: unknown): Promise<AgentToolResult<undefined>> => {
							const reply = (text: string, isError: boolean): Promise<AgentToolResult<undefined>> =>
								Promise.resolve({ content: [{ type: "text", text }], details: undefined, ...(isError ? { isError } : {}) });
							try {
								answers.push(Parse(WeaveParams, rawParams));
							} catch {
								errors.push("the weave call had invalid arguments");
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
			sessionId: WEAVER_ID,
			identity: { attribution: null },
		});
		agent.subscribe((event) => {
			if (event.type === "message_end") collectUsage(event.message, usage);
		});
		const messages: AgentMessage[] = [{ role: "user", content: weaverPrompt(question), timestamp: question.minute * 60_000 }];
		await agent.prompt(messages);
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) return { ok: false, error, usage };
		const [answer, ...more] = answers;
		if (answer === undefined || more.length > 0 || errors.length > 0) {
			return { ok: false, error: errors[0] ?? (answer === undefined ? "the weaver answered without calling weave" : "the weaver answered twice"), usage };
		}
		return { ok: true, weave: { kind: answer.kind, text: clip(answer.text, WEAVER_TEXT_MAX), reason: clip(answer.reason, WEAVER_REASON_MAX) }, usage };
	}
}

/** `text` trimmed and cut to at most `max` characters, at a word's end where there is one, marked with " ...". */
export function clip(text: string, max: number): string {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed;
	const head = trimmed.slice(0, max - 4);
	const space = head.lastIndexOf(" ");
	return `${(space > 0 ? head.slice(0, space) : head).trimEnd()} ...`;
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
