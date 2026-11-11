/** Reads a story file (YAML or JSON) into the plain value the story graph takes. */
import { parse } from "yaml";

export function parseStoryFile(name: string, text: string): unknown {
	return name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parse(text);
}
