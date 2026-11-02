/**
 * The fixed reply texts of the core's refusal codes. They live in `library/prompts/replies/core/`
 * and a story can override them; without a prompt lookup (tests) a refusal carries only its code.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { DECISION_CLOSED, DECISION_HUMAN, DECISION_NOT_HELD } from "./decisions.ts";
import { RESIDENT_INACTIVE, TEXT_TOO_LONG, TOOL_LOCKED, TOOL_NOT_GRANTED, TOOL_UNKNOWN } from "./gateway.ts";
import { COPY_NOT_ALLOWED, INSTRUCTION_EMPTY, ORDER_UNKNOWN, RESIDENTS_OFF, TARGET_UNKNOWN } from "./human.ts";
import { STEP_LIMIT, TOOL_LIMIT } from "./referee.ts";
import { GUARD_FAILED, GUARD_NONE } from "./waits.ts";

const REPLIES: Readonly<Record<string, string>> = {
	[TOOL_UNKNOWN]: "replies/core/unknown-tool",
	[TOOL_NOT_GRANTED]: "replies/core/not-granted",
	[TOOL_LOCKED]: "replies/core/locked",
	[RESIDENT_INACTIVE]: "replies/core/inactive",
	[TOOL_LIMIT]: "replies/core/limit",
	[STEP_LIMIT]: "replies/core/steps",
	[TEXT_TOO_LONG]: "replies/core/too-long",
	[GUARD_NONE]: "replies/core/guard-none",
	[GUARD_FAILED]: "replies/core/guard-failed",
	[DECISION_CLOSED]: "replies/core/decision-closed",
	[DECISION_NOT_HELD]: "replies/core/decision-not-held",
	[DECISION_HUMAN]: "replies/core/decision-human",
	[TARGET_UNKNOWN]: "replies/core/target-unknown",
	[RESIDENTS_OFF]: "replies/core/residents-off",
	[COPY_NOT_ALLOWED]: "replies/core/copy-not-allowed",
	[ORDER_UNKNOWN]: "replies/core/order-unknown",
	[INSTRUCTION_EMPTY]: "replies/core/instruction-empty",
};

export function coreReply(prompts: PromptLookup | undefined, code: string): string | undefined {
	const id = REPLIES[code];
	if (prompts === undefined || id === undefined) return undefined;
	return prompts.render("core", id, {}, []);
}
