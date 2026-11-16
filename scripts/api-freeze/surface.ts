// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The frozen surface of section 5.1 of the M5 specification, as files: the API reports of the frozen packages and of
 * the base mechanics, and the text forms of what has no report of its own (the formats' schemas, the table of the
 * command line, the list of the error codes), written under `scripts/api-freeze/surface/` by `pnpm api:freeze
 * --write`. A text form leaves out what is not frozen: the help texts of the command line, the why and fix of a code.
 */
import { COMMANDS, FLAGS } from "@swarmtales/cli/src/flags.ts";
import { HandLineSchema } from "@swarmtales/cli/src/hand.ts";
import { EnvelopeSchema, KernelSnapshotSchema, RunManifestSchema } from "@swarmtales/contracts";
import { SavedSessionsSchema } from "@swarmtales/models";
import { SnapshotFileSchema } from "@swarmtales/runlog";
import { OracleSchema } from "@swarmtales/testkit";
import { errorPage } from "../error-docs/page.ts";

/** The frozen packages under `packages/` (5.1); each is frozen as `packages/<name>/<name>.api.md`. */
const PACKAGES = ["contracts", "kernel", "sdk", "engine", "chain", "prompts", "runlog", "testkit", "models", "swarmtales"];

/** The base mechanics and `mechanics/contracts` (5.1, J283); each is frozen as its `mechanic-<name>.api.md`. */
const MECHANICS = ["channels", "consensus", "decisions", "exile", "human-hand", "ledger", "team-channel", "contracts"];

/** The text forms, by their file names under the folder. */
const FORMS = ["envelope.json", "run-manifest.json", "kernel-snapshot.json", "saved-sessions.json", "snapshot-file.json", "hand-line.json", "oracle.json", "cli.json", "error-codes.json"] as const;

/** The folder of the text forms. */
export const SURFACE_FOLDER = "scripts/api-freeze/surface";

/** Writes JSON with sorted keys and one value per line, so that a diff of two texts shows what moved. */
function stable(value: unknown): string {
	const sorted = (_key: string, inner: unknown): unknown =>
		inner !== null && typeof inner === "object" && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b, "en"))) : inner;
	return `${JSON.stringify(value, sorted, "\t")}\n`;
}

/** The command line without its help texts: per command its argument, its flags with their kind, its exit codes. */
function commandLine(): unknown {
	const kind = (name: keyof typeof FLAGS): string => {
		const flag: { readonly type: string; readonly multiple?: boolean } = FLAGS[name];
		return flag.multiple === true ? `${flag.type}, repeated` : flag.type;
	};
	return Object.fromEntries(
		Object.entries(COMMANDS).map(([name, row]) => [name, { argument: row.argument, flags: Object.fromEntries([...row.flags, "help" as const].map((flag) => [flag, kind(flag)])), exits: Object.keys(row.exits).map(Number) }]),
	);
}

/**
 * The text forms of the frozen surface that has no API report, as they follow from the code now.
 *
 * @returns The text of each file, by its path from the repository root.
 */
export function surfaceTexts(): ReadonlyMap<string, string> {
	const forms: Record<(typeof FORMS)[number], unknown> = {
		"envelope.json": EnvelopeSchema,
		"run-manifest.json": RunManifestSchema,
		"kernel-snapshot.json": KernelSnapshotSchema,
		"saved-sessions.json": SavedSessionsSchema,
		"snapshot-file.json": SnapshotFileSchema,
		"hand-line.json": HandLineSchema,
		"oracle.json": OracleSchema,
		"cli.json": commandLine(),
		"error-codes.json": errorPage().entries.map((entry) => entry.code).sort(),
	};
	return new Map(Object.entries(forms).map(([name, value]) => [`${SURFACE_FOLDER}/${name}`, stable(value)]));
}

/**
 * Every file of the frozen list: the API reports, then the text forms.
 *
 * @returns The paths from the repository root, sorted.
 */
export function frozenPaths(): readonly string[] {
	const reports = [...PACKAGES.map((name) => `packages/${name}/${name}.api.md`), ...MECHANICS.map((name) => `mechanics/${name}/mechanic-${name}.api.md`)];
	return [...reports, ...FORMS.map((name) => `${SURFACE_FOLDER}/${name}`)].sort();
}
