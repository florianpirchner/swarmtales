// SPDX-License-Identifier: Apache-2.0
/**
 * The results of an experiment (`results.json`): written by code only and validated by this schema. Every number
 * of a series README comes from this file; nobody types one.
 */
import { type Static, Type } from "typebox";
import { parseLabFile } from "./spec.ts";

const text = (description: string) => Type.String({ description });
const number = (description: string) => Type.Number({ description });
const value = (description: string) => Type.Union([Type.Number({ description: "The number" }), Type.Literal("absent")], { description });
const interval = (description: string) => Type.Tuple([number("The lower end"), number("The upper end")], { description });
const over = Type.Union([Type.Literal("included"), Type.Literal("finished")], { description: "The runs the estimate is computed over: the included ones, or every finished run that has a value" });

const Run = Type.Object(
	{
		run: text("The id of the run, also the name of its folder"),
		arm: text("The arm"),
		seed: Type.Integer({ minimum: 0, description: "The seed" }),
		replicate: Type.Integer({ minimum: 0, description: "The replicate; a replacement has the replaced one's plus 100" }),
		manifestHash: text("The hash of the run's manifest"),
		head: text("The last signed head of the run's chain"),
		status: Type.Union([Type.Literal("included"), Type.Literal("excluded"), Type.Literal("stopped")], { description: "Whether the run counts" }),
		reason: Type.Optional(text("Why the run is excluded or stopped")),
		costUsd: Type.Number({ minimum: 0, description: "What the run cost" }),
	},
	{ additionalProperties: false, description: "One run of the experiment" },
);

const Estimate = Type.Object(
	{
		metric: text("The metric key"),
		role: Type.Union([Type.Literal("primary"), Type.Literal("secondary"), Type.Literal("guardrail")], { description: "The role of the metric in the spec" }),
		contrast: Type.Array(text("An arm"), { minItems: 1, maxItems: 2, description: "Treatment and control arm, or the one arm of a replicates design" }),
		estimator: text("How the estimate is computed, for example the mean of the paired differences"),
		estimate: number("The estimate, with full precision"),
		se: number("The standard error"),
		interval: interval("The 95 % interval"),
		n: Type.Integer({ minimum: 0, description: "Complete pairs, or runs" }),
		test: text("The test the p value comes from"),
		p: Type.Number({ minimum: 0, maximum: 1, description: "The p value" }),
		over,
	},
	{ additionalProperties: false, description: "One estimate" },
);

const Pass = Type.Object(
	{
		rule: text("The pass rule of the spec, in words"),
		estimate: value("The estimate the rule read; `absent` when too few runs give none"),
		n: Type.Integer({ minimum: 0, description: "The n the rule read" }),
		verdict: Type.Union([Type.Literal("kept"), Type.Literal("not-kept"), Type.Literal("no-verdict")], { description: "The outcome; `no-verdict` when n is below the spec's smallest n" }),
	},
	{ additionalProperties: false, description: "The outcome of the pass rule" },
);

const GuardrailResult = Type.Object(
	{
		metric: text("The metric key"),
		per: Type.Optional(text("The metric key it is divided by")),
		arm: text("The arm"),
		value: value("The mean of the arm"),
		held: Type.Boolean({ description: "Whether the guardrail held" }),
	},
	{ additionalProperties: false, description: "One guardrail of one arm" },
);

const Tolerance = Type.Object(
	{
		kind: Type.Union([Type.Literal("mean"), Type.Literal("share")], { description: "What was compared" }),
		baselineMean: number("The mean, or the share, of the baseline"),
		newMean: number("The mean, or the share, of the new runs"),
		difference: number("New minus baseline"),
		se: number("The standard error of the difference"),
		within: Type.Boolean({ description: "Whether the new runs are within the noise of the baseline" }),
	},
	{ additionalProperties: false, description: "The comparison with a noise floor" },
);

/**
 * The schema of the results of an experiment (version 1).
 *
 * @public
 */
export const ExperimentResultsSchema = Type.Object(
	{
		format: Type.Literal("swarmtales-results", { description: "The name of the format" }),
		version: Type.Literal(1, { description: "The version of the format" }),
		spec: Type.Object({ id: text("The id of the experiment"), hash: text("The hash of its spec") }, { additionalProperties: false, description: "The spec the runs were planned from" }),
		code: Type.Object(
			{ commit: text("The commit of the platform's source tree"), kernelRevision: Type.Integer({ minimum: 1, description: "The runtime revision of the kernel" }) },
			{ additionalProperties: false, description: "The code that played the runs" },
		),
		runs: Type.Array(Run, { description: "Every run that has a record, excluded and stopped ones too" }),
		values: Type.Array(Type.Object({ run: text("The run"), metric: text("The metric key"), value: value("The value of the run") }, { additionalProperties: false, description: "One value" }), {
			description: "The values in long format: one row per run and metric",
		}),
		estimates: Type.Array(Estimate, { description: "The estimates, each over the included and over the finished runs" }),
		pass: Type.Optional(Pass),
		guardrails: Type.Array(GuardrailResult, { description: "The guardrails" }),
		tolerance: Type.Optional(Tolerance),
		deviations: Type.Array(Type.Object({ at: text("When, or at which run"), what: text("What differed from the plan"), why: text("Why") }, { additionalProperties: false, description: "One deviation" }), {
			description: "Every deviation from the committed plan",
		}),
	},
	{ additionalProperties: false, description: "The results of an experiment" },
);

/**
 * The results of an experiment.
 *
 * @public
 */
export type ExperimentResults = Static<typeof ExperimentResultsSchema>;

/**
 * Parses a results file.
 *
 * @param value - The parsed JSON of the file.
 * @param file - The file's path, for the message.
 * @returns The results.
 * @throws LabError `SWT-E001` when the value does not match `ExperimentResultsSchema`.
 * @public
 */
export function parseExperimentResults(value: unknown, file?: string): ExperimentResults {
	return parseLabFile(ExperimentResultsSchema, value, "results file", file);
}
