// SPDX-License-Identifier: Apache-2.0
/**
 * The README files of the mechanics: hand-written sections and generated blocks between markers
 * (`<!-- generated:tools -->` ... `<!-- /generated:tools -->`). This file writes the blocks into a README and says
 * what is wrong with one: a missing file, section or marker, a placeholder, a stale block.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { docsContext, mechanicBlocks } from "./blocks.ts";
import { loadMechanics } from "./head.ts";

/** One section of the README; `generated` names the block the section holds. */
export interface Section {
	readonly heading: string;
	readonly generated?: string;
}

/** The README's sections in order. */
export const MECHANIC_SECTIONS: readonly Section[] = [
	{ heading: "At a glance", generated: "glance" },
	{ heading: "How it plays" },
	{ heading: "Tools", generated: "tools" },
	{ heading: "Events", generated: "events" },
	{ heading: "Options", generated: "options" },
	{ heading: "Services", generated: "services" },
	{ heading: "Metrics", generated: "metrics" },
	{ heading: "Prompts", generated: "prompts" },
	{ heading: "Example" },
	{ heading: "Lessons and loopholes" },
	{ heading: "Tests" },
];

/** What a hand-written section holds until someone writes it; the check refuses it. */
export const PLACEHOLDER = "_To be written._";

const open = (name: string): string => `<!-- generated:${name} -->`;
const close = (name: string): string => `<!-- /generated:${name} -->`;
const NOTE = "<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->";

function blockText(name: string, body: string): string {
	return `${open(name)}\n${NOTE}\n\n${body}\n\n${close(name)}`;
}

/**
 * Builds a new README with every section, the hand-written ones as placeholders.
 *
 * @param title - The title.
 * @param blocks - The generated blocks by name.
 * @returns The README text.
 */
export function skeleton(title: string, blocks: Readonly<Record<string, string>>): string {
	const parts = [`# ${title}`, "", PLACEHOLDER, ""];
	for (const section of MECHANIC_SECTIONS) {
		parts.push(`## ${section.heading}`, "", section.generated === undefined ? PLACEHOLDER : blockText(section.generated, blocks[section.generated] ?? ""), "");
	}
	return `${parts.join("\n").trimEnd()}\n`;
}

/**
 * Replaces every generated block of a README by its current text. A block without markers is left out; the check reports it.
 *
 * @param readme - The README text.
 * @param blocks - The generated blocks by name.
 * @returns The README with current blocks; text outside the markers is untouched.
 */
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

function sectionProblems(file: string, lines: readonly string[]): readonly string[] {
	const problems: string[] = [];
	if (lines[0]?.startsWith("# ") !== true) problems.push(`${file}: the first line is not the title (\`# Name\`)`);
	const wanted = MECHANIC_SECTIONS.map((section) => section.heading);
	const present = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim()).filter((heading) => wanted.includes(heading));
	for (const heading of wanted) if (!present.includes(heading)) problems.push(`${file}: no section "## ${heading}"`);
	if (present.join("|") !== wanted.filter((heading) => present.includes(heading)).join("|")) problems.push(`${file}: the sections are not in the order of docs/MECHANIC-README.md`);
	const first = lines.findIndex((line) => line.startsWith("## "));
	if (lines.slice(1, first < 0 ? lines.length : first).join("\n").trim() === "") problems.push(`${file}: no paragraph under the title`);
	return problems;
}

/**
 * Says what is wrong with a README: missing or misordered sections, placeholders, missing markers, stale blocks.
 *
 * @param file - The file's name, for the messages.
 * @param readme - The README text.
 * @param blocks - The current generated blocks by name.
 * @returns The problems; empty for a current README.
 */
export function readmeProblems(file: string, readme: string, blocks: Readonly<Record<string, string>>): readonly string[] {
	const problems = [...sectionProblems(file, readme.split("\n"))];
	if (readme.includes(PLACEHOLDER)) problems.push(`${file}: a section still says "${PLACEHOLDER}"`);
	for (const section of MECHANIC_SECTIONS) {
		const name = section.generated;
		if (name === undefined) continue;
		if (blocks[name] === undefined) problems.push(`${file}: the generator computed no block "${name}"`);
		const start = readme.indexOf(open(name));
		if (start < 0 || readme.indexOf(close(name)) < start) problems.push(`${file}: no generated block "${name}" (markers ${open(name)} ... ${close(name)})`);
	}
	if (problems.length === 0 && withBlocks(readme, blocks) !== readme) problems.push(`${file}: a generated block is stale; run \`pnpm docs:mechanics\``);
	return problems;
}

/** One README the generator owns. */
export interface ReadmeTarget {
	/** The folder under `mechanics/`. */
	readonly folder: string;
	/** The README's path, relative to the root. */
	readonly file: string;
	readonly blocks: Readonly<Record<string, string>>;
}

/**
 * Lists every README the generator owns, one per mechanic folder, with its current blocks.
 *
 * @param root - The repository root.
 * @returns The targets, sorted by folder.
 * @throws TypeError when no mechanic is found or a head cannot be read.
 */
export async function readmeTargets(root: string): Promise<readonly ReadmeTarget[]> {
	const mechanics = await loadMechanics(root);
	const ctx = docsContext(root, mechanics);
	return mechanics.map((mechanic) => ({ folder: mechanic.folder, file: `mechanics/${mechanic.folder}/README.md`, blocks: mechanicBlocks(ctx, mechanic) }));
}

/**
 * Checks every mechanic README of a repository.
 *
 * @param root - The repository root.
 * @returns The problems; empty when every README exists and is current.
 * @throws TypeError when no mechanic is found or a head cannot be read.
 */
export async function docsProblems(root: string): Promise<readonly string[]> {
	const targets = await readmeTargets(root);
	return targets.flatMap((target) => {
		const path = join(root, target.file);
		return existsSync(path) ? readmeProblems(target.file, readFileSync(path, "utf8"), target.blocks) : [`${target.file}: missing; run \`pnpm docs:mechanics\``];
	});
}
