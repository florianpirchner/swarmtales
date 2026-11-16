// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The three records the freeze gate reads (section 5.2 of the M5 specification): the frozen list
 * `scripts/api-freeze/frozen.json`, the table "Changes" of `docs/API-FREEZE.md` and the decision rows of section 9 of
 * `DECISIONS.md`; and the git history the gate compares against.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

/** The frozen list. */
export const FROZEN_LIST = "scripts/api-freeze/frozen.json";
/** The record of the changes of the frozen files. */
export const FREEZE_DOC = "docs/API-FREEZE.md";
/** The decisions; their section 9 holds the rows `A<n>`. */
export const DECISIONS_DOC = "docs/refactoring-before-release/DECISIONS.md";
/** The cell of a freeze row that names every file of the list. */
export const EVERY_FILE = "every file of the frozen list";

const EntrySchema = Type.Object(
	{
		path: Type.String({ description: "The frozen file, from the repository root" }),
		sha256: Type.String({ pattern: "^[0-9a-f]{64}$", description: "The sha256 of its committed text" }),
		base: Type.String({ pattern: "^[0-9a-f]{40}$", description: "A commit that holds the text before its last recorded change" }),
		row: Type.String({ pattern: "^F[0-9]+$", description: "The row of docs/API-FREEZE.md that admitted the text" }),
	},
	{ additionalProperties: false, description: "One frozen file" },
);
const ListSchema = Type.Object({ files: Type.Array(EntrySchema, { description: "The frozen files, by path" }) }, { additionalProperties: false, description: "The frozen list" });

/** One row of the frozen list. */
export type FrozenEntry = Static<typeof EntrySchema>;

/** The kinds of a row of `docs/API-FREEZE.md`. */
export const KINDS = ["freeze", "addition", "addition: docs only", "break"] as const;

/** One row of the table "Changes" of `docs/API-FREEZE.md`. */
export interface ChangeRow {
	readonly id: string;
	/** `YYYY-MM-DD`, or `undefined` while the cell holds no date (a freeze row before it is in force). */
	readonly date: string | undefined;
	/** The paths it names; `undefined` for a freeze row over every file of the list. */
	readonly paths: readonly string[] | undefined;
	readonly kind: string;
	readonly decision: string;
}

/**
 * Reads the frozen list.
 *
 * @param root - The repository root.
 * @returns The rows, or `undefined` when the file is missing or does not match its schema.
 */
export function readList(root: string): readonly FrozenEntry[] | undefined {
	const path = join(root, FROZEN_LIST);
	return existsSync(path) ? parseList(readFileSync(path, "utf8")) : undefined;
}

