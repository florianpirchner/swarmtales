// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The noise floor: the values of one metric over replicates of one arm at one seed, with their summary. A new
 * series is compared with it (the tolerance check); the file of the old platform is written once and never changed.
 */
import { type Static, Type } from "typebox";
import { parseLabFile } from "./spec.ts";

const pair = (description: string) => Type.Tuple([Type.Number({ description: "The lower end" }), Type.Number({ description: "The upper end" })], { description });

/**
 * The schema of the summary of a list of values.
 *
 * @public
 */
export const SummarySchema = Type.Object(
	{
		n: Type.Integer({ minimum: 1, description: "The number of values" }),
		mean: Type.Number({ description: "The mean" }),
		sd: Type.Number({ minimum: 0, description: "The sample standard deviation" }),
		min: Type.Number({ description: "The smallest value" }),
		max: Type.Number({ description: "The largest value" }),
		t95: pair("The 95 % t interval of the mean"),
		bootstrap95: pair("The 95 % percentile bootstrap interval of the mean"),
	},
	{ additionalProperties: false, description: "The summary of a list of values" },
);

/**
 * The schema of a noise-floor file (version 1).
 *
 * @public
 */
export const NoiseFloorSchema = Type.Object(
	{
		format: Type.Literal("swarmtales-noise-floor", { description: "The name of the format" }),
		version: Type.Literal(1, { description: "The version of the format" }),
		game: Type.String({ description: "The id of the game" }),
		arm: Type.String({ description: "The id of the arm, as the experiment specs name it" }),
		seed: Type.Integer({ minimum: 0, description: "The seed every replicate was played with" }),
		metric: Type.String({ description: "The metric key of the values" }),
		platform: Type.Union([Type.Literal("legacy"), Type.Literal("rewrite")], { description: "The platform that played the runs" }),
		kernelRevision: Type.Integer({ minimum: 1, description: "The runtime revision the runs were played with" }),
		values: Type.Array(Type.Number({ description: "The value of one run" }), { minItems: 2, description: "The values, in run order" }),
		summary: SummarySchema,
		guardrails: Type.Record(Type.String(), SummarySchema, { description: "The summaries of the guardrail measures, by name: requests per decision, cost per run" }),
	},
	{ additionalProperties: false, description: "The noise floor of one metric of one arm at one seed" },
);

/**
 * The summary of a list of values.
 *
 * @public
 */
export type NoiseSummary = Static<typeof SummarySchema>;

/**
 * A noise floor.
 *
 * @public
 */
export type NoiseFloor = Static<typeof NoiseFloorSchema>;

/**
 * Parses a noise-floor file.
 *
 * @param value - The parsed JSON of the file.
 * @param file - The file's path, for the message.
 * @returns The noise floor.
 * @throws LabError `SWT-E001` when the value does not match `NoiseFloorSchema`.
 * @public
 */
export function parseNoiseFloor(value: unknown, file?: string): NoiseFloor {
	return parseLabFile(NoiseFloorSchema, value, "noise-floor file", file);
}
