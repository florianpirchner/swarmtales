// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt doctor`, offline (section 5 of the M6 specification): the Node that runs against the line of the clone or of
 * the installed `swarmtales`, the versions of the installed packages in step per version line, the key of each
 * provider by the name of its variable, and the other `SWT_` names. It reads files and the environment record it is
 * handed, writes nothing, and never prints a value of the environment.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SwtError } from "@swarmtales/contracts";
import { createKeyBroker, KEY_VARIABLES } from "@swarmtales/models";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { online, type OnlineFlags } from "./doctor-online.ts";
import { ENV_NAMES, readEnv, setNames } from "./env.ts";
import type { CliIo } from "./main.ts";

const PACKAGE_FILE = fileURLToPath(new URL("../package.json", import.meta.url));

/**
 * What one check of `swt doctor` found: `fail` makes the command exit with 1.
 *
 * @public
 */
export interface DoctorCheck {
	/** What was checked: `node`, `swt`, `versions`, `key <provider>` or `env`. */
	readonly check: string;
	/** `ok`, `warn` (worth a look, the command still exits with 0) or `fail`. */
	readonly status: "ok" | "warn" | "fail";
	/** What was found, as one line without a value of the environment. */
	readonly detail: string;
}

/**
 * What `swt doctor` reads.
 *
 * @public
 */
export interface DoctorInput {
	/** The directory the clone, the project and its `node_modules` are looked for from, upwards. */
	readonly cwd: string;
	/** The version of the Node that runs, as `process.version` gives it (`v22.23.4`). */
	readonly node: string;
	/** The environment, as a record. */
	readonly env: Readonly<Record<string, string | undefined>>;
	/** The `package.json` of the command line that runs. */
	readonly own: string;
}

/**
 * The packages of the platform line (decision A123), which are published in step; every other `@swarmtales/*`
 * package is of the plugins line. `scripts/release/packages.json` is the list of the release; this one is what an
 * installed tree is checked against, so the two must name the same packages.
 *
 * @public
 */
export const PLATFORM_LINE: readonly string[] = Object.freeze(["swarmtales", ...["cli", "contracts", "kernel", "sdk", "engine", "chain", "prompts", "runlog", "testkit", "models", "lab"].map((name) => `@swarmtales/${name}`), ...["channels", "consensus", "decisions", "exile", "human-hand", "ledger", "team-channel", "contracts"].map((name) => `@swarmtales/mechanic-${name}`)]);

const Manifest = Type.Object(
	{
		name: Type.Optional(Type.String({ description: "The package name" })),
		version: Type.Optional(Type.String({ description: "The version of the package" })),
		engines: Type.Optional(Type.Object({ node: Type.Optional(Type.String({ description: "The Node versions the package runs on" })) }, { description: "The runtimes the package runs on" })),
	},
	{ description: "The fields of a `package.json` that `swt doctor` reads" },
);
type Manifest = Static<typeof Manifest>;

/** The name of the `package.json` at the root of a clone of the repository. */
const WORKSPACE = "swarmtales-workspace";

function read(file: string): Manifest | undefined {
	try {
		const value: unknown = JSON.parse(readFileSync(file, "utf8"));
		return Value.Check(Manifest, value) ? value : undefined;
	} catch {
		return undefined;
	}
}

function findUp(directory: string, found: (directory: string) => boolean): string | undefined {
	if (found(directory)) return directory;
	return dirname(directory) === directory ? undefined : findUp(dirname(directory), found);
}

// `v22.23.4`, `22.19` or `22` as numbers; undefined for anything else.
function numbers(text: string): Version | undefined {
	const [, major, minor, patch] = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(text.trim()) ?? [];
	return major === undefined ? undefined : [Number(major), Number(minor ?? "0"), Number(patch ?? "0")];
}

type Version = readonly [number, number, number];

function below([major, minor, patch]: Version, floor: Version): boolean {
	return major !== floor[0] ? major < floor[0] : minor !== floor[1] ? minor < floor[1] : patch < floor[2];
}

