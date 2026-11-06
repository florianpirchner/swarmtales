/**
 * `pnpm check:packages`: the workspace rules that no compiler enforces.
 *
 * 1. Dependency rule (docs/ideas/monorepo.md §2): a package declares only the workspace packages
 *    its layer may use, and imports only what it declares.
 * 2. No import cycles between the files of a package (type-only imports count).
 * 3. No native dependencies in published packages (§7): no runtime dependency, direct or transitive,
 *    needs a native addon or a compiler. Dev tools such as esbuild and tsdown never ship and are exempt.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");

/** The mechanic packages of `mechanics/` (docs/design/carve-plan.md); each may use the core and the shared module only. */
const MECHANIC_IDS = [
	"names", "ledger", "marks", "receipts", "whispers", "channels", "petitions", "cast", "motives", "puzzles",
	"progression", "goals", "script", "arena", "standoff", "exile", "tribunal", "seal", "standoff-tribunal",
	"consensus", "team-channel", "grid-game", "optimal-referee", "strategy-brain", "econ-games", "card-table", "trick-play",
] as const;
const MECHANIC_DEPENDENCIES = ["@swarmtales/contracts", "@swarmtales/kernel", "@swarmtales/mechanic-shared"] as const;

/** Which workspace packages each package may depend on (today's coarse layering; see the module README). */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
	...Object.fromEntries(MECHANIC_IDS.map((id) => [`@swarmtales/mechanic-${id}`, MECHANIC_DEPENDENCIES])),
	// The tic-tac-toe mechanics use each other's published APIs (docs/ideas/tictactoe-teams.md §4).
	"@swarmtales/mechanic-grid-game": [...MECHANIC_DEPENDENCIES, "@swarmtales/mechanic-consensus", "@swarmtales/mechanic-team-channel"],
	"@swarmtales/mechanic-optimal-referee": [...MECHANIC_DEPENDENCIES, "@swarmtales/mechanic-grid-game"],
	"@swarmtales/mechanic-strategy-brain": [...MECHANIC_DEPENDENCIES, "@swarmtales/mechanic-grid-game", "@swarmtales/mechanic-team-channel"],
	// The economics games plug into the strategy brain through its source API.
	"@swarmtales/mechanic-econ-games": [...MECHANIC_DEPENDENCIES, "@swarmtales/mechanic-strategy-brain"],
	// The card games build on the card table and plug into the strategy brain (docs/ideas/game-roadmap.md §2.3).
	"@swarmtales/mechanic-trick-play": [...MECHANIC_DEPENDENCIES, "@swarmtales/mechanic-card-table", "@swarmtales/mechanic-strategy-brain"],
	"@swarmtales/mechanic-shared": ["@swarmtales/contracts", "@swarmtales/kernel"],
	"@swarmtales/contracts": [],
	"@swarmtales/kernel": ["@swarmtales/contracts"],
	"@swarmtales/legacy-log": ["@swarmtales/contracts"],
	"@swarmtales/prompts": [],
	"@swarmtales/models": ["@swarmtales/contracts", "@swarmtales/kernel"],
	"@swarmtales/sdk": ["@swarmtales/contracts", "@swarmtales/kernel"],
	"@swarmtales/roles": ["@swarmtales/contracts", "@swarmtales/legacy-log", "@swarmtales/kernel", "@swarmtales/prompts", "@swarmtales/models", "@swarmtales/mechanic-shared"],
	"@swarmtales/chronicle": ["@swarmtales/contracts", "@swarmtales/legacy-log", "@swarmtales/kernel", "@swarmtales/prompts", "@swarmtales/models", "@swarmtales/roles"],
	"@swarmtales/novelist": ["@swarmtales/contracts", "@swarmtales/kernel", "@swarmtales/prompts", "@swarmtales/models", "@swarmtales/chronicle"],
	"@swarmtales/testkit": ["@swarmtales/contracts", "@swarmtales/kernel", "@swarmtales/chronicle"],
};

