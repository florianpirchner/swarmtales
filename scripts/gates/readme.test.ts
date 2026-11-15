// SPDX-License-Identifier: Apache-2.0
/** The README is the landing page: at most 120 lines (DECISIONS.md, section 4). */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readText, REPO_ROOT } from "../lib/files.ts";
import { LIMITS } from "../lib/limits.ts";

/** The tutorials and their samples that "Choose your path" links (11-m4-spec.md, section 4.7). */
const TUTORIALS = ["docs/tutorials/mechanic.md", "samples/own-mechanic/README.md", "docs/tutorials/director.md", "samples/own-director/README.md"];

/**
 * The tutorial and sample links that the section "Choose your path" of a README lacks.
 *
 * @param text - The README.
 * @returns The targets it does not link, in the order of `TUTORIALS`.
 */
function missingTutorials(text: string): readonly string[] {
	const path = text.split(/^## /m).find((section) => section.startsWith("Choose your path")) ?? "";
	return TUTORIALS.filter((target) => !path.includes(`](${target})`));
}

describe("README", () => {
	const readme = readText("README.md");

	it(`has at most ${LIMITS.readmeMax} lines`, () => {
		expect(LIMITS.readmeMax).toBe(120);
		expect(readme.trimEnd().split("\n").length).toBeLessThanOrEqual(LIMITS.readmeMax);
	});

	it("says where the old platform is, until it is removed", () => {
		expect(readme).toContain("`legacy`");
		expect(readme).toContain("`v0-final`");
	});

	it("links both tutorials under \"Choose your path\", each with the sample that checks it (M4, 4.7)", () => {
		expect(missingTutorials(readme)).toEqual([]);
		const before = readme.replace(/^- \*\*Write a mechanic:\*\*.*$/m, "- **Write a mechanic:** the tutorial arrives with milestone M4, as a tested sample.");
		expect(missingTutorials(before)).toEqual(["docs/tutorials/mechanic.md", "samples/own-mechanic/README.md"]);
		expect(missingTutorials("# A README without the section\n")).toHaveLength(4);
	});

	it("links only to files that exist", () => {
		const targets = [...readme.matchAll(/\]\((?!https?:|#)([^)#]+)/g)].map((match) => match[1] ?? "");
		expect(targets.length).toBeGreaterThan(5);
		expect(targets.filter((target) => !existsSync(join(REPO_ROOT, target)))).toEqual([]);
	});
});