/** The Node that runs against the major of the `.node-version` of a clone of the repository, if one holds `cwd`. */
function cloneCheck(input: DoctorInput, running: Version): DoctorCheck | undefined {
	const clone = findUp(input.cwd, (directory) => read(join(directory, "package.json"))?.name === WORKSPACE && existsSync(join(directory, ".node-version")));
	if (clone === undefined) return undefined;
	const line = readFileSync(join(clone, ".node-version"), "utf8").trim();
	const major = numbers(line)?.[0] ?? Number.POSITIVE_INFINITY;
	const status = major === running[0] ? "ok" : running[0] > major ? "warn" : "fail";
	return { check: "node", status, detail: `Node ${input.node} against the clone's \`.node-version\` ${line} (major ${String(major)})` };
}

/** The Node that runs against the `engines.node` of the installed `swarmtales`; only the form `>=x.y.z` is read. */
function enginesCheck(input: DoctorInput, running: Version, range: string | undefined): DoctorCheck | undefined {
	if (range === undefined) return undefined;
	const floor = numbers(/^>=\s*(\S+)$/.exec(range)?.[1] ?? "");
	if (floor === undefined) return { check: "node", status: "warn", detail: `Node ${input.node}; the range "${range}" of the installed swarmtales cannot be read` };
	return { check: "node", status: below(running, floor) ? "fail" : "ok", detail: `Node ${input.node} against the engines "${range}" of the installed swarmtales` };
}

/** The Node that runs against the clone's line and the installed `swarmtales`; a warning when neither is found. */
function nodeChecks(input: DoctorInput, umbrella: Manifest | undefined): readonly DoctorCheck[] {
	const running = numbers(input.node) ?? [0, 0, 0];
	const checks = [cloneCheck(input, running), enginesCheck(input, running, umbrella?.engines?.node)].filter((check) => check !== undefined);
	return checks.length > 0 ? checks : [{ check: "node", status: "warn", detail: `Node ${input.node}, not checked: no clone of the repository and no installed swarmtales from ${input.cwd}` }];
}

/** The installed `swarmtales` and `@swarmtales/*` packages, by name: of the nearest `node_modules`, and beside the real folder of `swarmtales` (where pnpm puts its dependencies). */
function installed(modules: string): ReadonlyMap<string, string> {
	const umbrella = join(modules, "swarmtales");
	const folders = new Set([modules, ...(existsSync(umbrella) ? [dirname(realpathSync(umbrella))] : [])]);
	const packages = new Map<string, string>();
	for (const folder of folders) {
		const scoped = join(folder, "@swarmtales");
		const names = [...(existsSync(join(folder, "swarmtales", "package.json")) ? ["swarmtales"] : []), ...(existsSync(scoped) ? readdirSync(scoped).map((name) => `@swarmtales/${name}`) : [])];
		for (const name of names) if (!packages.has(name)) packages.set(name, read(join(folder, name, "package.json"))?.version ?? "unreadable");
	}
	return packages;
}

/** One check per version line: every package of a line at one version. */
function versionChecks(packages: ReadonlyMap<string, string>, modules: string): readonly DoctorCheck[] {
	if (packages.size === 0) return [{ check: "versions", status: "warn", detail: `no installed swarmtales or @swarmtales/* package in ${modules}` }];
	const lines = [
		["platform", [...packages].filter(([name]) => PLATFORM_LINE.includes(name))],
		["plugins", [...packages].filter(([name]) => !PLATFORM_LINE.includes(name))],
	] as const;
	return lines.flatMap(([line, members]): DoctorCheck[] => {
		const versions = new Set(members.map(([, version]) => version));
		if (versions.size === 0) return [];
		if (versions.size === 1) return [{ check: "versions", status: "ok", detail: `the ${line} line: ${String(members.length)} packages at ${[...versions].join("")}` }];
		return [{ check: "versions", status: "warn", detail: `the ${line} line is not in step: ${members.map(([name, version]) => `${name} ${version}`).join(", ")}` }];
	});
}

