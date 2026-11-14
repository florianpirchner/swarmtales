/**
 * `oracles/mechanics/<id>.md`: for every mechanic an oracle file loads, what its README said when the files were
 * written: how it plays, its tools with their parameters and descriptions, its events with their payload fields and
 * its options. The oracle files name tools, events and options; these pages say what they mean once the old
 * `mechanics/` folder is gone. Links are flattened to their text, since their targets are not part of the oracle set.
 */
import { existsSync, globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const KEPT = ["How it plays", "Tools", "Events", "Options"];

/** The ids of the mechanics the oracle files load, sorted. */
export function loadedMechanics(root: string): readonly string[] {
	const ids = new Set<string>();
	for (const file of globSync("*/*.json", { cwd: resolve(root, "oracles") })) {
		// The head of a file comes before its timeline; the ids are read from it without parsing the whole file.
		const head = readFileSync(resolve(root, "oracles", file), "utf8").split('"timeline": [')[0] ?? "";
		const mechanics = /"mechanics": \[([\s\S]*?)\n\t\t\],/.exec(head)?.[1] ?? "";
		for (const match of mechanics.matchAll(/^\t\t\t\t"id": "([^"]+)"/gm)) ids.add(match[1] ?? "");
	}
	return [...ids].sort();
}

/** The page of one mechanic, or `undefined` when it has no README. */
export function mechanicPage(root: string, id: string): string | undefined {
	const path = resolve(root, "mechanics", id, "README.md");
	if (!existsSync(path)) return undefined;
	const text = readFileSync(path, "utf8");
	const [intro = "", ...sections] = text.split(/^## /m);
	const kept = sections.filter((section) => KEPT.some((title) => section.startsWith(`${title}\n`)));
	const page = [intro.trimEnd(), `Copied from \`mechanics/${id}/README.md\` by \`scripts/export-oracles.ts\`; do not edit.`, ...kept.map((section) => `## ${section.trimEnd()}`)].join("\n\n");
	const flat = page
		.replace(/<!--[\s\S]*?-->\n?/g, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/\n{3,}/g, "\n\n");
	return `${flat}\n`;
}

export interface DerivedFile {
	readonly path: string;
	readonly text: string;
}

export function mechanicPages(root: string): readonly DerivedFile[] {
	return loadedMechanics(root).flatMap((id) => {
		const text = mechanicPage(root, id);
		return text === undefined ? [] : [{ path: `oracles/mechanics/${id}.md`, text }];
	});
}
