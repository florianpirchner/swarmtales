/**
 * A prompt file: Markdown with a small frontmatter (`id`, `variables`) and a body with
 * `{{variable}}` placeholders. The template language has nothing else: no conditions, no loops;
 * dial variants and alternatives are separate files and the code picks one.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";

const Frontmatter = Type.Object({ id: Type.String({ minLength: 1 }), variables: Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9]*$" })) });

export interface PromptFile {
	readonly id: string;
	/** The variables the file declares, in the order it lists them. */
	readonly variables: readonly string[];
	/** The text after the frontmatter, without the file's final newline. */
	readonly body: string;
}

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

/** Parses a prompt file; throws with `source` in the message when the frontmatter is missing or malformed. */
export function parsePromptFile(text: string, source: string): PromptFile {
	const lines = text.split("\n");
	if (lines[0] !== "---") throw new Error(`${source}: a prompt file starts with a frontmatter (---)`);
	const end = lines.indexOf("---", 1);
	if (end < 0) throw new Error(`${source}: the frontmatter is not closed (---)`);
	const fields = new Map<string, string>();
	for (const line of lines.slice(1, end)) {
		const colon = line.indexOf(":");
		if (colon < 0) throw new Error(`${source}: frontmatter line without a colon: ${line}`);
		fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
	}
	const variables = (fields.get("variables") ?? "")
		.split(",")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
	let meta;
	try {
		meta = Parse(Frontmatter, { id: fields.get("id"), variables });
	} catch {
		throw new Error(`${source}: the frontmatter needs an id and variables that are plain names`);
	}
	const raw = lines.slice(end + 1).join("\n");
	return { id: meta.id, variables: meta.variables, body: raw.endsWith("\n") ? raw.slice(0, -1) : raw };
}

/** The names of the placeholders in a body, in order of appearance (with repeats). */
export function placeholders(body: string): readonly string[] {
	return [...body.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/** True when a body holds `{{` that is not a placeholder: a prompt file has no braces pairs of its own. */
export function hasStrayBraces(body: string): boolean {
	return body.replace(PLACEHOLDER, "").includes("{{");
}

/** Fills the placeholders; every declared variable must be given, none may be extra or undeclared. */
export function renderBody(file: PromptFile, variables: Readonly<Record<string, string | number>>): string {
	const given = Object.keys(variables);
	for (const name of file.variables) if (!given.includes(name)) throw new Error(`prompt ${file.id}: missing variable "${name}"`);
	for (const name of given) if (!file.variables.includes(name)) throw new Error(`prompt ${file.id}: unknown variable "${name}"`);
	return file.body.replace(PLACEHOLDER, (_match, name: string) => {
		const value = variables[name];
		if (value === undefined) throw new Error(`prompt ${file.id}: the body uses "${name}", which is not declared`);
		return String(value);
	});
}
