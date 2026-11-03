/**
 * Stories from files (docs/ideas/monorepo.md §3a): a story written as YAML or JSON is the same data
 * as one built in TypeScript. `readStoryFile` parses the file and checks it against the story
 * schema and `validateStory` (`parseStoryData`); `storyToYaml` writes a story back out with the
 * `# yaml-language-server: $schema=` line, so an editor with the YAML extension validates it.
 *
 * `yaml` (eemeli/yaml, no dependencies, YAML 1.2, errors with line and column) is the one parser:
 * it was already in the lockfile through vite, and a story file needs nothing it does not do.
 */
import { existsSync, readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import type { AnyStory } from "@swarmtales/contracts";
import { parseStoryData, type StoryParse } from "@swarmtales/sdk";
import { findStory, storyNames } from "../../../../stories/index.ts";

const FILE_EXTENSIONS = [".yaml", ".yml", ".json"];

/** True when a story reference names a file rather than a registered story. */
export function isStoryFile(reference: string): boolean {
	return FILE_EXTENSIONS.includes(extname(reference).toLowerCase());
}

/** Reads a YAML or JSON story file; problems come back as issues, never as a throw. */
export function readStoryFile(path: string): StoryParse {
	if (!existsSync(path)) return { issues: [`No file ${path}`] };
	let data: unknown;
	try {
		const text = readFileSync(path, "utf8");
		data = extname(path).toLowerCase() === ".json" ? JSON.parse(text) : parse(text);
	} catch (error) {
		return { issues: [`${path}: ${error instanceof Error ? error.message : String(error)}`] };
	}
	return parseStoryData(data);
}

export type ResolvedStory = { readonly story: AnyStory; readonly source: string; readonly issues?: undefined } | { readonly story?: undefined; readonly source: string; readonly issues: readonly string[] };

/** A registered story by name, or a story file by path. */
export function resolveStory(reference: string): ResolvedStory {
	if (isStoryFile(reference)) {
		const parsed = readStoryFile(reference);
		return parsed.story === undefined ? { source: reference, issues: parsed.issues } : { story: parsed.story, source: reference };
	}
	const story = findStory(reference);
	if (story === undefined) return { source: reference, issues: [`Unknown story "${reference}". Known: ${storyNames().join(", ")}`] };
	return { story, source: `stories/${story.id}` };
}

/** A story as a YAML file whose first line points an editor at the schema file. */
export function storyToYaml(story: AnyStory, schemaFile: string, from: string): string {
	const schema = relative(resolve(from), resolve(schemaFile)) || schemaFile;
	// JSON first: a story is plain data, and this drops anything YAML would write as a tag.
	return `# yaml-language-server: $schema=${schema}\n${stringify(JSON.parse(JSON.stringify(story)), { lineWidth: 0 })}`;
}
