// SPDX-License-Identifier: Apache-2.0
/**
 * `defineMechanic(head, body)`: checks that the body fits the head, and gives the definition a game lists. Its
 * `resolve` binds parsed options and the texts into the plugin the kernel loads; `create` then builds the state of
 * one run and binds every entry of the head and the body through the kit.
 */
import type { TSchema } from "typebox";
import { Clone, Default, Errors } from "typebox/value";
import { closest, nameOf, SwtError, type JsonValue, type PluginInstance, type PluginPort, type PromptLookup, type ResolvedPlugin } from "@swarmtales/contracts";
import { optionMismatch, optionsNoObject } from "../errors.ts";
import { convertArguments } from "./arguments.ts";
import { contextFor, RESIDENT_KIND, viewFor } from "./context.ts";
import type { MechanicShape } from "./context-types.ts";
import { definitionIssues, erasedHead } from "./define-head.ts";
import { bindHooks, bindStages } from "./hooks.ts";
import { createKit } from "./kit.ts";
import type { ErasedBody, InstanceParts } from "./parts.ts";
import type { AnyHead, DefinitionOf, MechanicBody, MechanicDefinition, None, PluginHead, ShapeOf, ToolsOf } from "./types.ts";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const proto: unknown = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

function isJson(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every((item: unknown) => isJson(item));
	return isRecord(value) && Object.values(value).every((item) => isJson(item));
}

// The properties of an object schema; undefined when the schema is no object.
function propertiesOf(schema: TSchema): Readonly<Record<string, unknown>> | undefined {
	return "type" in schema && schema.type === "object" && "properties" in schema && isRecord(schema.properties) ? schema.properties : undefined;
}

// `/board/0/size` as `options.board[0].size`.
function optionPath(pointer: string): string {
	return pointer.split("/").slice(1).reduce((path, part) => (/^\d+$/.test(part) ? `${path}[${part}]` : `${path}.${part}`), "options");
}

// The options with defaults filled; every problem is one `SWT-G020` whose path is relative to the use.
function parseOptions(head: PluginHead, raw: unknown): JsonValue {
	const at = { owner: head.id, package: head.package };
	const known = Object.keys(propertiesOf(head.options) ?? {});
	if (raw !== undefined && raw !== null && !isRecord(raw)) throw new SwtError(optionMismatch({ ...at, path: "options", message: "must be an object" }));
	// An option given as `undefined` is an option left out.
	const given = Object.entries(raw ?? {}).filter(([, value]) => value !== undefined);
	const unknown = given.flatMap(([key]) => {
		if (known.includes(key)) return [];
		const near = closest(key, known);
		return [optionMismatch({ ...at, path: `options.${key}`, message: near === undefined ? "is unknown" : `is unknown; did you mean "${near}"?` })];
	});
	// Defaults go into a copy: the game's own option objects stay as the author wrote them.
	const value: unknown = Default(head.options, Clone(Object.fromEntries(given.filter(([key]) => known.includes(key)))));
	const paths = new Set<string>();
	const wrong = Errors(head.options, value).flatMap((error) => {
		if (paths.has(error.instancePath)) return [];
		paths.add(error.instancePath);
		return [optionMismatch({ ...at, path: optionPath(error.instancePath), message: error.message })];
	});
	if (unknown.length + wrong.length > 0) throw new SwtError([...unknown, ...wrong]);
	if (!isJson(value)) throw new SwtError(optionMismatch({ ...at, path: "options", message: "must be plain JSON data" }));
	return value;
}

