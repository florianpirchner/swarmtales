// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The generated blocks of `GAMES.md` (`<!-- generated:overview -->` ... `<!-- /generated:overview -->`): the count
 * of the games that run, the overview table and the families of the old platform with their ported marks. This file
 * writes the blocks and says what is wrong with the catalogue: a missing marker, a stale block, a game without a
 * card or without its facts, a card without a game, a card over 20 lines.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CARDS, FAMILIES, type CardFacts } from "./catalogue.ts";
import type { GameHead } from "./head.ts";

/** The generated blocks, in the order they stand in `GAMES.md`. */
export const BLOCKS = ["status", "overview", "families"] as const;

/** The headings of `GAMES.md` that are no card. */
export const FRAME_HEADINGS: readonly string[] = ["Overview", "The games of the old platform"];

/** A card may have this many lines, its heading included (DECISIONS section 4). */
export const CARD_LINES = 20;

const open = (name: string): string => `<!-- generated:${name} -->`;
const close = (name: string): string => `<!-- /generated:${name} -->`;
const NOTE = "<!-- Written by `pnpm docs:games` from games/index.ts, the game files and scripts/game-docs/catalogue.ts; edit those, not this block. -->";
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** A count as a word, as the prose of the catalogue writes it. */
export const word = (count: number): string => WORDS[count] ?? String(count);
const capital = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
const code = (names: readonly string[]): string => (names.length === 0 ? "none" : names.map((name) => `\`${name}\``).join(", "));
/** The anchor GitHub gives a heading. */
export const anchor = (title: string): string => title.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
const familyOf = (folder: string): string | undefined => FAMILIES.find((entry) => entry.games.some((game) => game.folder === folder))?.family;

function oracleCount(root: string, folder: string): number {
	const path = join(root, "oracles", folder);
	return existsSync(path) ? readdirSync(path).filter((file) => file.endsWith(".json")).length : 0;
}

function row(root: string, head: GameHead, facts: CardFacts): string {
	const family = facts.family ?? familyOf(head.folder)?.toLowerCase() ?? "?";
	const residents = facts.residents === undefined ? String(head.residents) : `${head.residents} ${facts.residents}`;
	const params = head.params === undefined ? "none" : `a game family: ${code(head.params)}`;
	const oracles = facts.oracles === undefined ? [] : [`${word(oracleCount(root, facts.oracles))} oracle files match at level 3`];
	const proof = [...oracles, ...(facts.proof === undefined ? [] : [facts.proof])].join("; ");
	return `| [${facts.title}](#${anchor(facts.title)}) | ${family} | ${residents} | ${code(head.mechanics)} | ${code(head.directors)} | ${params} | ${proof} |`;
}

function familiesBlock(running: ReadonlySet<string>): string {
	const all = FAMILIES.flatMap((entry) => entry.games);
	const ported = all.filter((game) => running.has(game.folder)).length;
	const lines = [
		`${capital(word(ported))} of the ${word(all.length)} are ported so far, marked in bold, each with its card above.`,
		"",
		"| Family | Games |",
		"|---|---|",
	];
	for (const entry of FAMILIES) {
		const games = entry.games.map((game) => {
			const title = CARDS[game.folder]?.title;
			return running.has(game.folder) && title !== undefined ? `**[${title}](#${anchor(title)})**` : game.name;
		});
		lines.push(`| ${entry.family} | ${games.join(", ")} |`);
	}
	return lines.join("\n");
}

/**
 * Computes the generated blocks of `GAMES.md`.
 *
 * @param root - The repository root, for the oracle folders.
 * @param heads - The heads of the games on the list, in its order.
 * @returns The blocks by name; a game without facts in the catalogue gets no row (the check reports it).
 */
export function gameBlocks(root: string, heads: readonly GameHead[]): Readonly<Record<(typeof BLOCKS)[number], string>> {
	const running = new Set(heads.map((head) => head.folder));
	const ported = FAMILIES.flatMap((entry) => entry.games).filter((game) => running.has(game.folder)).length;
	const rows = heads.flatMap((head) => {
		const facts = CARDS[head.folder];
		return facts === undefined ? [] : [row(root, head, facts)];
	});
	return {
		status: `${capital(word(heads.length))} games run on the new platform today, ${word(ported)} of them ports of the games of the old platform.`,
		overview: ["| Game | Family | Residents | Mechanics | Directors | Params | How it is proven |", "|---|---|---|---|---|---|---|", ...rows].join("\n"),
		families: familiesBlock(running),
	};
}

