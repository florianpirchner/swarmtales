// SPDX-License-Identifier: Apache-2.0
/**
 * The generated blocks of a mechanic's README (docs/MECHANIC-README.md), computed from the mechanic's head, its
 * prompt files and the manifests of the games: what a reader would otherwise have to dig out of the code.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readManifest, type HeadView, type LoadedMechanic, type ServiceView } from "./head.ts";
import { cell, code, fieldLine, fieldsOf, isRecord, outputText, plain, table } from "./schema-text.ts";

/** What the blocks of one README are computed against. */
export interface DocsContext {
	readonly root: string;
	/** Every mechanic of the repository. */
	readonly mechanics: readonly LoadedMechanic[];
	/** The game folders under `games/` by the name of each package they depend on. */
	readonly games: ReadonlyMap<string, readonly string[]>;
}

/**
 * Builds the context: the mechanics and which game depends on which package.
 *
 * @param root - The repository root.
 * @param mechanics - The loaded mechanics.
 * @returns The context.
 */
export function docsContext(root: string, mechanics: readonly LoadedMechanic[]): DocsContext {
	const games = new Map<string, string[]>();
	const base = join(root, "games");
	for (const folder of existsSync(base) ? readdirSync(base).sort((a, b) => a.localeCompare(b, "en")) : []) {
		const dependencies = readManifest(join(base, folder, "package.json"))?.dependencies;
		for (const name of isRecord(dependencies) ? Object.keys(dependencies) : []) games.set(name, [...(games.get(name) ?? []), folder]);
	}
	return { root, mechanics, games };
}

function mechanicLink(ctx: DocsContext, id: string): string {
	const folder = ctx.mechanics.find((mechanic) => mechanic.head.id === id)?.folder;
	return folder === undefined ? code(id) : `[${id}](../${folder}/README.md)`;
}

function providersOf(ctx: DocsContext, service: string): readonly string[] {
	return ctx.mechanics.filter((mechanic) => mechanic.head.provides.some((provided) => provided.name === service)).map((mechanic) => mechanic.head.id);
}

function serviceList(ctx: DocsContext, services: readonly ServiceView[]): string {
	if (services.length === 0) return "none";
	return services
		.map((service) => {
			const by = providersOf(ctx, service.name);
			return by.length === 0 ? code(service.name) : `${code(service.name)} (from ${by.map((id) => mechanicLink(ctx, id)).join(", ")})`;
		})
		.join(", ");
}

function gamesLine(ctx: DocsContext, packageName: string): string {
	const games = ctx.games.get(packageName) ?? [];
	return games.length === 0 ? "none of the games in this repository" : games.map((folder) => `[${folder}](../../games/${folder}/README.md)`).join(", ");
}

function glanceBlock(ctx: DocsContext, mechanic: LoadedMechanic): string {
	const head = mechanic.head;
	return table(["", ""], [
		["Package", code(mechanic.packageName)],
		["Id", code(head.id)],
		["Summary", cell(head.summary)],
		["Requires", cell(serviceList(ctx, head.requires))],
		["Uses when loaded", cell(serviceList(ctx, head.uses))],
		["Provides", head.provides.length === 0 ? "none" : head.provides.map((service) => code(service.name)).join(", ")],
		["State", head.state === undefined ? "none" : `kept, snapshot slice version ${head.version}`],
		["Games", gamesLine(ctx, mechanic.packageName)],
	]);
}

/** A prompt file's text without its frontmatter, and its path relative to the README's folder; `undefined` without a file. */
function promptOf(ctx: DocsContext, folder: string, id: string): { readonly body: string; readonly path: string } | undefined {
	const path = `prompts/${id}.md`;
	const file = join(ctx.root, "mechanics", folder, path);
	if (!existsSync(file)) return undefined;
	const lines = readFileSync(file, "utf8").split("\n");
	const end = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
	return { body: lines.slice(end + 1).join("\n").trim(), path };
}

