// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tutorials gate (M6-12, `13-m6-spec.md` 3.5): every fenced code block of a tutorial in `docs/tutorials/` is an
 * include of a file of a sample, or is marked `no-test` with its reason (the info string ```` ```sh no-test: <reason>
 * ````). A block is an include when its lines stand, in one piece, in the file that the last link before it names,
 * and that file lies in a sample: a folder of `samples/`, or `games/hello/` (sample 1). Every sample a tutorial links
 * must have its tutorial test, `test/tutorial.test.ts`, which runs what the tutorial shows. With it the first-hour
 * tutorials pass when the tutorial tests of samples 1 to 6 pass (1.0 line 6).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";
import { listFiles, readText, REPO_ROOT } from "../lib/files.ts";

/** The folder of a sample a repository path lies in, or undefined: `samples/<name>` or sample 1, `games/hello`. */
function sampleOf(path: string): string | undefined {
	return /^(samples\/[^/]+|games\/hello)\//.exec(path)?.[1];
}

/** One fenced block: its info string, its lines, and the repository path the last link before it names. */
interface Block {
	readonly line: number;
	readonly info: string;
	readonly lines: readonly string[];
	readonly link: string | undefined;
}

/** The repository paths of the relative links of a text of the tutorial at `path`, anchors left out. */
function linksOf(path: string, text: string): readonly string[] {
	return [...text.matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+)(?:#[^)]*)?\)/g)].map((match) => posix.normalize(posix.join(posix.dirname(path), match[1] ?? "")));
}

/**
 * The fenced blocks of a tutorial, each with the last link before it that names a file of a sample.
 *
 * @param path - The tutorial's repository path, which relative links start from.
 * @param text - The tutorial.
 * @returns The blocks in their order.
 */
function blocksOf(path: string, text: string): readonly Block[] {
	const parts = text.split(/^```/m);
	return parts.flatMap((part, index) => {
		if (index % 2 === 0) return [];
		const prose = parts.filter((_, at) => at < index && at % 2 === 0).join("");
		const line = parts.slice(0, index).join("```").split("\n").length;
		const [info = "", ...rest] = part.split("\n");
		return [{ line, info: info.trim(), lines: rest.slice(0, -1), link: linksOf(path, prose).filter((link) => sampleOf(link) !== undefined).at(-1) }];
	});
}

/** The lines of a repository file, or none when it is no file. */
function fileLines(path: string): readonly string[] {
	const full = join(REPO_ROOT, path);
	return existsSync(full) && statSync(full).isFile() ? readFileSync(full, "utf8").trimEnd().split("\n") : [];
}

/** True when `part` stands in `whole` as consecutive lines. */
const within = (part: readonly string[], whole: readonly string[]): boolean => part.length > 0 && whole.some((_, at) => part.every((line, offset) => whole[at + offset] === line));

/** The reason of a `no-test` block, empty when it gives none; undefined for a block that is not marked. */
const noTestReason = (info: string): string | undefined => /(?:^|\s)no-test(?::\s*(.*))?$/.exec(info)?.[1]?.trim() ?? (/(?:^|\s)no-test\b/.test(info) ? "" : undefined);

/**
 * What is wrong with a tutorial: a free block, a `no-test` block without a reason, a sample without a tutorial test.
 *
 * @param path - The tutorial's repository path.
 * @param text - The tutorial.
 * @param hasTest - Whether a sample folder holds its tutorial test.
 * @returns One line per problem, empty when the tutorial passes.
 */
function problemsOf(path: string, text: string, hasTest: (sample: string) => boolean): readonly string[] {
	const blocks = blocksOf(path, text).flatMap((block) => {
		const reason = noTestReason(block.info);
		if (reason !== undefined) return reason === "" ? [`${path}:${String(block.line)}: a no-test block gives no reason`] : [];
		if (block.link !== undefined && within(block.lines, fileLines(block.link))) return [];
		return [`${path}:${String(block.line)}: the block is no include of ${block.link ?? "a file of a sample"} and is not marked no-test`];
	});
	const samples = [...new Set(linksOf(path, text).flatMap((link) => sampleOf(link) ?? []))];
	return [...blocks, ...samples.filter((sample) => !hasTest(sample)).map((sample) => `${path}: names ${sample}, which has no test/tutorial.test.ts`)];
}

const TUTORIALS = listFiles("docs/tutorials", (path) => path.endsWith(".md"));
const hasTutorialTest = (sample: string): boolean => existsSync(join(REPO_ROOT, sample, "test", "tutorial.test.ts"));
const FIXTURE_PATH = "docs/tutorials/fixture.md";

describe("the tutorials gate", () => {
	it("reads the four tutorials, the game tutorial among them", () => {
		expect(TUTORIALS).toEqual(expect.arrayContaining(["docs/tutorials/game.md", "docs/tutorials/mechanic.md", "docs/tutorials/director.md", "docs/tutorials/scheduler.md"]));
		expect(TUTORIALS.reduce((sum, path) => sum + blocksOf(path, readText(path)).length, 0)).toBeGreaterThan(40);
	});

	it.each(TUTORIALS)("%s holds only includes of a sample and no-test blocks, and every sample it names has its tutorial test", (path) => {
		expect(problemsOf(path, readText(path), hasTutorialTest)).toEqual([]);
	});

	it("the game tutorial teaches from samples 1 to 4", () => {
		const named = new Set(blocksOf("docs/tutorials/game.md", readText("docs/tutorials/game.md")).flatMap((block) => (block.link === undefined ? [] : [sampleOf(block.link)])));
		expect([...named].sort()).toEqual(["games/hello", "samples/roles", "samples/shipped-director", "samples/team-game"]);
	});

	it("fails on a fixture tutorial with a free code block, a no-test block without reason, and a sample without its tutorial test", () => {
		const free = "Sample 2, [`game.ts`](../../samples/team-game/game.ts):\n\n```ts\nconst a = 1;\n```\n";
		expect(problemsOf(FIXTURE_PATH, free, hasTutorialTest)).toEqual([`${FIXTURE_PATH}:3: the block is no include of samples/team-game/game.ts and is not marked no-test`]);
		expect(problemsOf(FIXTURE_PATH, "No link.\n\n```sh\nswt run x\n```\n", hasTutorialTest)).toEqual([`${FIXTURE_PATH}:3: the block is no include of a file of a sample and is not marked no-test`]);
		expect(problemsOf(FIXTURE_PATH, "```sh no-test\nswt run x\n```\n", hasTutorialTest)).toEqual([`${FIXTURE_PATH}:1: a no-test block gives no reason`]);
		expect(problemsOf(FIXTURE_PATH, "[s](../../samples/team-game/README.md)\n", () => false)).toEqual([`${FIXTURE_PATH}: names samples/team-game, which has no test/tutorial.test.ts`]);
	});

	it("passes an include, sample 1's file among them, and a no-test block with its reason", () => {
		const game = fileLines("games/hello/game.ts").slice(1, 3).join("\n");
		const text = `Sample 1, [\`game.ts\`](../../games/hello/game.ts#top):\n\n\`\`\`ts\n${game}\n\`\`\`\n\n\`\`\`sh no-test: a live run asks a model and costs money\nswt run x\n\`\`\`\n`;
		expect(problemsOf(FIXTURE_PATH, text, hasTutorialTest)).toEqual([]);
	});
});
