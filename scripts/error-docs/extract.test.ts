// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { sitesOf } from "./extract.ts";
import { entriesOf, renderPage } from "./page.ts";

const CATALOGUE = `
const RESTORE = "Restore the folder.";
const issue = (code: string, summary: string, why: string, fix: string) => ({ code, summary, why, fix });
export const MAP = { "SWT-G001": "the game does not match", "SWT-L001": { why: "Lines are chained.", fix: RESTORE } };
/**
 * \`SWT-R001\`: the kernel is used after it failed.
 *
 * @returns The issue.
 */
export function failed(name: string) {
	return { code: "SWT-R001", summary: \`\${name} failed\`, why: "A failed run is closed.", fix: \`Create a new kernel for "\${name}".\` };
}
export const lab = (count: number) => issue("SWT-E003", \`the plan costs \${count}\`, "The cap holds.", "Raise the cap.");
// A mention in a comment is no code: SWT-E009.
export function oracle(code: "SWT-T001" | "SWT-T002", summary: string, fix: string) {
	const why = code === "SWT-T001" ? "An oracle is version 1." : "The runner plays one run.";
	return { code, summary, why, fix };
}
`;
const CALLER = `oracle("SWT-T002", "the oracle has a resume", "Take the file unchanged.");`;

describe("the error extractor", () => {
	const sites = sitesOf([{ file: "packages/a/src/errors.ts", text: CATALOGUE }, { file: "apps/b/src/run.ts", text: CALLER }]);

	it("finds the codes of code, not of comments", () => {
		expect([...new Set(sites.map((site) => site.code))].sort()).toEqual(["SWT-E003", "SWT-G001", "SWT-L001", "SWT-R001", "SWT-T001", "SWT-T002"]);
	});

	it("reads object literals, helper calls, catalogue maps and the branch of a code", () => {
		const entries = Object.fromEntries(entriesOf(sites, {}).map((entry) => [entry.code, entry]));
		expect(entries["SWT-R001"]).toEqual({ code: "SWT-R001", packages: ["packages/a"], summary: "the kernel is used after it failed.", why: "A failed run is closed.", fix: 'Create a new kernel for "{name}".' });
		expect(entries["SWT-E003"]).toMatchObject({ summary: "the plan costs {count}", why: "The cap holds.", fix: "Raise the cap." });
		expect(entries["SWT-G001"]).toMatchObject({ summary: "the game does not match" });
		expect(entries["SWT-L001"]).toMatchObject({ why: "Lines are chained.", fix: "Restore the folder." });
		expect(entries["SWT-T002"]).toMatchObject({ packages: ["apps/b", "packages/a"], summary: "the oracle has a resume", why: "The runner plays one run.", fix: "Take the file unchanged." });
	});

	it("renders one anchored section per code, grouped by area", () => {
		const page = renderPage(entriesOf(sites, {}));
		expect(page.indexOf("## G: Game")).toBeLessThan(page.indexOf("## R: Run and kernel"));
		expect(page).toContain("### SWT-R001\n\nThe kernel is used after it failed.\n\n- **Why:** A failed run is closed.\n- **Fix:** Create a new kernel for \"{name}\".\n- **Named in:** `packages/a`");
		expect(page).not.toContain("SWT-E009");
	});
});
