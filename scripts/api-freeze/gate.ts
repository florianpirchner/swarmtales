// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The API freeze gate (section 5.2 of the M5 specification): each frozen file against its row of the frozen list, the
 * row of `docs/API-FREEZE.md` that admitted its text and the decision row that row names. The gate, not the builder,
 * says what a change is: a removed or changed line against the text at the row's `base` is a break, only added lines
 * are an addition, and an addition "docs only" changes comment and description lines only.
 *
 * A freeze row admits the text it found. Before its date cell holds a date, it is refreshed by `--write` with every
 * merge up to the freeze (the base then is only a commit of the history); from its date on, its base must hold the
 * text and be committed on or before that date, so a later change cannot pass as the freeze, and no other freeze row
 * may stand beside it.
 *
 * Decision A116 (issue M5-104) closed four holes the review of M5 found: the base of a change must hold the text the
 * list recorded before it (read from the history of the list, not trusted); a JSON text form is also compared as a
 * schema (`forms.ts`); a file that leaves the list needs a break row; and the owner's go is a cell of its own of the
 * decision row. The set of frozen files is checked against the list of `docs/API-FREEZE.md` by `frozenSetProblems`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { schemaBreaks } from "./forms.ts";
import { type ChangeRow, commitHolding, EVERY_FILE, FREEZE_DOC, FROZEN_FILES_HEADING, FROZEN_LIST, type FrozenEntry, git, KINDS, listHistory, readChanges, readDecisions, readFrozenFiles, readList, sha256, textAt } from "./records.ts";

/** What the gate reads beside the frozen list. */
interface Records {
	readonly root: string;
	readonly changes: ReadonlyMap<string, ChangeRow>;
	readonly decisions: ReadonlyMap<string, string>;
	/** The committed versions of the frozen list, newest first. */
	readonly history: readonly (readonly FrozenEntry[])[];
}

const OWNERS_GO = "the owner's go";

/** Says whether a decision row (`| A<n> | date | decision | evidence |`) has a cell, after its id and date, that is exactly the owner's go. */
const givesOwnersGo = (decision: string): boolean => decision.split("|").slice(3).some((cell) => cell.trim() === OWNERS_GO);

/** A line of a report or a text form that is documentation only: a comment, or a schema's description. */
const isDocsLine = (line: string): boolean => /^\s*(\/\/|"description":)/.test(line);

/** Says whether `now` keeps every line of `before`, in order: then it only adds lines. */
function onlyAdds(before: readonly string[], now: readonly string[]): boolean {
	let next = 0;
	for (const line of now) if (next < before.length && line === before[next]) next += 1;
	return next === before.length;
}

const lines = (text: string): readonly string[] => text.split("\n");
// In a JSON text form a member added after the last one puts a comma behind the line before it (issue M6-04): the
// lines are compared without a trailing comma, and what the comma cannot show is the schema comparison's (`forms.ts`).
// The kernel's revision is a value that each runtime revision raises (`docs/RUNTIME-REVISIONS.md`), not a surface:
// its line is compared without the number (decision A143).
const revisionLine = (line: string): string => line.replace(/^(export (?:declare )?const RUNTIME_REVISION = )\d+;$/, "$1<revision>;");
const formLines = (path: string, text: string): readonly string[] => (path.endsWith(".json") ? lines(text).map((line) => line.replace(/,$/, "")) : lines(text).map(revisionLine));
const apiLines = (text: string): string => lines(text).filter((line) => !isDocsLine(line)).join("\n");

/** Why the row of an entry cannot admit its path, or `undefined`. */
function rowProblem(entry: Pick<FrozenEntry, "path" | "row">, row: ChangeRow | undefined, records: Records): string | undefined {
	if (row === undefined) return `its row ${entry.row} is not in the table "Changes" of ${FREEZE_DOC}`;
	if (!KINDS.some((kind) => kind === row.kind)) return `row ${row.id} has the kind "${row.kind}"; it is one of ${KINDS.join(", ")}`;
	if (row.paths === undefined ? row.kind !== "freeze" : !row.paths.includes(entry.path)) return `row ${row.id} does not name it (only a freeze row may say "${EVERY_FILE}")`;
	const decision = records.decisions.get(row.decision);
	if (decision === undefined) return `row ${row.id} names the decision row "${row.decision}", which section 9 of DECISIONS.md does not hold`;
	if (row.kind === "break" && !givesOwnersGo(decision)) return `row ${row.id} is a break, and its decision row ${row.decision} has no cell "${OWNERS_GO}"`;
	return undefined;
}

/** Why a freeze row in force does not admit the text: its base must hold it, from the freeze's day or before. */
function freezeProblem(entry: FrozenEntry, row: ChangeRow, before: string | undefined, root: string): string | undefined {
	if (row.date === undefined) return undefined;
	const day = git(root, "show", "-s", "--format=%cs", entry.base)?.trim() ?? "";
	const holds = before !== undefined && sha256(before) === entry.sha256 && day <= row.date;
	return holds ? undefined : `row ${row.id} froze the text on ${row.date}, and its base ${entry.base} does not hold this text from that day or before`;
}

