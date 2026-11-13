/**
 * The Games tab's data (`games` in `viewer-data.json`): one entry per story folder with a README, from the registered
 * stories of that folder, the mechanics of its main story (summary, event types with their fields) and its tools with
 * the text the residents read (`<mechanic>/tools/<tool>.md` in a prompt folder). City stories (`cityofkeys`,
 * `whispers`) are not core stories: they get their README and variants, no mechanics or tools.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MechanicUse } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { GameInfo } from "@swarmtales/viewer-ui/games";
import { coreStories, coreStoryNames, storyId, storyNames } from "../stories/index.ts";

const ALIASES = ["nexus", "quarry-noburn", "lantern-auction"];

/** The README's title (first `# ` line) and first paragraph after it. */
export function readmeParts(readme: string, fallback: string): { readonly title: string; readonly summary: string } {
	const lines = readme.split("\n");
	const titleLine = lines.find((line) => line.startsWith("# "));
	const after = titleLine === undefined ? lines : lines.slice(lines.indexOf(titleLine) + 1);
	const paragraph: string[] = [];
	for (const line of after) {
		if (line.trim() === "") {
			if (paragraph.length > 0) break;
			continue;
		}
		if (line.startsWith("#") || line.startsWith("```") || line.startsWith("**Full description")) {
			if (paragraph.length > 0) break;
			continue;
		}
		paragraph.push(line.trim());
	}
	return { title: titleLine?.slice(2).trim() ?? fallback, summary: paragraph.join(" ") };
}

/** A prompt file's text without its front matter. */
function promptText(file: string): string {
	const text = readFileSync(file, "utf8");
	const match = /^---\n[\s\S]*?\n---\n?/.exec(text);
	return (match === null ? text : text.slice(match[0].length)).trim();
}

/** Every `<folder>/prompts/<id>/tools/<tool>.md` under `mechanics/` and `library/prompts/`, by tool name (first found wins, the mechanic's own folder first). */
function toolTexts(root: string, mechanicIds: readonly string[]): ReadonlyMap<string, string> {
	const found = new Map<string, string>();
	const add = (dir: string) => {
		if (!existsSync(dir)) return;
		for (const file of readdirSync(dir)) if (file.endsWith(".md") && !found.has(file.slice(0, -3))) found.set(file.slice(0, -3), promptText(join(dir, file)));
	};
	for (const id of mechanicIds) for (const folder of readdirSync(join(root, "mechanics"))) add(join(root, "mechanics", folder, "prompts", id, "tools"));
	add(join(root, "library", "prompts", "core", "tools"));
	add(join(root, "library", "prompts", "tools"));
	return found;
}

const ObjectSchema = Type.Object({ properties: Type.Optional(Type.Record(Type.String(), Type.Object({ description: Type.Optional(Type.String()) }))) });

const fieldsOf = (schema: unknown): GameInfo["mechanics"][number]["events"][number]["fields"] => {
	const plain: unknown = JSON.parse(JSON.stringify(schema));
	if (!Check(ObjectSchema, plain)) return [];
	return Object.entries(plain.properties ?? {}).map(([name, field]) => (field.description === undefined ? { name } : { name, description: field.description }));
};

function mechanicsOf(uses: readonly MechanicUse[]): GameInfo["mechanics"] {
	return uses.map(({ mechanic }) => ({
		id: mechanic.id,
		summary: mechanic.summary,
		events: Object.entries(mechanic.events).map(([type, schema]) => ({ type, fields: fieldsOf(schema) })),
	}));
}

export function gamesOf(root: string): GameInfo[] {
	const folders = readdirSync(join(root, "stories"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(join(root, "stories", entry.name, "README.md"))).map((entry) => entry.name);
	const names = [...storyNames(), ...coreStoryNames()];
	const folderOf = (name: string) => folders.filter((folder) => name === folder || name.startsWith(`${folder}-`)).sort((a, b) => b.length - a.length)[0];
	return folders.sort().map((folder) => {
		const own = readFileSync(join(root, "stories", folder, "README.md"), "utf8");
		const { title, summary } = readmeParts(own, folder);
		// A README that points to a full description under docs/ (`docs/STORY-<NAME>.md`) gets it appended.
		const full = /docs\/(STORY-[A-Z0-9-]+\.md)/.exec(own)?.[1];
		const readme = full !== undefined && existsSync(join(root, "docs", full)) ? `${own}\n\n---\n\n${readFileSync(join(root, "docs", full), "utf8")}` : own;
		const variants = names.filter((name) => folderOf(name) === folder).sort();
		const aliases = ALIASES.filter((old) => folderOf(storyId(old)) === folder && storyId(old) !== old);
		const entry = coreStories[folder] ?? coreStories[variants.find((name) => coreStories[name] !== undefined) ?? ""];
		const game: GameInfo = { id: folder, title, summary, readme, variants, ...(aliases.length === 0 ? {} : { aliases }), mechanics: [], tools: [] };
		if (entry === undefined) return game;
		const story = entry.story;
		const uses: readonly MechanicUse[] = story.mechanics;
		const texts = toolTexts(root, uses.map((use) => use.mechanic.id));
		const granted = new Map<string, string[]>();
		if (story.grants !== "auto") {
			for (const [who, tools] of Object.entries(story.grants)) for (const tool of tools ?? []) granted.set(tool, [...(granted.get(tool) ?? []), who]);
		}
		const tools = [...granted].map(([name, grantedTo]) => {
			const description = texts.get(name);
			return description === undefined ? { name, grantedTo } : { name, grantedTo, description };
		});
		const residents = typeof story.residents === "number" ? story.residents : story.residents.length;
		return { ...game, residents, minutes: story.minutes, mechanics: mechanicsOf(uses), tools };
	});
}
