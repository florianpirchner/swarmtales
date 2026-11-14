// SPDX-License-Identifier: Apache-2.0
/** The schema of a scheduled job, as a snapshot holds it. The interface `Job` is in `kernel-def.ts`. */
import { Type } from "typebox";
import type { JsonValue } from "../values.ts";

const text = (description: string): { readonly description: string } => ({ description });

/** A JSON value, checked in full: a snapshot is read from a file, and a job's data goes back into a plugin. */
const JsonValueSchema = Type.Unsafe<JsonValue>(
	Type.Cyclic(
		{
			Json: Type.Union(
				[
					Type.String(text("A string")),
					Type.Number(text("A number")),
					Type.Boolean(text("A boolean")),
					Type.Null(text("Null")),
					Type.Array(Type.Ref("Json", text("One entry of the list")), text("A list of JSON values")),
					Type.Record(Type.String(text("A key")), Type.Ref("Json", text("The value of one key")), text("An object of JSON values")),
				],
				text("A JSON value"),
			),
		},
		"Json",
		text("The data the job was scheduled with: a JSON value"),
	),
);

/**
 * The schema of `Job`: a scheduled job of a plugin.
 *
 * @public
 */
export const JobSchema = Type.Object(
	{
		id: Type.Integer({ minimum: 0, description: "The number of the job, in the order of scheduling" }),
		owner: Type.String(text("The id of the plugin that owns it")),
		job: Type.String(text("The name of the job in its plugin")),
		next: Type.Integer({ minimum: 0, description: "The tick it runs at" }),
		data: Type.Optional(JsonValueSchema),
	},
	{ additionalProperties: false, description: "A scheduled job of a plugin" },
);
