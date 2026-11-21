// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Every failure of the prompt loader is an `SwtError` with a code of this package's catalogue (`SWT-P010` to `SWT-P015`). */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { SwtError, SwtIssueSchema } from "@swarmtales/contracts";
import { createPromptLookup, parsePromptFile, PromptError, renderBody } from "../src/index.ts";

/** Runs the code and returns the error it throws. */
function thrown(code: () => unknown): unknown {
	try {
		code();
	} catch (error) {
		return error;
	}
	return undefined;
}

const root = mkdtempSync(join(tmpdir(), "swt-prompt-errors-"));
mkdirSync(join(root, "m"), { recursive: true });
writeFileSync(join(root, "m", "hello.md"), "---\nid: m/hello\nvariables: name\n---\nhello {{name}}\n");
writeFileSync(join(root, "m", "moved.md"), "---\nid: m/other\nvariables:\n---\nx\n");
writeFileSync(join(root, "m", "broken.md"), "no frontmatter\n");
// A lookup keeps the files it has read and checks their variables only on the first read, so every case gets its own
// lookup and does not depend on what an earlier case read (M6-15).
const fresh = () => createPromptLookup({ mechanics: { m: root }, library: join(root, "none") });

const CASES: readonly (readonly [string, () => unknown])[] = [
	["SWT-P010", () => fresh().render("m", "m/none", {}, [])],
	["SWT-P011", () => fresh().render("m", "m/broken", {}, [])],
	["SWT-P011", () => parsePromptFile("---\nid: a\nvariables: x, x\n---\n", "a.md")],
	["SWT-P012", () => fresh().render("m", "m/moved", {}, [])],
	["SWT-P013", () => fresh().render("m", "m/hello", { name: "A01" }, [])],
	["SWT-P014", () => fresh().render("m", "m/hello", {}, ["name"])],
	["SWT-P014", () => renderBody({ id: "a", variables: [], body: "{{x}}" }, {})],
];

describe("the errors of the prompt loader", () => {
	it.each(CASES)("raises %s as an SwtError with one whole issue", (code, run) => {
		const error = thrown(run);
		expect(error).toBeInstanceOf(PromptError);
		expect(error).toBeInstanceOf(SwtError);
		if (!(error instanceof SwtError)) return;
		expect(error.code).toBe(code);
		expect(error.issues).toHaveLength(1);
		expect(Check(SwtIssueSchema, error.issues[0])).toBe(true);
		expect(error.message.split("\n")[0]).toBe(`error ${code}: ${error.issues[0]?.summary ?? ""}`);
	});

	it("names the file as the place of a fault in a file", () => {
		const error = thrown(() => fresh().render("m", "m/moved", {}, []));
		expect(error instanceof SwtError ? error.issues[0]?.where : undefined).toEqual({ file: join(root, "m", "moved.md") });
	});
});
