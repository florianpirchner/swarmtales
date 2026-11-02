/**
 * The recorder of the old engine's side (step 18, item 7b), for as long as the old engine exists.
 *
 * With `OLD_ENGINE_RECORD=1` a differential harness plays its old side on the old `World` and
 * writes it into `test/fixtures/old-engine/<name>.json` before the test reads it back; without it
 * the harness only reads the recorded file. The recordings were made once, on the commit named in
 * the README there. This file and the harnesses' live old sides are deleted with the engine.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { Type, type Static, type TSchema } from "typebox";
import { Check, Parse } from "typebox/value";
import { expect, onTestFinished } from "vitest";
import type { World } from "@swarmtales/engine";
import { currentScenario, fingerprintOf, OLD_ENGINE_DIR, recordedOld, recordedValue, replayAt, replayOld } from "./old-engine.ts";
import { OldWorldRecord } from "./old-world.ts";

export const RECORDING = process.env.OLD_ENGINE_RECORD === "1";

/** Writes one scenario (as JSON) into its file, one scenario per line, sorted by key. */
export function recordOld(name: string, scenario: string, value: unknown): void {
	const path = `${resolve(OLD_ENGINE_DIR, name)}.json.gz`;
	const existing = Parse(Type.Record(Type.String(), Type.Unknown()), existsSync(path) ? JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) : {});
	existing[scenario] = JSON.parse(JSON.stringify(value));
	const body = Object.keys(existing)
		.sort()
		.map((key) => `${JSON.stringify(key)}: ${JSON.stringify(existing[key])}`)
		.join(",\n");
	writeFileSync(path, gzipSync(`{\n${body}\n}\n`, { level: 9 }));
}

/** What the tests read from an old `World` after its run (`RecordedWorld` reads it back). */
export function recordWorld(world: World): OldWorldRecord {
	const levels = Array.from({ length: world.lastLevel }, (_unused, index) => index + 1);
	const codes = (agent: string): Record<string, string> => {
		const found: Record<string, string> = {};
		for (const level of levels) {
			try {
				found[String(level)] = world.inspect.codeOf(agent, level);
			} catch {
				// No solution of this level for the resident.
			}
		}
		return found;
	};
	const actStarts: Record<string, number> = {};
	for (const level of levels) {
		const start = world.actStartOf(level);
		if (start !== undefined) actStarts[String(level)] = start;
	}
	const duty = world.whisperDutyNow();
	return Parse(OldWorldRecord, JSON.parse(JSON.stringify({
		snapshot: world.snapshot(),
		minute: world.minute,
		competitors: world.competitors,
		startLevel: world.startLevel,
		lastLevel: world.lastLevel,
		residents: Object.fromEntries(
			world.competitors.map((agent) => {
				const name = world.nameOf(agent);
				return [agent, { level: world.levelOf(agent), finished: world.isFinished(agent), exiled: world.isExiled(agent), display: world.display(agent), ...(name === undefined ? {} : { name }), balance: world.ledger.balance(agent), held: world.heldPieces(agent), passed: levels.filter((level) => world.hasPassed(agent, level)), codes: codes(agent) }];
			}),
		),
		actStarts,
		...(duty === undefined ? {} : { whisperDutyNow: duty }),
	})));
}

/** A single old value: recorded from `live` when recording, then read back as `recordedValue()` reads it. */
export function oldValue(live: () => unknown): unknown {
	if (!RECORDING) return recordedValue();
	const { name, scenario } = currentScenario();
	recordOld(name, scenario, live());
	return recordedOld(name, scenario, Type.Unknown());
}

type Outcome = { readonly value: unknown } | { readonly error: string };

function failed(error: unknown): Outcome {
	return { error: error instanceof Error ? error.message : String(error) };
}

/** An old run of `input`: played by `live` and recorded when recording, then read back as `replayOld` reads it. */
export function oldRun<T extends TSchema>(input: unknown, schema: T, live: () => unknown): Static<T> {
	if (!RECORDING) return replayOld(input, schema);
	const { name, scenario } = currentScenario();
	let outcome: Outcome;
	try {
		outcome = { value: JSON.parse(JSON.stringify(live() ?? null)) };
	} catch (error) {
		outcome = failed(error);
	}
	recordOld(name, scenario, { fingerprint: fingerprintOf(input), ...outcome });
	return replayAt(name, scenario, input, schema);
}

/** `oldRun` for an old run that is played asynchronously. */
export async function oldRunAsync<T extends TSchema>(input: unknown, schema: T, live: () => Promise<unknown>): Promise<Static<T>> {
	if (!RECORDING) return replayOld(input, schema);
	const { name, scenario } = currentScenario();
	let outcome: Outcome;
	try {
		outcome = { value: JSON.parse(JSON.stringify((await live()) ?? null)) };
	} catch (error) {
		outcome = failed(error);
	}
	recordOld(name, scenario, { fingerprint: fingerprintOf(input), ...outcome });
	return replayAt(name, scenario, input, schema);
}

const TraceEntry = Type.Object({ label: Type.String(), value: Type.Optional(Type.Unknown()), error: Type.Optional(Type.String()) });
type TraceEntry = Static<typeof TraceEntry>;

/**
 * Every answer the old engine gave a test that drives it step by step beside the new host (the
 * twin), in order: recorded when recording (written when the test ends), read back otherwise. A
 * read names what it asks (`label`); the replay refuses a test that asks something else.
 */
export class OldTrace {
	readonly #entries: TraceEntry[];
	readonly #where: string;
	#flush: () => void = () => undefined;
	#at = 0;

	constructor() {
		const { name, scenario } = currentScenario();
		this.#where = `test/fixtures/old-engine/${name}.json: ${scenario}`;
		if (RECORDING) {
			const entries: TraceEntry[] = [];
			this.#entries = entries;
			// Outside a test (a module's setup) the trace is written after every answer.
			if (expect.getState().currentTestName === undefined) this.#flush = () => { recordOld(name, scenario, entries); };
			else
				onTestFinished(() => {
					recordOld(name, scenario, entries);
				});
		} else this.#entries = [...recordedOld(name, scenario, Type.Array(TraceEntry))];
	}

	/** The old engine's next answer, to the question `label`. */
	read<T extends TSchema>(label: string, schema: T, live: () => unknown): Static<T> {
		if (RECORDING) {
			try {
				const value: unknown = live();
				this.#entries.push(value === undefined ? { label } : { label, value: JSON.parse(JSON.stringify(value)) });
			} catch (error) {
				this.#entries.push({ label, error: error instanceof Error ? error.message : String(error) });
			}
			this.#flush();
		}
		const entry = this.#entries[this.#at];
		this.#at += 1;
		if (entry?.label !== label) throw new Error(`${this.#where}: answer ${String(this.#at)} was recorded for ${entry?.label ?? "nothing"}, not ${label}`);
		if (entry.error !== undefined) throw new Error(entry.error);
		if (!Check(schema, entry.value)) throw new Error(`${this.#where}: answer ${String(this.#at)} (${label}) does not have the recorded shape`);
		return entry.value;
	}

	/** An old step without an answer (a mutation of the old world). */
	step(label: string, live: () => void): void {
		this.read(label, Type.Undefined(), () => {
			live();
			return undefined;
		});
	}
}
