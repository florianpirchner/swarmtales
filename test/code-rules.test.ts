/**
 * Project rules (ARCHITECTURE §4) that hold even when the linter does not run:
 * English only, no `any`, no type assertions except `as const`, no non-null
 * assertions, no randomness or wall-clock time in engine code.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { STORIES } from "../stories/index.ts";
import { assertNever } from "@swarmtales/kernel";
import type { Action } from "@swarmtales/contracts";

const ROOT = process.cwd();
/** This file lists the forbidden patterns and words and is therefore exempt from the text scan. */
const SELF = join("test", "code-rules.test.ts");

function filesIn(directory: string, extensions: readonly string[]): readonly string[] {
	const found: string[] = [];
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) found.push(...filesIn(path, extensions));
		else if (extensions.some((extension) => entry.endsWith(extension))) found.push(path);
	}
	return found;
}

/** The code folders of the workspace: every package's and the app's `src`. */
const sourceDirectories = [...readdirSync("packages").map((name) => join("packages", name, "src")), join("apps", "cli", "src")];
const sourceFiles = sourceDirectories.flatMap((directory) => filesIn(directory, [".ts"]));
const typescriptFiles = [...sourceFiles, ...filesIn("stories", [".ts"]), ...filesIn("test", [".ts"])];

interface Offence {
	readonly file: string;
	readonly line: number;
	readonly rule: string;
	readonly text: string;
}

function scanAst(file: string, visit: (node: ts.Node, report: (rule: string) => void) => void): readonly Offence[] {
	const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	const offences: Offence[] = [];
	const walk = (node: ts.Node): void => {
		visit(node, (rule) => {
			const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
			offences.push({ file, line: line + 1, rule, text: node.getText(source).slice(0, 80) });
		});
		ts.forEachChild(node, walk);
	};
	walk(source);
	return offences;
}

function isConstAssertion(node: ts.AsExpression): boolean {
	return ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName) && node.type.typeName.text === "const";
}

function describeOffences(offences: readonly Offence[]): readonly string[] {
	return offences.map((offence) => `${offence.file}:${offence.line} ${offence.rule}: ${offence.text}`);
}

describe("project rules: types", () => {
	it("forbids any, type assertions other than `as const`, double casts and non-null assertions", () => {
		const offences = typescriptFiles.flatMap((file) =>
			scanAst(file, (node, report) => {
				if (node.kind === ts.SyntaxKind.AnyKeyword) report("any");
				if (ts.isAsExpression(node) && !isConstAssertion(node)) report("type assertion");
				if (ts.isAsExpression(node) && ts.isAsExpression(node.expression)) report("double cast");
				if (ts.isTypeAssertionExpression(node)) report("angle-bracket assertion");
				if (ts.isNonNullExpression(node)) report("non-null assertion");
			}),
		);
		expect(describeOffences(offences)).toEqual([]);
	});

	it("keeps engine code deterministic", () => {
		// The digest must give the same beats for the same log, so it is held to the same rule.
		const engineDirectories = [...["kernel", "engine", "contracts", "sdk"].map((name) => join("packages", name, "src")), join("packages", "chronicle", "src", "digest"), "stories"];
		const engineFiles = typescriptFiles.filter((file) => engineDirectories.some((directory) => file.startsWith(directory + sep)));
		expect(engineFiles.length).toBeGreaterThan(10);
		const offences = engineFiles.flatMap((file) =>
			scanAst(file, (node, report) => {
				if (ts.isPropertyAccessExpression(node)) {
					const target = node.expression.getText();
					const name = node.name.text;
					if (target === "Math" && name === "random") report("Math.random");
					if (target === "Date" && name === "now") report("Date.now");
					if (target === "performance" && name === "now") report("performance.now");
				}
				if (ts.isNewExpression(node) && node.expression.getText() === "Date") report("new Date");
			}),
		);
		expect(describeOffences(offences)).toEqual([]);
	});

	it("keeps story content out of the engine", () => {
		const engineFiles = typescriptFiles.filter((file) => ["kernel", "engine", "contracts", "sdk"].some((name) => file.startsWith(join("packages", name, "src") + sep)));
		const offences = engineFiles.flatMap((file) =>
			scanAst(file, (node, report) => {
				if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.includes("/stories/")) {
					report("engine imports a story");
				}
			}),
		);
		expect(describeOffences(offences)).toEqual([]);
	});

	it("keeps no story text in engine code (texts live in stories/ only)", () => {
		const nonStory = typescriptFiles.filter((file) => sourceFiles.includes(file));
		expect(nonStory.length).toBeGreaterThan(20);
		const sources = nonStory.map((file) => ({ file, text: readFileSync(file, "utf8") }));
		const directorTexts = (actions: readonly Action[]): readonly string[] =>
			actions.flatMap((action) => {
				switch (action.kind) {
					case "post":
					case "notify":
					case "dm":
						return [action.text];
					case "openPetition":
						return [action.petition.text, ...directorTexts(action.petition.onPass), ...directorTexts(action.petition.onFail)];
					case "lottery":
						return directorTexts(action.then);
					case "revealCollection":
						return action.header === undefined ? [] : [action.header];
					case "setCastLevel":
					case "revealCast":
					case "retireCast":
					case "grant":
					case "fine":
					case "escrowTransfer":
					case "unlockTools":
					case "publishStandings":
					case "collectDms":
					case "revealFactor":
						return [];
					default:
						return assertNever(action, "action");
				}
			});
		const storyTexts = Object.values(STORIES).flatMap((story) => [
			story.finishedNotice,
			...story.levels.flatMap((entry) => [entry.title, ...entry.task.split("\n")]),
			...story.personas.flatMap((persona) => [persona.temperament, persona.values, persona.voice]),
			...story.director.flatMap((rule) => directorTexts(rule.actions)),
		]);
		// Short fragments ("Level {level}") may legitimately coincide; whole sentences may not.
		const sentences = storyTexts.flatMap((text) => text.split(/(?<=[.!?])\s+/)).filter((sentence) => sentence.trim().length >= 24);
		expect(sentences.length).toBeGreaterThan(30);
		const offences = sentences.flatMap((sentence) =>
			sources.filter((source) => source.text.includes(sentence.trim())).map((source) => `${source.file}: "${sentence.trim()}"`),
		);
		expect(offences).toEqual([]);
	});

	it("checks the scanner itself", () => {
		const sample = "const a = b as Foo; const c = d as const; const e = f!; let g: any;";
		const source = ts.createSourceFile("sample.ts", sample, ts.ScriptTarget.Latest, true);
		const kinds: string[] = [];
		const walk = (node: ts.Node): void => {
			if (ts.isAsExpression(node)) kinds.push(isConstAssertion(node) ? "const" : "assertion");
			if (ts.isNonNullExpression(node)) kinds.push("non-null");
			if (node.kind === ts.SyntaxKind.AnyKeyword) kinds.push("any");
			ts.forEachChild(node, walk);
		};
		walk(source);
		expect(kinds).toEqual(["assertion", "const", "non-null", "any"]);
	});
});

