// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The drivers of a fake run of Whispers, as `swt run --fake` plays it (`apps/cli/src/run.ts`, `playFake`): the
 * residents and the gamemaker's look are the fake driver, from the `sample` of each tool; a Director that asks its
 * model (the Confessor) and an answerer of a review (the guard, the judge) get no answer and act on their fallback.
 */
import type { Activation, AskModel, Kernel, RecordSource, ReviewPort } from "@swarmtales/contracts";
import { createDirectorDrivers, createReviewPort, DIRECTOR_RECORDS, REVIEW_RECORDS, turns } from "@swarmtales/engine";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame, type Game } from "@swarmtales/sdk";
import { fakeDriver, type StandingDrivers } from "@swarmtales/testkit";

/** The record sources of the Directors' driver and of the review stage. */
export const RECORDS: readonly RecordSource[] = [DIRECTOR_RECORDS, REVIEW_RECORDS];

const noAnswer: AskModel = () => Promise.resolve({ ok: false, reason: "error", detail: "a fake run asks no model" });

/** The drivers of a fake run and the answerer port of its reviews. */
export interface FakeRun {
	readonly drivers: StandingDrivers;
	readonly review: ReviewPort;
}

/**
 * The drivers of a fake run of a game of Whispers.
 *
 * @param game - The game.
 * @param seed - The seed of the run and of the fake driver.
 * @returns The drivers, as a function of the kernel, and the review port, which reads the facts of that kernel.
 */
export function fakeRun(game: Game, seed: number): FakeRun {
	const resolved = resolveGame({ game, seed, schedulers: { turns }, prompts: createPromptLookup(), records: RECORDS });
	let bound: Kernel | undefined;
	const facts = (key: string): unknown => bound?.fact(key);
	const drivers: StandingDrivers = (kernel) => {
		bound = kernel;
		const fake = fakeDriver(kernel, seed);
		// Each activation first yields to the event loop: a run of only resolved promises holds the test worker for the
		// whole run, and Vitest's messages to the worker time out. The log does not depend on it.
		const yielding = async (activation: Activation): Promise<void> => {
			await new Promise((resolve) => setImmediate(resolve));
			await fake(activation);
		};
		return { resident: yielding, ...createDirectorDrivers({ game: resolved, ask: noAnswer, facts, look: yielding }) };
	};
	return { drivers, review: createReviewPort({ game: resolved, ask: noAnswer, facts }) };
}
