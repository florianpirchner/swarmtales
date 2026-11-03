/**
 * `swt prompt list|show|check`: the prompt files and which of them wins. A prompt id is looked up
 * in the story's `prompts/` folder first, then in the mechanic's own folder, then in
 * `library/prompts/` (packages/prompts/src/lookup.ts); `show` prints the layers in that order.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { libraryDir, libraryRoot, mechanicPromptFolders, parsePromptFile, storiesDir, validatePrompts } from "@swarmtales/prompts";
import { UsageError } from "../args.ts";
import { json, parseFlags, table, type CommandRun, type Noun } from "./io.ts";

interface Layer {
	/** `story:<name>`, `mechanic:<id>` or `library`. */
	readonly layer: string;
	readonly path: string;
}

function mdFiles(directory: string): readonly string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) return mdFiles(path);
		return path.endsWith(".md") ? [path] : [];
	});
}

const idIn = (root: string, path: string) => relative(root, path).split(sep).join("/").replace(/\.md$/, "");

/** Every layer's files, by prompt id; within an id, in lookup order (story, mechanic, library). */
function layersById(): ReadonlyMap<string, readonly Layer[]> {
	const found = new Map<string, Layer[]>();
	const add = (root: string, layer: string) => {
		for (const path of mdFiles(root)) found.set(idIn(root, path), [...(found.get(idIn(root, path)) ?? []), { layer, path }]);
	};
	const stories = storiesDir();
	for (const story of existsSync(stories) ? readdirSync(stories).sort() : []) add(join(stories, story, "prompts"), `story:${story}`);
	for (const [id, folder] of Object.entries(mechanicPromptFolders()).sort(([a], [b]) => a.localeCompare(b))) add(folder, `mechanic:${id}`);
	add(libraryDir(), "library");
	return found;
}

function variablesOf(layer: Layer): readonly string[] {
	try {
		return parsePromptFile(readFileSync(layer.path, "utf8"), layer.path).variables;
	} catch {
		return [];
	}
}

const list: CommandRun = (argv, io) => {
	const { flags } = parseFlags(argv);
	const rows = [...layersById()].sort(([a], [b]) => a.localeCompare(b)).map(([id, layers]) => ({ id, variables: layers[0] === undefined ? [] : variablesOf(layers[0]), layers: layers.map((layer) => layer.layer) }));
	io.out(flags.json === true ? json(rows) : table(["prompt", "variables", "layers"], rows.map((row) => [row.id, row.variables.join(",") || "-", row.layers.join(" > ")])));
	return 0;
};

const show: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv);
	const [key, ...rest] = positionals;
	if (key === undefined || rest.length > 0) throw new UsageError("show takes one prompt key");
	const layers = layersById().get(key);
	const winner = layers?.[0];
	if (layers === undefined || winner === undefined) {
		io.err(`No prompt "${key}". \`swt prompt list\` shows the keys.`);
		return 1;
	}
	const root = libraryRoot();
	const body = parsePromptFile(readFileSync(winner.path, "utf8"), winner.path);
	if (flags.json === true) {
		io.out(json({ id: key, winner: relative(root, winner.path), layers: layers.map((layer) => ({ layer: layer.layer, file: relative(root, layer.path) })), variables: body.variables, body: body.body }));
		return 0;
	}
	io.out(
		[
			...layers.map((layer, index) => `${index === 0 ? "wins   " : "covered"}  ${layer.layer.padEnd(22)} ${relative(root, layer.path)}`),
			`variables: ${body.variables.join(", ") || "-"}`,
			"",
			body.body,
		].join("\n"),
	);
	return 0;
};

const check: CommandRun = (_argv, io) => {
	const issues = validatePrompts();
	if (issues.length === 0) {
		io.out("ok   prompts: library/prompts and story overrides agree with the registry");
		return 0;
	}
	io.out(`FAIL prompts\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
	return 1;
};

export const promptNoun: Noun = {
	name: "prompt",
	verbs: {
		list: { args: "[--json]", summary: "every prompt id, its variables and the layers that hold a file for it", run: list },
		show: { args: "<key> [--json]", summary: "the layers in lookup order (story, mechanic, library) and the text of the winner", run: show },
		check: { summary: "the checks of `swt validate` for the prompt library only", run: check },
	},
};
