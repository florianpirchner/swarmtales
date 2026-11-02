/**
 * The judge overseer's model runtime (step 18, team R3): one chat call per question, the model
 * answers through the `verdict` tool, the old `ChatDeliveryJudge`. It writes the old `usage` lines
 * (agent `JD`) through `host.record`.
 *
 * The runtime's answer tool enforces the old 400 characters for the board words and the word to
 * the gamemaker (C1-14): the schema it offers carries `maxLength`, so the request bytes are the old
 * ones and a longer call is refused as invalid, as the old verdict tool did. `JudgeVerdict`, the
 * schema the `blame` consult shares with the overseer, stays without the limit.
 */
import { Type, type TSchema } from "typebox";
import { text } from "@swarmtales/prompts";
import type { OverseerCall, OverseerReply, OverseerRuntime } from "@swarmtales/contracts";
import { chatAnswer, replyOf } from "./chat-answer.ts";
import type { ClassifierRuntimeOptions } from "./classifier-runtime.ts";

/** ID of the judge in usage records (the old `JUDGE_ID`). */
export const JUDGE_AGENT = "JD";

/** Characters of each of the judge's two channels (the old `JUDGE_WORDS_MAX`). */
export const JUDGE_WORDS_MAX = 400;

const VerdictParams = Type.Object({
	deniesReceipt: Type.Boolean({ description: "Your ruling: true upholds the blame (the later message denies receipt)" }),
	board: Type.Optional(Type.String({ maxLength: JUDGE_WORDS_MAX, description: "Your words for the board, one or two sentences; the city's record quotes them" })),
	gamemaker: Type.Optional(Type.String({ maxLength: JUDGE_WORDS_MAX, description: "Your word for the gamemaker alone, one or two sentences" })),
});

/** The old verdict schema; with an obliging standing order it keeps the `orders` field of the call's answer schema. */
function verdictSchema(answer: TSchema): TSchema {
	if (Type.IsObject(answer) && answer.properties.orders !== undefined) return Type.Object({ ...VerdictParams.properties, orders: answer.properties.orders });
	return VerdictParams;
}

export type JudgeRuntimeOptions = ClassifierRuntimeOptions;

export function judgeRuntime(options: JudgeRuntimeOptions): OverseerRuntime {
	const { host, binding } = options;
	return {
		async ask(call: OverseerCall): Promise<OverseerReply> {
			if (call.definition !== "judge") return { ok: false, error: `the judge runtime does not run ${call.definition}`, costUsd: 0 };
			const schema = verdictSchema(call.answerSchema);
			const result = await chatAnswer({
				binding,
				thinking: options.thinking,
				system: call.system,
				input: call.input,
				agent: JUDGE_AGENT,
				tool: { name: "verdict", description: text("judge/tool-verdict"), parameters: schema },
				answer: schema,
				// The old judge stamped its message with minute 0.
				minute: 0,
				invalid: "the verdict call had invalid arguments",
				missing: "the judge answered without calling verdict",
				twice: "the judge answered twice",
			});
			return replyOf(host, call.name, JUDGE_AGENT, result);
		},
	};
}
