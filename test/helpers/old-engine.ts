/**
 * The old engine's side of the differential tests, recorded once (step 18, item 7b).
 *
 * Until step 18 a differential played the old `World` and a mechanic side by side and compared
 * them. The old engine is going away, so each differential's old side was played one last time,
 * on the commit named in `test/fixtures/old-engine/README.md`, and its output stored in
 * `test/fixtures/old-engine/<name>.json`: an object of scenarios, keyed as the test names them.
 * The tests now compare the mechanic against these files. A recorded file is never regenerated:
 * the code that wrote it is gone, and a changed file would mean the comparison lost its anchor.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";

export const OLD_ENGINE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/old-engine");
const TEST_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const Scenarios = Type.Record(Type.String(), Type.Unknown());
const cache = new Map<string, { readonly modified: number; readonly scenarios: Readonly<Record<string, unknown>> }>();

/** The scenarios of a recorded file, parsed once per test file (a large file is read by many tests). */
function scenariosOf(name: string): Readonly<Record<string, unknown>> {
	const path = resolve(OLD_ENGINE_DIR, `${name}.json`);
	const modified = statSync(path).mtimeMs;
	const known = cache.get(name);
	if (known?.modified === modified) return known.scenarios;
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!Check(Scenarios, parsed)) throw new Error(`${path} is not an object of scenarios`);
	cache.set(name, { modified, scenarios: parsed });
	return parsed;
}

/** One recorded scenario of `test/fixtures/old-engine/<name>.json`, checked against its schema. */
export function recordedOld<T extends TSchema>(name: string, scenario: string, schema: T): Static<T> {
	const entry = scenariosOf(name)[scenario];
	if (entry === undefined) throw new Error(`test/fixtures/old-engine/${name}.json has no scenario ${scenario}`);
	if (!Check(schema, entry)) throw new Error(`test/fixtures/old-engine/${name}.json: scenario ${scenario} does not have the recorded shape`);
	return entry;
}

const ordinals = new Map<string, number>();

/**
 * Where the running test's next old side is recorded: the file is named after the test file (its
 * path under `test/`, slashes as dashes), the scenario after the test's full name and the number of
 * old sides it played before (` #1`, ` #2`, ...). A harness calls it once per old side it plays.
 */
export function currentScenario(): { readonly name: string; readonly scenario: string } {
	const state = expect.getState();
	const path = state.testPath ?? "unknown";
	const name = relative(TEST_DIR, path).replace(/\.test\.ts$/, "").replace(/\.ts$/, "").replaceAll("/", "-");
	const test = state.currentTestName ?? "(outside a test)";
	const ordinal = (ordinals.get(test) ?? 0) + 1;
	ordinals.set(test, ordinal);
	return { name, scenario: `${test} #${String(ordinal)}` };
}

/** A short digest of a scenario's inputs, so a recorded old side refuses a test whose inputs changed since. */
export function fingerprintOf(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

/** Throws when a recorded scenario was played from other inputs than the test gives now. */
export function expectFingerprint(name: string, scenario: string, recorded: string, now: string): void {
	if (recorded !== now) throw new Error(`test/fixtures/old-engine/${name}.json: scenario ${scenario} was recorded for other inputs (${recorded}, now ${now}); the old side cannot be played again`);
}

/** Every call a plan makes, per resident (`A01`, `A02`, ...) and minute: the plan's part of a fingerprint. */
export function planTable(agents: number, minutes: number, plan: (agent: string, minute: number) => unknown): unknown {
	return Array.from({ length: agents }, (_unused, index) => {
		const agent = `A${String(index + 1).padStart(2, "0")}`;
		return Array.from({ length: minutes }, (_never, minute) => plan(agent, minute));
	});
}

/** The running test's next recorded old value (a single value the old engine computed, compared as JSON). */
export function recordedValue(): unknown {
	const { name, scenario } = currentScenario();
	return recordedOld(name, scenario, Type.Unknown());
}

const Outcome = Type.Union([Type.Object({ fingerprint: Type.String(), value: Type.Unknown() }), Type.Object({ fingerprint: Type.String(), error: Type.String() })]);

/** A recorded old run of `scenario` in file `name`: its value, or the error it threw (thrown again). */
export function replayAt<T extends TSchema>(name: string, scenario: string, input: unknown, schema: T): Static<T> {
	const entry = recordedOld(name, scenario, Outcome);
	expectFingerprint(name, scenario, entry.fingerprint, fingerprintOf(input));
	if ("error" in entry) throw new Error(entry.error);
	if (!Check(schema, entry.value)) throw new Error(`test/fixtures/old-engine/${name}.json: scenario ${scenario} does not have the recorded shape`);
	return entry.value;
}

/**
 * The running test's next recorded old run: what the old engine returned (or threw) for `input`,
 * which must be the input it was recorded for.
 */
export function replayOld<T extends TSchema>(input: unknown, schema: T): Static<T> {
	const { name, scenario } = currentScenario();
	return replayAt(name, scenario, input, schema);
}
