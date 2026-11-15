// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The cost meter: the one place that counts what a run spent and the one place that holds its cap. The numbers
 * come from the answers of the provider library; the cap reaches the kernel as the run limit `models.budget`.
 * The meter fails closed: after an answer it could not count, its limit is breached and nothing more is sent.
 * It reserves the cost of the dearest answer so far (runtime revision 5, P472): its limit is breached as soon as
 * one more answer of that cost would reach the cap, so a cap is passed only by an answer dearer than every one
 * before it, or by requests that were sent at the same time.
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
	 * @throws RangeError when a number is missing, negative, not finite or no number; nothing is counted then and the meter is closed.
	 */
	add(actor: ActorId, usage: Omit<Spend, "requests">): void;
	/**
	 * Closes the meter: an answer was paid for and its cost is not known. The limit is breached from then on,
	 * whatever was counted, so no further request is sent and the kernel ends the run. The first reason is kept.
	 *
	 * @param reason - What could not be counted, as a sentence part without a secret.
	 */
	close(reason: string): void;
	/** The reason the meter was closed for; `undefined` while every answer was counted. */
	readonly closed: string | undefined;
	/** The spending of the run so far. */
	readonly total: Spend;
	/** The spending of each actor that was answered, by actor id. */
	readonly byActor: Readonly<Record<string, Spend>>;
	/** The cap, in USD. */
	readonly capUsd: number;
	/** The cost of the dearest answer so far, in USD: what the meter reserves for the next request; 0 before the first answer. */
	readonly dearestUsd: number;
	/**
	 * The run limit `models.budget`: breached when the meter is closed, when `total.costUsd >= capUsd`, or, with the
	 * reservation, when `total.costUsd + dearestUsd >= capUsd`. Pass it to `KernelPorts.limits`.
	 */
	readonly limit: RunLimit;
}

/**
 * How a meter counts against its cap.
 *
 * @public
 */
export interface CostMeterOptions {
	/**
	 * The runtime revision whose rule the meter keeps, for a replay of an older run: below 5 the limit is breached
	 * only at the cap and its reason writes the money in two decimals, as revision 4 did. Default: 5, the reservation
	 * of the dearest answer and the money in full.
	 */
	readonly revision?: number;
}

/**
 * An amount of money as the meter writes it: up to nine decimals, without trailing zeros, never in exponent form.
 *
 * @param amount - The amount, in USD.
 * @returns The digits, for example `0.00133` or `0.001`.
 * @example
 * ```ts
 * formatUsd(0.0013322); // "0.0013322"
 * ```
 *
 * @public
 */
export function formatUsd(amount: number): string {
	if (!Number.isFinite(amount)) return String(amount);
	return amount.toFixed(9).replace(/\.?0+$/u, "");
}

// The runtime revision from which the meter reserves the dearest answer (P472).
const RESERVED_FROM = 5;

// The reason of a breach, or undefined while one more answer of the dearest cost stays under the cap.
function breach(costUsd: number, dearestUsd: number, capUsd: number, reserve: boolean): string | undefined {
	const money = reserve ? formatUsd : (amount: number): string => amount.toFixed(2);
	// Not `>=` alone: a sum that is no number any more must stop the run too.
	if (!(costUsd < capUsd)) return `cost ${money(costUsd)} USD reached the cap of ${money(capUsd)} USD`;
	if (!reserve || costUsd + dearestUsd < capUsd) return undefined;
	return `cost ${formatUsd(costUsd)} USD and the dearest answer so far (${formatUsd(dearestUsd)} USD) reach the cap of ${formatUsd(capUsd)} USD`;
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
 * @param options - The runtime revision whose rule the meter keeps (default: 5, it reserves the dearest answer so far).
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
export function createCostMeter(capUsd: number, options: CostMeterOptions = {}): CostMeter {
	if (!(Number.isFinite(capUsd) && capUsd > 0)) throw thrown(noCostCap(), redactSecrets);
	const reserve = (options.revision ?? RESERVED_FROM) >= RESERVED_FROM;
	let total = NOTHING;
	let dearestUsd = 0;
	let closed: string | undefined;
	const byActor = new Map<string, Spend>();
	const close = (reason: string): void => {
		closed ??= reason;
	};
	return Object.freeze({
		add: (actor: ActorId, usage: Omit<Spend, "requests">): void => {
			// `Number.isFinite` is false for a text, for `undefined` and for NaN: only a plain amount is counted.
			const bad = FIELDS.find((field) => !(Number.isFinite(usage[field]) && usage[field] >= 0));
			if (bad !== undefined) {
				close(`the ${bad} of an answer to ${actor} is no amount that can be counted`);
				throw new RangeError(`the ${bad} of a request of ${actor} is negative or not finite`);
			}
			total = plus(total, usage);
			dearestUsd = Math.max(dearestUsd, usage.costUsd);
			byActor.set(actor, plus(byActor.get(actor) ?? NOTHING, usage));
		},
		close,
		get closed(): string | undefined {
			return closed;
		},
		get total(): Spend {
			return total;
		},
		get byActor(): Readonly<Record<string, Spend>> {
			return Object.freeze(Object.fromEntries(byActor));
		},
		get dearestUsd(): number {
			return dearestUsd;
		},
		capUsd,
		limit: Object.freeze({
			id: "models.budget",
			summary: "the cost of the run's model requests reached its cap",
			check: (): string | undefined => {
				if (closed !== undefined) return `the cost of the run is not known: ${closed}`;
				return breach(total.costUsd, dearestUsd, capUsd, reserve);
			},
		}),
	});
}
