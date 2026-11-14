// SPDX-License-Identifier: Apache-2.0
/**
 * View descriptors: a mechanic ships `views.json` naming an event type and the paths of its fields,
 * and the viewer draws it with one of its fixed renderers (`kind`). The descriptor holds no code and
 * no game words of the viewer's own.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

/** One view of a mechanic: an event type, the paths of its fields and the renderer that draws them. */
export const ViewDescriptorSchema = Type.Object(
	{
		/** Unique within a run; also the key of the panel. */
		id: Type.String({ minLength: 1 }),
		title: Type.Optional(Type.String()),
		/** The renderer: `board-fen` draws an 8x8 board from a FEN field. Unknown kinds are ignored by the viewer. */
		kind: Type.String({ minLength: 1 }),
		/** The event type that carries the state; the view shows the last one at or before the current seq. */
		event: Type.String({ minLength: 1 }),
		/** Renderer inputs: name to a dotted path into the event (`fen`, `move.to`; a leading `$.` is allowed). */
		fields: Type.Record(Type.String(), Type.String()),
	},
	{ additionalProperties: false },
);
/**
 * One view of a mechanic.
 *
 * @public
 */
export type ViewDescriptor = Static<typeof ViewDescriptorSchema>;

/**
 * The descriptors of a `views.json` and what could not be read.
 *
 * @public
 */
export interface ParsedViews {
	/** The entries that are view descriptors. */
	readonly views: readonly ViewDescriptor[];
	/** One sentence per entry that is none. */
	readonly issues: readonly string[];
}

// The list of a parsed `views.json`: the value itself, or its `views` field.
function listOf(parsed: unknown): unknown {
	if (Array.isArray(parsed)) return parsed;
	return typeof parsed === "object" && parsed !== null && "views" in parsed ? parsed.views : undefined;
}

/**
 * Reads a `views.json` text: a list of descriptors, or `{ "views": [...] }`. A bad entry becomes an issue, the rest is kept.
 *
 * @param text - The text of the file.
 * @param source - The name of the file, for the issues.
 * @returns The descriptors and one issue per entry that is none.
 * @public
 */
export function parseViews(text: string, source = "views.json"): ParsedViews {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		return { views: [], issues: [`${source}: ${error instanceof Error ? error.message : "not JSON"}`] };
	}
	const list = listOf(parsed);
	if (!Array.isArray(list)) return { views: [], issues: [`${source}: expected a list of views`] };
	const views: ViewDescriptor[] = [];
	const issues: string[] = [];
	for (const [index, entry] of list.entries()) {
		if (Check(ViewDescriptorSchema, entry)) views.push(entry);
		else issues.push(`${source}: entry ${String(index)} is not a view descriptor`);
	}
	return { views, issues };
}

/**
 * The value at a dotted path (`fen`, `a.b.0`, `$.fen`) of an event's data.
 *
 * @param data - The data of the event.
 * @param path - The dotted path.
 * @returns The value, or `undefined` when the path leads nowhere.
 */
export function pathValue(data: unknown, path: string): unknown {
	let value: unknown = data;
	for (const part of path.replace(/^\$\.?/, "").split(".")) {
		if (part === "") continue;
		if (Array.isArray(value)) value = value[Number(part)];
		else if (typeof value === "object" && value !== null) value = Object.entries(value).find(([key]) => key === part)?.[1];
		else return undefined;
	}
	return value;
}

/**
 * A field of a descriptor read from an event as text (numbers are written out); undefined when absent.
 *
 * @param view - The descriptor.
 * @param name - The name of the field.
 * @param data - The data of the event.
 * @returns The text, or `undefined`.
 */
export function viewText(view: ViewDescriptor, name: string, data: unknown): string | undefined {
	const path = Object.entries(view.fields).find(([key]) => key === name)?.[1];
	if (path === undefined) return undefined;
	const value = pathValue(data, path);
	return typeof value === "string" ? value : typeof value === "number" ? String(value) : undefined;
}
