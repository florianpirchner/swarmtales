// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The driver of a Director that acts by tool use (`acts: "tools"`, REWRITE 3.6's "declared exception"): one look is
 * a resident session of its own (the same request, tool list and limits as a resident's), started with the
 * Director's system text and with its input as the one new text, and the tools of its grant that are open now. The
 * model calls them, in order and through the activation, until it answers without a tool call or the look reaches
 * its `maxRequests` (2 when left out, the old `modelCallsPerTurn`). A look keeps no conversation for the next one,
 * as the old gamemaker's runtime made a fresh agent per look; the actor's binding is made once, so a provider's
 * cache spans the looks.
 */
import type { Activation, ActorId, Kernel, Redact } from "@swarmtales/contracts";
import { over } from "../director.ts";
import type { CostMeter } from "../meter.ts";
import { REQUEST_TIMEOUT_MS } from "../request.ts";
import type { ModelSettings } from "../settings.ts";
import type { ModelBinding, ModelSource } from "../source.ts";
import { createResidentSession } from "./session.ts";

/**
 * The model requests of one look when the Director's limits do not say: the old `modelCallsPerTurn`.
 *
 * @internal
 */
export const LOOK_REQUESTS = 2;

/**
 * What the looks of the Directors that act by tool use are made of.
 *
 * @public
 */
export interface LookInput {
	/** The kernel of the run, for the tools open to the Director now. */
	readonly kernel: Pick<Kernel, "openTools">;
	/** The model source; every Director that looks is bound once. */
	readonly source: ModelSource;
	/** The thinking level and the output cap of a Director's model. */
	readonly settings: (actor: ActorId) => Pick<ModelSettings, "thinking" | "maxOutputTokens">;
	/** The limits of a Director: `maxCostUsd` counts on the meter under its actor, `maxRequests` bounds a look. */
	readonly limits: (actor: ActorId) => { readonly maxCostUsd?: number; readonly maxRequests?: number };
	/** The cost meter of the run. */
	readonly meter: CostMeter;
	/** Takes secrets out of the error text of a failed request. */
	readonly redact: Redact;
	/** Shown names of granted tools the model is never given: the tool `take` of the plugin `directors`. */
	readonly hidden?: readonly string[];
}

/**
 * One look of a Director: the activation, and the system and input texts of the Director.
 *
 * @public
 */
export type Look = (activation: Activation, question: { readonly system: string; readonly input: string }) => Promise<void>;

/**
 * Creates the look of the Directors that act by tool use, for `look` of the engine's `createDirectorDrivers`.
 * Nothing is sent once the meter's limit or the Director's `maxCostUsd` is reached.
 *
 * @param input - The kernel, the source, the settings and limits per Director, the meter, the redaction and the hidden tools.
 * @returns The look. It records what a resident session records, under the Director's actor.
 * @throws SwtError From the look: `SWT-X007` from `bind`, `SWT-X040` and `SWT-R017` for a record.
 * @example
 * ```ts
 * const look = createToolDirector({ kernel, source, settings: () => settings, limits: () => ({}), meter, redact, hidden: ["take"] });
 * const drivers = createDirectorDrivers({ game, ask, look });
 * ```
 *
 * @public
 */
export function createToolDirector(input: LookInput): Look {
	const bindings = new Map<ActorId, ModelBinding>();
	return async (activation, question) => {
		const { actor } = activation;
		const settings = input.settings(actor);
		const limits = input.limits(actor);
		const binding = bindings.get(actor) ?? input.source.bind(actor, { maxOutputTokens: settings.maxOutputTokens, timeoutMs: REQUEST_TIMEOUT_MS });
		bindings.set(actor, binding);
		const open = input.kernel.openTools(actor).filter((name) => !(input.hidden ?? []).includes(name));
		const tools = activation.tools.filter((spec) => open.includes(spec.name));
		const session = createResidentSession({ actor, systemPrompt: question.system, tools, binding, thinking: settings.thinking, meter: input.meter, redact: input.redact });
		// The look's input is its one new text: the input lines of the activation are not the Director's.
		const look: Activation = { ...activation, inputs: [] };
		for (let made = 0; made < (limits.maxRequests ?? LOOK_REQUESTS); made++) {
			if (over(input.meter, actor, limits.maxCostUsd) !== undefined) return;
			const { pending } = await session.step(look, made === 0 ? { open, notice: [question.input] } : { open });
			if (!pending) return;
		}
	};
}
