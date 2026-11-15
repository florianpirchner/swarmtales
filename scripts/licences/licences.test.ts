// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { ALLOWED_LICENCES, PROJECT_LICENCE } from "./allowlist.ts";
import { readText } from "../lib/files.ts";
import { declaredByInstalled, judgePackages, lockedPackages, recordedRows, renderInventory, type JudgementInput } from "./inventory.ts";
import { checkHeaders, checkManifests, checkVendored, checkWorkflows, usedActions } from "./repo-files.ts";
import { judge, parseExpression } from "./spdx.ts";

function verdict(text: string): string {
	const expression = parseExpression(text);
	if (expression === undefined) return "unparsable";
	const result = judge(expression, ALLOWED_LICENCES);
	return result.ok ? `ok: ${result.usedAs}` : `refused: ${result.refused.join(", ")}`;
}

describe("SPDX expressions", () => {
	it("accepts allowed ids, also with an exception", () => {
		expect(verdict("MIT")).toBe("ok: MIT");
		expect(verdict("Apache-2.0 WITH LLVM-exception")).toBe("ok: Apache-2.0 WITH LLVM-exception");
	});

	it("takes the allowed side of OR and records it", () => {
		expect(verdict("MPL-2.0 OR Apache-2.0")).toBe("ok: Apache-2.0");
		expect(verdict("(MIT OR GPL-3.0-or-later)")).toBe("ok: MIT");
		expect(verdict("GPL-2.0-only OR LGPL-3.0-only")).toBe("refused: GPL-2.0-only, LGPL-3.0-only");
	});

	it("needs both sides of AND", () => {
		expect(verdict("MIT AND CC-BY-4.0")).toBe("ok: MIT AND CC-BY-4.0");
		expect(verdict("MIT AND GPL-3.0-only")).toBe("refused: GPL-3.0-only");
		expect(verdict("MIT OR (Apache-2.0 AND GPL-3.0-only)")).toBe("ok: MIT");
		expect(verdict("GPL-3.0-only OR MIT AND ISC")).toBe("ok: MIT AND ISC");
	});

	it("refuses copyleft, source-available and unknown ids", () => {
		for (const id of ["GPL-3.0", "LGPL-2.1-or-later", "AGPL-3.0-only", "MPL-2.0", "EPL-2.0", "CC-BY-SA-4.0", "OFL-1.1", "BUSL-1.1", "UNLICENSED", "WTFPL"]) {
			expect(verdict(id)).toBe(`refused: ${id}`);
		}
		expect(verdict("GPL-2.0-only WITH Classpath-exception-2.0")).toContain("refused");
	});

	it("refuses a dependency under the project's own licence or another source-available one, with no override", () => {
		expect(verdict(PROJECT_LICENCE)).toBe(`refused: ${PROJECT_LICENCE}`);
		expect(verdict("Elastic-2.0")).toBe("refused: Elastic-2.0");
		const coversUp = [{ package: "odd@1.0.0", licence: "MIT", evidence: "https://example.org/LICENSE" }];
		const result = judgePackages(input({ "odd@1.0.0": "LicenseRef-SUL-1.0" }, { overrides: coversUp }));
		expect(result.offences[0]).toContain("LicenseRef-SUL-1.0");
		expect(result.offences.join("\n")).toContain("an override never replaces a licence that is never allowed");
	});

	it("does not parse what is not an expression", () => {
		for (const text of ["", "SEE LICENSE IN LICENSE", "MIT OR", "(MIT", "MIT AND AND ISC", "MIT, ISC", "MIT WITH"]) {
			expect(verdict(text)).toBe("unparsable");
		}
	});
});

const NPM = "https://www.npmjs.com/package/";

/** `input({ "a@1.0.0": "MIT" })` is a lockfile of installed packages, each with its declared licence. */
function input(installed: Readonly<Record<string, string>>, more: Partial<JudgementInput> = {}): JudgementInput {
	const declared = new Map(Object.entries(installed).map(([id, licence]) => [id, { licence, source: `${NPM}${id.slice(0, id.lastIndexOf("@"))}` }]));
	return { locked: [...declared.keys()], installed: declared, recorded: new Map(), overrides: [], vendored: [], actions: [], ...more };
}

