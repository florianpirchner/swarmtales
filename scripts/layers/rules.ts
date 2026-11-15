// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The layer rules as pure functions over a description of the workspace. `workspace.ts` builds the description. */
import { isBuiltin } from "node:module";
import { posix } from "node:path";
import { isTestFile } from "../lib/files.ts";
import {
	CONTRACT_IMPORTS, FOLDER_RULES, FORBIDDEN_PACKAGES, LAYER_TITLES, MAX_LIBRARY_PACKAGES, PACKAGE_RULES, PLUGIN_LAYER,
	PLUGIN_CLASSES, PLUGIN_SUBPATHS, RULES_IMPORTS, SHARED_CONTRACTS, TEST_ONLY_PACKAGES, TOP_LAYER, type ImportRule,
} from "./table.ts";

/** One import of a source file: `import`, `export ... from`, `import()` or `require()`. */
export interface ImportUse {
	/** The importing file, relative to the repository root. */
	readonly file: string;
	/** The module specifier; empty when {@link ImportUse.computed} is true. */
	readonly specifier: string;
	readonly inTest: boolean;
	/** True for `import(expression)` and `require(expression)`: the target is not a string in the source. */
	readonly computed?: boolean;
}

/** One workspace package, as the layer check sees it. */
export interface WorkspacePackage {
	readonly name: string;
	/** The package folder, relative to the root, for example `mechanics/chess`. */
	readonly folder: string;
	/** The layer id (`L0` to `L6`), from the number declared in `package.json` under `swarmtales.layer`. */
	readonly layer: string | undefined;
	/** For a package under `mechanics/`: `base`, `game` or `director`, declared under `swarmtales.class`. */
	readonly mechanicClass: string | undefined;
	/** Workspace and external packages under `dependencies` and `peerDependencies`. */
	readonly dependencies: readonly string[];
	readonly devDependencies: readonly string[];
	readonly imports: readonly ImportUse[];
}

interface Target {
	readonly name: string;
	readonly subpath: string;
}

function splitSpecifier(specifier: string): Target {
	const parts = specifier.split("/");
	const size = specifier.startsWith("@") ? 2 : 1;
	return { name: parts.slice(0, size).join("/"), subpath: parts.slice(size).join("/") };
}

/** The rule of a package: its own row, or the rule of its folder. `packages/` has rows only. */
function ruleOf(pack: WorkspacePackage): ImportRule | undefined {
	return PACKAGE_RULES[pack.folder] ?? FOLDER_RULES[pack.folder.split("/")[0] ?? ""];
}

const isPlugin = (pack: WorkspacePackage): boolean => ruleOf(pack)?.layer === PLUGIN_LAYER && pack.name !== SHARED_CONTRACTS;

/** The offences of a package against its row: its name and its folder. */
function rowOffences(pack: WorkspacePackage): readonly string[] {
	const row = PACKAGE_RULES[pack.folder];
	const elsewhere = Object.entries(PACKAGE_RULES).find(([folder, entry]) => entry.name === pack.name && folder !== pack.folder);
	return [
		...(row !== undefined && row.name !== pack.name ? [`${pack.folder}: the package must be named ${row.name}, not ${pack.name}`] : []),
		...(elsewhere === undefined ? [] : [`${pack.name}: this package lives in ${elsewhere[0]}, not in ${pack.folder}`]),
	];
}

function declarationOffences(pack: WorkspacePackage): readonly string[] {
	const hub = FORBIDDEN_PACKAGES.some((name) => name === pack.name) ? [`${pack.name}: this package must not exist (no hub package)`] : [];
	const rule = ruleOf(pack);
	if (rule === undefined) {
		return [...hub, `${pack.name}: ${pack.folder} has no row in scripts/layers/table.ts; a new package needs an issue and a row`];
	}
	const offences = [...hub, ...rowOffences(pack)];
	if (pack.layer !== rule.layer) {
		offences.push(`${pack.name}: declares layer ${pack.layer ?? "none"}, but ${pack.folder} must declare "swarmtales": { "layer": "${rule.layer}" }`);
	}
	if (isPlugin(pack) && !PLUGIN_CLASSES.some((name) => name === pack.mechanicClass)) {
		offences.push(`${pack.name}: a package under mechanics/ declares "swarmtales": { "class": "base", "game" or "director" }`);
	}
	return offences;
}

/** Says why one plugin may not use another, or `undefined` when it may. */
function pluginRefusal(source: WorkspacePackage, target: WorkspacePackage, subpath: string | undefined): string | undefined {
	if (source.mechanicClass === "base" && target.mechanicClass === "game") return `a base mechanic may not use the game mechanic ${target.name}`;
	if (source.mechanicClass === "base" && target.mechanicClass === "director") return `a base mechanic may not use the director package ${target.name}`;
	if (subpath !== undefined && !PLUGIN_SUBPATHS.some((allowed) => subpath === allowed || subpath.startsWith(`${allowed}/`))) {
		return `a mechanic imports another mechanic only through ${PLUGIN_SUBPATHS.map((path) => `/${path}`).join(" and ")}`;
	}
	return undefined;
}

