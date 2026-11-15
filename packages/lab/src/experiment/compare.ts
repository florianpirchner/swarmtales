// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Comparable runs: the manifest fields that must be equal before two runs of one experiment are pooled.
 */
import { canonicalJson } from "@swarmtales/chain";
import type { RunManifest } from "@swarmtales/contracts";
import { type LabError, notAsPlanned, unknownParam } from "../errors.ts";
import type { PlannedRun } from "./plan.ts";
import type { ExperimentSpec } from "./spec.ts";

/**
 * The manifest fields two runs must share, as paths (a path through `actors` reads the field of every actor, in
 * order). `always` holds for any two runs of an experiment; `sameArm` only inside one arm, because across arms the
 * game is the factor, and the system prompt and the granted tools may differ with it.
 *
 * @public
 */
export const COMPARE_FIELDS = {
	always: ["kernel.revision", "scheduler.id", "scheduler.revision", "scheduler.optionsHash", "actors.model.provider", "actors.model.resolvedId", "actors.model.params", "actors.model.pricing"],
	sameArm: ["game.hash", "actors.textHashes.system", "actors.textHashes.toolSpecs"],
} as const;

function read(value: unknown, path: readonly string[]): unknown {
	if (Array.isArray(value)) return value.map((item: unknown) => read(item, path));
	const [head, ...rest] = path;
	if (head === undefined) return value ?? null;
	return typeof value === "object" && value !== null ? read(Reflect.get(value, head), rest) : null;
}

/**
 * Finds the first field of {@link COMPARE_FIELDS} in which two manifests differ.
 *
 * @param a - The manifest of one run.
 * @param b - The manifest of the other run.
 * @returns The path of the field, or `undefined` when the runs compare.
 */
export function difference(a: RunManifest, b: RunManifest): string | undefined {
	const sameArm = a.experiment?.arm === b.experiment?.arm;
	const fields: readonly string[] = sameArm ? [...COMPARE_FIELDS.always, ...COMPARE_FIELDS.sameArm] : COMPARE_FIELDS.always;
	return fields.find((field) => canonicalJson(read(a, field.split("."))) !== canonicalJson(read(b, field.split("."))));
}

/**
 * Says whether two runs may be pooled: every field of {@link COMPARE_FIELDS} is equal (the `sameArm` ones only
 * when both manifests name the same arm).
 *
 * @param a - The manifest of one run.
 * @param b - The manifest of the other run.
 * @returns Whether the runs compare.
 * @example
 * ```ts
 * if (!comparable(first, next)) console.error("do not pool these two runs");
 * ```
 *
 * @public
 */
export function comparable(a: RunManifest, b: RunManifest): boolean {
	return difference(a, b) === undefined;
}

// The model of every actor that has one is the spec's: the provider, the id as it was asked for, and the thinking level when the spec names one.
function modelMismatch(spec: ExperimentSpec, manifest: RunManifest): LabError | undefined {
	for (const [index, { model }] of manifest.actors.entries()) {
		if (model === undefined) continue;
		const fields = [["provider", model.provider, spec.model.provider], ["requestedId", model.requestedId, spec.model.id], ["params.thinking", model.params.thinking, spec.model.thinking ?? model.params.thinking]] as const;
		const differs = fields.find(([, found, planned]) => found !== planned);
		if (differs !== undefined) return notAsPlanned(manifest.run.id, `actors[${index}].model.${differs[0]}`, differs[1], differs[2]);
	}
	return undefined;
}

/**
 * Finds what a finished run was played with that the spec does not plan: a param of its arm, the model, or the
 * cost cap of the run.
 *
 * @param spec - The experiment spec.
 * @param planned - The planned run the manifest belongs to.
 * @param manifest - The manifest of the finished run.
 * @returns `SWT-E002` when the game of the run declares no param an arm overrides; `SWT-E005` when a param of the
 * arm has another value in the run, an actor's model is not the spec's, or the run's budget is not `budget.perRunUsd`;
 * `undefined` when the run was played as planned.
 */
export function planMismatch(spec: ExperimentSpec, planned: PlannedRun, manifest: RunManifest): LabError | undefined {
	const { params } = manifest.game;
	for (const [param, value] of Object.entries(planned.params)) {
		if (!Object.hasOwn(params, param)) return unknownParam(planned.arm, param, Object.keys(params));
		if (canonicalJson(params[param]) !== canonicalJson(value)) return notAsPlanned(manifest.run.id, `game.params.${param}`, params[param], value);
	}
	const budget = manifest.limits.budgetUsd;
	if (budget !== spec.budget.perRunUsd) return notAsPlanned(manifest.run.id, "limits.budgetUsd", budget, spec.budget.perRunUsd);
	return modelMismatch(spec, manifest);
}
