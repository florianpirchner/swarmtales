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
import { Parse } from "typebox/value";
import { currentScenario, fingerprintOf, OLD_ENGINE_DIR, replayAt, replayOld } from "./old-engine.ts";

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