describe("package judgement", () => {
	it("lists allowed packages, sorted, with the side of OR that is used", () => {
		const result = judgePackages(input({ "zeta@1.0.0": "MIT", "alpha@1.0.0": "MIT", "dompurify@3.0.0": "(MPL-2.0 OR Apache-2.0)" }));
		expect(result.offences).toEqual([]);
		expect(result.rows.map((row) => `${row.name}: ${row.licence}`)).toEqual(["alpha: MIT", "dompurify: (MPL-2.0 OR Apache-2.0) -> Apache-2.0", "zeta: MIT"]);
	});

	it("refuses a copyleft licence, a missing one and an unparsable one, and names the package", () => {
		const result = judgePackages(input({ "stockfish.js@10.0.2": "GPL-3.0", "nameless@1.0.0": "Unknown", "odd@1.0.0": "SEE LICENSE IN LICENSE", "@scope/weak@2.0.0": "LGPL-3.0-or-later" }));
		expect(result.rows).toEqual([]);
		expect(result.offences).toEqual([
			"stockfish.js@10.0.2 is under GPL-3.0 (never allowed, no exception path)",
			"nameless@1.0.0 has no licence",
			'odd@1.0.0 has a licence that is not an SPDX expression: "SEE LICENSE IN LICENSE"',
			"@scope/weak@2.0.0 is under LGPL-3.0-or-later (never allowed, no exception path)",
		]);
		expect(result.refusedPackages).toEqual(["stockfish.js", "nameless", "odd", "@scope/weak"]);
	});

	it("judges every package of the lockfile, also one that this machine does not install", () => {
		const recorded = new Map([["fsevents@2.3.3", { licence: "MIT", source: "https://example.org/fsevents" }]]);
		const base = input({ "a@1.0.0": "MIT" });
		const locked = [...base.locked, "fsevents@2.3.3"];
		expect(judgePackages({ ...base, locked }).offences[0]).toContain("fsevents@2.3.3 is in the lockfile, but it is not installed on this machine");
		expect(judgePackages({ ...base, locked, recorded }).rows.map((row) => row.name)).toEqual(["a", "fsevents"]);
		const copyleft = new Map([["fsevents@2.3.3", { licence: "GPL-2.0-only", source: "https://example.org" }]]);
		expect(judgePackages({ ...base, locked, recorded: copyleft }).offences).toEqual(["fsevents@2.3.3 is under GPL-2.0-only (never allowed, no exception path)"]);
		expect(judgePackages({ ...base, locked: [] }).offences).toEqual(["a@1.0.0 is installed but not in the lockfile; run pnpm install --frozen-lockfile"]);
	});

	it("gives the same inventory on a machine that installs a package and on one that only has its row", () => {
		const here = judgePackages(input({ "a@1.0.0": "MIT", "@esbuild/linux-x64@0.28.2": "MIT" }));
		const elsewhere = judgePackages({ ...input({ "a@1.0.0": "MIT" }), locked: ["a@1.0.0", "@esbuild/linux-x64@0.28.2"], recorded: recordedRows(renderInventory(here.rows)) });
		expect(elsewhere.offences).toEqual([]);
		expect(renderInventory(elsewhere.rows)).toBe(renderInventory(here.rows));
	});

	it("reads its own inventory back, also a row with an override and one with a bar", () => {
		const rows = [
			{ name: "a", version: "1.0.0", licence: "(MPL-2.0 OR Apache-2.0) -> Apache-2.0", source: "https://a.example" },
			{ name: "b", version: "2.0.0", licence: "none (override) -> MIT", source: "https://b.example/x|y" },
		];
		expect([...recordedRows(renderInventory(rows))]).toEqual([
			["a@1.0.0", { licence: "(MPL-2.0 OR Apache-2.0)", source: "https://a.example" }],
			["b@2.0.0", { licence: "", source: "https://b.example/x|y" }],
		]);
	});

	it("applies an override to the exact version only, and reports a stale override", () => {
		const overrides = [{ package: "odd@1.0.0", licence: "MIT", evidence: "https://example.org/LICENSE" }];
		expect(judgePackages(input({ "odd@1.0.0": "Unknown" }, { overrides })).rows[0]?.licence).toBe("Unknown (override) -> MIT");
		expect(judgePackages(input({ "odd@1.0.1": "Unknown" }, { overrides })).offences).toEqual([
			"odd@1.0.1 has no licence",
			"licences.overrides.json: odd@1.0.0 is not in the lockfile; remove the row",
		]);
	});

	it("does not let an override bring in or cover up a licence that is not allowed", () => {
		const bringsIn = [{ package: "odd@1.0.0", licence: "GPL-3.0-only", evidence: "https://example.org/LICENSE" }];
		expect(judgePackages(input({ "odd@1.0.0": "Unknown" }, { overrides: bringsIn })).offences).toHaveLength(1);
		const coversUp = [{ package: "engine@1.0.0", licence: "MIT", evidence: "https://example.org/LICENSE" }];
		const result = judgePackages(input({ "engine@1.0.0": "GPL-3.0" }, { overrides: coversUp }));
		expect(result.rows).toEqual([]);
		expect(result.offences[0]).toContain("an override never replaces a licence that is never allowed");
	});

	it("judges a vendored folder and an action like a package", () => {
		const row = { name: "garbochess", source: "https://example.org/garbochess", commit: "abc1234", licence: "BSD-3-Clause" };
		expect(judgePackages(input({}, { vendored: [row] })).rows).toEqual([{ name: "third_party/garbochess", version: "abc1234", licence: "BSD-3-Clause", source: row.source }]);
		expect(judgePackages(input({}, { vendored: [{ ...row, licence: "GPL-3.0" }] })).offences).toHaveLength(1);
		const actions = [{ action: "actions/checkout", commit: "0123456789abcdef0123456789abcdef01234567" }];
		expect(judgePackages(input({}, { actions })).rows[0]).toEqual({ name: "action actions/checkout", version: actions[0]?.commit, licence: "MIT", source: "https://github.com/actions/checkout" });
	});

	it("flattens the output of pnpm licenses list", () => {
		const listed = { MIT: [{ name: "a", versions: ["1.0.0", "2.0.0"], license: "MIT", homepage: "https://a.example" }, { name: "b", versions: ["1.0.0"], license: "MIT" }] };
		expect([...declaredByInstalled(listed).entries()]).toEqual([
			["a@1.0.0", { licence: "MIT", source: "https://a.example" }],
			["a@2.0.0", { licence: "MIT", source: "https://a.example" }],
			["b@1.0.0", { licence: "MIT", source: `${NPM}b` }],
		]);
	});
});

