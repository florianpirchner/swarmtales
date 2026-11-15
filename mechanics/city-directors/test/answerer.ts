// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Test support: a scripted answerer port that asks a real answerer Director as the engine's port does (its `system`
 * and `input` with the question, the answer checked against its `output`), with a list of model answers instead of
 * a model (a mechanic's test may not import the engine, erratum J113).
 */
import type { ReviewAnswer, ReviewPort } from "@swarmtales/contracts";
import type { DirectorDefinition } from "@swarmtales/sdk";
import { Check } from "typebox/value";

/** One question as the model would have read it. */
export interface Asked {
	readonly question: unknown;
	readonly system: string;
	readonly input: string;
}

/**
 * The port: `director` answers its questions with the next answer of the list (`undefined`, or the end of the list,
 * is a failed answer); an answer that does not fit its `output` is `{ ok: false }`.
 *
 * @param director - The answerer Director.
 * @param raw - Its options, as the game names them.
 * @param answers - The model's answers in order.
 * @param asked - Where the questions are kept.
 * @returns The port.
 */
export function scriptedAnswerer(director: DirectorDefinition, raw: unknown, answers: readonly unknown[], asked: Asked[] = []): ReviewPort {
	const options = director.parseOptions(raw);
	return {
		answers: (answerer) => answerer === director.answers,
		ask: ({ question }) => {
			const ctx = { name: director.id, options, tick: 0, firings: [], facts: {}, question };
			const answer = answers[asked.length];
			asked.push({ question, system: director.system(ctx), input: director.input(ctx) });
			const answered: ReviewAnswer = answer !== undefined && Check(director.output, answer) ? { ok: true, answer } : { ok: false };
			return Promise.resolve(answered);
		},
	};
}
