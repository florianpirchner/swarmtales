// SPDX-License-Identifier: Apache-2.0
/**
 * The heads the README generator reads. A mechanic package names its mechanics in the `swarmtales` field of its
 * `package.json`; each name is an export of `src/index.ts` whose `head` holds everything that is data: tools,
 * events, options, services, prompts and metrics. Nothing is instantiated and no handler runs.
 *
 * The scripts are no package and depend on none, so a head is read as untrusted data and checked against a schema.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { isRecord } from "./schema-text.ts";

const Service = Type.Object(
	{
		name: Type.String({ description: "The service name." }),
		summary: Type.String({ description: "What the service is for." }),
		methods: Type.Record(
			Type.String(),
			Type.Object({ kind: Type.String({ description: "Command or query." }), input: Type.Unknown({ description: "The input schema." }), output: Type.Unknown({ description: "The output schema." }), summary: Type.String({ description: "What the method does." }) }, { description: "One method." }),
			{ description: "The methods by name." },
		),
	},
	{ description: "A service contract." },
);

const Names = Type.Array(Type.String({ description: "One name." }), { description: "A list of names." });

const Head = Type.Object(
	{
		id: Type.String({ description: "The id of the mechanic." }),
		package: Type.String({ description: "The npm name of its package." }),
		summary: Type.String({ description: "What it does, in one line." }),
		options: Type.Unknown({ description: "The schema of the options." }),
		state: Type.Optional(Type.Unknown({ description: "The schema of the state; absent: no state." })),
		version: Type.Number({ description: "The version of the snapshot slice." }),
		events: Type.Record(Type.String(), Type.Unknown({ description: "A payload schema." }), { description: "Event type to payload schema." }),
		audiences: Type.Record(Type.String(), Names, { description: "Event type to the grant names that may read it." }),
		prompts: Type.Record(Type.String(), Names, { description: "Prompt id to its variables." }),
		requires: Type.Array(Service, { description: "The services it needs." }),
		provides: Type.Array(Service, { description: "The services it provides." }),
		uses: Type.Array(Service, { description: "The services it calls when they are loaded." }),
		tools: Type.Array(
			Type.Object({ name: Type.String({ description: "The bare name." }), description: Type.String({ description: "A prompt id or the text." }), parameters: Type.Unknown({ description: "The schema of the arguments." }), for: Names, free: Type.Boolean({ description: "True for a read-only look." }) }, { description: "A declared tool." }),
			{ description: "The tools, in the order a caller sees them." },
		),
		metrics: Type.Array(
			Type.Object({ id: Type.String({ description: "The id inside the mechanic." }), title: Type.String({ description: "The column title." }), unit: Type.Optional(Type.String({ description: "The unit." })), reads: Names }, { description: "A metric." }),
			{ description: "The metrics it exports about a finished run." },
		),
	},
	{ description: "The erased head of a mechanic, as far as a README shows it." },
);

/** A service contract as the generator reads it. */
export type ServiceView = Static<typeof Service>;

/** The head of a mechanic as the generator reads it. */
export type HeadView = Static<typeof Head>;

/** One mechanic with the folder and the package it comes from. */
export interface LoadedMechanic {
	/** The folder under `mechanics/`. */
	readonly folder: string;
	/** The npm name in the folder's `package.json`. */
	readonly packageName: string;
	readonly head: HeadView;
}

/**
 * Reads a `package.json`.
 *
 * @param file - The absolute path.
 * @returns The manifest, or `undefined` when the file is missing or holds no object.
 */
export function readManifest(file: string): Readonly<Record<string, unknown>> | undefined {
	if (!existsSync(file)) return undefined;
	const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
	return isRecord(parsed) ? parsed : undefined;
}

/** The export names of the mechanics a package declares; `undefined` for a package that is no mechanic package. */
function declaredMechanics(manifest: Readonly<Record<string, unknown>>): readonly string[] | undefined {
	const field = manifest.swarmtales;
	if (!isRecord(field) || field.kind !== "mechanic") return undefined;
	return Array.isArray(field.mechanics) ? field.mechanics.filter((name) => typeof name === "string") : [];
}

function headOf(exports: unknown, name: string, where: string): HeadView {
	const definition: unknown = typeof exports === "object" && exports !== null ? Reflect.get(exports, name) : undefined;
	const head: unknown = typeof definition === "function" || isRecord(definition) ? Reflect.get(definition, "head") : undefined;
	if (!Value.Check(Head, head)) throw new TypeError(`mechanic-docs: ${where} has no export "${name}" with a head the generator can read`);
	return head;
}

/**
 * Loads the head of every mechanic under `mechanics/`, from source.
 *
 * @param root - The repository root.
 * @returns The mechanics, sorted by folder.
 * @throws TypeError when no mechanic is found, when a mechanic package declares not exactly one mechanic, or when a declared export has no readable head.
 */
export async function loadMechanics(root: string): Promise<readonly LoadedMechanic[]> {
	const base = join(root, "mechanics");
	const folders = existsSync(base) ? readdirSync(base).sort((a, b) => a.localeCompare(b, "en")) : [];
	const loaded: LoadedMechanic[] = [];
	for (const folder of folders) {
		const manifest = readManifest(join(base, folder, "package.json"));
		const names = manifest === undefined ? undefined : declaredMechanics(manifest);
		if (manifest === undefined || names === undefined) continue;
		const [name] = names;
		if (name === undefined || names.length > 1) throw new TypeError(`mechanic-docs: mechanics/${folder}/package.json must name exactly one mechanic in "swarmtales.mechanics" (found ${names.length}); one README documents one mechanic`);
		const exports: unknown = await import(pathToFileURL(join(base, folder, "src", "index.ts")).href);
		loaded.push({ folder, packageName: typeof manifest.name === "string" ? manifest.name : folder, head: headOf(exports, name, `mechanics/${folder}/src/index.ts`) });
	}
	if (loaded.length === 0) throw new TypeError(`mechanic-docs: no mechanic package under ${base}; a mechanic package has "swarmtales.kind": "mechanic" in its package.json`);
	return loaded;
}
