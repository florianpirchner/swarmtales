// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The API freeze gate (section 5.2 of the M5 specification): each frozen file against its row of the frozen list, the
 * row of `docs/API-FREEZE.md` that admitted its text and the decision row that row names. The gate, not the builder,
 * says what a change is: a removed or changed line against the text at the row's `base` is a break, only added lines
 * are an addition, and an addition "docs only" changes comment and description lines only.
 *
 * A freeze row admits the text it found. Before its date cell holds a date, it is refreshed by `--write` with every
 * merge up to the freeze (the base then is only a commit of the history); from its date on, its base must hold the
 * text and be committed on or before that date, so a later change cannot pass as the freeze.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type ChangeRow, commitHolding, EVERY_FILE, FREEZE_DOC, FROZEN_LIST, type FrozenEntry, git, KINDS, readChanges, readDecisions, readList, sha256, textAt } from "./records.ts";

/** What the gate reads beside the frozen list. */
interface Records {
	readonly root: string;
	readonly changes: ReadonlyMap<string, ChangeRow>;
	readonly decisions: ReadonlyMap<string, string>;
}

const OWNERS_GO = "the owner's go";

/** A line of a report or a text form that is documentation only: a comment, or a schema's description. */
const isDocsLine = (line: string): boolean => /^\s*(\/\/|"description":)/.test(line);

/** Says whether `now` keeps every line of `before`, in order: then it only adds lines. */
function onlyAdds(before: readonly string[], now: readonly string[]): boolean {
	let next = 0;
	for (const line of now) if (next < before.length && line === before[next]) next += 1;
	return next === before.length;
}

const lines = (text: string): readonly string[] => text.split("\n");
const apiLines = (text: string): string => lines(text).filter((line) => !isDocsLine(line)).join("\n");

/** Why the row of an entry cannot admit its path, or `undefined`. */
function rowProblem(entry: FrozenEntry, row: ChangeRow | undefined, records: Records): string | undefined {
	if (row === undefined) return `its row ${entry.row} is not in the table "Changes" of ${FREEZE_DOC}`;
	if (!KINDS.some((kind) => kind === row.kind)) return `row ${row.id} has the kind "${row.kind}"; it is one of ${KINDS.join(", ")}`;
	if (row.paths === undefined ? row.kind !== "freeze" : !row.paths.includes(entry.path)) return `row ${row.id} does not name it (only a freeze row may say "${EVERY_FILE}")`;
	const decision = records.decisions.get(row.decision);
	if (decision === undefined) return `row ${row.id} names the decision row "${row.decision}", which section 9 of DECISIONS.md does not hold`;
	if (row.kind === "break" && !decision.includes(OWNERS_GO)) return `row ${row.id} is a break, and its decision row ${row.decision} does not say "${OWNERS_GO}"`;
	return undefined;
}

/** Why a freeze row in force does not admit the text: its base must hold it, from the freeze's day or before. */
function freezeProblem(entry: FrozenEntry, row: ChangeRow, before: string | undefined, root: string): string | undefined {
	if (row.date === undefined) return undefined;
	const day = git(root, "show", "-s", "--format=%cs", entry.base)?.trim() ?? "";
	const holds = before !== undefined && sha256(before) === entry.sha256 && day <= row.date;
	return holds ? undefined : `row ${row.id} froze the text on ${row.date}, and its base ${entry.base} does not hold this text from that day or before`;
}

/** Why the text now is not of the kind its row says, against the text at the base, or `undefined`. */
function kindProblem(entry: FrozenEntry, row: ChangeRow, now: string, root: string): string | undefined {
	const before = textAt(root, entry.base, entry.path);
	if (row.kind === "freeze") return freezeProblem(entry, row, before, root);
	if (row.kind === "addition" && !onlyAdds(lines(before ?? ""), lines(now))) return `row ${row.id} calls it an addition, but it removes or changes a line of the text at ${entry.base}: that is a break`;
	if (row.kind === "addition: docs only" && apiLines(before ?? "") !== apiLines(now)) return `row ${row.id} calls it docs only, but it changes more than comment and description lines against ${entry.base}`;
	return undefined;
}

/** The problems of one entry of the frozen list. */
function entryProblems(entry: FrozenEntry, records: Records): readonly string[] {
	const path = join(records.root, entry.path);
	if (!existsSync(path)) return [`${entry.path}: the frozen file is missing`];
	const now = readFileSync(path, "utf8");
	if (sha256(now) !== entry.sha256) return [`${entry.path}: the text is not the one recorded in ${FROZEN_LIST}: add a row to ${FREEZE_DOC} and run \`pnpm api:freeze --write\``];
	const row = records.changes.get(entry.row);
	const problem = rowProblem(entry, row, records);
	if (problem !== undefined || row === undefined) return [`${entry.path}: ${problem ?? ""}`];
	if (git(records.root, "merge-base", "--is-ancestor", entry.base, "HEAD") === undefined) return [`${entry.path}: its base ${entry.base} is not a commit that HEAD reaches`];
	const kind = kindProblem(entry, row, now, records.root);
	return kind === undefined ? [] : [`${entry.path}: ${kind}`];
}

