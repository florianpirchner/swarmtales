/**
 * The generated parts of every mechanic's README (docs/MECHANIC-README.md): what a reader would otherwise have to dig out
 * of the code. A README holds handwritten sections and generated blocks between markers
 * (`<!-- generated:tools -->` ... `<!-- /generated:tools -->`); this module computes the blocks from the mechanic
 * definitions, the prompt files and the registered stories, and checks a README against them.
 * `scripts/write-mechanic-docs.ts` (`pnpm docs:mechanics`) writes them; `test/scripts/mechanic-docs.test.ts` fails when a
 * README is missing, lacks a section or holds a stale block.
 *
 * A mechanic's tools exist only once it is instantiated, so each mechanic is instantiated here against a port that
 * answers nothing (every call throws): the body only builds its tool, service and hook objects at that point.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { ApiDefinition, MechanicDefinition, MechanicInstance, MechanicPort, MechanicUse } from "@swarmtales/contracts";
import { createRng } from "@swarmtales/kernel";
import { arena } from "@swarmtales/mechanic-arena";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { chess } from "@swarmtales/mechanic-chess";
import { clueGrid } from "@swarmtales/mechanic-clue-grid";
import { consensus } from "@swarmtales/mechanic-consensus";
import { convoy } from "@swarmtales/mechanic-convoy";
import { draftRounds } from "@swarmtales/mechanic-draft-rounds";
import { econGames } from "@swarmtales/mechanic-econ-games";
import { exile } from "@swarmtales/mechanic-exile";
import { goals } from "@swarmtales/mechanic-goals";
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { hintTowers } from "@swarmtales/mechanic-hint-towers";
import { holdem } from "@swarmtales/mechanic-holdem";
import { ledger } from "@swarmtales/mechanic-ledger";
import { liarsDice } from "@swarmtales/mechanic-liars-dice";
import { marks } from "@swarmtales/mechanic-marks";
import { morris } from "@swarmtales/mechanic-morris";
import { morrisReferee } from "@swarmtales/mechanic-morris-referee";
import { motives } from "@swarmtales/mechanic-motives";
import { names } from "@swarmtales/mechanic-names";
import { optimalReferee } from "@swarmtales/mechanic-optimal-referee";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { saltMarket } from "@swarmtales/mechanic-salt-market";
import { script } from "@swarmtales/mechanic-script";
import { seal } from "@swarmtales/mechanic-seal";
import { sealedAuction } from "@swarmtales/mechanic-sealed-auction";
import * as shared from "@swarmtales/mechanic-shared";
import { standoff } from "@swarmtales/mechanic-standoff";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { trickPlay } from "@swarmtales/mechanic-trick-play";
import { whispers } from "@swarmtales/mechanic-whispers";
import { createPromptLookup, parsePromptFile } from "@swarmtales/prompts";
import { mechanicsOf, type HostRun } from "../apps/cli/src/host/story.ts";
import { coreStories, coreStoryNames, STORIES, storyNames } from "../stories/index.ts";

/** Every mechanic package by its folder under `mechanics/`. A new folder must be added here (the test says so). */
export const MECHANICS: Readonly<Record<string, MechanicDefinition>> = {
	arena,
	"card-table": cardTable,
	cast,
	channels,
	chess,
	"clue-grid": clueGrid,
	consensus,
	convoy,
	"draft-rounds": draftRounds,
	"econ-games": econGames,
	exile,
	goals,
	"grid-game": gridGame,
	"hint-towers": hintTowers,
	holdem,
	ledger,
	"liars-dice": liarsDice,
	marks,
	morris,
	"morris-referee": morrisReferee,
	motives,
	names,
	"optimal-referee": optimalReferee,
	petitions,
	progression,
	puzzles,
	receipts,
	"salt-market": saltMarket,
	script,
	seal,
	"sealed-auction": sealedAuction,
	standoff,
	"standoff-tribunal": standoffTribunal,
	"strategy-brain": strategyBrain,
	"team-channel": teamChannel,
	tribunal,
	"trick-play": trickPlay,
	whispers,
};

