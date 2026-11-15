// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Drivers for offline runs: a scripted one, an idle one and the fake one (`--fake`). A port of the old
 * `agents.ts`; a driver is a plain async function of the activation, so a test that decides each call from the
 * reply before it writes such a function itself.
 */
import type { Activation, ActorDriver, ActorId, JsonValue, Kernel, RandomSource, ToolOutcome } from "@swarmtales/contracts";
import { rngFor } from "@swarmtales/kernel";

const FAKE_CALLS = 8;

/**
 * One call a scripted driver makes.
 *
 * @public
 */
export interface PlannedCall {
	/** The shown name of the tool. */
	readonly tool: string;
	/** The params as the caller writes them. */
	readonly params: unknown;
}

/**
 * What an actor does in one activation, decided from the activation alone.
 *
 * @public
 */
export type Plan = (activation: Activation) => readonly PlannedCall[] | Promise<readonly PlannedCall[]>;

/**
 * One call a scripted driver made, with its outcome.
 *
 * @public
 */
export interface CallRecord {
	/** The tick of the activation. */
	readonly tick: number;
	/** The actor that called. */
	readonly actor: ActorId;
	/** The shown name of the tool. */
	readonly tool: string;
	/** What the kernel answered. */
	readonly outcome: ToolOutcome;
}

/**
 * A driver that makes the planned calls one after the other, each awaited; it is never pending.
 *
 * @param plan - The calls of one activation.
 * @param record - When given, every call and its outcome is appended here.
 * @returns The driver.
 * @example
 * ```ts
 * const driver = scriptedDriver((activation) => (activation.tick === 1 ? [{ tool: "guess", params: { value: 4 } }] : []));
 * ```
 *
 * @public
 */
export function scriptedDriver(plan: Plan, record?: CallRecord[]): ActorDriver {
	return async (activation) => {
		for (const call of await plan(activation)) {
			const outcome = await activation.call(call.tool, call.params);
			record?.push({ tick: activation.tick, actor: activation.actor, tool: call.tool, outcome });
		}
	};
}

/**
 * A driver that does nothing.
 *
 * @returns Nothing: it is never pending.
 *
 * @public
 */
export const idleDriver: ActorDriver = () => Promise.resolve();

// The first open tool of the actor whose `sample` gives params, in grant order.
function sampled(kernel: Kernel, actor: ActorId, random: RandomSource): { readonly tool: string; readonly params: JsonValue } | undefined {
	for (const tool of kernel.openTools(actor)) {
		const params = kernel.sample(actor, tool, random);
		if (params !== undefined) return { tool, params };
	}
	return undefined;
}

/**
 * The fake driver (`--fake`): for the activated actor it calls the first open tool whose `sample` gives params,
 * and again until a reply ends the turn, no open tool samples, or 8 calls were made. Its random stream is derived
 * from the seed, the actor and the activation's basis, so it keeps nothing between two activations and a resumed
 * run plays as the straight one.
 *
 * @param kernel - The kernel the driver plays on: it asks it for the open tools and their samples.
 * @param seed - The seed of the driver's choices.
 * @returns The driver; it is never pending.
 * @throws SwtError `SWT-R003` from the returned driver when a tool's `sample` throws.
 * @example
 * ```ts
 * const played = await play(game, { drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
 * ```
 *
 * @public
 */
export function fakeDriver(kernel: Kernel, seed: number): ActorDriver {
	return async (activation) => {
		const random = rngFor(seed, "fake", activation.actor, activation.basis);
		for (let made = 0; made < FAKE_CALLS; made++) {
			const next = sampled(kernel, activation.actor, random);
			if (next === undefined) return;
			const outcome = await activation.call(next.tool, next.params);
			if (outcome.ok && outcome.endsTurn === true) return;
		}
	};
}
