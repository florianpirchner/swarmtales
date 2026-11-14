// SPDX-License-Identifier: Apache-2.0
/** Part 5: the providers of the services, and the call of a method by another plugin. */
import { SwtError, type ProvidedService } from "@swarmtales/contracts";
import { guarded, misfit } from "./errors.ts";
import type { Log } from "./parts.ts";

/**
 * Creates the table of service providers.
 *
 * `provide` throws `SWT-R002` for a second provider of one service. `call` throws a `RangeError` for a service
 * without a provider or a method the service does not have: it is a mistake of the calling plugin, so its caller
 * turns it into `SWT-R003`. A throw of the provider is `SWT-R003` of the providing plugin.
 *
 * `has` says whether a provider is registered now; `PluginPort.has` is known from the start and reads
 * `ResolvedPlugin.provides`. `call` calls a method for the plugin `caller`.
 *
 * @param log - The log: a command writes `service_called` in the caller's frame and runs in a frame caused by it.
 * @returns The services.
 */
export function createServices(log: Log) {
	const providers = new Map<string, { readonly plugin: string; readonly service: ProvidedService }>();
	return {
		provide(pluginId: string, service: ProvidedService): void {
			const name = service.service.name;
			const other = providers.get(name);
			if (other !== undefined) throw new SwtError(misfit(`"${other.plugin}" and "${pluginId}" both provide the service "${name}"`, "Load only one of them."));
			providers.set(name, { plugin: pluginId, service });
		},
		has: (service: string): boolean => providers.has(service),
		call(caller: string, service: string, method: string, input: unknown): unknown {
			const provider = providers.get(service);
			if (provider === undefined) throw new RangeError(`"${caller}" calls the service "${service}", which no loaded plugin provides`);
			const methods = provider.service.service.methods;
			const spec = Object.hasOwn(methods, method) ? methods[method] : undefined;
			if (spec === undefined) throw new RangeError(`"${caller}" calls "${service}.${method}", which the service does not have`);
			const run = (): unknown => guarded(provider.plugin, () => provider.service.call(method, input, caller));
			if (spec.kind === "query") return run();
			const frame = log.frame();
			// The caller's frame is opened again, so that outside any frame nothing is delivered between the event and the call.
			return log.run(frame, () => {
				const called = log.emit("kernel", "service_called", { service, method, caller, input: input ?? null });
				return log.run({ ...frame, causedBy: called.seq }, run);
			});
		},
	};
}
