// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The API freeze gate (M5-51, section 5.2 of the M5 specification): the frozen files of this repository are as
 * recorded, and each of the five ways a change can slip past the record fails in a fixture (a temporary git
 * repository).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { freezeProblems, recordFrozen } from "../api-freeze/gate.ts";
import { DECISIONS_DOC, FREEZE_DOC, FROZEN_LIST, listText, readList, sha256 } from "../api-freeze/records.ts";
import { frozenPaths, surfaceTexts } from "../api-freeze/surface.ts";
import { REPO_ROOT } from "../lib/files.ts";

const REPORT = "packages/demo/demo.api.md";
const OTHER = "packages/other/other.api.md";
const DECISIONS = "# Decisions\n\n## 9. Addendum\n\n| Row | Date | Decision | Evidence |\n|---|---|---|---|\n| A60 | 2026-11-15 | The freeze | x |\n| A70 | 2026-11-16 | A break, by the owner's go | y |\n";
const HEAD_ROW = "| Row | Date | Paths | Kind | Decision | What |\n|---|---|---|---|---|---|\n";

let roots: string[] = [];
afterEach(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
	roots = [];
});

function git(root: string, ...args: string[]): string {
	return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function put(root: string, files: Readonly<Record<string, string>>): void {
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
}

function commit(root: string, message: string, date = "2026-11-16T12:00:00Z"): string {
	git(root, "add", "-A");
	execFileSync("git", ["commit", "-q", "-m", message], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
	return git(root, "rev-parse", "HEAD");
}

function changes(...rows: string[]): string {
	return `# The API freeze\n\n## Changes\n\n${HEAD_ROW}${rows.map((row) => `${row}\n`).join("")}`;
}

/** Records the list as `pnpm api:freeze --write` does, and fails on a refusal. */
function record(root: string, paths: readonly string[] = [REPORT, OTHER]): void {
	const result = recordFrozen(root, paths);
	expect(result.problems).toEqual([]);
	put(root, { [FROZEN_LIST]: listText(result.files) });
}

/** A repository with two reports frozen by the freeze row F1, before the freeze is in force. */
function frozenRepository(): string {
	const root = mkdtempSync(join(tmpdir(), "swt-freeze-"));
	roots.push(root);
	git(root, "init", "-q");
	git(root, "config", "user.email", "test@example.com");
	git(root, "config", "user.name", "Test");
	put(root, { [DECISIONS_DOC]: DECISIONS, [REPORT]: "export function a(): void;\n\nexport function b(): void;\n", [OTHER]: "export const c = 1;\n" });
	put(root, { [FREEZE_DOC]: changes("| F1 | (the merge of M5-57) | every file of the frozen list | freeze | A60 | the surface |") });
	commit(root, "reports", "2026-11-15T12:00:00Z");
	record(root);
	commit(root, "freeze", "2026-11-15T13:00:00Z");
	return root;
}

/** Changes the demo report and adds a row of the given cells (paths, kind, decision) for it. */
function change(root: string, text: string, row: string): void {
	const doc = readFileSync(join(root, FREEZE_DOC), "utf8");
	put(root, { [REPORT]: text, [FREEZE_DOC]: `${doc}| F2 | 2026-11-17 | ${row} | the change |\n` });
}

describe("the API freeze of this repository", () => {
	it("holds every frozen file as recorded, the text forms as the code says", () => {
		expect(readList(REPO_ROOT)?.map((entry) => entry.path)).toEqual(frozenPaths());
		expect(freezeProblems(REPO_ROOT, frozenPaths())).toEqual([]);
		for (const [path, text] of surfaceTexts()) expect(readFileSync(join(REPO_ROOT, path), "utf8"), path).toBe(text);
	});
});

describe("the API freeze gate", () => {
	it("passes the freeze, an addition and a break by the owner's go, each recorded by --write", () => {
		const root = frozenRepository();
		const frozenAt = git(root, "rev-parse", "HEAD");
		expect(freezeProblems(root, [REPORT, OTHER])).toEqual([]);
		change(root, "export function a(): void;\n\nexport function b(): void;\n\nexport function d(): void;\n", "`packages/demo/demo.api.md` | addition | A60");
		record(root);
		expect(readList(root)?.find((entry) => entry.path === REPORT)).toMatchObject({ row: "F2", base: frozenAt });
		expect(freezeProblems(root)).toEqual([]);
		const added = commit(root, "addition");
		put(root, { [REPORT]: "export function a(): string;\n", [FREEZE_DOC]: `${readFileSync(join(root, FREEZE_DOC), "utf8")}| F3 | 2026-11-18 | \`${REPORT}\` | break | A70 | a break |\n` });
		record(root);
		expect(readList(root)?.find((entry) => entry.path === REPORT)).toMatchObject({ row: "F3", base: added });
		expect(freezeProblems(root)).toEqual([]);
	});

	it("1: fails on a missing file, an empty list and a frozen surface without a row", () => {
		const root = frozenRepository();
		expect(freezeProblems(root, [REPORT, OTHER, "packages/new/new.api.md"])).toEqual([expect.stringContaining("packages/new/new.api.md: a frozen surface without a row")]);
		rmSync(join(root, OTHER));
		expect(freezeProblems(root)).toEqual([`${OTHER}: the frozen file is missing`]);
		writeFileSync(join(root, FROZEN_LIST), listText([]));
		expect(freezeProblems(root)).toEqual([expect.stringContaining("lists no file")]);
		rmSync(join(root, FROZEN_LIST));
		expect(freezeProblems(root)).toEqual([expect.stringContaining("is missing or does not match")]);
	});

	it("2: fails on a text that is not the recorded one", () => {
		const root = frozenRepository();
		put(root, { [REPORT]: "export function a(): void;\n" });
		expect(freezeProblems(root)).toEqual([expect.stringContaining(`${REPORT}: the text is not the one recorded`)]);
	});

	it("3: fails on a row that is missing, does not name the path, or names no decision row of section 9", () => {
		const root = frozenRepository();
		const appended = "export function a(): void;\n\nexport function b(): void;\nexport function e(): void;\n";
		change(root, appended, "`packages/demo/demo.api.md` | addition | A60");
		record(root);
		const listed = readFileSync(join(root, FROZEN_LIST), "utf8");
		writeFileSync(join(root, FROZEN_LIST), listed.replace('"row": "F2"', '"row": "F9"'));
		expect(freezeProblems(root)).toEqual([expect.stringContaining('its row F9 is not in the table "Changes"')]);
		writeFileSync(join(root, FROZEN_LIST), listed);
		const doc = readFileSync(join(root, FREEZE_DOC), "utf8");
		writeFileSync(join(root, FREEZE_DOC), doc.replace(`\`${REPORT}\` | addition`, `\`${OTHER}\` | addition`));
		expect(freezeProblems(root)).toEqual([expect.stringContaining("row F2 does not name it")]);
		writeFileSync(join(root, FREEZE_DOC), doc.replace("addition | A60", "addition | A61"));
		expect(freezeProblems(root)).toEqual([expect.stringContaining('names the decision row "A61", which section 9')]);
	});

	it("4: fails on an addition that removes or changes a line, and on docs only that changes more", () => {
		const root = frozenRepository();
		change(root, "export function a(): void;\n\nexport function b(): number;\n\nexport function d(): void;\n", "`packages/demo/demo.api.md` | addition | A60");
		record(root);
		expect(freezeProblems(root)).toEqual([expect.stringContaining("row F2 calls it an addition, but it removes or changes a line")]);
		writeFileSync(join(root, FREEZE_DOC), readFileSync(join(root, FREEZE_DOC), "utf8").replace("| addition | A60 | the change", "| addition: docs only | A60 | the change"));
		expect(freezeProblems(root)).toEqual([expect.stringContaining("row F2 calls it docs only")]);
		put(root, { [REPORT]: "// Warning: a note\nexport function a(): void;\n\nexport function b(): void;\n" });
		record(root);
		expect(freezeProblems(root)).toEqual([]);
	});

	it("5: fails on a break whose decision row does not say the owner's go", () => {
		const root = frozenRepository();
		change(root, "export function a(): void;\n", "`packages/demo/demo.api.md` | break | A60");
		record(root);
		expect(freezeProblems(root)).toEqual([expect.stringContaining(`row F2 is a break, and its decision row A60 does not say "the owner's go"`)]);
	});

	it("refuses a change passed off as the freeze once the freeze is in force", () => {
		const root = frozenRepository();
		put(root, { [FREEZE_DOC]: readFileSync(join(root, FREEZE_DOC), "utf8").replace("(the merge of M5-57)", "2026-11-15") });
		commit(root, "the freeze is in force", "2026-11-15T14:00:00Z");
		expect(freezeProblems(root)).toEqual([]);
		put(root, { [REPORT]: "export function a(): void;\n" });
		expect(recordFrozen(root, [REPORT, OTHER]).problems).toEqual([expect.stringContaining("the freeze of row F1 is in force since 2026-11-15")]);
		const late = commit(root, "a later change", "2026-11-20T12:00:00Z");
		const listed = readFileSync(join(root, FROZEN_LIST), "utf8");
		const entry = readList(root)?.find((row) => row.path === REPORT);
		const now = sha256(readFileSync(join(root, REPORT), "utf8"));
		writeFileSync(join(root, FROZEN_LIST), listed.replace(entry?.sha256 ?? "", now).replace(entry?.base ?? "", late));
		expect(freezeProblems(root)).toEqual([expect.stringContaining("row F1 froze the text on 2026-11-15")]);
	});
});
