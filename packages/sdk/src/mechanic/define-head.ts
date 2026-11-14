// SPDX-License-Identifier: Apache-2.0
/**
 * The head of a mechanic: `defineHead` and `defineHandlers` keep the types of what they are given, `erasedHead`
 * turns a head into the data that is read without running a handler, and `definitionIssues` finds what the types
 * cannot refuse (a body that does not fit its head, a state that cannot be started or saved).
 */
import { Type, type TSchema, type TUndefined } from "typebox";
import type { EventSchemas, ServiceDefinition, SwtIssue } from "@swarmtales/contracts";
import { bodyMismatch, stateUnsaved } from "../errors.ts";
import type { PromptKeys } from "./context-types.ts";
import type { ErasedBody } from "./parts.ts";
import type { AnyHead, MechanicHead, None, NoOptions, PluginHead, ShapeOf, ToolHandlers, ToolParams, ToolsOf } from "./types.ts";

/**
 * Declares the head of a mechanic: everything that is data, the tools included. The type of the mechanic follows
 * from the head alone, so helpers outside the body take `CtxOf<typeof head>`.
 *
 * @param head - The head.
 * @returns The same head, with its id, prompts and services as literal types.
 * @example
 * ```ts
 * const head = defineHead({
 * 	id: "counter",
 * 	package: "@example/counter",
 * 	summary: "Counts.",
 * 	state: Type.Object({ count: Type.Integer() }),
 * 	start: () => ({ count: 0 }),
 * 	tools: { add: { description: "Adds one.", params: Type.Object({}), for: ["resident"] } },
 * });
 * ```
 *
 * @public
 */
export function defineHead<
	const Id extends string,
	O extends TSchema = NoOptions,
	Snap extends TSchema = TUndefined,
	C = never,
	E extends EventSchemas = None,
	const P extends PromptKeys = None,
	const R extends readonly ServiceDefinition[] = [],
	const Pv extends readonly ServiceDefinition[] = [],
	const U extends readonly ServiceDefinition[] = [],
	TP extends ToolParams = None,
>(head: MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, TP>): MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, TP> {
	return head;
}

/**
 * Types the handlers of some tools of a head apart from the body, for a body that is split over files: spread the
 * result into the body's `tools`.
 *
 * @param _head - The head that declares the tools; only its type is read.
 * @param handlers - The handlers, by bare tool name.
 * @returns The same handlers.
 *
 * @public
 */
export function defineHandlers<H extends AnyHead, K extends keyof ToolsOf<H> & string>(
	_head: H,
	handlers: { readonly [N in K]: ToolHandlers<ShapeOf<H>, ToolsOf<H>[N]> },
): { readonly [N in K]: ToolHandlers<ShapeOf<H>, ToolsOf<H>[N]> } {
	return handlers;
}

/**
 * Erases a head: fills what was left out and drops its functions (`start`, `snapshot`, `migrations`).
 *
 * @param head - The head.
 * @returns The data of the head; a tool without `for` is in no derived grant, and `free` is false when left out.
 *
 * @internal
 */
export function erasedHead(head: AnyHead): PluginHead {
	return {
		id: head.id,
		package: head.package,
		summary: head.summary,
		options: head.options ?? Type.Object({}, { description: "No options." }),
		state: head.state,
		version: head.version ?? 1,
		events: head.events ?? {},
		audiences: Object.fromEntries(Object.entries(head.audiences ?? {}).flatMap(([type, grants]) => (grants === undefined ? [] : [[type, grants]]))),
		prompts: head.prompts ?? {},
		requires: head.requires ?? [],
		provides: head.provides ?? [],
		uses: head.uses ?? [],
		tools: Object.entries(head.tools ?? {}).map(([name, tool]) => ({ name, description: tool.description, parameters: tool.params, for: tool.for ?? [], free: tool.free ?? false })),
	};
}

// The names on one side that the other side lacks.
function lacking(names: readonly string[], other: Readonly<Record<string, unknown>> | undefined): readonly string[] {
	return names.filter((name) => other === undefined || !Object.hasOwn(other, name) || other[name] === undefined);
}

/**
 * Finds what makes a mechanic unusable and the types let through: a spread or plain JavaScript gets past them.
 *
 * @param head - The head.
 * @param body - The body.
 * @returns One `SWT-M014` when the head has `state` and no `start`, or `start` or `snapshot` and no `state`; one
 * `SWT-M012` per tool or provided service that only the head or only the body holds.
 *
 * @internal
 */
export function definitionIssues(head: AnyHead, body: ErasedBody): readonly SwtIssue[] {
	const at = { mechanic: head.id, package: head.package };
	const declared = { tool: Object.fromEntries(Object.keys(head.tools ?? {}).map((name) => [name, true])), service: Object.fromEntries((head.provides ?? []).map((service) => [service.name, true])) };
	const handled = { tool: body.tools, service: body.services };
	const unsaved = head.state === undefined ? head.start !== undefined || head.snapshot !== undefined : head.start === undefined;
	return [
		...(unsaved ? [stateUnsaved({ ...at, problem: head.state === undefined ? "no-schema" : "no-start" })] : []),
		...(["tool", "service"] as const).flatMap((part) => [
			...lacking(Object.keys(declared[part]), handled[part]).map((name) => bodyMismatch({ ...at, part, name, problem: "missing" })),
			...lacking(Object.keys(handled[part] ?? {}), declared[part]).map((name) => bodyMismatch({ ...at, part, name, problem: "undeclared" })),
		]),
	];
}
