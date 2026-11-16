// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of a game, in process: its log replays equal, and a run resumed from any tick boundary writes
 * the log of the straight run. Each returns a list of problems, empty when the game holds, so any test framework can
 * assert on it. The same two checks through the command line, and the fake run, are `apps/cli/test/standing.test.ts`
 * over the games list `games/index.ts`.
 */
import type { DriverTable, Envelope, GameData, JsonValue, Kernel, ReviewPort } from "@swarmtales/contracts";
import { REVIEW_RECORDS } from "@swarmtales/engine";
import type { Game } from "@swarmtales/sdk";
import { play, testKernel, type Played, type PlayOptions } from "./play.ts";
import { replay } from "./replay.ts";


/**
 * Makes the drivers of one run. It is called once for the straight run and once for every resumed run, so each run
 * starts with fresh drivers: a driver must decide from what its activation shows (its tick, its inputs, the replies),
 * not from what it counted before.
 *
 * @public
 */
export type StandingDrivers = (kernel: Kernel) => DriverTable;

/**
 * Makes the answerer port of the stage `review` for one run, as `StandingDrivers` makes the drivers: once for the
 * straight run and once for every resumed run. An answer must follow from the question, not from what the port
 * answered before.
 *
 * @public
 */
export type StandingReview = () => ReviewPort;

/**
 * How a standing check plays: the options of `play` it passes on, and the boundaries it resumes from.
 *
 * @public
 */
export interface StandingOptions extends Pick<PlayOptions, "seed" | "prompts" | "installed" | "params" | "records"> {
	/** The boundaries to resume from, as numbers of finished ticks; default: `sampleBoundaries` of the run's tick count. */
	readonly boundaries?: readonly number[];
	/**
	 * Makes the answerer port of each run (`answeringReview` gives one); the replay asks the straight run's port who
	 * answers, and `REVIEW_RECORDS` of the engine joins `records`. Left out: no answerer answers, in the run and in
	 * its replay.
	 */
	readonly review?: StandingReview;
}

/**
 * An answerer port for the standing checks: each named answerer answers what its function gives for the question,
 * and the port records the question and the answer (`asked`, `answered` of the engine's `REVIEW_RECORDS`) as the
 * engine's port does, so a replay feeds the answer from the log.
 *
 * @param answers - Answerer name to its answer, from the question alone.
 * @returns The maker of a fresh port for each run.
 * @example
 * ```ts
 * const review = answeringReview({ judge: (question) => ({ deniesReceipt: JSON.stringify(question).includes("never") }) });
 * expect(await checkReplay(game, drivers, { review })).toEqual([]);
 * ```
 *
 * @public
 */
export function answeringReview(answers: Readonly<Record<string, (question: JsonValue) => unknown>>): StandingReview {
	return () => ({
		answers: (answerer) => Object.hasOwn(answers, answerer),
		ask: ({ answerer, question, record }) => {
			record(REVIEW_RECORDS.id, "asked", { answerer, question });
			const answer = answers[answerer]?.(question);
			record(REVIEW_RECORDS.id, "answered", { answerer, ok: true, answer, costUsd: 0 });
			return Promise.resolve({ ok: true, answer });
		},
	});
}

// The options of `play` for one run: the given ones, with a fresh answerer port and its record source where one is made.
function playing(options: StandingOptions): Omit<PlayOptions, "drivers"> {
	const { review, ...rest } = options;
	if (review === undefined) return rest;
	const records = rest.records ?? [];
	return { ...rest, review: review(), records: records.includes(REVIEW_RECORDS) ? records : [...records, REVIEW_RECORDS] };
}

const plain = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

// A value as a snapshot file gives it back: written as JSON with the keys of every object sorted, and read again.
function stored(value: unknown): unknown {
	const sorted = (_key: string, inner: unknown): unknown => (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => (left < right ? -1 : 1))) : inner);
	return JSON.parse(JSON.stringify(value, sorted));
}

const said = (event: Envelope | undefined): string => (event === undefined ? "nothing" : JSON.stringify(event));

// The first line at which two logs differ, as one problem; nothing when they are equal.
function difference(label: string, expected: readonly Envelope[], got: readonly Envelope[]): readonly string[] {
	for (let index = 0; index < Math.max(expected.length, got.length); index++) {
		const [left, right] = [said(expected[index]), said(got[index])];
		if (left !== right) return [`${label}: line ${String(index + 1)} differs:\n  ${left}\n  ${right}`];
	}
	return [];
}

/**
 * The boundaries a resume check takes from a run of `ticks` ticks: every boundary from 0 (before the first tick) to
 * `ticks - 1` for a run of at most `every` ticks; for a longer run at most eight (decision A102): the first, the last
 * three and one at each fifth of the run. A resume plays the rest of the run, so the early boundaries are the dear ones.
 * Up to 12 ticks, as the command line's standing checks (M5-92; it was 30 before).
 *
 * @param ticks - The number of ticks the straight run played.
 * @param every - Up to this many ticks every boundary is taken; 12 when left out.
 * @returns The boundaries, as numbers of finished ticks, ascending.
 *
 * @public
 */
