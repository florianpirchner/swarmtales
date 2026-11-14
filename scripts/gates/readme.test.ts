// SPDX-License-Identifier: Apache-2.0
/** The README is the landing page: at most 120 lines (DECISIONS.md, section 4). */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readText, REPO_ROOT } from "../lib/files.ts";
import { LIMITS } from "../lib/limits.ts";

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

	it("links only to files that exist", () => {
		const targets = [...readme.matchAll(/\]\((?!https?:|#)([^)#]+)/g)].map((match) => match[1] ?? "");
		expect(targets.length).toBeGreaterThan(5);
		expect(targets.filter((target) => !existsSync(join(REPO_ROOT, target)))).toEqual([]);
	});
});
