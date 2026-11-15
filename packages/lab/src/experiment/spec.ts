// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The experiment spec: arms, seeds and replicates over one game, with the metrics, the pass rule, the guardrails,
 * the exclusions and the budget. A spec is a committed JSON file; its hash is in the manifest of every run.
 */
import { type Static, type TSchema, Type } from "typebox";
import { Check, Errors } from "typebox/value";
import { badFile } from "../errors.ts";

const text = (description: string) => Type.String({ description });
const usd = (description: string) => Type.Number({ exclusiveMinimum: 0, description });

const Guardrail = Type.Object(
	{
		metric: text("The metric key that is judged, on the mean of the arm"),
		per: Type.Optional(text("A second metric key the first is divided by, run by run")),
		arm: Type.Optional(text("The arm the guardrail holds for; every arm without it")),
		max: Type.Optional(Type.Number({ description: "The largest mean that holds" })),
		min: Type.Optional(Type.Number({ description: "The smallest mean that holds" })),
		within: Type.Optional(
			Type.Object(
				{ of: Type.Number({ description: "The expected mean" }), share: Type.Number({ exclusiveMinimum: 0, description: "The allowed distance as a share of it; 0.1 is 10 %" }) },
				{ additionalProperties: false, description: "A band around an expected mean" },
			),
		),
	},
	{ additionalProperties: false, description: "A limit that is reported as held or not held; it never fails the pass rule" },
);

const Arm = Type.Object(
	{
		id: text("The id of the arm"),
		params: Type.Record(Type.String(), Type.Unknown({ description: "The value of one param" }), { description: "The overrides of the game family's params; `{}` is the game as it is" }),
		control: Type.Optional(Type.Boolean({ description: "Whether this is the control arm" })),
	},
	{ additionalProperties: false, description: "One setting of the game" },
);

const Pass = Type.Object(
	{
		contrast: Type.Tuple([text("The treatment arm"), text("The control arm")], { description: "The two arms of the estimate: treatment minus control" }),
		sign: Type.Union([Type.Literal("positive"), Type.Literal("negative")], { description: "The sign the estimate must have" }),
		minN: Type.Integer({ minimum: 2, description: "The smallest n for a verdict: complete pairs, or runs in each arm" }),
	},
	{ additionalProperties: false, description: "The rule that reads the primary estimate over the included runs" },
);

/**
 * The schema of an experiment spec (version 1). Unknown keys are refused at every level.
 *
 * @public
 */
export const ExperimentSpecSchema = Type.Object(
	{
		format: Type.Literal("swarmtales-experiment", { description: "The name of the format" }),
		version: Type.Literal(1, { description: "The version of the format" }),
		id: Type.String({ pattern: "^[a-z][a-z0-9-]*$", description: "The id of the experiment, also the name of its folder" }),
		question: text("The question the experiment answers, in one sentence"),
		purpose: Type.Union([Type.Literal("pilot"), Type.Literal("exploratory"), Type.Literal("confirmatory")], { description: "What the runs are for; `confirmatory` needs a clean tree" }),
		game: text("The path of the game file, relative to the repository root; its default export is a game family"),
		model: Type.Object(
			{ provider: text("The provider's id"), id: text("The model id or alias at the provider"), thinking: Type.Optional(text("The thinking level")) },
			{ additionalProperties: false, description: "The model every resident of every run uses" },
		),
		arms: Type.Array(Arm, { minItems: 1, description: "The arms" }),
		seeds: Type.Array(Type.Integer({ minimum: 0, maximum: 4294967295, description: "A seed" }), { minItems: 1, description: "The seeds: blocks of a paired design, run labels of an unpaired one" }),
		replicates: Type.Integer({ minimum: 1, maximum: 99, description: "The runs per arm and seed; at most 99, because a replacement has the replicate plus 100" }),
		design: Type.Union([Type.Literal("paired"), Type.Literal("unpaired"), Type.Literal("replicates")], { description: "How runs are compared: the seed is the block, runs are independent, or one arm and one seed are repeated" }),
		metrics: Type.Object(
			{
				primary: text("The metric key the pass rule reads"),
				secondary: Type.Array(text("A metric key"), { description: "The metrics that are reported" }),
				guardrails: Type.Array(Guardrail, { description: "The guardrails" }),
			},
			{ additionalProperties: false, description: "The metrics, as \"<plugin id>.<metric id>\" or a generic key of the lab" },
		),
		pass: Type.Optional(Pass),
		allowedRefusals: Type.Optional(Type.Array(text("A refusal code"), { description: "The refusal codes that are expected; another code is reported" })),
		exclusions: Type.Array(Type.Union([Type.Literal("failed-request"), Type.Literal("missed-decision"), Type.Literal("cost-cap"), Type.Literal("error-end")], { description: "A rule" }), {
			description: "The rules that exclude a run; an excluded run is replaced once",
		}),
		budget: Type.Object(
			{
				perRunUsd: usd("The cost cap of one run"),
				totalUsd: usd("The cost cap of the experiment"),
				estimateUsdPerRun: Type.Record(Type.String(), Type.Number({ minimum: 0, description: "The expected cost of one run of the arm" }), { description: "The expected cost of a run, by arm id" }),
			},
			{ additionalProperties: false, description: "The money; every cap is checked by code before a run starts" },
		),
		concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: 4, description: "The runs in flight at once; 1 when absent" })),
		shareAt: Type.Optional(Type.Number({ description: "A value of the primary metric: the series report gives, per arm, the share of the included runs at or above it with its Wilson interval. Without it the threshold of a `share` tolerance is taken" })),
		baseline: Type.Optional(text("The path of a noise-floor file the control values are compared with")),
		tolerance: Type.Optional(
			Type.Union(
				[
					Type.Object({ kind: Type.Literal("mean", { description: "Compare the means" }) }, { additionalProperties: false, description: "Within two standard errors of the baseline mean" }),
					Type.Object(
						{ kind: Type.Literal("share", { description: "Compare shares" }), threshold: Type.Number({ description: "A run at or above it counts" }) },
						{ additionalProperties: false, description: "The share of runs at or above a threshold, with overlapping intervals" },
					),
				],
				{ description: "How the values are compared with the baseline" },
			),
		),
	},
	{ additionalProperties: false, description: "An experiment: arms, seeds and replicates over a game" },
);

