// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm check:licences` (`--check`) and `pnpm licences:write` (`--write`): the licence gate of DECISIONS.md 5.3.
 *
 * It judges every package of the lockfile (all platforms), every vendored folder and every action against the
 * allowlist, checks the SPDX header of every source file, that a binary or model file is only vendored, the licence and the exact versions of every
 * `package.json`, the actions of every workflow, and that `THIRD-PARTY-LICENSES.md` is up to date.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";
import { isSourceFile, listFiles, readText, REPO_ROOT } from "./lib/files.ts";
import {
	declaredByInstalled, judgePackages, lockedPackages, Overrides, PnpmLicences, recordedRows, renderInventory, ThirdParty, type Declared,
} from "./licences/inventory.ts";
import { checkBinaries, checkHeaders, checkManifests, checkVendored, checkWorkflows, usedActions, type TextFile, type VendoredEntry } from "./licences/repo-files.ts";

const INVENTORY = "THIRD-PARTY-LICENSES.md";

function parse<Schema extends TSchema>(schema: Schema, text: string, what: string): Static<Schema> {
	const raw: unknown = JSON.parse(text);
	if (Value.Check(schema, raw)) return raw;
	const first = Value.Errors(schema, raw)[0];
	throw new TypeError(`${what} has an unexpected shape: ${first?.instancePath ?? ""} ${first?.message ?? ""}`);
}

const pnpm = (...args: readonly string[]): string => execFileSync("pnpm", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
/** Every file that git tracks, so that a binary in a folder the file walk skips is seen too. */
const tracked = (): readonly string[] =>
	execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter((path) => path !== "");
const filesWith =(keep: (path: string) => boolean): readonly TextFile[] => listFiles(".", keep).map((path) => ({ path, text: readText(path) }));

function vendoredEntries(): readonly VendoredEntry[] {
	return readdirSync(join(REPO_ROOT, "third_party"), { withFileTypes: true }).map((entry) => ({
		name: entry.name,
		isFolder: entry.isDirectory(),
		hasLicence: existsSync(join(REPO_ROOT, "third_party", entry.name, "LICENSE")),
	}));
}

/** Shows what pulls a refused package in. */
function pulledInBy(name: string): string {
	try {
		return pnpm("why", "-r", name).trim().split("\n").slice(0, 20).join("\n");
	} catch {
		return "(pnpm why gave no answer)";
	}
}

const Published = Type.Object({ license: Type.Optional(Type.String()), homepage: Type.Optional(Type.String()) });

/**
 * Asks the registry what the packages declare that the lockfile names and this machine does not install (binaries
 * of other platforms and what they pull in). Only `--write` calls it; the check itself never uses the network.
 */
function fetchDeclared(ids: readonly string[]): ReadonlyMap<string, Declared> {
	const fetched = new Map<string, Declared>();
	for (const id of ids) {
		try {
			const published = parse(Published, pnpm("view", "--json", id, "license", "homepage"), `pnpm view ${id}`);
			const source = published.homepage ?? `https://www.npmjs.com/package/${id.slice(0, id.lastIndexOf("@"))}`;
			fetched.set(id, { licence: published.license ?? "", source });
		} catch {
			console.error(`licences: could not ask the registry about ${id}`);
		}
	}
	return fetched;
}

function main(mode: string): number {
	const installed = declaredByInstalled(parse(PnpmLicences, pnpm("licenses", "list", "--json"), "pnpm licenses list"));
	const overrides = parse(Overrides, readText("licences.overrides.json"), "licences.overrides.json");
	const vendored = parse(ThirdParty, readText("third_party/manifest.json"), "third_party/manifest.json");
	const locked = lockedPackages(readText("pnpm-lock.yaml"));
	const committed = existsSync(join(REPO_ROOT, INVENTORY)) ? recordedRows(readText(INVENTORY)) : new Map<string, Declared>();
	const unknown = locked.keys.filter((id) => !installed.has(id) && !committed.has(id));
	const recorded = mode === "--write" ? new Map([...committed, ...fetchDeclared(unknown)]) : committed;
	const workflows = filesWith((path) => path.startsWith(".github/") && /\.ya?ml$/.test(path));
	const judgement = judgePackages({ locked: locked.keys, installed, recorded, overrides, vendored, actions: usedActions(workflows) });
	const inventory = renderInventory(judgement.rows);
	if (mode === "--write") writeFileSync(join(REPO_ROOT, INVENTORY), inventory);
	const stale = !existsSync(join(REPO_ROOT, INVENTORY)) || readText(INVENTORY) !== inventory;
	const offences = [
		...locked.offences,
		...judgement.offences,
		...checkHeaders(filesWith(isSourceFile)),
		...checkManifests(filesWith((path) => path === "package.json" || path.endsWith("/package.json"))),
		...checkWorkflows(workflows),
		...checkVendored(vendoredEntries(), vendored.map((row) => row.name)),
		...checkBinaries(tracked(), vendored.map((row) => row.name)),
		...(stale ? [`${INVENTORY} is stale; run pnpm licences:write and commit it`] : []),
	];
	for (const offence of offences) console.error(`licences: ${offence}`);
	for (const name of new Set(judgement.refusedPackages)) console.error(`licences: what pulls ${name} in:\n${pulledInBy(name)}`);
	if (offences.length === 0) console.log(`licences: ${judgement.rows.length} entries (${locked.keys.length} packages of the lockfile), all on the allowlist; headers, manifests and workflows are clean`);
	return offences.length === 0 ? 0 : 1;
}

const mode = process.argv[2];
if (mode !== "--check" && mode !== "--write") {
	console.error("usage: node scripts/check-licences.ts --check | --write");
	process.exitCode = 2;
} else {
	process.exitCode = main(mode);
}
