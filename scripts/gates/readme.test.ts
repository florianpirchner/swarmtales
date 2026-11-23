// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The README is the landing page (DECISIONS.md, section 4); it has no line limit since A158. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readText, REPO_ROOT } from "../lib/files.ts";

/** The tutorials and their samples that "Build your own" links (11-m4-spec.md, section 4.7). */
const TUTORIALS = ["docs/tutorials/game.md", "samples/README.md", "docs/tutorials/mechanic.md", "samples/own-mechanic/README.md", "docs/tutorials/director.md", "samples/own-director/README.md"];

/** The folders under `mechanics/` that are no mechanic: the shared contracts and the Directors' package. */
const NOT_MECHANICS = new Set(["contracts", "city-directors"]);

/**
 * The mechanic packages that a README does not link.
 *
 * @param text - The README.
 * @param names - The folders under `mechanics/`.
 * @returns The mechanics without a link to their README, sorted.
 */
function unlistedMechanics(text: string, names: readonly string[]): readonly string[] {
	return names.filter((name) => !NOT_MECHANICS.has(name) && !text.includes(`](mechanics/${name}/README.md)`)).sort();
}

/**
 * The cards of `GAMES.md` that a README does not link.
 *
 * @param text - The README.
 * @param games - The text of `GAMES.md`.
 * @returns The anchors of the cards without a link.
 */
function unlistedGames(text: string, games: string): readonly string[] {
	const cards = [...games.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? "").filter((title) => title !== "Overview" && !title.startsWith("The games of the old platform"));
	const anchor = (title: string): string => title.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
	return cards.map(anchor).filter((id) => !text.includes(`](GAMES.md#${id})`));
}

/**
 * The tutorial and sample links that the section "Build your own" of a README lacks.
 *
 * @param text - The README.
 * @returns The targets it does not link, in the order of `TUTORIALS`.
 */
function missingTutorials(text: string): readonly string[] {
	const path = text.split(/^## /m).find((section) => section.startsWith("Build your own")) ?? "";
	return TUTORIALS.filter((target) => !path.includes(`](${target})`));
}

describe("README", () => {
	const readme = readText("README.md");

	it("says where the old platform is, until it is removed", () => {
		expect(readme).toContain("`legacy`");
		expect(readme).toContain("`v0-final`");
	});

	it("links both tutorials under \"Choose your path\", each with the sample that checks it (M4, 4.7)", () => {
		expect(missingTutorials(readme)).toEqual([]);
		const before = readme.replace(/^- \*\*Write a mechanic:\*\*.*$/m, "- **Write a mechanic:** the tutorial arrives with milestone M4, as a tested sample.");
		expect(missingTutorials(before)).toEqual(["docs/tutorials/mechanic.md", "samples/own-mechanic/README.md"]);
		expect(missingTutorials("# A README without the section\n")).toHaveLength(TUTORIALS.length);
	});

	it("lists every mechanic and every game (A158)", () => {
		const names = readdirSync(join(REPO_ROOT, "mechanics"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
		expect(names.length).toBeGreaterThan(30);
		expect(unlistedMechanics(readme, names)).toEqual([]);
		expect(unlistedMechanics("", ["grid", "contracts"])).toEqual(["grid"]);
		const games = readText("GAMES.md");
		expect(unlistedGames(readme, games)).toEqual([]);
		expect(unlistedGames("", "## Overview\n## Nine men's morris\n")).toEqual(["nine-mens-morris"]);
	});

	it("links only to files that exist", () => {
		const targets = [...readme.matchAll(/\]\((?!https?:|#)([^)#]+)/g)].map((match) => match[1] ?? "");
		expect(targets.length).toBeGreaterThan(5);
		expect(targets.filter((target) => !existsSync(join(REPO_ROOT, target)))).toEqual([]);
	});
});
