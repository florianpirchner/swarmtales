// SPDX-License-Identifier: Apache-2.0
/**
 * The layer table: which workspace package may import which, and which Node modules. `check-layers.ts` enforces
 * it; `docs/LAYERS.md` explains it. Sources: DECISIONS.md D8 and E6, paper 01 section 4.4, and the layer table of
 * the M1 specification (`08-m1-spec.md`, section 1.2) and of the M2 specification (`09-m2-spec.md`, section 1.2).
 */

/** What one package, or every package of one folder, may import. */
export interface ImportRule {
	/** The layer the package declares in `package.json`, `L0` to `L6`. */
	readonly layer: string;
	/** The workspace packages that may be imported, by name. `"*"` allows every workspace package. */
	readonly may: readonly string[];
	/** The Node modules that source files may import, as `node:<name>`. `"any"` allows all. Tests may use any. */
	readonly node: readonly string[] | "any";
}

/** The titles of the layers, lowest first. */
export const LAYER_TITLES: Readonly<Record<string, string>> = {
	L0: "contracts, chain",
	L1: "kernel",
	L2: "sdk, prompts",
	L3: "plugins: mechanics",
	L4: "engine, run log, testkit, models, lab",
	L5: "viewer",
	L6: "command line, umbrella package, games, samples",
};

const CONTRACTS = "@swarmtales/contracts";
const SDK = "@swarmtales/sdk";
const KERNEL = "@swarmtales/kernel";
const CHAIN = "@swarmtales/chain";

/** The package of the service contracts that have two providers (D8). Every mechanic may import it whole. */
export const SHARED_CONTRACTS = "@swarmtales/mechanic-contracts";

/**
 * One row per package under `packages/`, by folder name, plus the shared contracts of the mechanics. A package
 * under `packages/` without a row fails the check: a new package needs an issue and a row.
 */
export const PACKAGE_RULES: Readonly<Record<string, ImportRule & { readonly name: string }>> = {
	"packages/contracts": { name: CONTRACTS, layer: "L0", may: [], node: [] },
	"packages/chain": { name: CHAIN, layer: "L0", may: [], node: [] },
	"packages/kernel": { name: KERNEL, layer: "L1", may: [CONTRACTS], node: [] },
	"packages/sdk": { name: SDK, layer: "L2", may: [CONTRACTS, CHAIN], node: [] },
	"packages/prompts": { name: "@swarmtales/prompts", layer: "L2", may: [CONTRACTS], node: ["node:fs", "node:path", "node:url"] },
	"packages/engine": { name: "@swarmtales/engine", layer: "L4", may: [KERNEL, SDK, CONTRACTS, CHAIN], node: [] },
	"packages/runlog": { name: "@swarmtales/runlog", layer: "L4", may: [CONTRACTS, CHAIN], node: ["node:fs", "node:path", "node:crypto"] },
	"packages/testkit": {
		name: "@swarmtales/testkit",
		layer: "L4",
		may: ["@swarmtales/engine", KERNEL, SDK, CONTRACTS, "@swarmtales/prompts"],
		node: ["node:fs"],
	},
	// `models` gets the kernel as a type of contracts; `lab` reads run folders and never reaches a live kernel.
	"packages/models": { name: "@swarmtales/models", layer: "L4", may: [CONTRACTS], node: [] },
	"packages/lab": { name: "@swarmtales/lab", layer: "L4", may: [CONTRACTS, CHAIN, "@swarmtales/runlog"], node: ["node:fs", "node:path"] },
	"packages/viewer-core": { name: "@swarmtales/viewer-core", layer: "L5", may: [CONTRACTS, CHAIN], node: [] },
	"packages/viewer-ui": { name: "@swarmtales/viewer-ui", layer: "L5", may: [CONTRACTS, CHAIN, "@swarmtales/viewer-core"], node: [] },
	"packages/swarmtales": { name: "swarmtales", layer: "L6", may: ["*"], node: "any" },
	"mechanics/contracts": { name: SHARED_CONTRACTS, layer: "L3", may: [CONTRACTS, SDK], node: [] },
};

/** The rule of every package in a top-level folder that has no row of its own. `packages/` has none: rows only. */
export const FOLDER_RULES: Readonly<Record<string, ImportRule>> = {
	mechanics: { layer: "L3", may: [CONTRACTS, SDK, SHARED_CONTRACTS], node: [] },
	games: { layer: "L6", may: ["*"], node: "any" },
	samples: { layer: "L6", may: ["*"], node: "any" },
	apps: { layer: "L6", may: ["*"], node: "any" },
};

/** The top-level folders that hold workspace packages. `pnpm-workspace.yaml` lists the same ones (a test checks it). */
export const WORKSPACE_FOLDERS = ["packages", ...Object.keys(FOLDER_RULES)] as const;

/** The layer of the packages that hold no library code of their own: the umbrella, apps, games and samples. */
export const TOP_LAYER = "L6";

/** The layer of plugins. A plugin imports another plugin only through the sub-paths in {@link PLUGIN_SUBPATHS}. */
export const PLUGIN_LAYER = "L3";

/**
 * The classes of a package under `mechanics/` (`swarmtales.class`): a base mechanic, a game mechanic, or a package of
 * Directors (A58), which imports a game mechanic only through {@link PLUGIN_SUBPATHS}, like a game mechanic does.
 */
export const PLUGIN_CLASSES = ["base", "game", "director"] as const;

/** The sub-paths one mechanic may import from another: its service contract and its pure rule code. */
export const PLUGIN_SUBPATHS = ["contract", "rules"] as const;

/** What a file of a `/contract` sub-path may import besides files of its own package. */
export const CONTRACT_IMPORTS = ["typebox", CONTRACTS, SDK] as const;

/** What a file of a `/rules` sub-path may import besides other `/rules` files of its own package. */
export const RULES_IMPORTS = ["typebox"] as const;

/** Packages that test files may import in addition to what their rule allows. */
export const TEST_ONLY_PACKAGES = ["@swarmtales/testkit"] as const;

/** Package names that must never exist: each would be the hub that the rewrite removes (D8, paper 01 decision 14). */
export const FORBIDDEN_PACKAGES = [
	"@swarmtales/std-contracts",
	"@swarmtales/capabilities",
	"@swarmtales/schedulers",
	"@swarmtales/mechanic-shared",
] as const;

/**
 * The most library packages until three games run (E6). A library package is a package under `packages/` that
 * holds code: the umbrella package (layer `L6`, re-exports only) does not count (M1 specification, 1.1).
 */
export const MAX_LIBRARY_PACKAGES = 12;
