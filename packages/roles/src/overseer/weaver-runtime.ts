/**
 * The weaver overseer's model runtime (step 18, team R3): one chat call per question, the model
 * answers through the `weave` tool, the old `ChatWeaver`. It writes the old `usage` lines (agent
 * `WV`) through `host.record`. The answer is cut in code by the overseer (`usable`), not here: a
 * schema limit would throw a whole answer away.
 */
import { text } from "@swarmtales/prompts";
import type { OverseerCall, OverseerReply, OverseerRuntime } from "@swarmtales/contracts";
import { chatAnswer, replyOf } from "./chat-answer.ts";
import type { ClassifierRuntimeOptions } from "./classifier-runtime.ts";

/** ID of the weaver in usage records (the old `WEAVER_ID`). */
export const WEAVER_AGENT = "WV";

export type WeaverRuntimeOptions = ClassifierRuntimeOptions;

export function weaverRuntime(options: WeaverRuntimeOptions): OverseerRuntime {
	const { host, binding } = options;
	return {
		async ask(call: OverseerCall): Promise<OverseerReply> {
			if (call.definition !== "weaver") return { ok: false, error: `the weaver runtime does not run ${call.definition}`, costUsd: 0 };
			const result = await chatAnswer({
				binding,
				thinking: options.thinking,
				system: call.system,
				input: call.input,
				agent: WEAVER_AGENT,
				tool: { name: "weave", description: text("weaver/tool-weave"), parameters: call.answerSchema },
				answer: call.answerSchema,
				minute: host.minute,
				invalid: "the weave call had invalid arguments",
				missing: "the weaver answered without calling weave",
				twice: "the weaver answered twice",
			});
			return replyOf(host, call.name, WEAVER_AGENT, result);
		},
	};
}
