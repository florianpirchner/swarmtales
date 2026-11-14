// SPDX-License-Identifier: Apache-2.0
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

/**
 * Exported identifiers that may hold a retired word, each with its reason. Empty at the start; an entry needs an
 * issue.
 */
export const ALLOWED_IDENTIFIERS: ReadonlySet<string> = new Set<string>();

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
 * left out, because it quotes code.
 *
 * @param text - A Markdown text.
 * @returns The hits, each with its line.
 */
export function retiredProse(text: string): readonly WordHit[] {
	const listed = new Set(RETIRED.filter((entry) => entry.inProse).map((entry) => entry.word));
	return findWords(text.replace(/`[^`\n]*`/g, (quoted) => " ".repeat(quoted.length)), listed);
}
