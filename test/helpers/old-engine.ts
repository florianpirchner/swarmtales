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
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";

export const OLD_ENGINE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/old-engine");

const Scenarios = Type.Record(Type.String(), Type.Unknown());

/** One recorded scenario of `test/fixtures/old-engine/<name>.json`, checked against its schema. */
export function recordedOld<T extends TSchema>(name: string, scenario: string, schema: T): Static<T> {
	const path = resolve(OLD_ENGINE_DIR, `${name}.json`);
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!Check(Scenarios, parsed)) throw new Error(`${path} is not an object of scenarios`);
	const entry = parsed[scenario];
	if (entry === undefined) throw new Error(`${path} has no scenario ${scenario}`);
	if (!Check(schema, entry)) throw new Error(`${path}: scenario ${scenario} does not have the recorded shape`);
	return entry;
}
