// SPDX-License-Identifier: Apache-2.0
/**
 * The stale check of the mechanic READMEs (docs/MECHANIC-README.md): every mechanic package has a README in the
 * fixed shape, and its generated blocks say what the head says. `pnpm docs:mechanics` rewrites them.
 */
import { describe, expect, it } from "vitest";
import { listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { docsProblems, readmeTargets } from "../mechanic-docs/readme.ts";

describe("mechanic READMEs", () => {
	it("documents every mechanic package", async () => {
		// Found without the manifests the generator reads: a folder whose source defines a mechanic.
		const defining = listFiles("mechanics", (path) => /^mechanics\/[^/]+\/src\/.*\.ts$/.test(path) && readText(path).includes("defineMechanic("));
		const folders = [...new Set(defining.map((path) => path.split("/")[1]))];
		expect(folders.length).toBeGreaterThanOrEqual(7);
		expect((await readmeTargets(REPO_ROOT)).map((target) => target.folder)).toEqual(folders);
	});

	it("are current: no missing section or marker, no placeholder, no stale block", async () => {
		expect(await docsProblems(REPO_ROOT)).toEqual([]);
	});
});