/**
 * An experiment spec.
 *
 * @public
 */
export type ExperimentSpec = Static<typeof ExperimentSpecSchema>;

/**
 * Checks a value against a schema of the lab and names the first mismatch.
 *
 * @param schema - The schema.
 * @param value - The value, for example parsed JSON.
 * @param what - What kind of file it is, for the message.
 * @param file - The file the value came from, for the message.
 * @returns The value, typed. It is not copied and nothing is filled in.
 * @throws LabError `SWT-E001` when the value does not match; an unknown key is a mismatch.
 * @public
 */
export function parseLabFile<S extends TSchema>(schema: S, value: unknown, what: string, file?: string): Static<S> {
	if (Check(schema, value)) return value;
	const first = Errors(schema, value)[0];
	const extra = first?.keyword === "additionalProperties" ? ` ${JSON.stringify(first.params)}` : "";
	throw badFile(what, `${first?.instancePath === "" ? "the file" : (first?.instancePath ?? "the file")} ${first?.message ?? "does not match the schema"}${extra}`, file);
}

/**
 * Refuses a spec whose plan would hold a cell twice: a seed that is listed twice, or an arm id that is. Two runs of
 * one arm, seed and replicate share a place in the analysis, and the later one would replace the earlier without a word.
 *
 * @param spec - The experiment spec.
 * @param file - The file the spec came from, for the message.
 * @returns The spec.
 * @throws LabError `SWT-E001` for the first seed or arm id that is listed twice.
 */
export function checkCells(spec: ExperimentSpec, file?: string): ExperimentSpec {
	const twice = <T>(items: readonly T[]): T | undefined => items.find((item, index) => items.indexOf(item) !== index);
	const [seed, arm] = [twice(spec.seeds), twice(spec.arms.map((item) => item.id))];
	if (seed !== undefined) throw badFile("experiment spec", `/seeds lists the seed ${seed} twice; for more runs of one seed raise \`replicates\``, file);
	if (arm !== undefined) throw badFile("experiment spec", `/arms lists the arm "${arm}" twice`, file);
	return spec;
}

/**
 * Parses an experiment spec.
 *
 * @param value - The parsed JSON of a spec file.
 * @param file - The file's path, for the message.
 * @returns The spec.
 * @throws LabError `SWT-E001` when the value does not match `ExperimentSpecSchema`, or lists a seed or an arm id twice.
 * @public
 */
export function parseExperimentSpec(value: unknown, file?: string): ExperimentSpec {
	return checkCells(parseLabFile(ExperimentSpecSchema, value, "experiment spec", file), file);
}
