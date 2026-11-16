// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Findings 1 to 3 of the challenger's review of M5 (`docs/M5-REVIEW.md`): three ways a frozen file changes in a way
 * that breaks its users while `freezeProblems` passes. Each test asserts what the gate should say; it fails today and
 * is marked `it.fails` so that the check stays green. When a finding is fixed, its test turns into `it`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { freezeProblems, recordFrozen } from "../api-freeze/gate.ts";
import { DECISIONS_DOC, FREEZE_DOC, FROZEN_LIST, listText, readList, sha256 } from "../api-freeze/records.ts";

const REPORT = "packages/demo/demo.api.md";
const FORM = "scripts/api-freeze/surface/run-manifest.json";
const DECISIONS = "# Decisions\n\n## 9. Addendum\n\n| Row | Date | Decision | Evidence |\n|---|---|---|---|\n| A60 | 2026-11-15 | The freeze | x |\n";
const TABLE = "# The API freeze\n\n## Changes\n\n| Row | Date | Paths | Kind | Decision | What |\n|---|---|---|---|---|---|\n";
const MANIFEST = '{\n\t"properties": {\n\t\t"id": {\n\t\t\t"type": "string"\n\t\t},\n\t\t"seed": {\n\t\t\t"type": "number"\n\t\t}\n\t},\n\t"required": [\n\t\t"id",\n\t\t"seed"\n\t]\n}\n';

let roots: string[] = [];
afterEach(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
	roots = [];
});

const git = (root: string, ...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function put(root: string, files: Readonly<Record<string, string>>): void {
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
}

function commit(root: string, message: string, date: string): string {
	git(root, "add", "-A");
	execFileSync("git", ["commit", "-q", "-m", message], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
	return git(root, "rev-parse", "HEAD");
}

function appendRow(root: string, row: string): void {
	put(root, { [FREEZE_DOC]: `${readFileSync(join(root, FREEZE_DOC), "utf8")}${row}\n` });
}

/** A repository whose freeze F1 is in force since 2026-11-15, as `rewrite/develop` is since M5-57. */
function inForce(): string {
	const root = mkdtempSync(join(tmpdir(), "swt-freeze-review-"));
	roots.push(root);
	git(root, "init", "-q");
	git(root, "config", "user.email", "test@example.com");
	git(root, "config", "user.name", "Test");
	put(root, { [DECISIONS_DOC]: DECISIONS, [REPORT]: "export function a(): void;\n\nexport function b(): void;\n", [FORM]: MANIFEST, [FREEZE_DOC]: TABLE });
	appendRow(root, "| F1 | (the merge) | every file of the frozen list | freeze | A60 | the surface |");
	commit(root, "reports", "2026-11-15T12:00:00Z");
	const recorded = recordFrozen(root, [REPORT, FORM]);
	expect(recorded.problems).toEqual([]);
	put(root, { [FROZEN_LIST]: listText(recorded.files) });
	put(root, { [FREEZE_DOC]: readFileSync(join(root, FREEZE_DOC), "utf8").replace("(the merge)", "2026-11-15") });
	commit(root, "the freeze is in force", "2026-11-15T13:00:00Z");
	expect(freezeProblems(root, [REPORT, FORM])).toEqual([]);
	return root;
}

describe("the API freeze gate, attacked by the review of M5", () => {
	// Finding 1: a second freeze row without a date admits any text, and needs neither the owner's go nor a kind of change.
	it.fails("refuses a break admitted by a new freeze row without a date once the freeze is in force", () => {
		const root = inForce();
		put(root, { [REPORT]: "export function a(): string;\n" });
		appendRow(root, "| F2 | (later) | every file of the frozen list | freeze | A60 | a second freeze |");
		const recorded = recordFrozen(root, [REPORT, FORM]);
		expect(recorded.problems).toEqual([]);
		put(root, { [FROZEN_LIST]: listText(recorded.files) });
		commit(root, "a break as a second freeze", "2026-11-20T12:00:00Z");
		expect(freezeProblems(root, [REPORT, FORM])).not.toEqual([]);
	});

	// Finding 2: the gate compares with the text at `base` and never asks whether `base` holds the text recorded before.
	it.fails("refuses a break called an addition whose base is moved to the commit of the break", () => {
		const root = inForce();
		put(root, { [REPORT]: "export function a(): string;\n" });
		appendRow(root, `| F2 | 2026-11-20 | \`${REPORT}\` | addition | A60 | an addition |`);
		const broken = commit(root, "the break", "2026-11-20T12:00:00Z");
		const list = readList(root) ?? [];
		const text = readFileSync(join(root, REPORT), "utf8");
		const forged = list.map((entry) => (entry.path === REPORT ? { ...entry, sha256: sha256(text), base: broken, row: "F2" } : entry));
		put(root, { [FROZEN_LIST]: listText(forged) });
		commit(root, "the list", "2026-11-20T12:05:00Z");
		expect(freezeProblems(root, [REPORT, FORM])).not.toEqual([]);
	});

	// Finding 3: a new required field of a frozen format (old files no longer parse) adds lines only, so it passes as an addition.
	it.fails("refuses a new required field of a frozen format called an addition", () => {
		const root = inForce();
		const required = MANIFEST.replace('\t\t"id": {', '\t\t"budget": {\n\t\t\t"type": "number"\n\t\t},\n\t\t"id": {').replace('\t\t"id",\n', '\t\t"budget",\n\t\t"id",\n');
		put(root, { [FORM]: required });
		appendRow(root, `| F2 | 2026-11-20 | \`${FORM}\` | addition | A60 | a new optional field |`);
		const recorded = recordFrozen(root, [REPORT, FORM]);
		expect(recorded.problems).toEqual([]);
		put(root, { [FROZEN_LIST]: listText(recorded.files) });
		commit(root, "a required field", "2026-11-20T12:00:00Z");
		expect(freezeProblems(root, [REPORT, FORM])).not.toEqual([]);
	});
});

