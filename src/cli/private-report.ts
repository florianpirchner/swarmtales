/**
 * `pnpm report:private runs/run-NNN`: (re)writes the run's private files,
 * `cast/<ID>-<figure>.md` and `acts/act-<n>/private.md`, from its
 * `events.jsonl` and the story named in `000-run.json`. Offline.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { writePrivateFiles } from "../log/private-files.ts";
import { RUN_METADATA_FILE } from "../log/run-artifacts.ts";
import { DEFAULT_STORY, findStory } from "../../stories/index.ts";

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

const [target, ...rest] = process.argv.slice(2);
if (target === undefined || rest.length > 0) fail("Usage: pnpm report:private <run-directory>");
const directory = resolve(target);
if (!existsSync(join(directory, "events.jsonl"))) fail(`No events.jsonl in ${directory}`);
const Metadata = Type.Object({ story: Type.Object({ id: Type.String() }) });
const metadataPath = join(directory, RUN_METADATA_FILE);
let storyId = DEFAULT_STORY;
if (existsSync(metadataPath)) {
	const value: unknown = JSON.parse(readFileSync(metadataPath, "utf8"));
	if (Check(Metadata, value)) storyId = value.story.id;
}
const story = findStory(storyId) ?? fail(`Unknown story ${storyId}`);
writePrivateFiles(directory, story);
process.stdout.write(`private files: ${join(directory, "cast")}, ${join(directory, "acts")}\n`);