/** The folder that holds the shared APIs and schemas; its README has its own shape (`SHARED_SECTIONS`). */
export const SHARED_FOLDER = "shared";

/** The README's sections in order; `generated` names the block the section holds. */
export const MECHANIC_SECTIONS: readonly { readonly heading: string; readonly generated?: string }[] = [
	{ heading: "At a glance", generated: "glance" },
	{ heading: "How it plays" },
	{ heading: "Tools", generated: "tools" },
	{ heading: "Events", generated: "events" },
	{ heading: "Options", generated: "options" },
	{ heading: "Services", generated: "services" },
	{ heading: "Decisions and prompts", generated: "prompts" },
	{ heading: "Example" },
	{ heading: "Lessons and loopholes" },
	{ heading: "Tests" },
];

export const SHARED_SECTIONS: readonly { readonly heading: string; readonly generated?: string }[] = [
	{ heading: "What is in it" },
	{ heading: "APIs", generated: "apis" },
	{ heading: "Tests" },
];

/** What a handwritten section holds until someone writes it; the check refuses it. */
export const PLACEHOLDER = "_To be written._";

// ---------------------------------------------------------------------------------------------------------------------
// Schemas as text

type Json = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function plain(value: unknown): unknown {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stringOf(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

/** A schema's type in a few words: `string`, `integer ≥ 1`, `"a" or "b"`, `string[]`, `record of number`. */
export function typeText(schema: unknown): string {
	if (!isRecord(schema)) return "any";
	if ("const" in schema) return JSON.stringify(schema.const);
	if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(" or ");
	const anyOf = schema.anyOf ?? schema.oneOf;
	if (Array.isArray(anyOf)) return [...new Set(anyOf.map((part) => typeText(part)))].join(" or ");
	const type = schema.type;
	if (Array.isArray(type)) return type.map((part) => String(part)).join(" or ");
	switch (type) {
		case "array": {
			const items = typeText(schema.items);
			return items.includes(" ") ? `(${items})[]` : `${items}[]`;
		}
		case "object": {
			if (isRecord(schema.properties) && Object.keys(schema.properties).length > 0) return "object";
			const pattern = isRecord(schema.patternProperties) ? Object.values(schema.patternProperties)[0] : undefined;
			const additional = isRecord(schema.additionalProperties) ? schema.additionalProperties : undefined;
			const value = pattern ?? additional;
			return value === undefined ? "object" : `record of ${typeText(value)}`;
		}
		case "integer":
		case "number": {
			const bounds: string[] = [];
			if (typeof schema.minimum === "number") bounds.push(`≥ ${String(schema.minimum)}`);
			if (typeof schema.exclusiveMinimum === "number") bounds.push(`> ${String(schema.exclusiveMinimum)}`);
			if (typeof schema.maximum === "number") bounds.push(`≤ ${String(schema.maximum)}`);
			return [type, ...bounds].join(" ");
		}
		case "string":
		case "boolean":
		case "null":
			return type;
		default:
			return "any";
	}
}

interface Field {
	readonly name: string;
	readonly type: string;
	readonly required: boolean;
	readonly defaultText: string | undefined;
	readonly description: string | undefined;
}

/** The object schema inside a schema: itself, the items of an array of objects, or an optional object. */
function objectInside(schema: unknown): Json | undefined {
	if (!isRecord(schema)) return undefined;
	if (isRecord(schema.properties)) return schema;
	if (schema.type === "array") return objectInside(schema.items);
	return undefined;
}

/** The properties of an object schema, nested ones as `a.b` (`a[].b` inside arrays), down to `depth` levels. */
export function fieldsOf(schema: unknown, depth = 1, prefix = ""): readonly Field[] {
	const object = objectInside(schema);
	if (object === undefined || !isRecord(object.properties)) return [];
	const required = Array.isArray(object.required) ? object.required : [];
	return Object.entries(object.properties).flatMap(([name, property]) => {
		const full = `${prefix}${name}`;
		const field: Field = {
			name: full,
			type: typeText(property),
			required: required.includes(name),
			defaultText: isRecord(property) && "default" in property ? JSON.stringify(property.default) : undefined,
			description: isRecord(property) ? stringOf(property.description) : undefined,
		};
		if (depth <= 1) return [field];
		const inner = objectInside(property);
		if (inner === undefined) return [field];
		const nested = fieldsOf(inner, depth - 1, isRecord(property) && property.type === "array" ? `${full}[].` : `${full}.`);
		return [field, ...nested];
	});
}

/** Text safe inside a Markdown table cell. */
function cell(text: string | undefined): string {
	if (text === undefined || text === "") return "";
	return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function code(text: string): string {
	return `\`${text}\``;
}

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
	return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

// ---------------------------------------------------------------------------------------------------------------------
// Instances against a silent port

function refuse(what: string): never {
	throw new Error(`mechanic-docs: the documentation port has no ${what}`);
}

function silentPort(id: string): MechanicPort {
	return {
		id,
		seed: 1,
		minutes: 60,
		minute: () => 0,
		emit: () => refuse("emit"),
		call: () => refuse("call"),
		has: () => false,
		render: (prompt) => prompt,
		random: () => createRng(1),
		rng: () => createRng(1),
		stage: () => refuse("stage"),
		decide: () => refuse("decide"),
		decisions: { pending: () => [] },
		residents: {
			ids: ["A01", "A02", "A03", "A04", "A05", "A06"],
			has: () => true,
			mayAct: () => true,
			attribute: () => undefined,
			setAttribute: () => refuse("setAttribute"),
			suspend: () => refuse("suspend"),
			resume: () => refuse("resume"),
		},
		schedule: { at: () => refuse("schedule"), every: () => refuse("schedule") },
		access: { lock: () => refuse("lock"), unlock: () => refuse("unlock"), isLocked: () => false, isOpen: () => true, open: () => [] },
		roles: { has: () => false },
		log: { length: 0, all: () => [], since: () => [], ofType: () => [] },
	};
}

// ---------------------------------------------------------------------------------------------------------------------
// Where mechanics are used

/** A city run as the CLI composes it by default: six residents, everything on, the dials in the middle. */
const CITY_RUN: HostRun = {
	residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
	seed: 1,
	minutes: 60,
	arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: true, stopWhenSeatsDecided: false },
	names: true,
	coreMotives: true,
	whisperer: true,
	guards: true,
	gamemaker: true,
	figureDirection: 5,
	gmDirection: 5,
};

export interface StoryUse {
	/** The registered story name (`chess-nobrain`). */
	readonly story: string;
	readonly use: MechanicUse;
}

/** Every registered story's mechanics, the city stories as composed for a default run. */
export function storyUses(): readonly StoryUse[] {
	const uses: StoryUse[] = [];
	for (const name of storyNames()) {
		const story = STORIES[name];
		if (story === undefined) continue;
		for (const use of mechanicsOf(story, CITY_RUN)) uses.push({ story: name, use });
	}
	for (const name of coreStoryNames()) {
		const entry = coreStories[name];
		if (entry === undefined) continue;
		for (const use of entry.story.mechanics) uses.push({ story: name, use });
	}
	return uses;
}

/** The story folder a registered name belongs to: the longest folder that is the name or a prefix of it followed by `-`. */
function folderOfStory(folders: readonly string[], name: string): string | undefined {
	return folders.filter((folder) => name === folder || name.startsWith(`${folder}-`)).sort((a, b) => b.length - a.length)[0];
}

// ---------------------------------------------------------------------------------------------------------------------
// The blocks

export interface DocsContext {
	readonly root: string;
	readonly uses: readonly StoryUse[];
	/** Registered story names by story folder. */
	readonly storyFolders: ReadonlyMap<string, readonly string[]>;
	/** Mechanic folder by mechanic id. */
	readonly folderOfId: ReadonlyMap<string, string>;
}

export function docsContext(root: string): DocsContext {
	const folders = readdirSync(join(root, "stories"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
	const storyFolders = new Map<string, string[]>();
	for (const name of [...storyNames(), ...coreStoryNames()]) {
		const folder = folderOfStory(folders, name);
		if (folder !== undefined) storyFolders.set(folder, [...(storyFolders.get(folder) ?? []), name]);
	}
	const folderOfId = new Map(Object.entries(MECHANICS).map(([folder, definition]) => [definition.id, folder]));
	return { root, uses: storyUses(), storyFolders, folderOfId };
}

/** The instances of a mechanic for its distinct options in the stories (or its defaults when no story loads it). */
function instancesOf(definition: MechanicDefinition, uses: readonly StoryUse[]): readonly MechanicInstance[] {
	const seen = new Set<string>();
	const options: unknown[] = [];
	for (const { use } of uses) {
		if (use.mechanic.id !== definition.id) continue;
		const key = JSON.stringify(use.options);
		if (seen.has(key)) continue;
		seen.add(key);
		options.push(use.options);
	}
	if (options.length === 0) options.push({});
	return options.map((raw) => definition.instantiate(silentPort(definition.id), raw));
}

/** A link from a mechanic's README to another mechanic's README. */
function mechanicLink(ctx: DocsContext, id: string): string {
	const folder = ctx.folderOfId.get(id);
	return folder === undefined ? code(id) : `[${id}](../${folder}/README.md)`;
}

function apiList(ctx: DocsContext, apis: readonly ApiDefinition[], providers: ReadonlyMap<string, readonly string[]>): string {
	if (apis.length === 0) return "none";
	return apis
		.map((api) => {
			const by = providers.get(api.name) ?? [];
			return by.length === 0 ? code(api.name) : `${code(api.name)} (from ${by.map((id) => mechanicLink(ctx, id)).join(", ")})`;
		})
		.join(", ");
}

/** Mechanic ids by the API names they provide. */
function providersByApi(): ReadonlyMap<string, readonly string[]> {
	const providers = new Map<string, string[]>();
	for (const definition of Object.values(MECHANICS)) {
		for (const api of definition.provides) providers.set(api.name, [...(providers.get(api.name) ?? []), definition.id]);
	}
	return providers;
}

function storiesLine(ctx: DocsContext, id: string): string {
	const using = new Set(ctx.uses.filter((entry) => entry.use.mechanic.id === id).map((entry) => entry.story));
	if (using.size === 0) return "none of the registered stories";
	const parts: string[] = [];
	for (const [folder, variants] of [...ctx.storyFolders].sort(([a], [b]) => a.localeCompare(b))) {
		const own = variants.filter((name) => using.has(name)).sort();
		if (own.length === 0) continue;
		const link = `[${folder}](../../stories/${folder}/README.md)`;
		parts.push(variants.length === 1 && own.length === 1 ? link : own.length === variants.length ? `${link} (all ${String(variants.length)} variants)` : `${link} (${own.map(code).join(", ")})`);
	}
	return parts.join(", ");
}

function glanceBlock(ctx: DocsContext, folder: string, definition: MechanicDefinition, instances: readonly MechanicInstance[]): string {
	const providers = providersByApi();
	const first = instances[0];
	const snapshot = first?.snapshot;
	const facts = [...new Set(instances.flatMap((instance) => Object.keys(instance.facts)))].sort();
	const jobs = [...new Set(instances.flatMap((instance) => instance.jobs))].sort();
	const pkg = readPackageName(ctx.root, folder);
	const rows: (readonly string[])[] = [
		["Package", code(pkg)],
		["Id", code(definition.id)],
		["Summary", cell(definition.summary)],
		["Requires", cell(apiList(ctx, definition.requires, providers))],
		["Uses when loaded", cell(apiList(ctx, definition.uses, providers))],
		["Provides", cell(definition.provides.length === 0 ? "none" : definition.provides.map((api) => code(api.name)).join(", "))],
		["State", first?.stateful === true ? `kept, snapshot slice version ${String(snapshot?.version ?? "?")}` : "none"],
		["Facts", facts.length === 0 ? "none" : facts.map(code).join(", ")],
		["Jobs", jobs.length === 0 ? "none" : jobs.map(code).join(", ")],
		["Stories", storiesLine(ctx, definition.id)],
	];
	return table(["", ""], rows);
}

function readPackageName(root: string, folder: string): string {
	const parsed: unknown = JSON.parse(readFileSync(join(root, "mechanics", folder, "package.json"), "utf8"));
	return isRecord(parsed) ? (stringOf(parsed.name) ?? folder) : folder;
}

const LOOKUP = createPromptLookup();

/** A prompt file's body without its front matter, and its path relative to the README's folder. */
function promptOf(ctx: DocsContext, folder: string, owner: string, id: string): { readonly body: string; readonly path: string } | undefined {
	const path = LOOKUP.pathOf(owner, id);
	if (path === undefined) return undefined;
	const file = parsePromptFile(readFileSync(path, "utf8"), path);
	return { body: file.body.trim(), path: relative(join(ctx.root, "mechanics", folder), path) };
}

function limitText(limit: { readonly max: number; readonly per: unknown; readonly key?: string } | undefined): string | undefined {
	if (limit === undefined) return undefined;
	const per = limit.per;
	const window = typeof per === "string" ? per : isRecord(per) && typeof per.minutes === "number" ? `${String(per.minutes)} minutes` : isRecord(per) ? `until \`${String(per.resetOn)}\`` : "?";
	return `${String(limit.max)} per ${window}${limit.key === undefined ? "" : ` (shared counter \`${limit.key}\`)`}`;
}

function quote(text: string): string {
	return text
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`))
		.join("\n");
}

function toolsBlock(ctx: DocsContext, folder: string, definition: MechanicDefinition, instances: readonly MechanicInstance[]): string {
	const seen = new Set<string>();
	const parts: string[] = [];
	for (const tool of instances.flatMap((instance) => instance.tools)) {
		const key = `${tool.name}:${(tool.serves ?? []).join(",")}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const lines: string[] = [`### ${code(tool.name)}`, ""];
		const facts: string[] = [];
		facts.push(`- Suggested for: ${tool.suggest.length === 0 ? "no one (the story grants it by name)" : tool.suggest.map(code).join(", ")}`);
		if (tool.serves !== undefined) facts.push(`- Serves only: ${tool.serves.map(code).join(", ")}`);
		const limit = limitText(tool.limit);
		if (limit !== undefined) facts.push(`- Limit: ${limit}`);
		if (tool.free === true) facts.push("- Free: does not count as a step");
		if (tool.consult !== undefined) facts.push(`- Consults the model role ${code(tool.consult.role)}`);
		lines.push(...facts, "");
		const params = fieldsOf(plain(tool.parameters), 2);
		if (params.length === 0) lines.push("No parameters.", "");
		else lines.push(table(["Parameter", "Type", "Required", "Description"], params.map((field) => [code(field.name), cell(field.type), field.required ? "yes" : "no", cell(field.description)])), "");
		const promptId = tool.descriptionPrompt?.id ?? tool.description;
		const prompt = promptOf(ctx, folder, definition.id, promptId);
		if (prompt === undefined) lines.push(`Description prompt ${code(promptId)} (no file found).`);
		else lines.push(`What the caller reads ([${promptId}](${prompt.path})):`, "", quote(prompt.body));
		parts.push(lines.join("\n").trimEnd());
	}
	return parts.length === 0 ? "This mechanic defines no tools." : parts.join("\n\n");
}

function eventsBlock(definition: MechanicDefinition): string {
	const types = Object.keys(definition.events);
	if (types.length === 0) return "This mechanic writes no events of its own.";
	return types
		.map((type) => {
			const audience = definition.audiences?.[type];
			const lines = [`### ${code(type)}`, "", `Audience: ${audience === undefined ? "everyone" : audience.map(code).join(", ")}`, ""];
			const fields = fieldsOf(plain(definition.events[type]), 2);
			if (fields.length === 0) lines.push("No fields.");
			else lines.push(table(["Field", "Type", "Required", "Description"], fields.map((field) => [code(field.name), cell(field.type), field.required ? "yes" : "no", cell(field.description)])));
			return lines.join("\n");
		})
		.join("\n\n");
}

function optionsBlock(definition: MechanicDefinition): string {
	const fields = fieldsOf(plain(definition.options), 3);
	if (fields.length === 0) return "This mechanic takes no options.";
	return table(
		["Option", "Type", "Default", "Description"],
		fields.map((field) => [code(field.name), cell(field.type), field.defaultText === undefined ? (field.required ? "required" : "unset") : cell(code(field.defaultText)), cell(field.description)]),
	);
}

function apiBlock(api: ApiDefinition): string {
	const rows = Object.entries(api.methods).map(([name, method]) => {
		const input = fieldsOf(plain(method.input))
			.map((field) => `${field.name}${field.required ? "" : "?"}: ${field.type}`)
			.join(", ");
		return [code(name), method.kind, cell(input === "" ? "-" : input), cell(typeText(plain(method.output))), cell(method.summary)];
	});
	return [`### ${code(api.name)}`, "", api.summary, "", table(["Method", "Kind", "Input", "Output", "Summary"], rows)].join("\n");
}

function servicesBlock(definition: MechanicDefinition): string {
	if (definition.provides.length === 0) return "This mechanic provides no API to other mechanics.";
	return definition.provides.map(apiBlock).join("\n\n");
}

function promptsBlock(ctx: DocsContext, folder: string, definition: MechanicDefinition): string {
	const lines: string[] = [];
	const kinds = Object.entries(definition.decisions);
	if (kinds.length === 0) lines.push("Decisions: none.");
	else {
		lines.push("Decisions (an overseer or the human may amend them while the window is open):", "");
		for (const [kind, schema] of kinds) {
			const fields = fieldsOf(plain(schema))
				.map((field) => `${field.name}${field.required ? "" : "?"}: ${field.type}`)
				.join(", ");
			lines.push(`- ${code(kind)}: ${fields === "" ? "no fields" : cell(fields)}`);
		}
	}
	lines.push("");
	const keys = Object.entries(definition.prompts);
	if (keys.length === 0) lines.push("Prompts: none besides the tool descriptions.");
	else {
		lines.push("Prompts (the files a story may override in its own `prompts/` folder):", "");
		const rows = keys.map(([key, variables]) => {
			const prompt = promptOf(ctx, folder, definition.id, key);
			return [prompt === undefined ? code(key) : `[${key}](${prompt.path})`, variables.length === 0 ? "-" : variables.map(code).join(", ")];
		});
		lines.push(table(["Prompt", "Variables"], rows));
	}
	return lines.join("\n");
}

/** The generated blocks of one mechanic's README, by block name. */
export function mechanicBlocks(ctx: DocsContext, folder: string): Readonly<Record<string, string>> {
	const definition = MECHANICS[folder];
	if (definition === undefined) throw new Error(`mechanic-docs: no mechanic for folder "${folder}"`);
	const instances = instancesOf(definition, ctx.uses);
	return {
		glance: glanceBlock(ctx, folder, definition, instances),
		tools: toolsBlock(ctx, folder, definition, instances),
		events: eventsBlock(definition),
		options: optionsBlock(definition),
		services: servicesBlock(definition),
		prompts: promptsBlock(ctx, folder, definition),
	};
}

function isApi(value: unknown): value is ApiDefinition {
	return isRecord(value) && typeof value.name === "string" && typeof value.summary === "string" && isRecord(value.methods);
}

/** The shared package's block: every API it declares, with its providers. */
export function sharedBlocks(ctx: DocsContext): Readonly<Record<string, string>> {
	const providers = providersByApi();
	const exported: readonly unknown[] = Object.values(shared);
	const apis = exported
		.filter(isApi)
		.sort((a, b) => a.name.localeCompare(b.name));
	const parts = apis.map((api) => {
		const by = providers.get(api.name) ?? [];
		const users = Object.values(MECHANICS)
			.filter((definition) => [...definition.requires, ...definition.uses].some((used) => used.name === api.name))
			.map((definition) => mechanicLink(ctx, definition.id));
		return `${apiBlock(api)}\n\nProvided by: ${by.length === 0 ? "no mechanic of this repository" : by.map((id) => mechanicLink(ctx, id)).join(", ")}. Used by: ${users.length === 0 ? "none" : users.join(", ")}.`;
	});
	return { apis: parts.join("\n\n") };
}

// ---------------------------------------------------------------------------------------------------------------------
// README files

const open = (name: string) => `<!-- generated:${name} -->`;
const close = (name: string) => `<!-- /generated:${name} -->`;
const NOTE = "<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->";

function blockText(name: string, body: string): string {
	return `${open(name)}\n${NOTE}\n\n${body}\n\n${close(name)}`;
}

/** A new README with every section, the handwritten ones as placeholders. */
export function skeleton(title: string, sections: typeof MECHANIC_SECTIONS, blocks: Readonly<Record<string, string>>): string {
	const parts = [`# ${title}`, "", PLACEHOLDER, ""];
	for (const section of sections) {
		parts.push(`## ${section.heading}`, "", section.generated === undefined ? PLACEHOLDER : blockText(section.generated, blocks[section.generated] ?? ""), "");
	}
	return `${parts.join("\n").trimEnd()}\n`;
}

/** The README with every generated block replaced by its current text; a block without markers is left out (the check reports it). */
export function withBlocks(readme: string, blocks: Readonly<Record<string, string>>): string {
	let text = readme;
	for (const [name, body] of Object.entries(blocks)) {
		const start = text.indexOf(open(name));
		const end = text.indexOf(close(name));
		if (start < 0 || end < start) continue;
		text = `${text.slice(0, start)}${blockText(name, body)}${text.slice(end + close(name).length)}`;
	}
	return text;
}

/** What is wrong with a README: missing or misordered sections, placeholders, missing markers, stale blocks. */
export function readmeProblems(file: string, readme: string, sections: typeof MECHANIC_SECTIONS, blocks: Readonly<Record<string, string>>): readonly string[] {
	const problems: string[] = [];
	const lines = readme.split("\n");
	if (!lines[0]?.startsWith("# ")) problems.push(`${file}: the first line is not the title (\`# Name\`)`);
	const headings = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim());
	const wanted = sections.map((section) => section.heading);
	const present = headings.filter((heading) => wanted.includes(heading));
	for (const heading of wanted) if (!present.includes(heading)) problems.push(`${file}: no section "## ${heading}"`);
	if (present.join("|") !== wanted.filter((heading) => present.includes(heading)).join("|")) problems.push(`${file}: the sections are not in the order of docs/MECHANIC-README.md`);
	const intro = lines.slice(1, lines.findIndex((line) => line.startsWith("## "))).join("\n").trim();
	if (intro === "") problems.push(`${file}: no paragraph under the title`);
	if (readme.includes(PLACEHOLDER)) problems.push(`${file}: a section still says "${PLACEHOLDER}"`);
	for (const section of sections) {
		if (section.generated === undefined) continue;
		if (!readme.includes(open(section.generated)) || !readme.includes(close(section.generated))) problems.push(`${file}: no generated block "${section.generated}" (markers ${open(section.generated)} ... ${close(section.generated)})`);
	}
	if (problems.length === 0 && withBlocks(readme, blocks) !== readme) problems.push(`${file}: a generated block is stale; run \`pnpm docs:mechanics\``);
	return problems;
}

export interface ReadmeTarget {
	readonly folder: string;
	readonly file: string;
	readonly title: string;
	readonly sections: typeof MECHANIC_SECTIONS;
	readonly blocks: Readonly<Record<string, string>>;
}

/** Every README the generator owns: one per mechanic folder and the shared package's. */
export function readmeTargets(root: string): readonly ReadmeTarget[] {
	const ctx = docsContext(root);
	const targets: ReadmeTarget[] = Object.keys(MECHANICS)
		.sort()
		.map((folder) => ({ folder, file: join(root, "mechanics", folder, "README.md"), title: folder, sections: MECHANIC_SECTIONS, blocks: mechanicBlocks(ctx, folder) }));
	targets.push({ folder: SHARED_FOLDER, file: join(root, "mechanics", SHARED_FOLDER, "README.md"), title: "Shared", sections: SHARED_SECTIONS, blocks: sharedBlocks(ctx) });
	return targets;
}

/** Mechanic folders on disk that the generator does not know. */
export function unknownFolders(root: string): readonly string[] {
	return readdirSync(join(root, "mechanics"), { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(root, "mechanics", entry.name, "package.json")))
		.map((entry) => entry.name)
		.filter((folder) => folder !== SHARED_FOLDER && MECHANICS[folder] === undefined);
}