/** Says whether the table allows the use outright, before the rules between plugins are asked. */
function allowedByTable(rule: ImportRule, source: WorkspacePackage, target: WorkspacePackage, inTest: boolean): boolean {
	if (source.name === target.name || rule.may.includes("*") || rule.may.includes(target.name)) return true;
	return inTest && TEST_ONLY_PACKAGES.some((name) => name === target.name);
}

/** Says why `source` may not use `target`, or `undefined` when it may. `subpath` is `undefined` for a declared dependency. */
function refusal(source: WorkspacePackage, target: WorkspacePackage, subpath: string | undefined, inTest: boolean): string | undefined {
	const rule = ruleOf(source);
	if (rule === undefined || allowedByTable(rule, source, target, inTest)) return undefined;
	// A test may load another mechanic whole (DECISIONS A16); source reaches it through /contract and /rules only.
	if (isPlugin(source) && isPlugin(target)) return inTest ? undefined : pluginRefusal(source, target, subpath);
	const allowed = rule.may.length === 0 ? "no workspace package" : `only ${rule.may.join(", ")}`;
	return `${source.name} (layer ${rule.layer}, ${LAYER_TITLES[rule.layer] ?? ""}) may use ${allowed}, not ${target.name}`;
}

/** Says whether a specifier names a package (and not a path, a Node module or nothing readable). */
function namesPackage(use: ImportUse): boolean {
	const isPath = isRelative(use.specifier) || /^[/#]|^file:/.test(use.specifier);
	return use.computed !== true && !isPath && !isBuiltin(use.specifier);
}

/** Says why an import of a package from outside the workspace is refused, or `undefined` when it is declared. */
function externalRefusal(pack: WorkspacePackage, use: ImportUse, name: string, rootTools: ReadonlySet<string>): string | undefined {
	if (!namesPackage(use) || pack.dependencies.includes(name)) return undefined;
	const inSource = !use.inTest && use.file.startsWith(`${pack.folder}/src/`);
	if (inSource) return `${pack.name} does not declare ${name} under dependencies; source may not lean on a development tool or on another package's install`;
	return pack.devDependencies.includes(name) || rootTools.has(name) ? undefined : `neither ${pack.name} nor the root package.json declares ${name}`;
}

function importOffences(pack: WorkspacePackage, byName: ReadonlyMap<string, WorkspacePackage>, rootTools: ReadonlySet<string>): readonly string[] {
	const offences: string[] = [];
	const declared = new Set([...pack.dependencies, ...pack.devDependencies, pack.name]);
	for (const use of pack.imports) {
		const { name, subpath } = splitSpecifier(use.specifier);
		const target = byName.get(name);
		if (target === undefined) {
			const external = externalRefusal(pack, use, name, rootTools);
			if (external !== undefined) offences.push(`${use.file}: imports ${use.specifier}: ${external}`);
			continue;
		}
		const why = refusal(pack, target, subpath, use.inTest);
		if (why !== undefined) offences.push(`${use.file}: imports ${use.specifier}: ${why}`);
		if (!declared.has(name)) offences.push(`${use.file}: imports ${name}, which ${pack.name} does not declare in package.json`);
	}
	for (const name of pack.dependencies) {
		const target = byName.get(name);
		const why = target === undefined ? undefined : refusal(pack, target, undefined, false);
		if (why !== undefined) offences.push(`${pack.name}: depends on ${name}: ${why}`);
	}
	return offences;
}

const isRelative = (specifier: string): boolean => specifier.startsWith(".");
const inSubpath = (file: string, subpath: string): boolean => new RegExp(`/src/${subpath}(\\.tsx?|/)`).test(file);

const resolved = (use: ImportUse): string => posix.normalize(posix.join(posix.dirname(use.file), use.specifier));

/** Says why a relative import is refused, or `undefined` when it is fine. */
function relativeRefusal(pack: WorkspacePackage, use: ImportUse): string | undefined {
	const target = resolved(use);
	const fromConfig = !use.file.slice(pack.folder.length + 1).includes("/");
	const toRootFile = !target.includes("/") && !target.startsWith("..");
	if (!target.startsWith(`${pack.folder}/`) && !(fromConfig && toRootFile)) {
		return "a relative import stays inside its package; import the other package by name";
	}
	return !use.inTest && isTestFile(target) ? "code that is not a test may not import a test file" : undefined;
}

/**
 * The files that may load a module whose name is known only at run time (DECISIONS A11): the loader of a
 * person's game file and of the installed mechanic packages.
 */
export const COMPUTED_IMPORT_FILES: readonly string[] = ["apps/cli/src/load-game.ts"];

/** Says why a relative, absolute or computed import is refused, or `undefined` when it is fine. */
function pathRefusal(pack: WorkspacePackage, use: ImportUse): string | undefined {
	if (use.computed === true) return use.inTest || COMPUTED_IMPORT_FILES.includes(use.file) ? undefined : "the target of import() or require() must be a string, so the check can read it";
	if (use.specifier.startsWith("/") || use.specifier.startsWith("file:")) return "an absolute path is not an import";
	if (use.specifier.startsWith("#")) return "sub-path imports (#name) are not used; import the file or the package";
	return isRelative(use.specifier) ? relativeRefusal(pack, use) : undefined;
}

/** The Node module a specifier names, as `node:<name>` without a sub-path, or `undefined`. */
function nodeModule(specifier: string): string | undefined {
	if (!isBuiltin(specifier)) return undefined;
	return `node:${specifier.replace(/^node:/, "").split("/")[0] ?? ""}`;
}

const RULES_ONLY = "a /rules file imports only typebox and other /rules files";

/** Says why a file of a `/contract` or `/rules` sub-path may not import this, or `undefined` when it may. */
function subpathRefusal(pack: WorkspacePackage, use: ImportUse): string | undefined {
	const inRules = inSubpath(use.file, "rules");
	if (isRelative(use.specifier)) return inRules && !inSubpath(resolved(use), "rules") ? RULES_ONLY : undefined;
	const external = splitSpecifier(use.specifier).name;
	const inContract = inSubpath(use.file, "contract") || pack.name === SHARED_CONTRACTS;
	if (inContract && !CONTRACT_IMPORTS.some((name) => name === external)) return `a /contract file imports only ${CONTRACT_IMPORTS.join(", ")}`;
	return inRules && !RULES_IMPORTS.some((name) => name === external) ? RULES_ONLY : undefined;
}

/** Says why a source file may not import a Node module, or `undefined` when it may or the import is none. */
function nodeRefusal(pack: WorkspacePackage, rule: ImportRule, use: ImportUse): string | undefined {
	const node = nodeModule(use.specifier);
	if (node === undefined || rule.node === "any" || rule.node.includes(node)) return undefined;
	return `${pack.name} may import ${rule.node.length === 0 ? "no Node module" : `only ${rule.node.join(", ")}`}`;
}

function fileOffences(pack: WorkspacePackage): readonly string[] {
	const rule = ruleOf(pack);
	return pack.imports.flatMap((use) => {
		const shown = use.computed === true ? "a computed target" : use.specifier;
		// Configuration files at a package's root are tools, like tests: the rules below are for what ships.
		const inSource = !use.inTest && use.computed !== true && rule !== undefined && use.file.startsWith(`${pack.folder}/src/`);
		const reasons = [
			pathRefusal(pack, use),
			inSource ? nodeRefusal(pack, rule, use) : undefined,
			inSource && rule.layer === PLUGIN_LAYER ? subpathRefusal(pack, use) : undefined,
		];
		return reasons.flatMap((why) => (why === undefined ? [] : [`${use.file}: imports ${shown}: ${why}`]));
	});
}

function cycleOffences(packages: readonly WorkspacePackage[], byName: ReadonlyMap<string, WorkspacePackage>): readonly string[] {
	const done = new Set<string>();
	const offences: string[] = [];
	const visit = (name: string, path: readonly string[]): void => {
		if (path.includes(name)) {
			offences.push(`dependency cycle: ${[...path.slice(path.indexOf(name)), name].join(" -> ")}`);
			return;
		}
		if (done.has(name)) return;
		for (const next of byName.get(name)?.dependencies ?? []) if (byName.has(next)) visit(next, [...path, name]);
		done.add(name);
	};
	for (const pack of packages) visit(pack.name, []);
	return offences;
}

/**
 * Checks a workspace against the layer table.
 *
 * @param packages - Every workspace package with its declarations and imports.
 * @param rootTools - The packages that the root `package.json` declares: the tools that tests and configuration
 * files of every package may import.
 * @returns One message per broken rule; an empty list when the workspace is clean.
 */
export function checkLayers(packages: readonly WorkspacePackage[], rootTools: ReadonlySet<string> = new Set()): readonly string[] {
	const byName = new Map(packages.map((pack) => [pack.name, pack]));
	const libraries = packages.filter((pack) => pack.folder.startsWith("packages/") && ruleOf(pack)?.layer !== TOP_LAYER).length;
	const twice = packages.filter((pack, index) => packages.findIndex((other) => other.name === pack.name) !== index);
	return [
		...twice.map((pack) => `${pack.folder}: the name ${pack.name} is used by two packages`),
		...packages.flatMap(declarationOffences),
		...packages.flatMap((pack) => importOffences(pack, byName, rootTools)),
		...packages.flatMap(fileOffences),
		...cycleOffences(packages, byName),
		...(libraries > MAX_LIBRARY_PACKAGES ? [`packages/ holds ${libraries} library packages; the limit is ${MAX_LIBRARY_PACKAGES} until three games run`] : []),
	];
}
