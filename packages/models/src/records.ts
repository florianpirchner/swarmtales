// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The records of the model driver: what one resident was sent and what it answered. The kernel checks that a
 * record's source and type are declared; the writer checks the payload, with {@link residentRecord}.
 */
import { Type, type Static } from "typebox";
import { Check, Errors } from "typebox/value";
import type { RecordSource } from "@swarmtales/contracts";
import { redactSecrets } from "@swarmtales/contracts";
import { recordMismatch, thrown } from "./errors.ts";

const text = (description: string) => Type.String({ description });
const count = (description: string) => Type.Integer({ minimum: 0, description });
const names = (description: string) => Type.Array(text("A shown tool name"), { description });
const closed = (description: string) => ({ additionalProperties: false, description });

const ToolSchema = Type.Object(
	{
		name: text("The shown name"),
		description: text("The rendered description"),
		parameters: Type.Record(Type.String({ description: "A keyword of the schema" }), Type.Unknown({ description: "Its value" }), { description: "The schema of the arguments" }),
	},
	closed("One tool as the model is told about it"),
);

const SCHEMAS = {
	prompt_fixed: Type.Object(
		{
			system: text("The system prompt"),
			systemHash: text("The hash of the system prompt, as the manifest holds it"),
			tools: Type.Array(ToolSchema, { description: "Every granted tool, in grant order" }),
			declared: names("The tools declared to the model at the start"),
		},
		closed("The fixed prompt of one actor: once per actor, after `run_started` and before the first tick"),
	),
	request: Type.Object(
		{
			inputs: Type.Array(text("One text"), { description: "Every text sent as new input, the notice included" }),
			tools: names("The tools that are open now, in grant order"),
			messages: count("The length of the context before the request"),
		},
		closed("One request to the model: written when the step starts"),
	),
	context_reset: Type.Object({ messages: count("The number of messages dropped") }, closed("The context was emptied before the request of this step")),
	thinking: Type.Object({ text: text("The thinking") }, closed("One thinking block of an answer")),
	text: Type.Object({ text: text("The text") }, closed("One text block of an answer")),
	response: Type.Object(
		{
			provider: text("The provider id"),
			model: text("The model id, as the provider answered"),
			stopReason: text("Why the answer ended"),
			input: count("Input tokens"),
			output: count("Output tokens"),
			cacheRead: count("Tokens read from the cache"),
			cacheWrite: count("Tokens written to the cache"),
			costUsd: Type.Number({ minimum: 0, description: "The cost of the request in USD, by the price table" }),
		},
		closed("The usage of one answered request"),
	),
	cost_unknown: Type.Object(
		{ reason: text("What could not be counted, as the meter's reason") },
		closed("An answer was paid for and its cost is not known: the cost meter closes here (runtime revision 6), so a replay closes its meter at this line"),
	),
	request_failed: Type.Object(
		{ message: text("The error text, redacted"), refusal: Type.Boolean({ description: "True for a refusal by the provider's safeguards" }) },
		closed("A request that ended with an error"),
	),
} as const;

/**
 * The record source of the model driver: pass it to the `records` of the game's resolution.
 *
 * @public
 */
export const RESIDENT_RECORDS: RecordSource = Object.freeze({ id: "@swarmtales/models/resident", events: SCHEMAS });

/**
 * The payload of every record type of the model driver.
 *
 * @public
 */
export type ResidentRecords = { readonly [Type in keyof typeof SCHEMAS]: Static<(typeof SCHEMAS)[Type]> };

/**
 * Checks one record payload against its schema, before the driver hands it to the kernel.
 *
 * @param type - The record type.
 * @param payload - The payload.
 * @returns The payload as it was given.
 * @throws SwtError `SWT-X040` when the payload does not match; it names the place, never the value.
 * @example
 * ```ts
 * activation.record(RESIDENT_RECORDS.id, "text", residentRecord("text", { text: "I take the corner." }));
 * ```
 *
 * @public
 */
export function residentRecord<Type extends keyof ResidentRecords>(type: Type, payload: ResidentRecords[Type]): ResidentRecords[Type] {
	const schema = SCHEMAS[type];
	if (Check(schema, payload)) return payload;
	const first = Errors(schema, payload)[0];
	throw thrown(recordMismatch(type, first?.instancePath ?? "", first?.message ?? "does not match its schema"), redactSecrets);
}
