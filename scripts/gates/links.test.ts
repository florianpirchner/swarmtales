// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The link classes (M6-17, `13-m6-spec.md` 7.2, decision A129): every link of the repository to the old state
 * (`v0-final`) and to the run data (`data/runs`) has a class, so that the links can be rewritten after O8 and before
 * O6; a link of no class fails, here in a fixture and on the repository itself.
 */
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../lib/files.ts";
import { classCounts, classify, classifyRepository, findLinks, linkProblems, readTrees, type Trees } from "../release/links.ts";

const BASE = "https://github.com/florianpirchner/swarmtales";
const FIXTURE: Trees = {
	old: new Set(["stories", "stories/quarry", "stories/quarry/runs", "stories/quarry/runs/001", "stories/quarry/story.ts", "examples", "examples/act2", "docs", "docs/ideas", "docs/ideas/door.md", "docs/HOW.md"]),
	data: new Set(["quarry", "quarry/open"]),
};

const classOf = (text: string): readonly string[] => findLinks("fixture.md", text).map((link) => classify(link, FIXTURE));

describe("the link classes", () => {
	it("finds the links of both kinds, without anchors, closing stops or trailing slashes", () => {
		const text = `see [a](${BASE}/blob/v0-final/docs/HOW.md#start). And ${BASE}/tree/v0-final/stories/quarry/runs/.\n[b](${BASE}/tree/data/runs/quarry/open) [c](${BASE}/tree/v0-final)`;
		expect(findLinks("x.md", text).map((link) => `${String(link.line)} ${link.ref}:${link.path}`)).toEqual([
			"1 v0-final:docs/HOW.md",
			"1 v0-final:stories/quarry/runs",
			"2 data/runs:quarry/open",
			"2 v0-final:",
		]);
		expect(findLinks("x.md", `${BASE}/tree/v0-finally/x ${BASE}/tree/main/README.md`)).toEqual([]);
	});

	it("gives run data, carried docs and old code their class", () => {
		expect(classOf(`${BASE}/tree/v0-final/stories/quarry/runs/001 ${BASE}/tree/v0-final/examples/act2 ${BASE}/tree/data/runs/quarry`)).toEqual(["run data", "run data", "run data"]);
		expect(classOf(`${BASE}/blob/v0-final/docs/ideas/door.md`)).toEqual(["carried doc"]);
		expect(classOf(`${BASE}/blob/v0-final/stories/quarry/story.ts ${BASE}/blob/v0-final/docs/HOW.md ${BASE}/tree/v0-final`)).toEqual(["old code", "old code", "old code"]);
	});

	it("fails on a fixture link of no class, and on finding no link at all", () => {
		const links = findLinks("fixture.md", `[gone](${BASE}/tree/v0-final/stories/gone/runs) [lost](${BASE}/tree/data/runs/quarry/lost)`).map((link) => ({ ...link, linkClass: classify(link, FIXTURE) }));
		expect(linkProblems(links)).toEqual([
			"fixture.md:1: v0-final/stories/gone/runs has no class (the old state holds no such path)",
			"fixture.md:1: data/runs/quarry/lost has no class (the branch holds no such path)",
		]);
		expect(linkProblems([])).toEqual(["no link to `v0-final` or `data/runs` was found; nothing was classified"]);
	});

	it("has a class for every link of the repository", () => {
		const trees = readTrees(REPO_ROOT);
		if (typeof trees === "string") throw new TypeError(`links: ${trees}`);
		const links = classifyRepository(trees);
		expect(linkProblems(links)).toEqual([]);
		expect(links.filter((link) => link.ref === "v0-final").length).toBeGreaterThan(300);
		expect(links.filter((link) => link.ref === "data/runs").length).toBeGreaterThan(0);
		expect(classCounts(links).length).toBeGreaterThan(2);
	});
});
