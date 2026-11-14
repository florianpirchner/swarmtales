// SPDX-License-Identifier: Apache-2.0
/**
 * The assembly's sequence of a run: the start, one tick in two halves (the scheduler plays between them), the end
 * and the failure. A port of `Host#play`, `start`, `#finish` and `#fail` of the old `host.ts`.
 *
 * Every hook and every job runs in its own outermost frame, so the listeners of what it emitted have run before
 * the next one is called. Whatever throws in a step ends the run through `fail` and is thrown on.
 */
import { redactSecrets, SwtError, type Job, type RunEnd } from "@swarmtales/contracts";
import { guarded, kernelFailed, misfit, sinkThrew } from "./errors.ts";
import type { Lifecycle, LifecycleParts } from "./parts.ts";

/** A run limit that answered a reason. */
interface Breach {
	readonly limit: string;
	readonly reason: string;
}

const SOURCE = "kernel";

// What `run_ended` says about a failure: code and summary of a developer error, else the thrown message; never a
// secret, because the line is signed as it is written (the redaction port of M2-05 replaces the fixed function).
function detailOf(error: unknown): string {
	if (error instanceof SwtError) return redactSecrets(error.issues[0] === undefined ? error.message : `${error.issues[0].code}: ${error.issues[0].summary}`);
	return redactSecrets(error instanceof Error ? error.message : String(error));
}

class Run implements Lifecycle {
	readonly #parts: LifecycleParts;
	#breach: Breach | undefined;
	#failure: { readonly error: unknown } | undefined;
	#closed = false;
	/** The closing event of a normal end is written (or was tried): a failure after that adds no second one. */
	#ending = false;

	constructor(parts: LifecycleParts) {
		this.#parts = parts;
	}