/** Per provider: whether a key is set and under which variable; a value too short to be a key fails. */
function keyChecks(env: DoctorInput["env"]): readonly DoctorCheck[] {
	return Object.entries(KEY_VARIABLES).map(([provider, names]): DoctorCheck => {
		const check = `key ${provider}`;
		const [used, ...unread] = names.filter((name) => (env[name] ?? "") !== "");
		if (used === undefined) return { check, status: "warn", detail: `no key: none of ${names.join(", ")} is set; a fake run needs none` };
		try {
			createKeyBroker(env, { [provider]: names });
		} catch (error) {
			if (!(error instanceof SwtError)) throw error;
			return { check, status: "fail", detail: `${used} is set and is no key: ${error.issues.map((issue) => issue.code).join(", ")}` };
		}
		return { check, status: "ok", detail: `a key is set in ${used}${unread.length > 0 ? `; ${unread.join(", ")} is set too and not read` : ""}` };
	});
}

/** The `SWT_` names beside the keys: those `swt` reads, and a warning for each one it does not know. */
function envChecks(env: DoctorInput["env"]): readonly DoctorCheck[] {
	const keys = Object.values(KEY_VARIABLES).flat();
	const known = ENV_NAMES.filter((name) => !keys.includes(name));
	const set = known.filter((name) => env[name] !== undefined);
	const unknown = Object.keys(env).filter((name) => name.startsWith("SWT_") && env[name] !== undefined && !ENV_NAMES.includes(name)).sort();
	return [
		{ check: "env", status: "ok", detail: set.length > 0 ? `set: ${set.join(", ")}` : `none of ${known.join(", ")} is set` },
		...unknown.map((name): DoctorCheck => ({ check: "env", status: "warn", detail: `${name} is set, and swt reads no variable of that name` })),
	];
}

/**
 * Runs the offline checks of `swt doctor`.
 *
 * @param input - The directory, the Node version, the environment and the command line's own `package.json`.
 * @returns One check per line, in the order they are printed: Node, the running `swt`, the versions, the keys, the
 * `SWT_` names.
 * @example
 * ```ts
 * const checks = doctor({ cwd: process.cwd(), node: process.version, env: readEnv(), own: cliPackageFile });
 * const failed = checks.some((check) => check.status === "fail");
 * ```
 *
 * @public
 */
export function doctor(input: DoctorInput): readonly DoctorCheck[] {
	const root = findUp(input.cwd, (directory) => existsSync(join(directory, "node_modules")));
	const modules = join(root ?? input.cwd, "node_modules");
	const packages = root === undefined ? new Map<string, string>() : installed(modules);
	const umbrella = packages.has("swarmtales") ? read(join(modules, "swarmtales", "package.json")) : undefined;
	const own = read(input.own);
	return [
		...nodeChecks(input, umbrella),
		{ check: "swt", status: "ok", detail: `this swt is ${own?.name ?? "@swarmtales/cli"} ${own?.version ?? "of an unreadable version"}` },
		...versionChecks(packages, modules),
		...keyChecks(input.env),
		...envChecks(input.env),
	];
}

/**
 * `swt doctor`: prints one line per check (`ok`, `warn` or `fail`, what was checked, what was found), or with
 * `--json` one line `{ "checks": [...] }`. With `--online` the checks of `online` follow; a line is printed as soon
 * as its check is known, so the estimate of a request stands before the request is sent.
 *
 * @param json - True for `--json`.
 * @param flags - The flags of `--online` (`onlineFlags`); offline when undefined.
 * @param io - The current directory, the output, and the environment, the Node version and the model source when a
 * test passes its own.
 * @returns 0 when no check failed, 1 when one did.
 * @throws SwtError What `online` throws.
 *
 * @public
 */
export async function runDoctor(json: boolean, flags: OnlineFlags | undefined, io: CliIo): Promise<number> {
	const env = io.env ?? readEnv([...ENV_NAMES, ...setNames("SWT_")]);
	const checks: DoctorCheck[] = [];
	const emit = (check: DoctorCheck): void => {
		checks.push(check);
		if (!json) io.out(`${check.status.padEnd(6)}${check.check.padEnd(15)} ${check.detail}`);
	};
	for (const check of doctor({ cwd: io.cwd, node: io.node ?? process.version, env, own: PACKAGE_FILE })) emit(check);
	if (flags !== undefined) await online(flags, { ...io, env }, emit);
	if (json) io.out(JSON.stringify({ checks }));
	return checks.some((check) => check.status === "fail") ? 1 : 0;
}