export function sampleBoundaries(ticks: number, every = 12): readonly number[] {
	const all = Array.from({ length: Math.max(ticks, 0) }, (_, index) => index);
	const fifths = [1, 2, 3, 4].map((fifth) => Math.floor((ticks * fifth) / 5));
	return ticks <= every ? all : all.filter((tick) => tick === 0 || tick >= ticks - 3 || fifths.includes(tick));
}

/**
 * The straight run of a standing check: the game played with the drivers and the options as `checkReplay` plays it
 * (a fresh answerer port, `REVIEW_RECORDS` among the record sources), so a test can see what the check covers.
 *
 * @param game - The game, in its builder form or its data form.
 * @param drivers - Makes the drivers of the run.
 * @param options - As `checkReplay`; the boundaries are not read.
 * @returns The played run.
 * @throws SwtError What `play` throws.
 *
 * @public
 */
export async function playStanding(game: Game | GameData, drivers: StandingDrivers, options: StandingOptions = {}): Promise<Played> {
	return play(game, { ...playing(options), drivers });
}

/**
 * Replay: plays the game with the drivers and replays its log; the replayed log must be the log, line by line.
 *
 * @param game - The game, in its builder form or its data form (a family is built first).
 * @param drivers - Makes the drivers of the run: a script of the game's tests, or the fake driver.
 * @param options - The seed, the prompts, the installed mechanics, the params, the record sources and the answerer port.
 * @returns The problems; empty when the replay is equal. A run without an accepted call is a problem: it proves nothing.
 * @throws SwtError What `play` and `replay` throw.
 * @example
 * ```ts
 * expect(await checkReplay(game, (kernel) => ({ resident: fakeDriver(kernel, 7) }), { seed: 7 })).toEqual([]);
 * ```
 *
 * @public
 */
export async function checkReplay(game: Game | GameData, drivers: StandingDrivers, options: StandingOptions = {}): Promise<readonly string[]> {
	const run = playing(options);
	const { events } = await play(game, { ...run, drivers });
	if (!events.some((event) => event.type === "tool_result")) return ["replay: the run holds no accepted call, so its replay proves nothing"];
	const port = run.review;
	const answerers = port === undefined ? [] : (answerer: string): boolean => port.answers(answerer);
	const again = await replay({ game, log: events, answerers, ...(run.records === undefined ? {} : { records: run.records }) });
	return again.issue === undefined ? [] : [`replay: ${again.issue.summary}:\n  ${JSON.stringify(again.firstDifference?.expected)}\n  ${JSON.stringify(again.firstDifference?.got)}`];
}

/**
 * Resume in process: plays the game one tick at a time and takes a snapshot at every boundary; then, for every
 * boundary, a second kernel is created from the snapshot and the log up to it, and plays the rest with fresh drivers.
 * Its log and its end must be those of the straight run. The snapshot is given as a snapshot file holds it (JSON,
 * the keys of every object sorted), so a state that is saved as an object and read back in key order is found.
 *
 * @param game - The game, in its builder form or its data form (a family is built first).
 * @param drivers - Makes the drivers of each run; see `StandingDrivers` for what a driver may depend on.
 * @param options - As `checkReplay` (a fresh answerer port for each run), and the boundaries when not every sampled one is wanted.
 * @returns The problems, at most one per boundary; empty when every resumed run equals the straight one. A run
 * without a boundary, and a boundary the run did not have, are problems.
 * @throws SwtError What `play` throws.
 * @example
 * ```ts
 * expect(await checkResumeEveryBoundary(game, () => ({ resident: player }), { seed: 7 })).toEqual([]);
 * ```
 *
 * @public
 */
export async function checkResumeEveryBoundary(game: Game | GameData, drivers: StandingDrivers, options: StandingOptions = {}): Promise<readonly string[]> {
	const { boundaries } = options;
	const { kernel } = testKernel(game, playing(options));
	const table = drivers(kernel);
	const cuts: { readonly snapshot: unknown; readonly lines: number }[] = [];
	while (kernel.ended === undefined) {
		cuts.push({ snapshot: stored(kernel.snapshot()), lines: kernel.log.length });
		await kernel.run(table, { ticks: 1 });
	}
	const straight = kernel.log.all();
	if (cuts.length === 0) return ["resume: the run has no tick boundary"];
	const problems: string[] = [];
	for (const tick of boundaries ?? sampleBoundaries(cuts.length)) {
		const cut = cuts[tick];
		if (cut === undefined) {
			problems.push(`resume from boundary ${String(tick)}: the run of ${String(cuts.length)} ticks has no such boundary`);
			continue;
		}
		const resumed = await play(game, { ...playing(options), drivers, resume: { snapshot: cut.snapshot, log: straight.slice(0, cut.lines).map(plain) } });
		const label = `resume from boundary ${String(tick)}`;
		problems.push(...difference(label, straight, resumed.events));
		if (JSON.stringify(resumed.end) !== JSON.stringify(kernel.ended)) problems.push(`${label}: ended with ${JSON.stringify(resumed.end)}, the straight run with ${JSON.stringify(kernel.ended)}`);
	}
	return problems;
}
