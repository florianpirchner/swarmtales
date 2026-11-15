// SPDX-License-Identifier: Apache-2.0
/** Part 5: the port of one plugin, the only way a plugin reaches the kernel. */
import type { PluginPort, ResolvedPlugin } from "@swarmtales/contracts";
import type { PluginPortParts } from "./parts.ts";
import { rngFor } from "./random.ts";

/**
 * Builds the port of one plugin.
 *
 * `emit` of an undeclared event type, and `schedule.at` or a `stage` with a `then` of a job the plugin does not have,
 * throw a `RangeError`: a mistake of the plugin, which the caller of its code turns into `SWT-R003`. The default audience of an event is
 * set by the log (`audienceOf`), not here.
 *
 * @param plugin - The plugin as the definition lists it.
 * @param parts - The kernel parts the port reaches.
 * @returns The port.
 */
export function portFor(plugin: ResolvedPlugin, parts: PluginPortParts): PluginPort {
	const { definition, log, clock } = parts;
	const source = `${plugin.package}/${plugin.id}`;
	return {
		id: plugin.id,
		source,
		seed: definition.seed,
		maxTicks: definition.limits.maxTicks,
		tick: () => clock.tick,
		emit(type, payload) {
			if (!Object.hasOwn(plugin.events, type)) throw new RangeError(`the event "${type}" is not declared by "${plugin.id}"`);
			log.emit(source, type, payload);
		},
		call: (service, method, input) => parts.services.call(plugin.id, service, method, input),
		has: (service) => definition.plugins.some((other) => other.provides.includes(service)),
		rng: (...labels) => rngFor(definition.seed, ...labels),
		actors: parts.actors.portFor(plugin.id),
		schedule: {
			at(tick, job, data) {
				if (!parts.hasJob(plugin.id, job)) throw new RangeError(`"${plugin.id}" schedules the job "${job}", which it does not have`);
				clock.at(plugin.id, tick, job, data);
			},
		},
		access: parts.access.portFor(plugin.id),
		stage(as, params, options) {
			const then = options?.then;
			if (then !== undefined && !parts.hasJob(plugin.id, then)) throw new RangeError(`"${plugin.id}" stages ${as} with the job "${then}", which it does not have`);
			parts.staged.push({ owner: plugin.id, as, params, causedBy: log.frame().causedBy, then });
		},
	};
}