/** Common German words that do not exist in English. */
const GERMAN_WORDS = [
	"und",
	"nicht",
	"oder",
	"wird",
	"werden",
	"ist",
	"sind",
	"eine",
	"einen",
	"einer",
	"auch",
	"noch",
	"kein",
	"keine",
	"wenn",
	"dann",
	"sich",
	"beim",
	"zum",
	"zur",
	"bitte",
	"diese",
	"dieser",
	"Punkte",
	"Stadt",
	"Aufgabe",
	"Gruppe",
	"Nachricht",
	"Spieler",
	"Fehler",
	"Lauf",
	"Runde",
	"Belohnung",
	"Lösung",
	"gelöst",
];

const UMLAUTS = /[äöüÄÖÜß]/;
const GERMAN = new RegExp(`(?<![\\p{L}\\d_])(${GERMAN_WORDS.join("|")})(?![\\p{L}\\d_])`, "iu");

describe("project rules: English only", () => {
	const textFiles = [
		...sourceFiles,
		...filesIn("stories", [".ts", ".md"]),
		...filesIn("test", [".ts"]),
		...filesIn("docs", [".md"]),
		"README.md",
		".env.example",
		join(".github", "workflows", "ci.yml"),
	].filter((file) => file !== SELF);

	it("scans every source, test and documentation file", () => {
		expect(textFiles.some((file) => file.startsWith("docs"))).toBe(true);
		expect(textFiles).toContain("README.md");
	});

	it("contains no German umlauts, sharp s or common German words", () => {
		const offences: string[] = [];
		for (const file of textFiles) {
			readFileSync(file, "utf8")
				.split(/\r?\n/)
				.forEach((line, index) => {
					const umlaut = UMLAUTS.exec(line);
					const word = GERMAN.exec(line);
					if (umlaut !== null) offences.push(`${relative(ROOT, file)}:${index + 1} umlaut "${umlaut[0]}"`);
					if (word !== null) offences.push(`${relative(ROOT, file)}:${index + 1} German word "${word[0]}"`);
				});
		}
		expect(offences).toEqual([]);
	});

	it("recognizes German text", () => {
		expect(GERMAN.test("Das ist nicht gut")).toBe(true);
		expect(UMLAUTS.test("Grüße")).toBe(true);
		expect(GERMAN.test("This list is not dist, nor mitigated by sindex")).toBe(false);
	});
});
