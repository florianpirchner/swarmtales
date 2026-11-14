// SPDX-License-Identifier: Apache-2.0
/**
 * Comparable runs: the manifest fields that must be equal before two runs of one experiment are pooled.
 */
import { canonicalJson } from "@swarmtales/chain";
import type { RunManifest } from "@swarmtales/contracts";

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
