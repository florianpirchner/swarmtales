// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Findings 1 to 3 and 8 of the challenger's review of M5 (`docs/M5-REVIEW.md`): ways a frozen file changes in a way
 * that breaks its users, or leaves the freeze, while the gate passed. The tests of findings 1 to 3 were committed as
 * `it.fails`; issue M5-104 (decision A116) closed the holes and turned them into `it`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { freezeProblems, frozenSetProblems, recordFrozen } from "../api-freeze/gate.ts";
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
function inForce(report = "export function a(): void;\n\nexport function b(): void;\n"): string {
	const root = mkdtempSync(join(tmpdir(), "swt-freeze-review-"));
	roots.push(root);
	git(root, "init", "-q");
	git(root, "config", "user.email", "test@example.com");
	git(root, "config", "user.name", "Test");
	put(root, { [DECISIONS_DOC]: DECISIONS, [REPORT]: report, [FORM]: MANIFEST, [FREEZE_DOC]: TABLE });
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
	it("refuses a break admitted by a new freeze row without a date once the freeze is in force", () => {
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
	it("refuses a break called an addition whose base is moved to the commit of the break", () => {
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
	it("refuses a new required field of a frozen format called an addition", () => {
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

	// The other side of finding 3: an optional field stays an addition, a constraint on a field that was there is a break.
	it("passes a new optional field of a frozen format as an addition, and refuses a constraint added to an old field", () => {
		const root = inForce();
		const optional = MANIFEST.replace('\t\t"id": {', '\t\t"budget": {\n\t\t\t"type": "number"\n\t\t},\n\t\t"id": {');
		put(root, { [FORM]: optional });
		appendRow(root, `| F2 | 2026-11-20 | \`${FORM}\` | addition | A60 | a new optional field |`);
		put(root, { [FROZEN_LIST]: listText(recordFrozen(root, [REPORT, FORM]).files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([]);
		put(root, { [FORM]: optional.replace('\t\t"id": {\n\t\t\t"type": "string"', '\t\t"id": {\n\t\t\t"minLength": 1,\n\t\t\t"type": "string"') });
		put(root, { [FROZEN_LIST]: listText(recordFrozen(root, [REPORT, FORM]).files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining("as a schema it is a break against the text at")]);
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining('#/properties/id: "minLength" is added')]);
	});

	// Issue M6-04: a member added after the last one puts a comma behind the line before; that alone is no break, a removed member still is.
	it("passes a field added after the last one of a frozen format as an addition, and still refuses a removed one", () => {
		const root = inForce();
		const last = MANIFEST.replace('\t\t\t"type": "number"\n\t\t}\n\t},', '\t\t\t"type": "number"\n\t\t},\n\t\t"tag": {\n\t\t\t"type": "string"\n\t\t}\n\t},');
		put(root, { [FORM]: last });
		appendRow(root, `| F2 | 2026-11-20 | \`${FORM}\` | addition | A60 | a new last field |`);
		put(root, { [FROZEN_LIST]: listText(recordFrozen(root, [REPORT, FORM]).files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([]);
		put(root, { [FORM]: last.replace('\t\t"seed": {\n\t\t\t"type": "number"\n\t\t},\n', "") });
		put(root, { [FROZEN_LIST]: listText(recordFrozen(root, [REPORT, FORM]).files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining("removes or changes a line")]);
	});

	// Issue M6-16, decision A143: a runtime revision raises the kernel's revision value; that alone is no break, another value still is.
	it("passes a raised RUNTIME_REVISION as an addition, and still refuses another changed value", () => {
		const root = inForce("export const RUNTIME_REVISION = 7;\n\nexport const LIMIT = 3;\n");
		put(root, { [REPORT]: "export const RUNTIME_REVISION = 8;\n\nexport const LIMIT = 3;\n" });
		appendRow(root, `| F2 | 2026-11-20 | \`${REPORT}\` | addition | A60 | revision 8 |`);
		put(root, { [FROZEN_LIST]: listText(recordFrozen(root, [REPORT, FORM]).files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([]);
		put(root, { [REPORT]: "export const RUNTIME_REVISION = 8;\n\nexport const LIMIT = 4;\n" });
		put(root, { [FROZEN_LIST]: listText(recordFrozen(root, [REPORT, FORM]).files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining("removes or changes a line")]);
	});
});

describe("the frozen set and the owner's go, attacked by the review of M5 (finding 8)", () => {
	it("refuses a frozen set of surface.ts that is not the list of docs/API-FREEZE.md", () => {
		const root = inForce();
		expect(frozenSetProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining('holds no section "The frozen files"')]);
		put(root, { [FREEZE_DOC]: `${readFileSync(join(root, FREEZE_DOC), "utf8")}\n## The frozen files\n\n- \`${REPORT}\`\n` });
		expect(frozenSetProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining(`${FORM}: frozen by surface.ts, and not in the list`)]);
		expect(frozenSetProblems(root, [])).toEqual([expect.stringContaining(`${REPORT}: in the list of ${FREEZE_DOC}, and not frozen by surface.ts`)]);
		expect(frozenSetProblems(root, [REPORT])).toEqual([]);
	});

	it("refuses a file that leaves the frozen list without a break row by the owner's go", () => {
		const root = inForce();
		put(root, { [FROZEN_LIST]: listText((readList(root) ?? []).filter((entry) => entry.path !== FORM)) });
		commit(root, "the form unfrozen", "2026-11-20T12:00:00Z");
		expect(freezeProblems(root, [REPORT])).toEqual([expect.stringContaining(`${FORM}: it left ${FROZEN_LIST}`)]);
		put(root, { [DECISIONS_DOC]: `${DECISIONS}| A61 | 2026-11-20 | The form leaves the freeze | the owner's go |\n` });
		appendRow(root, `| F2 | 2026-11-20 | \`${FORM}\` | break | A61 | the form leaves |`);
		expect(freezeProblems(root, [REPORT])).toEqual([]);
	});

	it("takes the owner's go only from a cell of its own of the decision row", () => {
		const root = inForce();
		put(root, { [REPORT]: "export function a(): string;\n", [DECISIONS_DOC]: `${DECISIONS}| A61 | 2026-11-20 | A break without the owner's go | x |\n` });
		appendRow(root, `| F2 | 2026-11-20 | \`${REPORT}\` | break | A61 | a break |`);
		const recorded = recordFrozen(root, [REPORT, FORM]);
		expect(recorded.problems).toEqual([]);
		put(root, { [FROZEN_LIST]: listText(recorded.files) });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([expect.stringContaining(`row F2 is a break, and its decision row A61 has no cell "the owner's go"`)]);
		put(root, { [DECISIONS_DOC]: `${DECISIONS}| A61 | 2026-11-20 | A break | the owner's go |\n` });
		expect(freezeProblems(root, [REPORT, FORM])).toEqual([]);
	});
});

