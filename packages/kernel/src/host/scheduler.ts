/**
 * The virtual-minute scheduler (docs/ideas/monorepo.md §3g). Jobs are named functions a mechanic
 * declares; an entry holds only the owner, the job's name, when it runs next and its data, so the
 * schedule is part of the snapshot. Due jobs run at the start of a minute, in the order they were
 * scheduled. A job scheduled for a minute that has started runs at the start of the next one.
 */
import type { JsonValue, SchedulePort } from "@swarmtales/contracts";

export interface ScheduledJob {
	readonly id: number;
	readonly owner: string;
	readonly job: string;
	readonly next: number;
	readonly interval?: number;
	readonly data?: JsonValue;
}

export class Scheduler {
	#entries: ScheduledJob[] = [];
	#nextId = 1;

	/** The port of one mechanic; `jobs` knows the names it declared. */
	portFor(owner: string, jobs: { has(job: string): boolean }, minute: () => number): SchedulePort {
		const known = (job: string): void => {
			if (!jobs.has(job)) throw new Error(`${owner}: no job "${job}" to schedule`);
		};
		return {
			at: (at, job, data) => {
				known(job);
				if (!Number.isInteger(at) || at < minute()) throw new RangeError(`${owner}: cannot schedule "${job}" at minute ${String(at)}`);
				this.#add({ owner, job, next: at, ...(data === undefined ? {} : { data }) });
			},
			every: (interval, job, options = {}) => {
				known(job);
				if (!Number.isInteger(interval) || interval < 1) throw new RangeError(`${owner}: invalid interval ${String(interval)}`);
				const start = options.start ?? minute() + interval;
				this.#add({ owner, job, next: start, interval, ...(options.data === undefined ? {} : { data: options.data }) });
			},
		};
	}

	/** The jobs due at `minute`, in scheduling order; repeating ones move on, one-off ones are removed. */
	take(minute: number): readonly ScheduledJob[] {
		const due = this.#entries.filter((entry) => entry.next <= minute);
		this.#entries = this.#entries.flatMap((entry) => {
			if (entry.next > minute) return [entry];
			if (entry.interval === undefined) return [];
			return [{ ...entry, next: entry.next + entry.interval * Math.max(1, Math.ceil((minute + 1 - entry.next) / entry.interval)) }];
		});
		return due;
	}

	/** Drops the jobs that match (a decision's deadline once the run's end settled it). */
	cancel(matches: (job: ScheduledJob) => boolean): void {
		this.#entries = this.#entries.filter((entry) => !matches(entry));
	}

	save(): readonly ScheduledJob[] {
		return this.#entries;
	}

	load(entries: readonly ScheduledJob[]): void {
		this.#entries = [...entries].sort((a, b) => a.id - b.id);
		this.#nextId = Math.max(0, ...entries.map((entry) => entry.id)) + 1;
	}

	#add(entry: Omit<ScheduledJob, "id">): void {
		this.#entries.push({ id: this.#nextId, ...entry });
		this.#nextId += 1;
	}
}