	get halted(): boolean {
		if (this.#failure !== undefined) return true;
		try {
			this.#breach ??= this.#check();
		} catch (error) {
			this.fail(error);
			throw error;
		}
		return this.#breach !== undefined;
	}

	start(): void {
		this.#step(() => {
			const { definition, log, loaded } = this.#parts;
			log.emit(SOURCE, "run_started", {
				game: definition.game.id,
				seed: definition.seed,
				maxTicks: definition.limits.maxTicks,
				actors: definition.actors.map((actor) => actor.id),
				plugins: [...loaded.order],
			});
			this.#hooks("runStarted");
		});
	}

	beginTick(): Promise<void> {
		return new Promise((resolve) => {
			this.#step(() => {
				const { log, clock, steps } = this.#parts;
				steps.tickStarted();
				log.emit(SOURCE, "tick_started", {});
				for (const job of clock.take(clock.tick)) this.#job(job);
				this.#hooks("tickStarted");
				this.#breach = undefined;
			});
			resolve();
		});
	}

	endTick(idle: boolean): Promise<RunEnd | undefined> {
		return new Promise((resolve) => {
			resolve(this.#step(() => this.#end(idle)));
		});
	}

	fail(error: unknown): void {
		if (this.#failure !== undefined) return;
		this.#failure = { error };
		const { log, clock } = this.#parts;
		// A run that has ended keeps its `run_ended`: a sink that threw at it, or while it was closed, adds no second one.
		if (this.#ending) {
			this.#close({ reason: "error", tick: clock.tick });
			return;
		}
		try {
			log.fail(() => {
				log.emit(SOURCE, "run_ended", { reason: "error", detail: detailOf(error) });
			});
		} catch {
			// The first failure is the one that is reported; what the closing throws would hide it.
		}
		this.#close({ reason: "error", tick: clock.tick });
	}

	// Runs one step of the sequence: refused after a failure, and a throw of it is the failure.
	#step<T>(code: () => T): T {
		if (this.#failure !== undefined) throw new SwtError(kernelFailed(), { cause: this.#failure.error });
		try {
			return code();
		} catch (error) {
			this.fail(error);
			throw error;
		}
	}

	// Steps 4 to 7 of the tick sequence.
	#end(idle: boolean): RunEnd | undefined {
		const { definition, log, clock } = this.#parts;
		this.#breach ??= this.#check();
		this.#hooks("tickEnded");
		log.emit(SOURCE, "tick_ended", {});
		this.#breach ??= this.#check();
		const breach = this.#breach;
		// A breach seen before anything was played ends the run at that tick: the clock stays.
		if (!idle || breach === undefined) clock.advance();
		if (breach !== undefined) {
			log.emit(SOURCE, "limit_reached", { limit: breach.limit, reason: breach.reason });
			return this.#finish({ reason: "limit", tick: clock.tick, limit: breach.limit });
		}
		if (clock.tick >= definition.limits.maxTicks) return this.#finish({ reason: "ticks", tick: clock.tick });
		return undefined;
	}

	// The first run limit, in load order, that answers a reason.
	#check(): Breach | undefined {
		const { loaded } = this.#parts;
		for (const { id, limit } of loaded.limits) {
			const owner = loaded.order.find((plugin) => id.startsWith(`${plugin}.`)) ?? id;
			const reason = guarded(owner, () => limit.check());
			if (reason !== undefined) return { limit: id, reason };
		}
		return undefined;
	}

	#hooks(hook: "runStarted" | "tickStarted" | "tickEnded"): void {
		const { log, loaded } = this.#parts;
		for (const entry of loaded.hooks(hook)) {
			log.run({ actor: "kernel" }, () => {
				entry.run();
			});
		}
	}

	// Writes `job_ran` and runs the job in a frame caused by it.
	#job(job: Job): void {
		const { log, loaded } = this.#parts;
		const run = loaded.instances.get(job.owner)?.jobs[job.job];
		if (run === undefined) throw new SwtError(misfit(`a job "${job.job}" of "${job.owner}" is due, and no loaded plugin has it`, "Resume a snapshot only with the definition it was taken from."));
		log.run({ actor: "kernel" }, () => {
			const ran = log.emit(SOURCE, "job_ran", { owner: job.owner, job: job.job });
			log.run({ actor: "kernel", causedBy: ran.seq }, () => {
				guarded(job.owner, () => {
					run(job.data);
				});
			});
		});
	}

	#finish(end: RunEnd): RunEnd {
		this.#ending = true;
		this.#parts.log.emit(SOURCE, "run_ended", { reason: end.reason });
		const thrown = this.#close(end);
		if (thrown !== undefined) throw new SwtError(sinkThrew(thrown.error), { cause: thrown.error });
		return end;
	}

	// Closes every sink once; answers the first throw of a `close`.
	#close(end: RunEnd): { readonly error: unknown } | undefined {
		if (this.#closed) return undefined;
		this.#closed = true;
		let first: { readonly error: unknown } | undefined;
		for (const sink of this.#parts.sinks) {
			try {
				sink.close?.(end);
			} catch (error) {
				first ??= { error };
			}
		}
		return first;
	}
}

/**
 * Builds the lifecycle of one run: `start`, the two halves of a tick, the end and the failure.
 *
 * `start` writes `run_started` and runs the `runStarted` hooks. `beginTick` resets the step counters, writes
 * `tick_started`, runs the due jobs and the `tickStarted` hooks, and forgets the breach of the last tick.
 * `endTick` checks the run limits, runs the `tickEnded` hooks, writes `tick_ended`, moves the clock on and ends
 * the run when a limit is reached or the last tick is over. `halted` checks the run limits; a breach, once seen,
 * stays for the tick.
 *
 * @param parts - The definition, the log, the clock, the step counter, what was loaded, and the sinks to close.
 * @returns The lifecycle. Its steps throw (or reject with) `SWT-R003` when plugin code threw, `SWT-R020` when a
 * sink threw while it was closed, `SWT-R002` when a due job has no owner, and `SWT-R001` once the run failed.
 */
export const createLifecycle = (parts: LifecycleParts): Lifecycle => new Run(parts);