function quote(text: string): string {
	return text
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`))
		.join("\n");
}

function fieldTable(title: string, schema: unknown, none: string): string {
	const fields = fieldsOf(plain(schema), 2);
	if (fields.length === 0) return none;
	return table([title, "Type", "Required", "Description"], fields.map((field) => [code(field.name), cell(field.type), field.required ? "yes" : "no", cell(field.description)]));
}

/** What the caller of a tool reads: the prompt file when the description is a prompt id of the head, else the text itself. */
function descriptionOf(ctx: DocsContext, mechanic: LoadedMechanic, description: string): string {
	if (!(description in mechanic.head.prompts)) return `What the caller reads:\n\n${quote(description)}`;
	const prompt = promptOf(ctx, mechanic.folder, description);
	return prompt === undefined ? `Description prompt ${code(description)} (no file found).` : `What the caller reads ([${description}](${prompt.path})):\n\n${quote(prompt.body)}`;
}

function toolsBlock(ctx: DocsContext, mechanic: LoadedMechanic): string {
	const parts = mechanic.head.tools.map((tool) => {
		const facts = [`- Granted when the game lists no grants: ${tool.for.length === 0 ? "no one (the game grants it by name)" : tool.for.map(code).join(", ")}`];
		if (tool.free) facts.push("- Free: a read-only look that counts no step");
		return [`### ${code(tool.name)}`, "", ...facts, "", fieldTable("Parameter", tool.parameters, "No parameters."), "", descriptionOf(ctx, mechanic, tool.description)].join("\n");
	});
	return parts.length === 0 ? "This mechanic declares no tools." : parts.join("\n\n");
}

function eventsBlock(head: HeadView): string {
	const types = Object.entries(head.events);
	if (types.length === 0) return "This mechanic writes no events of its own.";
	return types
		.map(([type, schema]) => {
			const audience = head.audiences[type];
			return [`### ${code(type)}`, "", `Audience: ${audience === undefined ? "everyone" : audience.map(code).join(", ")}`, "", fieldTable("Field", schema, "No fields.")].join("\n");
		})
		.join("\n\n");
}

function optionsBlock(head: HeadView): string {
	const fields = fieldsOf(plain(head.options), 3);
	if (fields.length === 0) return "This mechanic takes no options.";
	return table(
		["Option", "Type", "Default", "Description"],
		fields.map((field) => [code(field.name), cell(field.type), field.defaultText === undefined ? (field.required ? "required" : "unset") : cell(code(field.defaultText)), cell(field.description)]),
	);
}

function serviceBlock(service: ServiceView): string {
	const rows = Object.entries(service.methods).map(([name, method]) => [code(name), method.kind, cell(fieldLine(plain(method.input))), cell(outputText(plain(method.output))), cell(method.summary)]);
	return [`### ${code(service.name)}`, "", service.summary, "", table(["Method", "Kind", "Input", "Output", "Summary"], rows)].join("\n");
}

function servicesBlock(head: HeadView): string {
	return head.provides.length === 0 ? "This mechanic provides no service to other mechanics." : head.provides.map(serviceBlock).join("\n\n");
}

function metricsBlock(head: HeadView): string {
	if (head.metrics.length === 0) return "This mechanic exports no metrics.";
	const rows = head.metrics.map((metric) => [code(`${head.id}.${metric.id}`), cell(metric.title), cell(metric.unit ?? "-"), metric.reads.map(code).join(", ")]);
	return ["Each number is computed from the mechanic's own events of one finished run; a run without a value reads \"absent\", never zero.", "", table(["Metric", "Title", "Unit", "Computed from"], rows)].join("\n");
}

function promptsBlock(ctx: DocsContext, mechanic: LoadedMechanic): string {
	const keys = Object.entries(mechanic.head.prompts);
	if (keys.length === 0) return "This mechanic has no prompt files.";
	const rows = keys.map(([key, variables]) => {
		const prompt = promptOf(ctx, mechanic.folder, key);
		return [prompt === undefined ? `${code(key)} (no file found)` : `[${key}](${prompt.path})`, variables.length === 0 ? "-" : variables.map(code).join(", ")];
	});
	return table(["Prompt", "Variables"], rows);
}

/**
 * Computes the generated blocks of one mechanic's README.
 *
 * @param ctx - The context.
 * @param mechanic - The mechanic.
 * @returns The text of each block, by block name.
 */
export function mechanicBlocks(ctx: DocsContext, mechanic: LoadedMechanic): Readonly<Record<string, string>> {
	return {
		glance: glanceBlock(ctx, mechanic),
		tools: toolsBlock(ctx, mechanic),
		events: eventsBlock(mechanic.head),
		options: optionsBlock(mechanic.head),
		services: servicesBlock(mechanic.head),
		metrics: metricsBlock(mechanic.head),
		prompts: promptsBlock(ctx, mechanic),
	};
}