/** The entry of the newest earlier version of the list that another row admitted; `undefined` when the path was not listed before. */
function recordedBefore(entry: FrozenEntry, history: Records["history"]): FrozenEntry | undefined {
	for (const version of history) {
		const earlier = version.find((other) => other.path === entry.path);
		if (earlier?.row !== entry.row) return earlier;
	}
	return undefined;
}

/** Why the base of a change does not hold the text the list recorded before the change, or `undefined`. */
function baseProblem(entry: FrozenEntry, before: string | undefined, history: Records["history"]): string | undefined {
	const earlier = recordedBefore(entry, history);
	if (earlier === undefined || (before !== undefined && sha256(before) === earlier.sha256)) return undefined;
	return `its base ${entry.base} does not hold the text that ${FROZEN_LIST} recorded under row ${earlier.row} before row ${entry.row}; the base is the last commit that holds it`;
}

/** Why the text now is not of the kind its row says, against the text at the base, or `undefined`. */
function kindProblem(entry: FrozenEntry, row: ChangeRow, now: string, records: Records): string | undefined {
	const root = records.root;
	const before = textAt(root, entry.base, entry.path);
	if (row.kind === "freeze") return freezeProblem(entry, row, before, root);
	return baseProblem(entry, before, records.history) ?? changeProblem(entry, row, before ?? "", now);
}

/** Why a change by an addition row is not of its kind against the text at the base, or `undefined`. */
function changeProblem(entry: FrozenEntry, row: ChangeRow, before: string, now: string): string | undefined {
	if (row.kind === "addition" && !onlyAdds(formLines(entry.path, before), formLines(entry.path, now))) return `row ${row.id} calls it an addition, but it removes or changes a line of the text at ${entry.base}: that is a break`;
	const breaks = row.kind === "addition" && entry.path.endsWith(".json") ? schemaBreaks(before, now) : [];
	if (breaks.length > 0) return `row ${row.id} calls it an addition, but as a schema it is a break against the text at ${entry.base}: ${breaks.join("; ")}`;
	if (row.kind === "addition: docs only" && apiLines(before) !== apiLines(now)) return `row ${row.id} calls it docs only, but it changes more than comment and description lines against ${entry.base}`;
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
	const kind = kindProblem(entry, row, now, records);
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
	const records: Records = { root, changes: readChanges(root), decisions: readDecisions(root), history: listHistory(root) };
	const listed = new Set(list.map((entry) => entry.path));
	const unlisted = expected.filter((path) => !listed.has(path)).map((path) => `${path}: a frozen surface without a row in ${FROZEN_LIST}; run \`pnpm api:freeze --write\``);
	return [...secondFreezeProblems(records.changes), ...unlisted, ...leftProblems(listed, records), ...list.flatMap((entry) => entryProblems(entry, records))];
}

/** Once a freeze row is dated, every other freeze row of the table: a later change is an addition or a break, never a freeze. */
function secondFreezeProblems(changes: ReadonlyMap<string, ChangeRow>): readonly string[] {
	const freezes = [...changes.values()].filter((row) => row.kind === "freeze");
	const inForce = freezes.find((row) => row.date !== undefined);
	if (inForce === undefined) return [];
	const others = freezes.filter((row) => row.id !== inForce.id);
	return others.map((row) => `${FREEZE_DOC}: row ${row.id} is a second freeze row, and the freeze of row ${inForce.id} is in force since ${inForce.date ?? ""}: a later change is a row of kind addition, "addition: docs only" or break`);
}

/** Every file that an earlier version of the list held and the list now does not, unless the newest row naming it is a break by the owner's go. */
function leftProblems(listed: ReadonlySet<string>, records: Records): readonly string[] {
	const left = new Set(records.history.flat().map((entry) => entry.path).filter((path) => !listed.has(path)));
	return [...left].flatMap((path) => {
		const row = [...records.changes.values()].filter((change) => change.paths?.includes(path) === true).at(-1);
		const why = row?.kind !== "break" ? `no row of kind break names it last` : rowProblem({ path, row: row.id }, row, records);
		return why === undefined ? [] : [`${path}: it left ${FROZEN_LIST}, and ${why}`];
	});
}

/**
 * Checks the set of the frozen files that `surface.ts` names against the list of the section "The frozen files" of
 * `docs/API-FREEZE.md`, so that a file cannot leave or enter the freeze by a change of the code alone.
 *
 * @param root - The repository root.
 * @param paths - The frozen files the code names (`frozenPaths()`).
 * @returns The problems; empty when both name the same files.
 */
export function frozenSetProblems(root: string, paths: readonly string[]): readonly string[] {
	const listed = readFrozenFiles(root);
	if (listed === undefined) return [`${FREEZE_DOC} holds no section "${FROZEN_FILES_HEADING.slice(3)}"`];
	if (listed.length === 0) return [`${FREEZE_DOC}: the section "${FROZEN_FILES_HEADING.slice(3)}" lists no file: a gate never passes on nothing`];
	const missing = paths.filter((path) => !listed.includes(path)).map((path) => `${path}: frozen by surface.ts, and not in the list of ${FREEZE_DOC}`);
	const extra = listed.filter((path) => !paths.includes(path)).map((path) => `${path}: in the list of ${FREEZE_DOC}, and not frozen by surface.ts`);
	return [...missing, ...extra];
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
