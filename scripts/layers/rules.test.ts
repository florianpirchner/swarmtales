// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLayers, COMPUTED_IMPORT_FILES, type ImportUse, type WorkspacePackage } from "./rules.ts";
import { MAX_LIBRARY_PACKAGES, PACKAGE_RULES } from "./table.ts";
import { computedImportsOf, importsOf, readRootTools, readWorkspace } from "./workspace.ts";

function pack(name: string, folder: string, layer: string, extra: Partial<WorkspacePackage> = {}): WorkspacePackage {
	return { name: `@swarmtales/${name}`, folder, layer, mechanicClass: undefined, dependencies: [], devDependencies: [], imports: [], ...extra };
}

/** `uses("mechanics/a", "@swarmtales/b")` gives a package's declared dependency plus one import of it. */
function uses(folder: string, specifier: string, file = "src/index.ts"): Partial<WorkspacePackage> {
	const name = specifier.split("/").slice(0, 2).join("/");
	return { dependencies: [name], imports: [{ file: `${folder}/${file}`, specifier, inTest: file.endsWith(".test.ts") }] };
}

const contracts = pack("contracts", "packages/contracts", "L0");
const kernel = pack("kernel", "packages/kernel", "L1", uses("packages/kernel", "@swarmtales/contracts"));
const sdk = pack("sdk", "packages/sdk", "L2", uses("packages/sdk", "@swarmtales/contracts"));
const base = [contracts, kernel, sdk];
const mechanic = (name: string, mechanicClass: string, extra: Partial<WorkspacePackage> = {}): WorkspacePackage =>
	pack(`mechanic-${name}`, `mechanics/${name}`, "L3", { mechanicClass, ...extra });

