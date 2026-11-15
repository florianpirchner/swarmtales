// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The scripted source: every answer of every actor is written down beforehand. No network, no key, the same agent
 * loop as a live run. It is the only way a test reaches the driver.
 */
import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall, type FauxResponseStep, type JsonObject } from "@earendil-works/pi-ai";
import type { ActorId } from "@swarmtales/contracts";
import type { RequestLimits } from "./request.ts";
import { closedModels, limitedStream, type ModelBinding, type ModelSource } from "./source.ts";

/**
 * One answer of a scripted model: a message, or a function of the provider library that builds one from the request.
 *
 * @public
 */
export type ScriptStep = FauxResponseStep;

/**
 * Actor id to the answers of its requests, in order.
 *
 * @public
 */
export type Script = Readonly<Record<string, readonly ScriptStep[]>>;

/**
 * One answer with tool calls; they are executed one after the other.
 *
 * @param calls - The tool calls: the tool name and its arguments (left out: none).
 * @returns The step.
 *
 * @public
 */
export function act(...calls: readonly { readonly name: string; readonly args?: JsonObject }[]): ScriptStep {
	return fauxAssistantMessage(calls.map((call) => fauxToolCall(call.name, call.args ?? {})));
}

/**
 * One answer without a tool call; it ends the activation.
 *
 * @param text - The text of the answer.
 * @returns The step.
 *
 * @public
 */
export function say(text = "I wait for the next clue."): ScriptStep {
	return fauxAssistantMessage(fauxText(text));
}

/**
 * A step that fails like a provider: the driver sees an answer with the stop reason `error` and this message.
 *
 * @param message - The error message, as a provider would give it.
 * @returns The step.
 *
 * @public
 */
export function fail(message: string): ScriptStep {
	return fauxAssistantMessage([], { stopReason: "error", errorMessage: message });
}

/**
 * The source that replays a script. Each binding of an actor starts at the first step of its list; an actor
 * without a list, and a request after the last step, get the error answer of the provider library. A scripted
 * model has no price and is exempt from `SWT-X007`.
 *
 * @param script - The answers of every actor.
 * @returns The source.
 * @example
 * ```ts
 * const source = scriptedSource({ "resident:r1": [act({ name: "guess", args: { n: 3 } }), say()] });
 * ```
 *
 * @public
 */
export function scriptedSource(script: Script): ModelSource {
	return Object.freeze({
		bind: (actor: ActorId, limits: RequestLimits): ModelBinding => {
			const faux = fauxProvider();
			faux.setResponses([...(script[actor] ?? [])]);
			const models = closedModels();
			models.setProvider(faux.provider);
			return { model: faux.getModel(), streamFn: limitedStream(models, limits) };
		},
	});
}
