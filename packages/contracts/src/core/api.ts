/**
 * Services between mechanics. An API is a named set of methods with schemas, declared apart from
 * any mechanic: one mechanic `provides` it, others `require` it. A story can swap the provider
 * (another implementation) without touching the mechanics that use it.
 */
import type { Static, TSchema } from "typebox";

export interface ApiMethod<I extends TSchema = TSchema, O extends TSchema = TSchema> {
	/**
	 * `command` changes state: the host writes a `service_called` event, and every event the
	 * provider emits is caused by it. `query` only reads and leaves no trace in the log.
	 */
	readonly kind: "command" | "query";
	readonly input: I;
	readonly output: O;
	readonly summary: string;
}

export type ApiMethods = Readonly<Record<string, ApiMethod>>;

export interface ApiDefinition<N extends string = string, M extends ApiMethods = ApiMethods> {
	readonly name: N;
	readonly summary: string;
	readonly methods: M;
}

/** The method names of an API. */
export type ApiMethodName<A extends ApiDefinition> = keyof A["methods"] & string;

export type ApiInput<A extends ApiDefinition, K extends ApiMethodName<A>> = Static<A["methods"][K]["input"]>;

export type ApiOutput<A extends ApiDefinition, K extends ApiMethodName<A>> = Static<A["methods"][K]["output"]>;

/** What a provider writes for one API: one function per method, given the provider's context. */
export type ApiImplementation<A extends ApiDefinition, Ctx> = {
	readonly [K in ApiMethodName<A>]: (input: ApiInput<A, K>, ctx: Ctx, caller: string) => ApiOutput<A, K>;
};

/** An API implementation with its types erased, as the host holds it. Built by `kit.provide`. */
export interface ProvidedApi {
	readonly api: ApiDefinition;
	/** Runs a method; the input is checked against the method's schema first. */
	call(method: string, input: unknown, caller: string): unknown;
}