describe("layer check", () => {
	it("accepts the planned stack", () => {
		const ledger = mechanic("ledger", "base", uses("mechanics/ledger", "@swarmtales/sdk"));
		const chess = mechanic("chess", "game", uses("mechanics/chess", "@swarmtales/mechanic-ledger/contract"));
		const engine = pack("engine", "packages/engine", "L4", uses("packages/engine", "@swarmtales/kernel"));
		const game = pack("game-chess", "games/chess", "L6", uses("games/chess", "@swarmtales/mechanic-chess"));
		const cli = pack("cli", "apps/cli", "L6", uses("apps/cli", "@swarmtales/engine"));
		expect(checkLayers([...base, ledger, chess, engine, game, cli])).toEqual([]);
	});

	it("rejects a missing or wrong layer, a package without a row, a wrong name and a wrong folder", () => {
		expect(checkLayers([pack("contracts", "packages/contracts", "L9")])).toHaveLength(1);
		expect(checkLayers([{ ...contracts, layer: undefined }])).toHaveLength(1);
		expect(checkLayers([pack("kernel", "packages/kernel", "L6")])).toEqual([
			'@swarmtales/kernel: declares layer L6, but packages/kernel must declare "swarmtales": { "layer": "L1" }',
		]);
		expect(checkLayers([pack("report", "packages/report", "L4")])[0]).toContain("has no row in scripts/layers/table.ts");
		expect(checkLayers([pack("core", "packages/kernel", "L1")])[0]).toContain("must be named @swarmtales/kernel");
		expect(checkLayers([pack("kernel", "games/kernel", "L6")])[0]).toContain("lives in packages/kernel");
		expect(checkLayers([pack("viewer", "tools/viewer", "L6")])[0]).toContain("has no row");
		expect(checkLayers([contracts, { ...contracts, folder: "games/copy" }]).join("\n")).toContain("used by two packages");
	});

	it("keeps the table inside the package limit (E6)", () => {
		const libraries = Object.entries(PACKAGE_RULES).filter(([folder, rule]) => folder.startsWith("packages/") && rule.layer !== "L6");
		expect(libraries).toHaveLength(12);
		expect(libraries.length).toBeLessThanOrEqual(MAX_LIBRARY_PACKAGES);
		const many = Array.from({ length: MAX_LIBRARY_PACKAGES + 1 }, (_, index) => pack(`p${index}`, `packages/p${index}`, "L4"));
		expect(checkLayers(many).join("\n")).toContain(`packages/ holds ${MAX_LIBRARY_PACKAGES + 1} library packages`);
		expect(checkLayers([pack("swarmtales", "packages/swarmtales", "L6")]).join("\n")).not.toContain("library packages");
	});

	it("lets the sdk and the engine hash with the chain, and nothing else below layer 4", () => {
		const chain = pack("chain", "packages/chain", "L0");
		const hashing = (name: string, folder: string, layer: string): WorkspacePackage => pack(name, folder, layer, uses(folder, "@swarmtales/chain"));
		expect(checkLayers([chain, hashing("sdk", "packages/sdk", "L2")])).toEqual([]);
		expect(checkLayers([chain, hashing("engine", "packages/engine", "L4")])).toEqual([]);
		expect(checkLayers([chain, hashing("kernel", "packages/kernel", "L1")])).toHaveLength(2);
	});

	it("rejects a plugin that imports the kernel (D8)", () => {
		const bad = mechanic("exile", "base", uses("mechanics/exile", "@swarmtales/kernel"));
		expect(checkLayers([...base, bad]).join("\n")).toContain("not @swarmtales/kernel");
	});

	it("rejects a mechanic that imports another mechanic outside /contract and /rules (D8)", () => {
		const puzzles = mechanic("puzzles", "game");
		const root = mechanic("goals", "game", uses("mechanics/goals", "@swarmtales/mechanic-puzzles"));
		const deep = mechanic("goals", "game", uses("mechanics/goals", "@swarmtales/mechanic-puzzles/src/state.ts"));
		const rules = mechanic("goals", "game", uses("mechanics/goals", "@swarmtales/mechanic-puzzles/rules"));
		expect(checkLayers([...base, puzzles, root])).toHaveLength(1);
		expect(checkLayers([...base, puzzles, deep])).toHaveLength(1);
		expect(checkLayers([...base, puzzles, rules])).toEqual([]);
	});

	it("lets every mechanic import the shared contracts whole, and holds that package to the contract rule", () => {
		const shared = pack("mechanic-contracts", "mechanics/contracts", "L3", uses("mechanics/contracts", "@swarmtales/sdk"));
		const user = mechanic("goals", "game", uses("mechanics/goals", "@swarmtales/mechanic-contracts"));
		expect(checkLayers([...base, shared, user])).toEqual([]);
		const heavy = { ...shared, dependencies: ["lodash"], imports: [{ file: "mechanics/contracts/src/index.ts", specifier: "lodash", inTest: false }] };
		expect(checkLayers([...base, heavy])).toHaveLength(1);
	});

	it("rejects a base mechanic that uses a game mechanic", () => {
		const puzzles = mechanic("puzzles", "game");
		const exile = mechanic("exile", "base", uses("mechanics/exile", "@swarmtales/mechanic-puzzles/contract"));
		expect(checkLayers([...base, puzzles, exile]).join("\n")).toContain("a base mechanic may not use the game mechanic");
		expect(checkLayers([mechanic("exile", "plugin")])[0]).toContain('"class": "base", "game" or "director"');
	});

	it("holds a package of class director to the rules of a game mechanic (M5, 4.6), and keeps base mechanics off it", () => {
		const puzzles = mechanic("puzzles", "game");
		const plain = pack("city-directors", "mechanics/city-directors", "L3", { mechanicClass: "director" });
		const directors = (specifier: string): WorkspacePackage => ({ ...plain, ...uses(plain.folder, specifier) });
		expect(checkLayers([...base, puzzles, directors("@swarmtales/sdk")])).toEqual([]);
		expect(checkLayers([...base, puzzles, directors("@swarmtales/mechanic-puzzles/contract")])).toEqual([]);
		expect(checkLayers([...base, puzzles, directors("@swarmtales/mechanic-puzzles/rules")])).toEqual([]);
		expect(checkLayers([...base, puzzles, directors("@swarmtales/mechanic-puzzles")]).join("\n")).toContain("only through /contract and /rules");
		expect(checkLayers([...base, directors("@swarmtales/kernel")]).join("\n")).toContain("not @swarmtales/kernel");
		const city = pack("game-city", "games/city", "L6");
		expect(checkLayers([...base, city, directors("@swarmtales/game-city")]).join("\n")).toContain("not @swarmtales/game-city");
		const ledger = mechanic("ledger", "base", uses("mechanics/ledger", "@swarmtales/city-directors/contract"));
		expect(checkLayers([...base, plain, ledger]).join("\n")).toContain("a base mechanic may not use the director package @swarmtales/city-directors");
	});

	it("rejects a hub package (D8)", () => {
		expect(checkLayers([pack("std-contracts", "packages/std-contracts", "L4")])[0]).toContain("must not exist");
	});

	it("rejects the kernel using the sdk, the sdk using the kernel, and the run log using the kernel", () => {
		expect(checkLayers([contracts, sdk, pack("kernel", "packages/kernel", "L1", uses("packages/kernel", "@swarmtales/sdk"))])).toHaveLength(2);
		expect(checkLayers([contracts, kernel, pack("sdk", "packages/sdk", "L2", uses("packages/sdk", "@swarmtales/kernel"))])).toHaveLength(2);
		expect(checkLayers([contracts, kernel, pack("runlog", "packages/runlog", "L4", uses("packages/runlog", "@swarmtales/kernel"))])).toHaveLength(2);
	});

	it("rejects an import that package.json does not declare", () => {
		const forgetful = { ...kernel, dependencies: [] };
		expect(checkLayers([contracts, forgetful])).toEqual([
			"packages/kernel/src/index.ts: imports @swarmtales/contracts, which @swarmtales/kernel does not declare in package.json",
		]);
	});

	it("lets a test import the testkit, and nothing else", () => {
		const testkit = pack("testkit", "packages/testkit", "L4", uses("packages/testkit", "@swarmtales/kernel"));
		const inTest = { ...kernel, devDependencies: ["@swarmtales/testkit"], imports: [{ file: "packages/kernel/src/a.test.ts", specifier: "@swarmtales/testkit", inTest: true }] };
		const inSource = { ...inTest, imports: [{ file: "packages/kernel/src/a.ts", specifier: "@swarmtales/testkit", inTest: false }] };
		expect(checkLayers([contracts, testkit, inTest])).toEqual([]);
		expect(checkLayers([contracts, testkit, inSource])).toHaveLength(1);
	});

	const withImport = (source: WorkspacePackage, file: string, specifier: string, more: Partial<ImportUse> = {}): WorkspacePackage => ({
		...source,
		imports: [{ file: `${source.folder}/${file}`, specifier, inTest: file.endsWith(".test.ts"), ...more }],
	});

	it("rejects a Node module that the package's row does not list, with or without the node: prefix", () => {
		expect(checkLayers([withImport(contracts, "src/a.ts", "node:fs")])).toHaveLength(1);
		expect(checkLayers([withImport(contracts, "src/a.ts", "fs")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/a.ts", "node:crypto")])).toHaveLength(1);
		expect(checkLayers([withImport(mechanic("ledger", "base"), "src/a.ts", "node:path")])).toHaveLength(1);
		const runlog = pack("runlog", "packages/runlog", "L4");
		expect(checkLayers([withImport(runlog, "src/a.ts", "node:fs/promises")])).toEqual([]);
		expect(checkLayers([withImport(runlog, "src/a.ts", "node:child_process")])).toHaveLength(1);
		expect(checkLayers([withImport(contracts, "src/a.test.ts", "node:fs")])).toEqual([]);
		expect(checkLayers([withImport(contracts, "tsdown.config.ts", "node:fs")])).toEqual([]);
		expect(checkLayers([withImport(pack("cli", "apps/cli", "L6"), "src/a.ts", "node:child_process")])).toEqual([]);
	});

	it("rejects a relative import that leaves the package, an absolute one and a computed one", () => {
		expect(checkLayers([withImport(kernel, "src/a.ts", "../../sdk/src/index.ts")])[0]).toContain("stays inside its package");
		expect(checkLayers([withImport(kernel, "src/a.test.ts", "../../sdk/src/index.ts")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/a.ts", "../../../tsdown.base.ts")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "tsdown.config.ts", "../../tsdown.base.ts")])).toEqual([]);
		expect(checkLayers([withImport(kernel, "tsdown.config.ts", "../sdk/src/index.ts")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/log/a.ts", "../b.ts")])).toEqual([]);
		expect(checkLayers([withImport(kernel, "src/a.ts", "/home/x.ts")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/a.ts", "#internal")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/a.ts", "", { computed: true })])[0]).toContain("must be a string");
		expect(COMPUTED_IMPORT_FILES).toEqual(["apps/cli/src/load-game.ts"]);
	});

	it("rejects code that imports a test file, so no code hides from the budgets in a test", () => {
		expect(checkLayers([withImport(kernel, "src/a.ts", "./big.test.ts")])[0]).toContain("may not import a test file");
		expect(checkLayers([withImport(kernel, "src/a.ts", "../test/big.ts")])).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/a.test.ts", "../test/helper.ts")])).toEqual([]);
	});

	it("holds /contract and /rules files to their imports", () => {
		const ledger = mechanic("ledger", "base", { dependencies: ["lodash", "typebox"] });
		expect(checkLayers([withImport(ledger, "src/contract.ts", "lodash")])).toHaveLength(1);
		expect(checkLayers([withImport(ledger, "src/contract/index.ts", "typebox")])).toEqual([]);
		expect(checkLayers([withImport(ledger, "src/rules/win.ts", "typebox")])).toEqual([]);
		expect(checkLayers([withImport(ledger, "src/rules/win.ts", "./lines.ts")])).toEqual([]);
		expect(checkLayers([withImport(ledger, "src/rules/win.ts", "../state.ts")])).toHaveLength(1);
		expect(checkLayers([...base, withImport({ ...ledger, dependencies: ["@swarmtales/sdk"] }, "src/rules.ts", "@swarmtales/sdk")])).toHaveLength(1);
	});

	it("rejects an outside package that is not declared, and source that leans on a development tool", () => {
		const tools = new Set(["vitest", "tsdown", "typebox"]);
		const typed = { ...kernel, dependencies: ["typebox"] };
		expect(checkLayers([withImport(typed, "src/a.ts", "typebox/value")], tools)).toEqual([]);
		expect(checkLayers([withImport(kernel, "src/a.ts", "typebox")], tools)[0]).toContain("does not declare typebox under dependencies");
		expect(checkLayers([withImport({ ...kernel, devDependencies: ["lodash"] }, "src/a.ts", "lodash")], tools)).toHaveLength(1);
		expect(checkLayers([withImport(kernel, "src/a.test.ts", "vitest")], tools)).toEqual([]);
		expect(checkLayers([withImport(kernel, "tsdown.config.ts", "tsdown")], tools)).toEqual([]);
		expect(checkLayers([withImport(kernel, "src/a.test.ts", "left-pad")], tools)[0]).toContain("neither @swarmtales/kernel nor the root package.json declares left-pad");
	});

	it("rejects a dependency cycle", () => {
		const a = mechanic("a", "base", { dependencies: ["@swarmtales/mechanic-b"] });
		const b = mechanic("b", "base", { dependencies: ["@swarmtales/mechanic-a"] });
		expect(checkLayers([a, b])).toEqual(["dependency cycle: @swarmtales/mechanic-a -> @swarmtales/mechanic-b -> @swarmtales/mechanic-a"]);
	});
});

describe("workspace reader", () => {
	it("finds static, dynamic and re-export imports", () => {
		const text = 'import a from "x";\nimport type { B } from "@s/y/contract";\nexport * from "./z.ts";\nconst c = await import("w");\n';
		expect(importsOf(text)).toEqual(["x", "@s/y/contract", "./z.ts", "w"]);
		const more = 'export type T = import("t").T;\nimport eq = require("eq");\nconst r = require("r");\nconst l = await import(`tpl`);\nexport { a } from "re";\n';
		expect(importsOf(more)).toEqual(expect.arrayContaining(["t", "eq", "r", "tpl", "re"]));
	});

	it("counts the imports whose target is computed", () => {
		expect(computedImportsOf('const a = await import("x");\nconst b = require("y");\n')).toBe(0);
		expect(computedImportsOf('const n = "x";\nconst a = await import(n);\nconst b = require("a" + n);\nconst c = await import(`${n}/y`);\n')).toBe(3);
	});

	it("reads packages with their layer, kind, dependencies and imports", () => {
		const root = mkdtempSync(join(tmpdir(), "swt-layers-"));
		mkdirSync(join(root, "mechanics/ledger/src"), { recursive: true });
		const manifest = { name: "@swarmtales/mechanic-ledger", swarmtales: { layer: "L3", class: "base" }, dependencies: { "@swarmtales/sdk": "workspace:*" } };
		writeFileSync(join(root, "mechanics/ledger/package.json"), JSON.stringify(manifest));
		writeFileSync(join(root, "mechanics/ledger/src/index.ts"), 'import { x } from "@swarmtales/sdk";\n');
		writeFileSync(join(root, "mechanics/ledger/src/index.test.ts"), 'import { y } from "vitest";\n');
		expect(readWorkspace(root)).toEqual([
			{
				name: "@swarmtales/mechanic-ledger",
				folder: "mechanics/ledger",
				layer: "L3",
				mechanicClass: "base",
				dependencies: ["@swarmtales/sdk"],
				devDependencies: [],
				imports: [
					{ file: "mechanics/ledger/src/index.test.ts", specifier: "vitest", inTest: true },
					{ file: "mechanics/ledger/src/index.ts", specifier: "@swarmtales/sdk", inTest: false },
				],
			},
		]);
	});

	it("reads this repository without an offence", () => {
		expect(readWorkspace().length).toBeGreaterThan(0);
		expect(readWorkspace().filter((entry) => entry.mechanicClass === "director").map((entry) => entry.folder)).toEqual(["mechanics/city-directors"]);
		expect(checkLayers(readWorkspace(), readRootTools())).toEqual([]);
	});
});
