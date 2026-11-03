/**
 * Story data from outside the TypeScript builder (a YAML or JSON file, a parsed run file): checked
 * against the story schema, then against `validateStory`, the same rules a built story meets.
 */
import { DIRECTOR_SUPPORT, StorySchema, type AnyStory } from "@swarmtales/contracts";
import { Check, Errors } from "typebox/value";
import { validateStory } from "./validate.ts";

export type StoryParse = { readonly story: AnyStory; readonly issues?: undefined } | { readonly story?: undefined; readonly issues: readonly string[] };

/** One line per schema violation, with the path of the field (`/levels/0/reward`). */
function schemaIssues(value: unknown): readonly string[] {
	return Errors(StorySchema, value).slice(0, 20).map((error) => `${error.instancePath === "" ? "(story)" : error.instancePath}: ${error.message}`);
}

/**
 * Turns untrusted data into a story, or lists what is wrong. The schema comes first (shape and
 * types), `validateStory` second (cross-field rules), so a story that passes is playable.
 */
export function parseStoryData(value: unknown): StoryParse {
	if (!Check(StorySchema, value)) return { issues: schemaIssues(value) };
	const story: AnyStory = value;
	const issues = validateStory(story, { support: DIRECTOR_SUPPORT });
	return issues.length === 0 ? { story } : { issues };
}