describe("lockfile", () => {
	const lock = (body: string): string => `lockfileVersion: '9.0'\n\npackages:\n\n${body}\nsnapshots:\n\n  a@1.0.0: {}\n`;
	const good = "  '@scope/a@1.0.0':\n    resolution: {integrity: sha512-x}\n    os: [darwin]\n\n  b@2.0.0-beta.1:\n    resolution: {integrity: sha512-y}\n";

	it("lists every package, quoted or not, and stops at the next section", () => {
		expect(lockedPackages(lock(good))).toEqual({ keys: ["@scope/a@1.0.0", "b@2.0.0-beta.1"], offences: [] });
	});

	it("reads the lockfile of this repository", () => {
		const { keys, offences } = lockedPackages(readText("pnpm-lock.yaml"));
		expect(offences).toEqual([]);
		expect(keys.length).toBeGreaterThan(100);
		expect(keys).toContain("typebox@1.3.27");
	});

	it("refuses a package from a git repository or a tarball, and a lockfile it cannot read", () => {
		const git = "  evil@https://codeload.github.com/o/r/tar.gz/abc:\n    resolution: {tarball: https://codeload.github.com/o/r/tar.gz/abc}\n";
		const tarball = "  c@1.0.0:\n    resolution: {tarball: https://example.org/c.tgz}\n";
		expect(lockedPackages(lock(git)).offences).toHaveLength(1);
		expect(lockedPackages(lock(tarball)).offences).toHaveLength(1);
		expect(lockedPackages("lockfileVersion: '9.0'\n").offences).toEqual(["pnpm-lock.yaml: no packages section"]);
		expect(lockedPackages(lock("")).offences).toEqual(["pnpm-lock.yaml: the packages section is empty or unreadable"]);
	});
});