/** Packages whose presence in a dependency closure means a native addon or a compiler. */
const NATIVE_HELPERS = new Set(["node-gyp", "node-gyp-build", "node-addon-api", "node-pre-gyp", "@mapbox/node-pre-gyp", "prebuild-install", "prebuildify", "cmake-js", "bindings", "nan", "napi-macros"]);
const INSTALL_SCRIPTS = ["preinstall", "install", "postinstall"] as const;

interface Manifest {
	readonly name: string;
	readonly dir: string;
	readonly dependencies: Readonly<Record<string, string>>;
	readonly optionalDependencies: Readonly<Record<string, string>>;
	readonly peerDependencies: Readonly<Record<string, string>>;
}

const problems: string[] = [];
let scanned = 0;

function readJson(path: string): Record<string, unknown> {
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`${path} is not an object`);
	return Object.fromEntries(Object.entries(parsed));
}

function stringMap(value: unknown): Readonly<Record<string, string>> {
	if (typeof value !== "object" || value === null) return {};
	return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function manifestAt(dir: string): Manifest {
	const json = readJson(join(dir, "package.json"));
	return {
		name: typeof json.name === "string" ? json.name : dir,
		dir,
		dependencies: stringMap(json.dependencies),
		optionalDependencies: stringMap(json.optionalDependencies),
		peerDependencies: stringMap(json.peerDependencies),
	};
}

function workspaceManifests(): readonly Manifest[] {
	const folders = [
		...readdirSync(join(ROOT, "packages")).map((name) => join(ROOT, "packages", name)),
		...readdirSync(join(ROOT, "mechanics")).map((name) => join(ROOT, "mechanics", name)),
		join(ROOT, "apps", "cli"),
	];
	const manifests = folders.filter((dir) => existsSync(join(dir, "package.json"))).map(manifestAt);
	for (const manifest of manifests) {
		if (ALLOWED[manifest.name] === undefined && manifest.dir.startsWith(join(ROOT, "mechanics"))) problems.push(`${manifest.name}: a mechanic package without a dependency rule (MECHANIC_IDS)`);
	}
	for (const id of MECHANIC_IDS) {
		if (!manifests.some((manifest) => manifest.name === `@swarmtales/mechanic-${id}`)) problems.push(`mechanics/${id}: the package of mechanic ${id} is missing`);
	}
	return manifests;
}

function sourceFiles(dir: string): readonly string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return path.endsWith(".ts") ? [path] : [];
	});
}

function importsOf(file: string): readonly string[] {
	return ts.preProcessFile(readFileSync(file, "utf8"), true, true).importedFiles.map((imported) => imported.fileName);
}

/** Rule 1: declared and imported workspace dependencies. */
function checkDependencyRule(manifests: readonly Manifest[]): void {
	for (const manifest of manifests) {
		const allowed = ALLOWED[manifest.name];
		const declared = Object.keys(manifest.dependencies).filter((name) => name.startsWith("@swarmtales/"));
		if (allowed !== undefined) {
			for (const name of declared) if (!allowed.includes(name)) problems.push(`${manifest.name} may not depend on ${name} (docs/ideas/monorepo.md §2)`);
		}
		const used = new Set<string>();
		for (const file of sourceFiles(join(manifest.dir, "src"))) {
			for (const specifier of importsOf(file)) {
				const match = /^(@swarmtales\/[^/]+)/.exec(specifier);
				if (match?.[1] !== undefined) used.add(match[1]);
			}
		}
		for (const name of used) if (!declared.includes(name)) problems.push(`${manifest.name} imports ${name} but does not declare it`);
		for (const name of declared) if (!used.has(name)) problems.push(`${manifest.name} declares ${name} but never imports it`);
	}
}

/** Rule 2: strongly connected components of size > 1 in a package's file import graph. */
function checkFileCycles(manifests: readonly Manifest[]): void {
	for (const manifest of manifests) {
		const files = sourceFiles(join(manifest.dir, "src"));
		const known = new Set(files);
		const edges = new Map<string, readonly string[]>();
		for (const file of files) {
			const targets = importsOf(file)
				.filter((specifier) => specifier.startsWith("."))
				.map((specifier) => resolve(dirname(file), specifier))
				.filter((target) => known.has(target));
			edges.set(file, targets);
		}
		for (const component of components(files, edges)) {
			problems.push(`${manifest.name}: import cycle ${component.map((file) => relative(manifest.dir, file)).join(" > ")}`);
		}
	}
}

