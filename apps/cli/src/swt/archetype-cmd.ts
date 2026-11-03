/**
 * `swt archetype list|show`: the story-independent library of characters in `archetypes/`
 * (professions, drives, temperaments, figures). Every file is Markdown with a flat `key: value`
 * header; a story does not read this folder (it has its own cast).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { libraryRoot } from "@swarmtales/prompts";
import { UsageError } from "../args.ts";
import { json, parseFlags, table, type CommandRun, type Noun } from "./io.ts";

interface Archetype {
	readonly kind: string;
	readonly id: string;
	readonly file: string;
	readonly header: Readonly<Record<string, string>>;
	readonly body: string;
}

/** Splits a flat `---` header from the body; a file without one has an empty header. */
function parseArchetype(kind: string, file: string, text: string): Archetype {
	const lines = text.split("\n");
	const end = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
	const header: Record<string, string> = {};
	if (end > 0) {
		for (const line of lines.slice(1, end)) {
			const colon = line.indexOf(":");
			if (colon > 0) header[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
		}
	}
	const name = basename(file, ".md");
	return { kind, id: header.id ?? name, file, header, body: lines.slice(end + 1).join("\n").trim() };
}

function allArchetypes(): readonly Archetype[] {
	const root = join(libraryRoot(), "archetypes");
	if (!existsSync(root)) return [];
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.flatMap((folder) =>
			readdirSync(join(root, folder.name))
				.filter((file) => file.endsWith(".md"))
				.sort()
				.map((file) => parseArchetype(folder.name, file, readFileSync(join(root, folder.name, file), "utf8"))),
		);
}

const titleOf = (archetype: Archetype) => archetype.header.title ?? archetype.header.persona ?? archetype.header.group ?? "";

const list: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv);
	const [kind, ...rest] = positionals;
	if (rest.length > 0) throw new UsageError("list takes at most one kind");
	const all = allArchetypes();
	const kinds = [...new Set(all.map((archetype) => archetype.kind))];
	if (kind !== undefined && !kinds.includes(kind)) throw new UsageError(`Unknown kind "${kind}". Kinds: ${kinds.join(", ")}`);
	const rows = all.filter((archetype) => kind === undefined || archetype.kind === kind);
	io.out(flags.json === true ? json(rows.map((row) => ({ kind: row.kind, id: row.id, ...row.header }))) : table(["kind", "id", "title"], rows.map((row) => [row.kind, row.id, titleOf(row)])));
	return 0;
};

const show: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv);
	const [name, ...rest] = positionals;
	if (name === undefined || rest.length > 0) throw new UsageError("show takes one archetype name");
	const matches = allArchetypes().filter((archetype) => archetype.id === name || basename(archetype.file, ".md") === name || basename(archetype.file, ".md").startsWith(`${name}-`));
	const [found] = matches;
	if (found === undefined) {
		io.err(`No archetype "${name}". \`swt archetype list\` shows them.`);
		return 1;
	}
	if (matches.length > 1) {
		io.err(`"${name}" is ambiguous: ${matches.map((match) => `${match.kind}/${match.id}`).join(", ")}`);
		return 1;
	}
	if (flags.json === true) {
		io.out(json({ kind: found.kind, id: found.id, header: found.header, body: found.body }));
		return 0;
	}
	io.out([`${found.kind}/${found.id}`, ...Object.entries(found.header).map(([key, value]) => `${key}: ${value}`), "", found.body].join("\n"));
	return 0;
};

export const archetypeNoun: Noun = {
	name: "archetype",
	verbs: {
		list: { args: "[kind] [--json]", summary: "the archetypes (kind: professions, drives, temperaments or figures)", run: list },
		show: { args: "<name> [--json]", summary: "one archetype by id or file name, e.g. c01, greed, archivist", run: show },
	},
};
