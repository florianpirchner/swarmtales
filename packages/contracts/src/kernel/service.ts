// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Service contracts: what one plugin offers to others. */
import type { TSchema } from "typebox";

/**
 * One method of a service.
 *
 * @public
 */
export interface ServiceMethod<I extends TSchema = TSchema, O extends TSchema = TSchema> {
	/** A command writes `service_called`; a query leaves no trace. */
	readonly kind: "command" | "query";
	/** The schema of the input. */
	readonly input: I;
	/** The schema of the output. */
	readonly output: O;
	/** What the method does, in one line. */
	readonly summary: string;
}

/**
 * The methods of a service, by name.
 *
 * @public
 */
export type ServiceMethods = Readonly<Record<string, ServiceMethod>>;

/**
 * A service contract, declared apart from the plugin that provides it.
 *
 * @public
 */
export interface ServiceDefinition<N extends string = string, M extends ServiceMethods = ServiceMethods> {
	/** The service name, as the log carries it. */
	readonly name: N;
	/** What the service is for, in one line. */
	readonly summary: string;
	/** The methods. */
	readonly methods: M;
}

/**
 * An implementation of a service with its types erased.
 *
 * @public
 */
export interface ProvidedService {
	/** The contract it implements. */
	readonly service: ServiceDefinition;
	/** Runs a method; it checks the input against the method's schema first. `caller` is a plugin id. */
	call(method: string, input: unknown, caller: string): unknown;
}
