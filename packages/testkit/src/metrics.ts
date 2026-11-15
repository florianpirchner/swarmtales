// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `metricsOf`: the metrics of one mechanic of a played run, as the facts of the lab read them, for a test that
 * checks a metric against a number counted by hand.
 */
import type { Envelope } from "@swarmtales/contracts";
import type { Game } from "@swarmtales/sdk";

/**
 * The metrics of one mechanic of a run as a table reads them: each over the events of that mechanic that it reads,
 * and `"absent"` where its `compute` gives no finite number (the rule of the lab's facts). A mechanic the game does
 * not load gives no metric.
 *
 * @param game - The game that was played, in its builder form.
 * @param id - The mechanic's id.
 * @param events - Every event of the run.
 * @returns The metric id to the number, or `"absent"`.
 * @example
 * ```ts
 * const { events } = await playOracle(oracle, game);
 * expect(metricsOf(game, "chess", events)).toEqual({ plies: 44, refusedMoves: 1 });
 * ```
 *
 * @public
 */
export function metricsOf(game: Game, id: string, events: readonly Envelope[]): Readonly<Record<string, number | "absent">> {
	const mechanic = game.mechanics.find((entry) => entry.mechanic.id === id)?.mechanic;
	if (mechanic === undefined) return {};
	const own = events.filter((event) => event.source === mechanic.source);
	return Object.fromEntries(
		mechanic.head.metrics.map((metric) => {
			const value = metric.compute(own.filter((event) => metric.reads.includes(event.type)));
			return [metric.id, value !== undefined && Number.isFinite(value) ? value : "absent"];
		}),
	);
}
