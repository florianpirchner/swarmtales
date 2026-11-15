// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The smallest model port: one question to a model inside an activation, and its answer. The Director's driver
 * asks through it, so that the engine needs no import of the models package. No behaviour. The file is not under
 * `kernel/`: the kernel knows no model and no cost.
 */
import type { Activation } from "../kernel/ports.ts";

/**
 * One question to a model.
 *
 * @public
 */
export interface ModelQuestion {
	/** The system prompt. */
	readonly system: string;
	/** The input the model answers. */
	readonly input: string;
	/** The JSON schema the answer must fit. */
	readonly output: unknown;
}

/**
 * The answer to a {@link ModelQuestion}: the value with what it cost, or the reason there is none. A failure is an
 * answer and never a throw.
 *
 * @remarks
 * `limit`: a limit of calls or of money was reached and the model was not asked. `invalid`: the model answered
 * with something that is no JSON or does not fit `output`. `error`: the request failed.
 *
 * @public
 */
export type ModelAnswer =
	| {
			/** The model answered and the answer fits. */
			readonly ok: true;
			/** The answer, checked against `output` of the question. */
			readonly value: unknown;
			/** What the question cost, in US dollars. */
			readonly costUsd: number;
	  }
	| {
			/** There is no answer to act on. */
			readonly ok: false;
			/** Why there is none. */
			readonly reason: "limit" | "invalid" | "error";
			/** The reason in words, for the log. */
			readonly detail: string;
	  };

/**
 * Asks a model once inside an activation. The implementation writes its own records through `activation.record`.
 *
 * @param activation - The open activation of the actor that asks.
 * @param question - The question.
 * @returns The answer, or the reason there is none; the promise never rejects for a failure of the model.
 *
 * @public
 */
export type AskModel = (activation: Activation, question: ModelQuestion) => Promise<ModelAnswer>;
