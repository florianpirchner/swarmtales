/**
 * The options of `script` as a story gives them (the step-17 mapping): its director rules and the ids
 * of its cast members. The rules are parsed into the script's own schema (a copy, the story's objects
 * stay as written).
 */
import type { Static } from "typebox";
import { Parse } from "typebox/value";
import type { AnyStory } from "@swarmtales/contracts";
import { ScriptOptions } from "./head.ts";

export function scriptOptionsFromStory(story: Pick<AnyStory, "cast" | "director">): Static<typeof ScriptOptions> {
	return Parse(ScriptOptions, { rules: story.director, cast: Object.keys(story.cast) });
}
