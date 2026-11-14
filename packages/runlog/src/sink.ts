// SPDX-License-Identifier: Apache-2.0
/** The sink of a run folder: it stamps each event with the wall clock and hands it to the chain writer. */
import type { EventSink } from "@swarmtales/contracts";
import type { EventChain } from "./chain-writer.ts";

/**
 * Makes the sink that writes a run's log. Each event becomes one stored envelope: the event plus `at`, the time
 * `now()` gives. An event that holds something that is no JSON value (`undefined`, a Date) is refused by the chain
 * writer's `CanonicalJsonError`, which ends the run (SWT-R020).
 *
 * @param chain - The chain writer of the run folder.
 * @param now - The clock: the wall clock in a run, a fixed clock in a test, so that a test run is the same bytes.
 * @returns The sink; its `close` signs the head of the chain.
 * @example
 * ```ts
 * const sink = createSink(new EventChain(directory, genesis), () => new Date());
 * ```
 *
 * @public
 */
export function createSink(chain: EventChain, now: () => Date): EventSink {
	return {
		write(event) {
			chain.append({ ...event, at: now().toISOString() });
		},
		close() {
			chain.close();
		},
	};
}
