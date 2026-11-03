/** Shorthands for the API declarations of this package (not exported from it). */
import type { TSchema } from "typebox";

/** A method that only reads: no event, no `service_called`. */
export function query<I extends TSchema, O extends TSchema>(summary: string, input: I, output: O) {
	return { kind: "query", summary, input, output } as const;
}

/** A method that changes state: the host writes `service_called` and the provider's events are caused by it. */
export function command<I extends TSchema, O extends TSchema>(summary: string, input: I, output: O) {
	return { kind: "command", summary, input, output } as const;
}
