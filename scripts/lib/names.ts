// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The name lint (issue 15): the words that the glossary retired do not come back, in exported identifiers and in
 * the prose of the docs. `docs/GLOSSARY.md` lists the same words for readers; a test keeps the two in step.
 */
import ts from "typescript";
import { findWords, type WordHit } from "./words.ts";

/** A retired word and the word to use instead. `inProse` is false for words that are ordinary English in a sentence. */
export interface RetiredWord {
	readonly word: string;
	readonly use: string;
	readonly inProse: boolean;
}

/** The retired words. */
export const RETIRED: readonly RetiredWord[] = [
	{ word: "overseer", use: "Director", inProse: true },
	{ word: "competitor", use: "Resident", inProse: true },
	{ word: "story", use: "Game (story is only the narrative written from a run)", inProse: false },
	{ word: "module", use: "Mechanic", inProse: false },
	{ word: "host", use: "kernel", inProse: false },
	{ word: "core", use: "kernel", inProse: false },
	{ word: "api", use: "service (for what one mechanic offers to another)", inProse: false },
	{ word: "capability", use: "service", inProse: false },
	{ word: "minute", use: "tick", inProse: false },
	{ word: "arena", use: "Swarm Tales (environment names start with SWT_)", inProse: false },
];

/** A retired id of the rename of original games (`13-m6-spec.md` 4.2, 4.4): the old mechanic or game id, its old package and the id to use. */
export interface RetiredId {
	readonly kind: "mechanic" | "game";
	readonly id: string;
	readonly pkg: string;
	readonly use: string;
}

/**
 * The retired ids of the rename (issue M6-06), a list of their own beside `RETIRED`, whose words the glossary lists.
 * An old id may still stand only where an exception of the rename keeps it (oracle files, run data, carried docs, the
 * records, paths of the old platform, random labels, prompt texts; `scripts/rename/table.ts`).
 */
export const RETIRED_IDS: readonly RetiredId[] = [
	{ kind: "mechanic", id: "grid-game", pkg: "@swarmtales/mechanic-grid-game", use: "grid" },
	{ kind: "mechanic", id: "draft-rounds", pkg: "@swarmtales/mechanic-draft-rounds", use: "quarry" },
	{ kind: "mechanic", id: "clue-grid", pkg: "@swarmtales/mechanic-clue-grid", use: "lanterns" },
	{ kind: "mechanic", id: "hint-towers", pkg: "@swarmtales/mechanic-hint-towers", use: "harbor-lights" },
	{ kind: "mechanic", id: "trick-play", pkg: "@swarmtales/mechanic-trick-play", use: "ember-tricks" },
	{ kind: "mechanic", id: "sealed-auction", pkg: "@swarmtales/mechanic-sealed-auction", use: "blind-bid" },
	{ kind: "mechanic", id: "econ-games", pkg: "@swarmtales/mechanic-econ-games", use: "econ-lab" },
	{ kind: "game", id: "tictactoe-teams", pkg: "@swarmtales/game-tictactoe-teams", use: "tictactoe" },
	{ kind: "game", id: "morris-teams", pkg: "@swarmtales/game-morris-teams", use: "morris" },
];

/**
 * Exported identifiers that may hold a retired word, each with its reason. Empty at the start; an entry needs an
 * issue.
 */
export const ALLOWED_IDENTIFIERS: ReadonlySet<string> = new Set<string>();

/**
 * The list of carried texts: sentences of prompt files carried byte for byte from the old platform that hold a
 * retired word (12-m5-spec.md 2.5, rule 7). The prose lint leaves them out wherever they stand, in the prompt file
 * and in a generated README that quotes it. An entry names its file and its issue.
 */
export const CARRIED_TEXTS: readonly string[] = [
	// mechanics/channels/prompts/channels/tools/addGroupMember.md, M5-13
	"Adds a competitor to a group you founded.",
	// mechanics/ledger/prompts/ledger/tools/transferPoints.md, M5-80 (A94, J231)
	"Transfers points to another competitor.",
	// mechanics/channels/prompts/channels/tools/sendDM.md, M5-80 (A94, J231)
	"Sends a private message to another competitor.",
	// The condition kind of the City's rules (`oracles/cityofkeys/setup/*.story.json`), in mechanics/script/mechanic-script.api.md, M5-31
	"competitorsAtLevel",
];

const use = (word: string): string => RETIRED.find((entry) => entry.word === word)?.use ?? "";

const isExported = (node: ts.Node): boolean =>
	ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

/** The names a declaration statement introduces. */
function declaredNames(statement: ts.Statement): readonly string[] {
	if (ts.isVariableStatement(statement)) {
		return statement.declarationList.declarations.flatMap((declaration) => (ts.isIdentifier(declaration.name) ? [declaration.name.text] : []));
	}
	const named =
		ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
		ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement);
	return named && statement.name !== undefined ? [statement.name.text] : [];
}

function exportedNames(text: string): readonly string[] {
	const source = ts.createSourceFile("names.ts", text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
	return source.statements.flatMap((statement) => {
		if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
			const clause = statement.exportClause;
			return ts.isNamedExports(clause) ? clause.elements.map((element) => element.name.text) : [clause.name.text];
		}
		return isExported(statement) ? declaredNames(statement) : [];
	});
}

/**
 * Finds retired words in the exported identifiers of a source text.
 *
 * @param text - The source text of one file.
 * @returns One message per identifier and retired word.
 */
export function retiredExports(text: string): readonly string[] {
	const listed = new Set(RETIRED.map((entry) => entry.word));
	return exportedNames(text)
		.filter((name) => !ALLOWED_IDENTIFIERS.has(name))
		.flatMap((name) => findWords(name, listed).map((hit) => `the export "${name}" uses the retired word "${hit.word}"; use ${use(hit.word)}`));
}

/**
 * Finds retired words in prose. Only the words that have no everyday meaning are checked; text in backticks is
 * left out, because it quotes code, and so is every text of `CARRIED_TEXTS`.
 *
 * @param text - A Markdown text.
 * @returns The hits, each with its line.
 */
export function retiredProse(text: string): readonly WordHit[] {
	const listed = new Set(RETIRED.filter((entry) => entry.inProse).map((entry) => entry.word));
	const blank = (quoted: string): string => " ".repeat(quoted.length);
	const prose = CARRIED_TEXTS.reduce((rest, carried) => rest.split(carried).join(blank(carried)), text.replace(/`[^`\n]*`/g, blank));
	return findWords(prose, listed);
}
