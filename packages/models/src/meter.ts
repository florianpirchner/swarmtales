// SPDX-License-Identifier: Apache-2.0
/**
 * The cost meter: the one place that counts what a run spent and the one place that holds its cap. The numbers
 * come from the answers of the provider library; the cap reaches the kernel as the run limit `models.budget`.
 */
import { redactSecrets, type ActorId, type RunLimit } from "@swarmtales/contracts";
import { noCostCap, thrown } from "./errors.ts";

/**
 * What was spent: requests, tokens and their cost at the price table of the provider library.
 *
 * @public
 */
export interface Spend {
	/** The answered requests. */
	readonly requests: number;
	/** The input tokens that were not read from a cache. */
	readonly input: number;
	/** The output tokens. */
	readonly output: number;
	/** The input tokens read from a cache. */
	readonly cacheRead: number;
	/** The input tokens written to a cache. */
	readonly cacheWrite: number;
	/** The cost, in USD. */
	readonly costUsd: number;
}

/**
 * Counts the spending of a run and says when the cap is reached.
 *
 * @public
 */
export interface CostMeter {
	/**
	 * Counts one answered request.
	 *
	 * @param actor - The actor that asked.
	 * @param usage - The tokens and the cost of the answer.
	 * @throws RangeError when a number is negative or not finite; nothing is counted then.
	 */
	add(actor: ActorId, usage: Omit<Spend, "requests">): void;
	/** The spending of the run so far. */
	readonly total: Spend;
	/** The spending of each actor that was answered, by actor id. */
	readonly byActor: Readonly<Record<string, Spend>>;
	/** The cap, in USD. */
	readonly capUsd: number;
	/** The run limit `models.budget`: breached when `total.costUsd >= capUsd`. Pass it to `KernelPorts.limits`. */
	readonly limit: RunLimit;
}

const NOTHING: Spend = Object.freeze({ requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 });
const FIELDS = ["input", "output", "cacheRead", "cacheWrite", "costUsd"] as const;

function plus(spend: Spend, usage: Omit<Spend, "requests">): Spend {
	return Object.freeze({
		requests: spend.requests + 1,
		input: spend.input + usage.input,
		output: spend.output + usage.output,
		cacheRead: spend.cacheRead + usage.cacheRead,
		cacheWrite: spend.cacheWrite + usage.cacheWrite,
		costUsd: spend.costUsd + usage.costUsd,
	});
}

/**
 * The cost meter of one run. A cap that code holds is the precondition of every live request (decision A14).
 *
 * @param capUsd - The cap of the run, in USD.
 * @returns The frozen meter; its `limit` has the id `models.budget`.
 * @throws SwtError `SWT-X005` when the cap is not a positive finite number.
 * @example
 * ```ts
 * const meter = createCostMeter(0.4);
 * const kernel = createKernel(game, { ...ports, limits: [meter.limit] });
 * meter.add("resident:r1", { input: 900, output: 80, cacheRead: 0, cacheWrite: 0, costUsd: 0.0013 });
 * ```
 *
 * @public
 */
export function createCostMeter(capUsd: number): CostMeter {
	if (!(Number.isFinite(capUsd) && capUsd > 0)) throw thrown(noCostCap(), redactSecrets);
	let total = NOTHING;
	const byActor = new Map<string, Spend>();
	return Object.freeze({
		add: (actor: ActorId, usage: Omit<Spend, "requests">): void => {
			const bad = FIELDS.find((field) => !(Number.isFinite(usage[field]) && usage[field] >= 0));
			if (bad !== undefined) throw new RangeError(`the ${bad} of a request of ${actor} is negative or not finite`);
			total = plus(total, usage);
			byActor.set(actor, plus(byActor.get(actor) ?? NOTHING, usage));
		},
		get total(): Spend {
			return total;
		},
		get byActor(): Readonly<Record<string, Spend>> {
			return Object.freeze(Object.fromEntries(byActor));
		},
		capUsd,
		limit: Object.freeze({
			id: "models.budget",
			summary: "the cost of the run's model requests reached its cap",
			check: (): string | undefined => (total.costUsd >= capUsd ? `cost ${total.costUsd.toFixed(2)} USD reached the cap of ${capUsd.toFixed(2)} USD` : undefined),
		}),
	});
}