// The instance of one run: the state of a fresh run, then every entry of the head and the body through the kit.
function create(head: AnyHead, erased: PluginHead, body: ErasedBody, options: unknown, texts: PromptLookup, port: PluginPort): PluginInstance {
	const setup = { options, residents: port.actors.ofKind(RESIDENT_KIND).map(nameOf), seed: port.seed, rng: port.rng.bind(port) };
	const parts: InstanceParts<MechanicShape> = { port, head: erased, options, state: { value: head.start?.(setup) }, setup, texts };
	const kit = createKit(parts, { contextFor, viewFor, convertArguments });
	const ctx = contextFor(parts);
	const { snapshot, migrations } = head;
	return {
		tools: erased.tools.flatMap((declared) => {
			const handlers = body.tools?.[declared.name];
			return handlers === undefined ? [] : [kit.tool(declared, handlers)];
		}),
		services: erased.provides.flatMap((service) => {
			const implementation = body.services?.[service.name];
			return implementation === undefined ? [] : [kit.provide(service, implementation)];
		}),
		listeners: body.listeners?.(kit) ?? [],
		hooks: bindHooks(parts, body.hooks),
		stages: bindStages(parts, body.pipeline),
		jobs: Object.fromEntries(
			Object.entries(body.jobs ?? {}).map(([name, job]) => [
				name,
				(data: JsonValue | undefined): void => {
					job(ctx, data);
				},
			]),
		),
		limits: Object.entries(body.limits ?? {}).map(([id, limit]) => kit.limit(id, limit)),
		facts: Object.fromEntries(Object.entries(body.facts ?? {}).map(([name, fact]) => [name, kit.fact(fact)])),
		slice: erased.state === undefined ? undefined : kit.slice({ version: erased.version, schema: erased.state, ...(snapshot === undefined ? {} : { snapshot }), ...(migrations === undefined ? {} : { migrations }) }),
	};
}

/**
 * Defines a mechanic from its head and its body. The body holds handlers only, keyed by the names the head
 * declared: `tools`, `services`, `listeners`, `facts`, `limits`, `jobs`, `hooks`, `pipeline`.
 *
 * @param head - The head, from `defineHead`.
 * @param body - The body.
 * @returns The definition: calling it gives the use for a game's `mechanics` list. Its `parseOptions` throws an
 * `SwtError` with one `SWT-G020` per option that is unknown or does not match the schema, each with a path relative
 * to the use (`options.size`); its `resolve` takes options that were parsed and parses nothing again.
 * @throws SwtError `SWT-M012` when head and body differ in their tools or provided services, `SWT-M014` when the
 * head has `state` and no `start` (or `start` or `snapshot` and no `state`), `SWT-M013` when `options` is no object
 * schema; one error holds every issue.
 * @example
 * ```ts
 * export const counter = defineMechanic(head, {
 * 	tools: { add: { run: (_params, ctx) => reply(`Count: ${++ctx.state.count}`) } },
 * });
 * const game = defineGame({ id: "count", residents: 2, mechanics: [counter()], end: { ticks: 3 } });
 * ```
 *
 * @public
 */
export function defineMechanic<H extends AnyHead, F extends Readonly<Record<string, TSchema>> = None>(head: H, body: MechanicBody<ShapeOf<H>, ToolsOf<H>, F>): DefinitionOf<H>;
export function defineMechanic(head: AnyHead, body: ErasedBody): MechanicDefinition {
	const erased = erasedHead(head);
	const issues = [...(propertiesOf(erased.options) === undefined ? [optionsNoObject({ mechanic: erased.id, package: erased.package })] : []), ...definitionIssues(head, body)];
	if (issues.length > 0) throw new SwtError(issues);
	const definition: MechanicDefinition = Object.assign((options?: unknown) => ({ mechanic: definition, options: options ?? {} }), {
		id: erased.id,
		package: erased.package,
		source: `${erased.package}/${erased.id}`,
		options: erased.options,
		events: erased.events,
		// What a reader of the definition sees of the body without running it: which tools the fake driver can call.
		head: { ...erased, tools: erased.tools.map((tool) => ({ ...tool, sampled: body.tools?.[tool.name]?.sample !== undefined })) },
		parseOptions: (raw: unknown): unknown => parseOptions(erased, raw),
		resolve(options: unknown, texts: PromptLookup, version: string): ResolvedPlugin {
			if (!isJson(options)) throw new SwtError(optionMismatch({ owner: erased.id, package: erased.package, path: "options", message: "must be plain JSON data" }));
			return {
				id: erased.id,
				package: erased.package,
				version,
				requires: erased.requires.map((service) => service.name),
				provides: erased.provides.map((service) => service.name),
				events: erased.events,
				audiences: erased.audiences,
				options,
				create: (port) => create(head, erased, body, options, texts, port),
			};
		},
	});
	return definition;
}
