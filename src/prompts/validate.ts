/**
 * Checks the prompt library for `pnpm validate`: every registered prompt has a file, every file is
 * registered, every variable a body uses is declared (and every declared one is used), the code
 * references every registered id, and story overrides replace a known prompt with the same variables.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { hasStrayBraces, parsePromptFile, placeholders, renderBody } from "./file.ts";
import { LIBRARY_DIR, REPO_ROOT } from "./library.ts";
import { PROMPTS, type PromptId } from "./registry.ts";

function filesIn(directory: string, extension: string): readonly string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) return filesIn(path, extension);
		return path.endsWith(extension) ? [path] : [];
	});
}

function idOf(root: string, path: string): string {
	return relative(root, path).split(sep).join("/").replace(/\.md$/, "");
}

function isPromptId(id: string): id is PromptId {
	return Object.hasOwn(PROMPTS, id);
}

/** Problems found in one prompt file against the variables it must declare. */
function checkFile(path: string, id: string, expected: readonly string[]): readonly string[] {
	const where = relative(REPO_ROOT, path);
	let file;
	try {
		file = parsePromptFile(readFileSync(path, "utf8"), where);
	} catch (error) {
		return [error instanceof Error ? error.message : String(error)];
	}
	const problems: string[] = [];
	if (file.id !== id) problems.push(`${where}: the id is "${file.id}", expected "${id}"`);
	for (const name of expected) if (!file.variables.includes(name)) problems.push(`${where}: does not declare "${name}"`);
	for (const name of file.variables) if (!expected.includes(name)) problems.push(`${where}: declares "${name}", which the registry does not know`);
	const used = placeholders(file.body);
	for (const name of used) if (!file.variables.includes(name)) problems.push(`${where}: uses "${name}" without declaring it`);
	for (const name of file.variables) if (!used.includes(name)) problems.push(`${where}: declares "${name}" but never uses it`);
	if (hasStrayBraces(file.body)) problems.push(`${where}: contains "{{" that is not a placeholder`);
	if (problems.length === 0) {
		try {
			const sample = renderBody(file, Object.fromEntries(file.variables.map((name) => [name, `<${name}>`])));
			if (sample.includes("{{")) problems.push(`${where}: a sample render leaves a placeholder behind`);
		} catch (error) {
			problems.push(error instanceof Error ? error.message : String(error));
		}
	}
	return problems;
}

/** The registered ids the code never mentions (as a quoted string outside the registry). */
function unreferenced(ids: readonly string[]): readonly string[] {
	const sources = [...filesIn(join(REPO_ROOT, "src"), ".ts"), ...filesIn(join(REPO_ROOT, "stories"), ".ts"), ...filesIn(join(REPO_ROOT, "lab"), ".ts")]
		.filter((path) => !path.includes(`${sep}prompts${sep}keys${sep}`))
		.map((path) => readFileSync(path, "utf8"));
	return ids.filter((id) => !sources.some((source) => source.includes(`"${id}"`)));
}

export function validatePrompts(): readonly string[] {
	const problems: string[] = [];
	const ids = Object.keys(PROMPTS);
	const files = filesIn(LIBRARY_DIR, ".md");
	const present = new Set(files.map((path) => idOf(LIBRARY_DIR, path)));
	for (const id of ids) {
		if (!present.has(id)) problems.push(`library/prompts/${id}.md is registered but missing`);
	}
	for (const path of files) {
		const id = idOf(LIBRARY_DIR, path);
		if (isPromptId(id)) problems.push(...checkFile(path, id, PROMPTS[id]));
		else problems.push(`${relative(REPO_ROOT, path)}: no code uses this file (it is not registered)`);
	}
	for (const id of unreferenced(ids)) problems.push(`prompt "${id}" is registered but no code mentions it`);
	for (const story of readdirSync(join(REPO_ROOT, "stories"))) {
		const directory = join(REPO_ROOT, "stories", story, "prompts");
		for (const path of filesIn(directory, ".md")) {
			const id = idOf(directory, path);
			if (!isPromptId(id)) problems.push(`${relative(REPO_ROOT, path)}: overrides "${id}", which is not a prompt`);
			else problems.push(...checkFile(path, id, PROMPTS[id]), `${relative(REPO_ROOT, path)}: story overrides are not applied yet (the callers do not pass the story); remove the file`);
		}
	}
	return problems;
}