/**
 * Replaces every generated block of the catalogue by its current text; text outside the markers is untouched.
 *
 * @param text - The text of `GAMES.md`.
 * @param blocks - The blocks by name.
 * @returns The text with current blocks; a block without markers is left out (the check reports it).
 */
export function withBlocks(text: string, blocks: Readonly<Record<string, string>>): string {
	let result = text;
	for (const [name, body] of Object.entries(blocks)) {
		const start = result.indexOf(open(name));
		const end = result.indexOf(close(name));
		if (start < 0 || end < start) continue;
		result = `${result.slice(0, start)}${open(name)}\n${NOTE}\n\n${body}\n\n${close(name)}${result.slice(end + close(name).length)}`;
	}
	return result;
}

function cardProblems(text: string, heads: readonly GameHead[]): readonly string[] {
	const lines = text.split("\n");
	const starts = lines.flatMap((line, index) => (line.startsWith("## ") ? [index] : []));
	const cards = new Map(starts.map((start, i) => [lines[start]?.slice(3).trim() ?? "", lines.slice(start, starts[i + 1] ?? lines.length).join("\n").trimEnd()]));
	const titles = new Set(heads.map((head) => CARDS[head.folder]?.title));
	const problems = [...cards.keys()].filter((title) => !FRAME_HEADINGS.includes(title) && !titles.has(title)).map((title) => `GAMES.md: the card "${title}" is no game of games/index.ts`);
	for (const head of heads) {
		const facts = CARDS[head.folder];
		const card = facts === undefined ? undefined : cards.get(facts.title);
		if (facts === undefined) problems.push(`scripts/game-docs/catalogue.ts: no card facts for games/${head.folder}`);
		else if (card === undefined) problems.push(`GAMES.md: no card "## ${facts.title}" for games/${head.folder}`);
		else {
			if (!card.includes(`(games/${head.folder}/)`)) problems.push(`GAMES.md: the card "${facts.title}" has no link to games/${head.folder}/`);
			if (facts.oracles !== undefined && !card.includes(`(oracles/${facts.oracles}/)`)) problems.push(`GAMES.md: the card "${facts.title}" has no link to oracles/${facts.oracles}/`);
			if (card.split("\n").length > CARD_LINES) problems.push(`GAMES.md: the card "${facts.title}" has more than ${CARD_LINES} lines`);
		}
	}
	return problems;
}

function oracleProblems(root: string, heads: readonly GameHead[]): readonly string[] {
	return heads.flatMap((head) => {
		const folder = CARDS[head.folder]?.oracles;
		return folder !== undefined && oracleCount(root, folder) === 0 ? [`scripts/game-docs/catalogue.ts: games/${head.folder}: oracles/${folder}/ holds no oracle file`] : [];
	});
}

/**
 * Says what is wrong with `GAMES.md`: no game, a missing marker, a stale block, a missing or foreign card.
 *
 * @param root - The repository root, for the oracle folders.
 * @param text - The text of `GAMES.md`.
 * @param heads - The heads of the games on the list.
 * @returns The problems; empty for a current catalogue.
 */
export function catalogueProblems(root: string, text: string, heads: readonly GameHead[]): readonly string[] {
	if (heads.length === 0) return ["games/index.ts: no game on the list, so the catalogue has nothing to show"];
	const problems = [...cardProblems(text, heads)];
	for (const name of BLOCKS) {
		const start = text.indexOf(open(name));
		if (start < 0 || text.indexOf(close(name)) < start) problems.push(`GAMES.md: no generated block "${name}" (markers ${open(name)} ... ${close(name)})`);
	}
	problems.push(...oracleProblems(root, heads));
	if (problems.length === 0 && withBlocks(text, gameBlocks(root, heads)) !== text) problems.push("GAMES.md: a generated block is stale; run `pnpm docs:games`");
	return problems;
}