/**
 * Checks the frozen files against the frozen list.
 *
 * @param root - The repository root (a git checkout with its whole history).
 * @param expected - The paths that must have a row; none when left out.
 * @returns The problems; empty when the gate passes.
 */
export function freezeProblems(root: string, expected: readonly string[] = []): readonly string[] {
	const list = readList(root);
	if (list === undefined) return [`${FROZEN_LIST} is missing or does not match its schema`];
	if (list.length === 0) return [`${FROZEN_LIST} lists no file: a gate never passes on nothing`];
	const records: Records = { root, changes: readChanges(root), decisions: readDecisions(root) };
	const listed = new Set(list.map((entry) => entry.path));
	const unlisted = expected.filter((path) => !listed.has(path)).map((path) => `${path}: a frozen surface without a row in ${FROZEN_LIST}; run \`pnpm api:freeze --write\``);
	return [...unlisted, ...list.flatMap((entry) => entryProblems(entry, records))];
}

/** The newest row of the table that names a path (a freeze row over every file names each). */
function newestRow(changes: ReadonlyMap<string, ChangeRow>, path: string): ChangeRow | undefined {
	return [...changes.values()].filter((row) => (row.paths === undefined ? row.kind === "freeze" : row.paths.includes(path))).at(-1);
}

/** The new entry of a path whose text changed, or why there is none. */
function recorded(root: string, path: string, old: FrozenEntry | undefined, changes: ReadonlyMap<string, ChangeRow>): FrozenEntry | string {
	const hash = sha256(readFileSync(join(root, path), "utf8"));
	const row = newestRow(changes, path);
	const head = git(root, "rev-parse", "HEAD")?.trim() ?? "";
	if (row === undefined) return `${path}: no row of ${FREEZE_DOC} names it; add one`;
	if (row.kind === "freeze" && row.date !== undefined) return `${path}: the freeze of row ${row.id} is in force since ${row.date}; add a row of kind addition or break`;
	if (row.kind === "freeze") return { path, sha256: hash, base: commitHolding(root, path, hash) ?? head, row: row.id };
	const base = changeBase(root, path, old, row, head);
	return base === undefined ? `${path}: no commit holds the text recorded before` : { path, sha256: hash, base, row: row.id };
}

/** An entry whose text did not change; under a freeze row without a date, its base moves to the newest commit that holds it. */
function kept(root: string, entry: FrozenEntry, changes: ReadonlyMap<string, ChangeRow>): FrozenEntry {
	const row = changes.get(entry.row);
	const open = row?.kind === "freeze" && row.date === undefined;
	return open ? { ...entry, base: commitHolding(root, entry.path, entry.sha256) ?? entry.base } : entry;
}

/** The base of a change by an addition or break row: the last commit that holds the text recorded before. */
function changeBase(root: string, path: string, old: FrozenEntry | undefined, row: ChangeRow, head: string): string | undefined {
	if (old === undefined) return head;
	// The same row again: the change is still being made, and is still compared with the text before it.
	return old.row === row.id ? old.base : commitHolding(root, path, old.sha256);
}

/**
 * Records the text now of every frozen file whose text changed (`pnpm api:freeze --write`): the new hash, the newest
 * row of `docs/API-FREEZE.md` that names the file, and as base the last commit that holds the text recorded before
 * (for a freeze row before its date: the newest commit that holds the text now, else `HEAD`).
 *
 * @param root - The repository root.
 * @param paths - Every file of the frozen list.
 * @returns The new rows of the list, and why a file could not be recorded.
 */
export function recordFrozen(root: string, paths: readonly string[]): { readonly files: readonly FrozenEntry[]; readonly problems: readonly string[] } {
	const old = new Map((readList(root) ?? []).map((entry) => [entry.path, entry]));
	const changes = readChanges(root);
	const files: FrozenEntry[] = [];
	const problems: string[] = [];
	for (const path of paths) {
		const before = old.get(path);
		const unchanged = before !== undefined && existsSync(join(root, path)) && sha256(readFileSync(join(root, path), "utf8")) === before.sha256;
		const entry = !existsSync(join(root, path)) ? `${path}: the frozen file is missing` : unchanged ? kept(root, before, changes) : recorded(root, path, before, changes);
		if (typeof entry === "string") problems.push(entry);
		else files.push(entry);
	}
	return { files, problems };
}
