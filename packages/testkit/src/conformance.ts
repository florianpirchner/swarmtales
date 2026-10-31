/**
 * Module conformance checks (docs/ideas/monorepo.md §3e item 8). Each returns a list of problems,
 * empty when the mechanic conforms, so any test framework can assert on it:
 *
 * - same seed, same events (two runs of a story give identical logs)
 * - snapshot round trip (a run cut at a minute, written as JSON and resumed, logs the same events
 *   after the cut as the uninterrupted run, and its snapshot reads back unchanged)
 * - every option documented (a `description` on every option property, at any depth)
 * - no forbidden imports or globals in a mechanic's sources (no Node APIs, no engine internals,
 *   no wall clock, no `Math.random`)
 */
import { Type, type TSchema } from "typebox";
import type { MechanicDefinition, TurnTaker } from "@swarmtales/contracts";
import { createHost, type HostOptions } from "@swarmtales/kernel";
import { playMinutes, playStory } from "./agents.ts";

function differences(label: string, left: readonly unknown[], right: readonly unknown[]): readonly string[] {
	const problems: string[] = [];
	if (left.length !== right.length) problems.push(`${label}: ${String(left.length)} events against ${String(right.length)}`);
	const length = Math.min(left.length, right.length);
	for (let index = 0; index < length && problems.length < 5; index++) {
		const a = JSON.stringify(left[index]);
		const b = JSON.stringify(right[index]);
		if (a !== b) problems.push(`${label}: event ${String(index + 1)} differs:\n  ${a}\n  ${b}`);
	}
	return problems;
}

/** Same seed, same events. `agent` is called once per run, so a stateful script starts fresh. */
export async function checkDeterminism(options: HostOptions, agent: () => TurnTaker): Promise<readonly string[]> {
	const first = await playStory(options, agent());
	const second = await playStory(options, agent());
	return differences("determinism", first.events, second.events);
}

/** A cut after `cut` minutes, through JSON, resumed: the events after the cut must equal the uninterrupted run's. */
export async function checkSnapshotRoundTrip(options: HostOptions, agent: () => TurnTaker, cut: number): Promise<readonly string[]> {
	const whole = await playStory(options, agent());
	const cutHost = await playMinutes(options, agent(), cut);
	const snapshot: unknown = JSON.parse(JSON.stringify(cutHost.snapshot()));
	const prefix: unknown[] = cutHost.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
	const resumed = await playStory({ ...options, resume: { snapshot, events: prefix } }, agent());
	const problems = [...differences("snapshot round trip", whole.events, resumed.events)];
	const restored = createHost({ ...options, resume: { snapshot, events: prefix } }).snapshot();
	if (JSON.stringify(restored) !== JSON.stringify(snapshot)) problems.push("snapshot: a restored host writes a different snapshot");
	if (JSON.stringify(whole.host.facts()) !== JSON.stringify(resumed.host.facts())) problems.push("snapshot: the facts differ after the resumed run");
	return problems;
}

function describedProperties(schema: TSchema, path: string): readonly string[] {
	if (!Type.IsObject(schema)) return [];
	return Object.entries(schema.properties).flatMap(([name, property]: [string, TSchema]) => {
		const where = path === "" ? name : `${path}.${name}`;
		const own = "description" in property && typeof property.description === "string" && property.description.trim().length > 0 ? [] : [`option "${where}" has no description`];
		return [...own, ...describedProperties(property, where)];
	});
}

/** Every option property, at any depth, carries a description. */
export function checkOptionsDocumented(definition: MechanicDefinition): readonly string[] {
	return describedProperties(definition.options, "").map((problem) => `${definition.id}: ${problem}`);
}

const FORBIDDEN_IMPORTS: readonly RegExp[] = [/^node:/, /^(fs|path|os|child_process|crypto|http|https|net|url|worker_threads)$/, /^@swarmtales\/(engine|roles|models|chronicle|novelist)(\/|$)/, /world(\.ts)?$/];
const FORBIDDEN_CODE: readonly (readonly [RegExp, string])[] = [
	[/\bMath\.random\b/, "Math.random"],
	[/\bDate\.now\b/, "Date.now"],
	[/\bnew Date\b/, "new Date"],
	[/\bperformance\.now\b/, "performance.now"],
	[/\bprocess\./, "process"],
	[/\bsetTimeout\b|\bsetInterval\b/, "timers"],
];
const IMPORT = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

/** Imports and globals a mechanic's source may not use: randomness and time come only from the host. */
export function checkSourceRules(files: readonly { readonly path: string; readonly text: string }[]): readonly string[] {
	return files.flatMap((file) => {
		const imports = [...file.text.matchAll(IMPORT)].map((match) => match[1] ?? "");
		const badImports = imports.filter((specifier) => FORBIDDEN_IMPORTS.some((pattern) => pattern.test(specifier))).map((specifier) => `${file.path}: imports ${specifier}`);
		const badCode = FORBIDDEN_CODE.filter(([pattern]) => pattern.test(file.text)).map(([, name]) => `${file.path}: uses ${name}`);
		return [...badImports, ...badCode];
	});
}
