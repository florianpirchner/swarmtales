// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A prompt file: Markdown with a small frontmatter (`id`, `variables`) and a body with
 * `{{variable}}` placeholders. The template language has nothing else: no conditions, no loops;
 * dial variants and alternatives are separate files and the code picks one.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { badFrontmatter, badVariable } from "./errors.ts";

const Frontmatter = Type.Object(
	{
		id: Type.String({ minLength: 1, description: "The prompt id: the file's path under its prompt folder, without `.md`." }),
		variables: Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9]*$", description: "One variable name." }), { description: "The variables the body may use." }),
	},
	{ description: "The frontmatter of a prompt file." },
);

/**
 * A parsed prompt file.
 *
 * @internal
 */
export interface PromptFile {
	/** The prompt id the file states. */
	readonly id: string;
	/** The variables the file declares, in the order it lists them. */
	readonly variables: readonly string[];
	/** The text after the frontmatter, without the file's final newline. */
	readonly body: string;
}

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

// The frontmatter's fields, as written.
function frontmatterFields(lines: readonly string[], source: string): ReadonlyMap<string, string> {
	const fields = new Map<string, string>();
	for (const line of lines) {
		const colon = line.indexOf(":");
		if (colon < 0) throw badFrontmatter(source, `frontmatter line without a colon: ${line}`);
		fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
	}
	return fields;
}

/**
 * Parses a prompt file.
 *
 * @param text - The file's text.
 * @param source - The file's name, for the error message.
 * @returns The id, the declared variables and the body.
 * @throws PromptError `SWT-P011`, with `source` in the summary, when the frontmatter is missing or malformed.
 * @internal
 */
export function parsePromptFile(text: string, source: string): PromptFile {
	const lines = text.split("\n");
	if (lines[0] !== "---") throw badFrontmatter(source, "a prompt file starts with a frontmatter (---)");
	const end = lines.indexOf("---", 1);
	if (end < 0) throw badFrontmatter(source, "the frontmatter is not closed (---)");
	const fields = frontmatterFields(lines.slice(1, end), source);
	const variables = (fields.get("variables") ?? "")
		.split(",")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
	let meta;
	try {
		meta = Parse(Frontmatter, { id: fields.get("id"), variables });
	} catch {
		throw badFrontmatter(source, "the frontmatter needs an id and variables that are plain names");
	}
	if (new Set(meta.variables).size !== meta.variables.length) throw badFrontmatter(source, "the frontmatter lists a variable twice");
	const raw = lines.slice(end + 1).join("\n");
	return { id: meta.id, variables: meta.variables, body: raw.endsWith("\n") ? raw.slice(0, -1) : raw };
}

/**
 * Lists the placeholders of a body.
 *
 * @param body - The body of a prompt file.
 * @returns The names of the placeholders, in order of appearance (with repeats).
 * @internal
 */
export function placeholders(body: string): readonly string[] {
	return [...body.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/**
 * Says whether a body holds `{{` that is not a placeholder: a prompt file has no brace pairs of its own.
 *
 * @param body - The body of a prompt file.
 * @returns True when a `{{` is left after the placeholders are taken out.
 * @internal
 */
export function hasStrayBraces(body: string): boolean {
	return body.replace(PLACEHOLDER, "").includes("{{");
}

/**
 * Fills the placeholders of a prompt file.
 *
 * @param file - The parsed file.
 * @param variables - The value of every declared variable.
 * @returns The rendered text.
 * @throws PromptError `SWT-P014` when a declared variable is not given, a given one is not declared, or the body
 * uses one that is not declared.
 * @internal
 */
export function renderBody(file: PromptFile, variables: Readonly<Record<string, string | number>>): string {
	const given = Object.keys(variables);
	for (const name of file.variables) if (!given.includes(name)) throw badVariable(file.id, `missing variable "${name}"`);
	for (const name of given) if (!file.variables.includes(name)) throw badVariable(file.id, `unknown variable "${name}"`);
	return file.body.replace(PLACEHOLDER, (_match, name: string) => {
		const value = variables[name];
		if (value === undefined) throw badVariable(file.id, `the body uses "${name}", which is not declared`);
		return String(value);
	});
}
