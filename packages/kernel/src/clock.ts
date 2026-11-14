// SPDX-License-Identifier: Apache-2.0
/**
 * Part 6: the tick and the job queue. A job is a named function of a plugin; an entry holds only the owner, the
 * job's name, its tick and its data, so the queue is part of the snapshot. Due jobs are taken once, in the order
 * they were scheduled. A job for the running tick whose jobs were already taken is due at the next one.
 */
import type { Job, JsonValue } from "@swarmtales/contracts";

/**
 * Creates the clock of a run, at tick 0 with no job. `at` queues a job of the plugin `owner`; `take` removes and
 * returns the jobs due at a tick, in the order they were scheduled.
 *
 * @returns The clock.
 * @throws RangeError From `at`, when the tick is no integer or lies in the past.
 */
export function createClock() {
	let now = 0;
	let jobs: Job[] = [];
	let nextId = 1;
	return {
		get tick(): number {
			return now;
		},
		advance: (): void => {
			now += 1;
		},
		at: (owner: string, tick: number, job: string, data?: JsonValue): void => {
			if (!Number.isInteger(tick) || tick < now) throw new RangeError(`${owner}: cannot schedule "${job}" at tick ${String(tick)}, the tick is ${String(now)}`);
			jobs.push({ id: nextId, owner, job, next: tick, ...(data === undefined ? {} : { data }) });
			nextId += 1;
		},
		take: (tick: number): readonly Job[] => {
			const due = jobs.filter((entry) => entry.next <= tick);
			jobs = jobs.filter((entry) => entry.next > tick);
			return due;
		},
		state: (): readonly Job[] => [...jobs],
		restore: (tick: number, entries: readonly Job[]): void => {
			now = tick;
			jobs = [...entries].sort((a, b) => a.id - b.id);
			nextId = Math.max(0, ...entries.map((entry) => entry.id)) + 1;
		},
	};
}
