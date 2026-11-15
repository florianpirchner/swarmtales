// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Conformance checks for a mechanic and the games that use it. Each returns a list of problems, empty when the
 * mechanic conforms, so any test framework can assert on it. A port of the old `conformance.ts`; the source rules
 * (no kernel import, no Node module, no wall clock) are the job of the layer check and the lint.
 */
import type { ActorDriver, GameData } from "@swarmtales/contracts";
import { packageMismatch, RESIDENT_KIND, type Game } from "@swarmtales/sdk";
import { Type, type TSchema } from "typebox";
import { Value } from "typebox/value";
import { play, testKernel, type PlayOptions } from "./play.ts";

/**
 * What a conformance run takes from the options of `play`: the seed, the prompts and the installed mechanics.
 *
 * @public
 */
export type ConformanceOptions = Pick<PlayOptions, "seed" | "prompts" | "installed">;

const PackageJson = Type.Object(
	{
		name: Type.String({ description: "The npm name of the package." }),
		swarmtales: Type.Object(
			{
				kind: Type.Literal("mechanic", { description: "What the package holds." }),
				class: Type.Union([Type.Literal("base"), Type.Literal("game")], { description: "A base mechanic or a game mechanic." }),
				mechanics: Type.Array(Type.String({ description: "The name of an export that is a mechanic definition." }), { minItems: 1, description: "The exports that are definitions." }),
			},
			{ description: "The registration of the mechanic package." },
		),
	},
	{ description: "The fields of a mechanic's `package.json` that conformance reads." },
);

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function differences(label: string, left: readonly unknown[], right: readonly unknown[]): readonly string[] {
	const problems = left.length === right.length ? [] : [`${label}: ${String(left.length)} events against ${String(right.length)}`];
	const length = Math.min(left.length, right.length);
	for (let index = 0; index < length && problems.length < 5; index++) {
		if (!same(left[index], right[index])) problems.push(`${label}: event ${String(index + 1)} differs:\n  ${JSON.stringify(left[index])}\n  ${JSON.stringify(right[index])}`);
	}
	return problems;
}

/**
 * Same seed, same events: plays the game twice and compares the two logs.
 *
 * @param game - The game, in its builder form or its data form.
 * @param driver - Makes the driver of every resident; called once per run, so a driver with state starts fresh.
 * @param options - The seed, the prompts and the installed mechanics.
 * @returns The problems; empty when both runs wrote the same events.
 * @throws SwtError What `play` throws.
 *
 * @public
 */
export async function checkDeterminism(game: Game | GameData, driver: () => ActorDriver, options: ConformanceOptions = {}): Promise<readonly string[]> {
	const first = await play(game, { ...options, drivers: { [RESIDENT_KIND]: driver() } });
	const second = await play(game, { ...options, drivers: { [RESIDENT_KIND]: driver() } });
	return differences("determinism", first.events, second.events);
}

/**
 * Snapshot round trip: a run cut after `cut` ticks, written as JSON and resumed, must write the same events as the
 * run that was not cut, and a kernel restored from the snapshot must write the same snapshot again.
 *
 * @param game - The game, in its builder form or its data form.
 * @param driver - Makes the driver of every resident; called once per run. The resumed run gets a fresh one, so the
 * driver must decide from the activation (its tick, its inputs), not from how often it was called.
 * @param cut - The number of ticks before the cut; the run must still be open there.
 * @param options - The seed, the prompts and the installed mechanics.
 * @returns The problems; empty when the resumed run equals the whole one.
 * @throws SwtError What `play` throws.
 *
 * @public
 */
export async function checkSnapshotRoundTrip(game: Game | GameData, driver: () => ActorDriver, cut: number, options: ConformanceOptions = {}): Promise<readonly string[]> {
	const drivers = (): PlayOptions => ({ ...options, drivers: { [RESIDENT_KIND]: driver() } });
	const whole = await play(game, drivers());
	const before = await play(game, { ...drivers(), ticks: cut });
	if (before.end !== undefined) return [`snapshot round trip: the run ended before the cut after ${String(cut)} ticks, so nothing was resumed`];
	const snapshot: unknown = JSON.parse(JSON.stringify(before.kernel.snapshot()));
	const log: readonly unknown[] = before.events.map((event): unknown => JSON.parse(JSON.stringify(event)));
	const restored = testKernel(game, { ...options, resume: { snapshot, log } }).kernel.snapshot();
	const resumed = await play(game, { ...drivers(), resume: { snapshot, log } });
	return [
		...differences("snapshot round trip", whole.events, resumed.events),
		...(same(restored, snapshot) ? [] : ["snapshot round trip: a kernel restored from the snapshot writes a different snapshot"]),
		...(same(whole.end, resumed.end) ? [] : [`snapshot round trip: the resumed run ended with ${JSON.stringify(resumed.end)}, the whole run with ${JSON.stringify(whole.end)}`]),
	];
}

function undescribed(schema: TSchema, path: string): readonly string[] {
	if (!Type.IsObject(schema)) return [];
	return Object.entries(schema.properties).flatMap(([name, property]: [string, TSchema]) => {
		const where = path === "" ? name : `${path}.${name}`;
		const described = "description" in property && typeof property.description === "string" && property.description.trim().length > 0;
		return [...(described ? [] : [`option "${where}" has no description`]), ...undescribed(property, where)];
	});
}

/**
 * Every option property of a mechanic, at any depth, carries a description.
 *
 * @param definition - The mechanic's definition, or anything with an id and an options schema.
 * @param definition.id - The id that names the mechanic in a problem.
 * @param definition.options - The schema of the options.
 * @returns One problem per option without a description.
 *
 * @public
 */
export function checkOptionsDocumented(definition: { readonly id: string; readonly options: TSchema }): readonly string[] {
	return undescribed(definition.options, "").map((problem) => `${definition.id}: ${problem}`);
}

/**
 * The definition and the `package.json` of its package agree: the head's `package` is the package's name
 * (`SWT-M011`), and the `swarmtales` field registers a mechanic package (`kind`, `class`, the list `mechanics`).
 *
 * @param definition - The mechanic's definition.
 * @param definition.id - The id of the mechanic.
 * @param definition.package - The `package` of its head.
 * @param packageJson - The parsed `package.json`, as read.
 * @returns The problems; empty when the two agree.
 *
 * @public
 */
export function checkPackage(definition: { readonly id: string; readonly package: string }, packageJson: unknown): readonly string[] {
	if (!Value.Check(PackageJson, packageJson)) {
		return [...Value.Errors(PackageJson, packageJson)].map((error) => `${definition.id}: package.json${error.instancePath}: ${error.message}`);
	}
	if (packageJson.name === definition.package) return [];
	const issue = packageMismatch({ mechanic: definition.id, declared: definition.package, actual: packageJson.name });
	return [`${issue.code}: ${issue.summary}`];
}
