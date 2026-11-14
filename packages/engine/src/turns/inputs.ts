// SPDX-License-Identifier: Apache-2.0
/** The order of an activation's input lines (specification of M1, section 4.2). */
import type { InputNote, OrderedNote } from "@swarmtales/contracts";
import type { InputEntry } from "./options.ts";

// The note as shown: without its sort key, and without a `kind` field when it has no kind.
function plain(note: OrderedNote): InputNote {
	return note.kind === undefined ? { source: note.source, text: note.text } : { source: note.source, kind: note.kind, text: note.text };
}

// The lines of one kind, sorted by `order` (0 when left out; the sort is stable), as one line when `join` is set.
function ofKind(notes: readonly OrderedNote[], kind: string, join: string | undefined): readonly InputNote[] {
	const lines = notes
		.filter((note) => note.kind === kind)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map(plain);
	if (lines.length === 0 || join === undefined) return lines;
	const source = [...new Set(lines.map((note) => note.source))].join("+");
	return [{ source, kind, text: lines.map((note) => note.text).join(join) }];
}

/**
 * Arranges the input lines of one activation: the entries in list order, then the lines no entry takes, in hook
 * order. A `{ kind }` entry takes the lines of that kind, sorted by their `order` and joined into one line when
 * `join` is set (its source is the sources joined by `+`). A `{ source }` entry takes the lines of that plugin
 * that no `{ kind }` entry of the list takes, in hook order.
 *
 * @param notes - The lines of every `inputs` hook, in hook order.
 * @param entries - The `inputs` option of the scheduler.
 * @returns The lines as shown, without their sort keys.
 * @example
 * ```ts
 * arrange(notes, [{ kind: "status", join: " · " }, { source: "team-channel" }]);
 * ```
 * @public
 */
export function arrange(notes: readonly OrderedNote[], entries: readonly InputEntry[]): readonly InputNote[] {
	const kinds = new Set(entries.flatMap((entry) => ("kind" in entry ? [entry.kind] : [])));
	const sources = new Set(entries.flatMap((entry) => ("kind" in entry ? [] : [entry.source])));
	const byKind = (note: OrderedNote): boolean => note.kind !== undefined && kinds.has(note.kind);
	const listed = entries.flatMap((entry): readonly InputNote[] => {
		if ("kind" in entry) return ofKind(notes, entry.kind, entry.join);
		return notes.filter((note) => note.source === entry.source && !byKind(note)).map(plain);
	});
	const rest = notes.filter((note) => !byKind(note) && !sources.has(note.source));
	return [...listed, ...rest.map(plain)];
}