function components(nodes: readonly string[], edges: ReadonlyMap<string, readonly string[]>): readonly (readonly string[])[] {
	let counter = 0;
	const index = new Map<string, number>();
	const low = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const found: string[][] = [];
	const visit = (node: string): void => {
		index.set(node, counter);
		low.set(node, counter);
		counter += 1;
		stack.push(node);
		onStack.add(node);
		for (const next of edges.get(node) ?? []) {
			if (!index.has(next)) {
				visit(next);
				low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
			} else if (onStack.has(next)) {
				low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0));
			}
		}
		if (low.get(node) !== index.get(node)) return;
		const component: string[] = [];
		for (;;) {
			const member = stack.pop();
			if (member === undefined) break;
			onStack.delete(member);
			component.push(member);
			if (member === node) break;
		}
		if (component.length > 1 || (edges.get(node) ?? []).includes(node)) found.push(component.reverse());
	};
	for (const node of nodes) if (!index.has(node)) visit(node);
	return found;
}

/** The directory of an installed dependency, found the way Node walks up `node_modules`. */
function installedDir(name: string, from: string): string | undefined {
	let directory = from;
	for (;;) {
		const candidate = join(directory, "node_modules", name);
		if (existsSync(join(candidate, "package.json"))) return realpathSync(candidate);
		const parent = dirname(directory);
		if (parent === directory) return undefined;
		directory = parent;
	}
}

/** Why an installed package is native, or undefined. */
function nativeReason(dir: string, json: Record<string, unknown>): string | undefined {
	if (json.gypfile === true || existsSync(join(dir, "binding.gyp"))) return "has a binding.gyp";
	const scripts = stringMap(json.scripts);
	for (const name of INSTALL_SCRIPTS) {
		const script = scripts[name];
		if (script !== undefined && /node-gyp|prebuild|node-pre-gyp|cmake|napi/.test(script)) return `runs "${script}" on ${name}`;
	}
	const all = { ...stringMap(json.dependencies), ...stringMap(json.optionalDependencies) };
	const helper = Object.keys(all).find((name) => NATIVE_HELPERS.has(name));
	if (helper !== undefined) return `depends on ${helper}`;
	if (Array.isArray(json.os) || Array.isArray(json.cpu)) return "is built for one platform (os/cpu)";
	return undefined;
}

/** Rule 3: walk the runtime dependency closure of every workspace package. */
function checkNativeDependencies(manifests: readonly Manifest[]): void {
	for (const manifest of manifests) {
		const seen = new Set<string>();
		const walk = (name: string, from: string, via: string): void => {
			const dir = installedDir(name, from);
			if (dir === undefined || seen.has(dir)) return;
			seen.add(dir);
			scanned += 1;
			const json = readJson(join(dir, "package.json"));
			const reason = nativeReason(dir, json);
			if (reason !== undefined) problems.push(`${manifest.name}: runtime dependency ${via} needs native code (${name} ${reason})`);
			const next = { ...stringMap(json.dependencies), ...stringMap(json.optionalDependencies) };
			for (const child of Object.keys(next)) walk(child, dir, `${via} > ${child}`);
		};
		const direct = { ...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies };
		for (const name of Object.keys(direct)) if (!name.startsWith("@swarmtales/")) walk(name, manifest.dir, name);
	}
}

const manifests = workspaceManifests();
checkDependencyRule(manifests);
checkFileCycles(manifests);
checkNativeDependencies(manifests);

if (problems.length > 0) {
	process.stdout.write(`FAIL packages\n${problems.map((problem) => `  - ${problem}`).join("\n")}\n`);
	process.exit(1);
}
process.stdout.write(`ok   packages: ${String(manifests.length)} packages, acyclic imports, declared dependencies, ${String(scanned)} runtime dependencies without native code\n`);
