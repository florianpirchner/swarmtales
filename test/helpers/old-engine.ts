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
import { existsSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, onTestFinished } from "vitest";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";

export const OLD_ENGINE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/old-engine");
const TEST_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const Scenarios = Type.Record(Type.String(), Type.Unknown());
const cache = new Map<string, { readonly modified: number; readonly scenarios: Readonly<Record<string, unknown>> }>();

/** The file of a recording: `<name>.json.gz` (gzipped JSON), or `<name>.json` for the first recording (motives). */
export function recordingPath(name: string): string {
	const plain = resolve(OLD_ENGINE_DIR, `${name}.json`);
	return existsSync(plain) ? plain : `${plain}.gz`;
}

/**
 * The rename "core becomes core motive" (step 18, docs/design/rename-core-motive.md) came after the
 * recordings: they keep the old names, and a test reads them under the current ones. The event
 * `core_dealt` is `motive_dealt`; the model-visible texts that said "core" say "core motive"
 * (pairs of old and current wording, applied to every recorded string).
 */
const RENAMED_TYPES: Readonly<Record<string, string>> = { core_dealt: "motive_dealt" };
const REWORDED: readonly (readonly [RegExp, string])[] = [
	[/^(- [^:\n]+: )core: /gm, "$1core motive: "],
	[/use a resident's core or goal only in a note/g, "use a resident's core motive or goal only in a note"],
	[/\(its core: temperament/g, "(its core motive: temperament"],
	[/Use a resident's core or goal/g, "Use a resident's core motive or goal"],
	[/a resident's core or secret goal/g, "a resident's core motive or secret goal"],
	[/Every resident has a core \(who it is/g, "Every resident has a core motive (who it is"],
	[/^Cores and secret goals:/gm, "Core motives and secret goals:"],
	[/"type":"core_dealt"/g, '"type":"motive_dealt"'],
];

/** The rewording undone, for the fingerprint of an input (the inputs were recorded under the old names). */
const UNDONE: readonly (readonly [RegExp, string])[] = [
	[/^(- [^:\n]+: )core motive: /gm, "$1core: "],
	[/use a resident's core motive or goal only in a note/g, "use a resident's core or goal only in a note"],
	[/\(its core motive: temperament/g, "(its core: temperament"],
	[/Use a resident's core motive or goal/g, "Use a resident's core or goal"],
	[/a resident's core motive or secret goal/g, "a resident's core or secret goal"],
	[/Every resident has a core motive \(who it is/g, "Every resident has a core (who it is"],
	[/^Core motives and secret goals:/gm, "Cores and secret goals:"],
	[/"type":"motive_dealt"/g, '"type":"core_dealt"'],
];

/** A value under the old names. */
function underOldNames(value: unknown): unknown {
	if (typeof value === "string") return UNDONE.reduce((text, [current, old]) => text.replace(current, old), value);
	if (Array.isArray(value)) return value.map(underOldNames);
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key === "type" && entry === "motive_dealt" ? "core_dealt" : underOldNames(entry)]));
}

/** A recorded value under the current names. */
function underCurrentNames(value: unknown): unknown {
	if (typeof value === "string") return REWORDED.reduce((text, [old, current]) => text.replace(old, current), value);
	if (Array.isArray(value)) return value.map(underCurrentNames);
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, key === "type" && typeof entry === "string" ? (RENAMED_TYPES[entry] ?? entry) : underCurrentNames(entry)]),
	);
}

/** The scenarios of a recorded file, parsed once per test file (a large file is read by many tests). */
function scenariosOf(name: string): Readonly<Record<string, unknown>> {
	const path = recordingPath(name);
	const modified = statSync(path).mtimeMs;
	const known = cache.get(name);
	if (known?.modified === modified) return known.scenarios;
	const bytes = readFileSync(path);
	const parsed: unknown = underCurrentNames(JSON.parse((path.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8")));
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
	// The inputs were recorded under the old names (the rename above), a recorded snapshot that a later scenario resumes too.
	const recorded = JSON.stringify(underOldNames(value));
	return createHash("sha256").update(recorded).digest("hex").slice(0, 16);
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

const TraceEntry = Type.Object({ label: Type.String(), value: Type.Optional(Type.Unknown()), error: Type.Optional(Type.String()) });

/**
 * The replay of an `OldTrace` (written by the old recorder, deleted with the engine in step 18) without the old engine: every answer the old
 * engine gave a test that drove it step by step beside the new host, in order. A read names what it
 * asks (`label`); the replay refuses a test that asks something else or in another order, and a
 * test that ends before it read every answer (`done`, checked when the test finishes): a scenario
 * that stops early would otherwise compare only a prefix. The traces carry no fingerprint of their
 * inputs (the old recorder wrote none); the labels in their order stand in for it.
 */
export class RecordedTrace {
	readonly #entries: readonly Static<typeof TraceEntry>[];
	readonly #where: string;
	#at = 0;

	/** The running test's next recorded trace; `recorded` gives the entries directly (the helper's own test). */
	constructor(recorded?: { readonly where: string; readonly entries: readonly Static<typeof TraceEntry>[] }) {
		if (recorded === undefined) {
			const { name, scenario } = currentScenario();
			this.#where = `test/fixtures/old-engine/${name}.json: ${scenario}`;
			this.#entries = recordedOld(name, scenario, Type.Array(TraceEntry));
			// A trace read while a file is collected (a scenario built at load time, `twin-resume`) has no test to finish.
			if (expect.getState().currentTestName !== undefined) {
				onTestFinished(() => {
					this.done();
				});
			}
		} else {
			this.#where = recorded.where;
			this.#entries = recorded.entries;
		}
	}

	/** The old engine's next answer, to the question `label`. */
	read<T extends TSchema>(label: string, schema: T): Static<T> {
		const entry = this.#entries[this.#at];
		this.#at += 1;
		if (entry?.label !== label) throw new Error(`${this.#where}: answer ${String(this.#at)} was recorded for ${entry?.label ?? "nothing"}, not ${label}`);
		if (entry.error !== undefined) throw new Error(entry.error);
		if (!Check(schema, entry.value)) throw new Error(`${this.#where}: answer ${String(this.#at)} (${label}) does not have the recorded shape`);
		return entry.value;
	}

	/** An old step without an answer (a mutation of the old world). */
	step(label: string): void {
		this.read(label, Type.Undefined());
	}

	/** Throws unless every recorded answer was read. */
	done(): void {
		if (this.#at < this.#entries.length) {
			throw new Error(`${this.#where}: read ${String(this.#at)} of ${String(this.#entries.length)} recorded answers; the next was ${this.#entries[this.#at]?.label ?? "nothing"}`);
		}
	}
}
