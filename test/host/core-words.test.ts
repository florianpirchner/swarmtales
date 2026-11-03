/**
 * The core contains no game word (docs/ideas/monorepo.md §2a): no file of `packages/kernel` or
 * `packages/contracts` names doors, points, boards and the like, in code or in comments. The old
 * engine's files that still live there are listed in LEGACY; the list may only shrink (wave 3
 * moves them into mechanics), and a listed file that became clean must leave the list.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CORE = [join("packages", "kernel", "src"), join("packages", "contracts", "src")];

/** Words with game meaning; `gamemaker` is an actor identity of the core and allowed. */
const GAME_WORDS = [
	"door", "doors", "tribunal", "tribunals", "ransom", "point", "points", "level", "levels", "board", "boards", "dm", "dms",
	"exile", "exiled", "receipt", "receipts", "fragment", "fragments", "puzzle", "puzzles", "city", "courier", "vote", "votes",
	"seal", "petition", "petitions", "mark", "marks", "password", "passwords", "ledger", "figure", "figures", "faction", "factions",
	"whisper", "whisperer", "standoff", "feast", "escrow", "escrows", "treasurer", "motive", "motives", "classifier", "weaver",
];

/** Old-engine files in the core packages, as of wave 2a. Shrink only. */
const LEGACY = [
	"packages/contracts/src/ids.ts",
	"packages/contracts/src/roles.ts",
	"packages/contracts/src/story-schema.ts",
	"packages/contracts/src/story.ts",
	"packages/contracts/src/tool-names.ts",
	"packages/kernel/src/counts.ts",
	"packages/kernel/src/random.ts",
];

function filesIn(directory: string): readonly string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		return statSync(path).isDirectory() ? filesIn(path) : path.endsWith(".ts") ? [path] : [];
	});
}

/** The game words in a text, also inside camelCase identifiers (`doorOpened` counts as door). */
function gameWords(text: string): readonly string[] {
	const words = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/);
	return [...new Set(words.filter((word) => GAME_WORDS.includes(word)))];
}

describe("the core has no game words", () => {
	const files = CORE.flatMap((directory) => filesIn(directory)).map((path) => path.split("\\").join("/"));
	const offenders = files.filter((file) => gameWords(readFileSync(file, "utf8")).length > 0);

	it("scans the core packages", () => {
		expect(files.length).toBeGreaterThan(20);
		expect(files).toContain("packages/kernel/src/host/host.ts");
	});

	it("finds them only in the legacy files", () => {
		const fresh = offenders.filter((file) => !LEGACY.includes(file));
		expect(fresh.map((file) => `${file}: ${gameWords(readFileSync(file, "utf8")).join(", ")}`)).toEqual([]);
	});

	it("keeps the legacy list as short as it can be", () => {
		expect(LEGACY.filter((file) => !offenders.includes(file))).toEqual([]);
	});

	it("recognises game words in code and prose", () => {
		expect(gameWords("const doorOpened = levelOf(x); // the Board")).toEqual(["door", "level", "board"]);
		expect(gameWords("dispatch the event log; points of view")).toEqual(["points"]);
		expect(gameWords("gamemaker, resident, mechanic, minute")).toEqual([]);
	});
});