describe("repository files", () => {
	it("needs the SPDX line of the project licence first, after an optional shebang", () => {
		expect(PROJECT_LICENCE).toBe("LicenseRef-SUL-1.0");
		const good = "// SPDX-License-Identifier: LicenseRef-SUL-1.0\nexport {};\n";
		expect(checkHeaders([{ path: "a.ts", text: good }, { path: "b.mjs", text: `#!/usr/bin/env node\n${good}` }])).toEqual([]);
		expect(checkHeaders([{ path: "a.ts", text: "export {};\n" }, { path: "c.ts", text: "// SPDX-License-Identifier: MIT\n" }])).toHaveLength(2);
		expect(checkHeaders([{ path: "d.ts", text: "// SPDX-License-Identifier: Apache-2.0\nexport {};\n" }])).toEqual([
			'd.ts: the first line must be "// SPDX-License-Identifier: LicenseRef-SUL-1.0"',
		]);
	});

	it("needs the project licence and exact versions in package.json", () => {
		expect(checkManifests([{ path: "a/package.json", text: JSON.stringify({ license: "Apache-2.0" }) }])).toEqual([
			'a/package.json: "license" must be "LicenseRef-SUL-1.0"',
		]);
		const good = { license: "LicenseRef-SUL-1.0", dependencies: { typebox: "1.3.27", "@swarmtales/contracts": "workspace:*" } };
		expect(checkManifests([{ path: "package.json", text: JSON.stringify(good) }])).toEqual([]);
		const bad = { license: "MIT", devDependencies: { eslint: "^9.39.5", vitest: "latest" } };
		expect(checkManifests([{ path: "p/package.json", text: JSON.stringify(bad) }])).toEqual([
			'p/package.json: "license" must be "LicenseRef-SUL-1.0"',
			'p/package.json: eslint has the version "^9.39.5"; name one exact version',
			'p/package.json: vitest has the version "latest"; name one exact version',
		]);
		expect(checkManifests([{ path: "q/package.json", text: "{}" }])).toHaveLength(1);
	});

	it("leaves the header of a vendored file alone", () => {
		expect(checkHeaders([{ path: "third_party/garbochess/garbochess.js", text: "// Copyright someone\n" }])).toEqual([]);
	});

	const sha = "0123456789abcdef0123456789abcdef01234567";
	const workflow = (text: string): readonly { path: string; text: string }[] => [{ path: ".github/workflows/w.yml", text }];

	it("needs allowed actions pinned by commit", () => {
		const text = [`      - uses: actions/checkout@${sha} # v1`, "      - uses: actions/checkout@v4", `        uses: evil/action@${sha}`, "      - uses: ./local", "      # - uses: a/b@v1"].join("\n");
		expect(checkWorkflows(workflow(text))).toEqual([
			'.github/workflows/w.yml:2: "actions/checkout@v4" must be pinned by a full commit id (owner/repo@<40 hex digits>)',
			".github/workflows/w.yml:3: the action evil/action is not on the list in scripts/licences/allowlist.ts",
			'.github/workflows/w.yml:4: "./local" must be pinned by a full commit id (owner/repo@<40 hex digits>)',
		]);
		expect(usedActions(workflow(text))).toEqual([{ action: "actions/checkout", commit: sha }, { action: "evil/action", commit: sha }]);
	});

	it("finds uses in every YAML form, in a local action, and refuses a container image", () => {
		for (const line of ["      - { uses: a/b@v1 }", '      - "uses": a/b@v1', "      - name: x\n        'uses' : \"a/b@v1\"", "      - {name: x, uses: a/b@v1}", "    uses: o/r/.github/workflows/w.yml@main"]) {
			expect(checkWorkflows(workflow(line))).toHaveLength(1);
		}
		expect(checkWorkflows([...workflow(""), { path: ".github/actions/x/action.yml", text: "    - uses: a/b@v1\n" }])).toHaveLength(1);
		expect(checkWorkflows(workflow("    container: node:26\n"))).toHaveLength(1);
		expect(checkWorkflows(workflow("        image: postgres\n"))).toHaveLength(1);
		expect(checkWorkflows(workflow("      - name: no uses here, focuses: on nothing\n"))).toEqual([]);
	});

	it("fails when there is no workflow, so the check does not pass on nothing", () => {
		expect(checkWorkflows([])).toEqual([".github/workflows/: no workflow found; the check workflow must exist"]);
	});

	it("needs a manifest row and a licence text for every vendored folder, and no loose file", () => {
		const folder = (name: string, hasLicence: boolean): { name: string; isFolder: boolean; hasLicence: boolean } => ({ name, isFolder: true, hasLicence });
		const file = (name: string): { name: string; isFolder: boolean; hasLicence: boolean } => ({ name, isFolder: false, hasLicence: false });
		expect(checkVendored([folder("a", true), file("README.md"), file("manifest.json")], ["a"])).toEqual([]);
		expect(checkVendored([folder("a", false)], ["b"])).toHaveLength(3);
		expect(checkVendored([file("engine.js")], [])[0]).toContain("third_party/engine.js");
		expect(checkVendored([folder("a", true)], ["a", "a"])).toHaveLength(1);
	});
});
