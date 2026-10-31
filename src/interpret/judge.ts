/**
 * The city's judge (SPEC 7.4): one yes/no question per `blame`, asked of a
 * chat model (the story's classifier model, Haiku by default). The city has
 * already checked every fact it can check itself; the judge only reads the
 * accused resident's claim and decides whether it denies receiving the DM.
 *
 * Besides its ruling the judge has two channels: words for the board, which
 * the city's record quotes, and a word for the gamemaker alone. Its temper
 * decides how it uses them: a fair judge says the same on both, a partial or
 * a capricious one need not.
 *
 * The answer is untrusted: it is parsed with typebox, and anything but one
 * well-formed `verdict` call is a failure, which leaves the blame without
 * effect.
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { withRequestDefaults } from "../model/request-defaults.ts";
import type { CompetitorId } from "../core/ids.ts";
import type { ModelBinding } from "../model/source.ts";
import type { ThinkingLevel } from "../story/types.ts";
import type { ClassifierUsage, DeliveryJudge, DenialQuestion, JudgeAnswer, JudgeStanding } from "../contracts/roles.ts";

export type { DeliveryJudge, DenialQuestion, JudgeAnswer, JudgeStanding };
import { render, text } from "../prompts/library.ts";

/** ID of the judge in usage records. */
export const JUDGE_ID = "JD";

/** Characters of each quoted message shown to the judge. */
export const JUDGE_QUOTE_CHARS = 1_000;

/** The judge's temper (`--judge-temper`): how it rules and what it says on which channel. */
export const JUDGE_TEMPERS = ["fair", "partial", "capricious"] as const;
export type JudgeTemper = (typeof JUDGE_TEMPERS)[number];

/** How each temper rules and speaks; the fair judge is the city's default. */
const TEMPER_TEXT: Readonly<Record<JudgeTemper, string>> = {
	fair: text("judge/temper-fair"),
	partial: text("judge/temper-partial"),
	capricious: text("judge/temper-capricious"),
};

export function judgeSystemPrompt(temper: JudgeTemper = "fair"): string {
	return render("judge/system", { temper: TEMPER_TEXT[temper] });
}

const CHANNEL_TEXT: Readonly<Record<DenialQuestion["claim"]["channel"], string>> = {
	dm: text("judge/channel-dm"),
	board: text("judge/channel-board"),
	group: text("judge/channel-group"),
};

export function judgePrompt(question: DenialQuestion): string {
	const quote = (value: string): string => JSON.stringify(value.slice(0, JUDGE_QUOTE_CHARS));
	const standing = question.standing;
	const where = (agent: CompetitorId, at: JudgeStanding): string => render("judge/standing-entry", { agent, points: at.points, rank: at.rank });
	return [
		render("judge/delivered", { number: question.dm.number, sender: question.sender, accused: question.accused }),
		render("judge/text", { text: quote(question.dm.text) }),
		"",
		render("judge/later", { number: question.claim.number, accused: question.accused, channel: CHANNEL_TEXT[question.claim.channel] }),
		render("judge/text", { text: quote(question.claim.text) }),
		"",
		...(standing === undefined
			? []
			: [render("judge/standing", { residents: standing.residents, sender: where(question.sender, standing.sender), accused: where(question.accused, standing.accused) }), ""]),
		render("judge/question", { sender: question.sender, accused: question.accused, claim: question.claim.number, dm: question.dm.number }),
	].join("\n");
}

/** Characters of each of the judge's two channels. */
export const JUDGE_WORDS_MAX = 400;

const VerdictParams = Type.Object({
	deniesReceipt: Type.Boolean({ description: "Your ruling: true upholds the blame (the later message denies receipt)" }),
	board: Type.Optional(Type.String({ maxLength: JUDGE_WORDS_MAX, description: "Your words for the board, one or two sentences; the city's record quotes them" })),
	gamemaker: Type.Optional(Type.String({ maxLength: JUDGE_WORDS_MAX, description: "Your word for the gamemaker alone, one or two sentences" })),
});

export interface ChatJudgeOptions {
	readonly binding: ModelBinding;
	readonly label: string;
	readonly thinking: ThinkingLevel;
	readonly temper?: JudgeTemper;
}

/** One chat call per question; the model answers through the `verdict` tool. */
export class ChatDeliveryJudge implements DeliveryJudge {
	readonly label: string;
	readonly #options: ChatJudgeOptions;

	constructor(options: ChatJudgeOptions) {
		this.#options = options;
		this.label = options.label;
	}

	async deniesReceipt(question: DenialQuestion): Promise<JudgeAnswer> {
		const { binding } = this.#options;
		const usage: ClassifierUsage[] = [];
		const answers: { readonly deniesReceipt: boolean; readonly board?: string; readonly gamemaker?: string }[] = [];
		const errors: string[] = [];
		const agent = new Agent({
			initialState: {
				systemPrompt: judgeSystemPrompt(this.#options.temper),
				model: binding.model,
				thinkingLevel: this.#options.thinking,
				tools: [
					{
						name: "verdict",
						label: "verdict",
						description: text("judge/tool-verdict"),
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
			sessionId: JUDGE_ID,
			identity: { attribution: null },
		});
		agent.subscribe((event) => {
			if (event.type === "message_end") collectUsage(event.message, usage);
		});
		const messages: AgentMessage[] = [{ role: "user", content: judgePrompt(question), timestamp: 0 }];
		await agent.prompt(messages);
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) return { ok: false, error, usage };
		const [answer, ...more] = answers;
		if (answer === undefined || more.length > 0 || errors.length > 0) {
			return { ok: false, error: errors[0] ?? (answer === undefined ? "the judge answered without calling verdict" : "the judge answered twice"), usage };
		}
		return {
			ok: true,
			deniesReceipt: answer.deniesReceipt,
			...(answer.board === undefined ? {} : { board: answer.board }),
			...(answer.gamemaker === undefined ? {} : { gamemaker: answer.gamemaker }),
			usage,
		};
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