/** The rows of a text of the frozen list, or `undefined` when it is no JSON or does not match the schema. */
function parseList(text: string | undefined): readonly FrozenEntry[] | undefined {
	if (text === undefined) return undefined;
	try {
		const value: unknown = JSON.parse(text);
		return Value.Check(ListSchema, value) ? value.files : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Every committed version of the frozen list that `HEAD` reaches, newest first; a version that does not match the
 * schema is left out.
 *
 * @param root - The repository root (a git checkout with its whole history).
 * @returns The rows of each version.
 */
export function listHistory(root: string): readonly (readonly FrozenEntry[])[] {
	const commits = git(root, "log", "--format=%H", "--", FROZEN_LIST)?.split("\n").filter((line) => line !== "") ?? [];
	return commits.flatMap((commit) => {
		const files = parseList(textAt(root, commit, FROZEN_LIST));
		return files === undefined ? [] : [files];
	});
}

/** The heading of the section of `docs/API-FREEZE.md` that lists the frozen files. */
export const FROZEN_FILES_HEADING = "## The frozen files";

/**
 * Reads the list of the frozen files of `docs/API-FREEZE.md`: the paths in backticks of the items (`- `) of its
 * section "The frozen files".
 *
 * @param root - The repository root.
 * @returns The paths in the order of the list, or `undefined` when the document or the section is missing.
 */
export function readFrozenFiles(root: string): readonly string[] | undefined {
	const path = join(root, FREEZE_DOC);
	if (!existsSync(path)) return undefined;
	const section = readFileSync(path, "utf8")
		.split(/^(?=## )/m)
		.find((text) => text.startsWith(`${FROZEN_FILES_HEADING}\n`));
	return section?.split("\n").flatMap((line) => {
		const item = /^- `([^`]+)`\s*$/.exec(line)?.[1];
		return item === undefined ? [] : [item];
	});
}

/**
 * The text of the frozen list.
 *
 * @param files - The rows.
 * @returns The JSON text, sorted by path.
 */
export function listText(files: readonly FrozenEntry[]): string {
	const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path, "en")).map(({ path, sha256, base, row }) => ({ path, sha256, base, row }));
	return `${JSON.stringify({ files: sorted }, null, "\t")}\n`;
}

/** One line of the table as a row (`| F<n> | date | paths | kind | decision | what |`), or `undefined`. */
function changeRow(line: string): ChangeRow | undefined {
	const cells = /^\| (F[0-9]+) \|(.*)\|\s*$/.exec(line);
	if (cells?.[1] === undefined || cells[2] === undefined) return undefined;
	const [date = "", paths = "", kind = "", decision = ""] = cells[2].split("|").map((cell) => cell.trim());
	const named = [...paths.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
	return { id: cells[1], date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined, paths: paths === EVERY_FILE ? undefined : named, kind, decision };
}

/**
 * Reads the table "Changes" of `docs/API-FREEZE.md`.
 *
 * @param root - The repository root.
 * @returns The rows by id, in the order of the table.
 */
export function readChanges(root: string): ReadonlyMap<string, ChangeRow> {
	const path = join(root, FREEZE_DOC);
	if (!existsSync(path)) return new Map();
	const rows = readFileSync(path, "utf8").split("\n").map(changeRow).filter((row) => row !== undefined);
	return new Map(rows.map((row) => [row.id, row]));
}

/**
 * Reads the decision rows of section 9 of `DECISIONS.md`.
 *
 * @param root - The repository root.
 * @returns The text of each row by its id (`A60`).
 */
export function readDecisions(root: string): ReadonlyMap<string, string> {
	const path = join(root, DECISIONS_DOC);
	const rows = new Map<string, string>();
	if (!existsSync(path)) return rows;
	const text = readFileSync(path, "utf8");
	const start = text.search(/^## 9\. /m);
	if (start < 0) return rows;
	for (const line of text.slice(start).split("\n")) {
		const id = /^\| (A[0-9]+) \|/.exec(line)?.[1];
		if (id !== undefined) rows.set(id, line);
	}
	return rows;
}

/**
 * The sha256 of a text.
 *
 * @param text - The text.
 * @returns The hash in hex.
 */
export function sha256(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

/**
 * Runs git in a repository.
 *
 * @param root - The repository root.
 * @param args - The arguments.
 * @returns The output, or `undefined` when git fails.
 */
export function git(root: string, ...args: readonly string[]): string | undefined {
	try {
		return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
	} catch {
		return undefined;
	}
}

/**
 * The text of a file at a commit.
 *
 * @param root - The repository root.
 * @param commit - The commit.
 * @param path - The file.
 * @returns The text, or `undefined` when the commit does not hold the file.
 */
export function textAt(root: string, commit: string, path: string): string | undefined {
	return git(root, "show", `${commit}:${path}`);
}

/**
 * The newest commit that `HEAD` reaches and that holds a text of a file.
 *
 * @param root - The repository root.
 * @param path - The file.
 * @param hash - The sha256 of the text.
 * @returns The commit id, or `undefined` when no commit holds it.
 */
export function commitHolding(root: string, path: string, hash: string): string | undefined {
	const head = git(root, "rev-parse", "HEAD")?.trim();
	const changes = git(root, "log", "--format=%H", "--", path)?.split("\n").filter((line) => line !== "") ?? [];
	return [head, ...changes].find((commit) => {
		const text = commit === undefined ? undefined : textAt(root, commit, path);
		return text !== undefined && sha256(text) === hash;
	});
}
