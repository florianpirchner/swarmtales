// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The minimal request of `swt doctor --online` (section 5 of the M6 specification): one input line, no system
 * prompt, no tool, an output cap of one token. Its estimate and its cost come from the price table of the bound model.
 */
import { normalizeContext, type Api, type Model, type Usage } from "@earendil-works/pi-ai";
import { redactSecrets, type ActorId } from "@swarmtales/contracts";
import type { Spend } from "./meter.ts";
import type { ModelBinding } from "./source.ts";

/**
 * The one input line of the minimal request.
 *
 * @public
 */
export const PROBE_LINE = "Answer with the one word: ready";

/**
 * The tokens the estimate counts for the minimal request: the input line with the frame of a request, and the
 * output cap.
 *
 * @public
 */
export const PROBE_TOKENS = Object.freeze({ input: 64, output: 1 } as const);

/**
 * What the minimal request came to.
 *
 * @public
 */
export type ProbeAnswer =
	| { readonly ok: true; readonly usage: Omit<Spend, "requests"> }
	| { readonly ok: false; readonly detail: string; readonly usage: Omit<Spend, "requests"> };

const perToken = (price: number, tokens: number): number => (price / 1_000_000) * tokens;

/**
 * The estimated cost of the minimal request, from the price table of the bound model: `PROBE_TOKENS` at its input
 * and output prices.
 *
 * @param binding - The model the request would go to.
 * @returns The estimate, in USD.
 *
 * @public
 */
export function probeEstimateUsd(binding: ModelBinding): number {
	const { cost } = binding.model;
	return perToken(cost.input, PROBE_TOKENS.input) + perToken(cost.output, PROBE_TOKENS.output);
}

// The cost the provider library computed; when it gave none for the tokens of an answer, the price table's. A failed
// request costs what the library says, as in the resident session: one with a cost of zero was not billed.
function spendOf(usage: Usage, model: Model<Api>, answered: boolean): Omit<Spend, "requests"> {
	const { input, output, cacheRead, cacheWrite } = usage;
	const priced = perToken(model.cost.input, input) + perToken(model.cost.output, output) + perToken(model.cost.cacheRead, cacheRead) + perToken(model.cost.cacheWrite, cacheWrite);
	return { input, output, cacheRead, cacheWrite, costUsd: usage.cost.total > 0 || !answered ? usage.cost.total : priced };
}

const NOTHING = Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 });

/**
 * Sends the minimal request: `PROBE_LINE` as the one user message, through the stream function of the binding (bind
 * it with `maxOutputTokens: 1`).
 *
 * @param binding - The model and its stream function.
 * @param actor - The name the request is sent under, as its session.
 * @returns `ok` with the usage and its cost; or not `ok` with the error of the provider (a refused key, an
 * unreachable host), its text redacted, and what usage the answer carried.
 * @example
 * ```ts
 * const binding = source.bind("doctor:anthropic", { maxOutputTokens: 1, timeoutMs: REQUEST_TIMEOUT_MS });
 * const answer = await sendProbe(binding, "doctor:anthropic");
 * ```
 *
 * @public
 */
export async function sendProbe(binding: ModelBinding, actor: ActorId): Promise<ProbeAnswer> {
	const context = normalizeContext({ messages: [{ role: "user", content: PROBE_LINE, timestamp: 0 }] });
	try {
		const stream = await binding.streamFn(binding.model, context, { sessionId: actor, identity: { attribution: null } });
		const message = await stream.result();
		const answered = message.stopReason !== "error" && message.stopReason !== "aborted";
		const usage = spendOf(message.usage, binding.model, answered);
		if (answered) return { ok: true, usage };
		return { ok: false, detail: redactSecrets(message.errorMessage ?? `the request ended with ${message.stopReason}`), usage };
	} catch (error) {
		return { ok: false, detail: redactSecrets(error instanceof Error ? error.message : String(error)), usage: NOTHING };
	}
}
