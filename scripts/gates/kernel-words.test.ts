// SPDX-License-Identifier: Apache-2.0
/**
 * The word-list test of the kernel (REWRITE.md 3.2; M1 specification, 3.7): the kernel has no role word and no game
 * word in an identifier or in a string literal. A role or a game exists for the kernel only as data that a plugin
 * hands in. Comments are not tested: a comment may say what the kernel does not know.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isBudgetFile } from "../lib/budget.ts";
import { listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { findWords, namesAndStrings, wordsOf } from "../lib/words.ts";

/**
 * Words the kernel must not know. `actor`, `kind`, `grant`, `tool`, `service`, `event`, `tick`, `job`, `plugin`,
 * `human`, `script` and `game` are the kernel's own words and are not listed. Extend the list when a review finds a
 * game word that it misses.
 */
const GAME_WORDS = new Set([
	// roles
	"resident", "director", "overseer", "gamemaker", "confessor", "judge", "referee", "weaver", "classifier", "player",
	"team", "captain", "role",
	// time and turns of a game
	"minute", "round", "turn", "pass", "level",
	// what games are made of
	"point", "score", "vote", "ballot", "board", "move", "match", "card", "deal", "puzzle", "exile", "tribunal",
	"whisper", "marks", "ledger", "city", "story", "decision",
	// brought by the mechanics and games of M3 and M4 (11-m4-spec.md, section 4.2)
	"banish", "pause", "holder", "amend", "verdict", "court", "channel", "fragment", "transfer", "bid", "trick", "pawn",
	"lantern", "convoy", "market",
	// what belongs to drivers and reports
	"briefing", "prompt", "model", "cost", "usd",
]);

/** The folders the test reads: the kernel, and the part of the contracts that describes it. */
const KERNEL_FOLDERS = ["packages/kernel", "packages/contracts/src/kernel"];

/**
 * Identifiers that may hold a listed word, each with its reason. An entry needs an issue.
 *
 * - `endsTurn`: the payload field of a tool result that ported mechanics return (D2; M1 specification, 3.7).
 */
const ALLOWED_IDENTIFIERS: readonly string[] = ["endsTurn"];

function withoutAllowed(text: string): string {
	return ALLOWED_IDENTIFIERS.reduce((rest, identifier) => rest.replaceAll(identifier, ""), text);
}

describe("kernel word list", () => {
	it("finds no role word and no game word in the kernel", () => {
		const files = KERNEL_FOLDERS.flatMap((folder) => listFiles(folder, isBudgetFile));
		// The test must not pass on nothing once the kernel exists.
		if (existsSync(join(REPO_ROOT, "packages/kernel"))) expect(files.some((file) => file.startsWith("packages/kernel/src/"))).toBe(true);
		const offences = files.flatMap((file) =>
			findWords(namesAndStrings(withoutAllowed(readText(file))), GAME_WORDS).map((hit) => `${file}:${hit.line} game word "${hit.word}"`),
		);
		expect(offences).toEqual([]);
	});

	it("knows the words that M3 and M4 brought, in every form a kernel file could hold them", () => {
		const text = ["const banishes = pauseRun();", 'emit("holders_amend");', "type VerdictOf = CourtChannel;", "const fragments = transferTo(bids);", "// tricks, pawns, lanterns", "const convoys = marketDeal;"].join("\n");
		expect(findWords(text, GAME_WORDS).map((hit) => `${String(hit.line)}:${hit.word}`)).toEqual([
			"1:banish", "1:pause", "2:holder", "2:amend", "3:verdict", "3:court", "3:channel", "4:fragment", "4:transfer", "4:bid",
			"5:trick", "5:pawn", "5:lantern", "6:convoy", "6:market", "6:deal",
		]);
	});

	it("splits identifiers into words", () => {
		expect(wordsOf("const residentIds = new Map<ActorId, HTTPServer>(); // snake_case_name")).toEqual([
			"const", "resident", "ids", "new", "map", "actor", "id", "http", "server", "snake", "case", "name",
		]);
	});

	it("recognizes every plural form and the one allowed identifier", () => {
		expect(findWords("matches, cities, passes, decisions", GAME_WORDS).map((hit) => hit.word)).toEqual(["match", "city", "pass", "decision"]);
		expect(findWords("bypass the password, compass", GAME_WORDS)).toEqual([]);
		expect(findWords(withoutAllowed("return { endsTurn: true };"), GAME_WORDS)).toEqual([]);
		expect(findWords(withoutAllowed("const endsTurns = turnEnd;"), GAME_WORDS)).toHaveLength(1);
	});

	it("reads identifiers and string literals, and leaves comments and keywords alone", () => {
		const text = ["// the resident moves", "const a = `team ${b} of", "the city`; /* a vote */", 'log("score");', "/** The judge. */", "function wake(): void {}"].join("\n");
		expect(namesAndStrings(text).split("\n")).toEqual(["", "a `team ${ b } of the city`", "", 'log "score"', "", "wake"]);
		expect(findWords(namesAndStrings(text), GAME_WORDS)).toEqual([{ line: 2, word: "team" }, { line: 2, word: "city" }, { line: 4, word: "score" }]);
		expect(findWords(namesAndStrings("const toAct = endTick(idle);"), GAME_WORDS)).toEqual([]);
	});

	it("recognizes a game word in an identifier, a comment and a plural", () => {
		const text = ["const actorId = 1;", "function wakeResident(): void {}", "// counts the votes of a level", "const checkpoint = pointer;"].join("\n");
		expect(findWords(text, GAME_WORDS)).toEqual([
			{ line: 2, word: "resident" },
			{ line: 3, word: "vote" },
			{ line: 3, word: "level" },
		]);
	});
});
