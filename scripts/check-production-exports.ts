/**
 * `pnpm knip:production`: the exports no production code uses (step 18, F2 m1).
 *
 * `pnpm knip` makes every test an entry, so an export only a test imports counts as used. This
 * check runs knip from the production entries alone (`knip.production.json`: the CLI, the stories,
 * the lab and the scripts; the testkit is test-only and left out) with the packages' entry exports
 * included, and compares what it reports with `scripts/production-exports.json`. The list may only
 * shrink: a new entry fails (use it in production code, move it next to its tests, or delete it),
 * and so does a listed entry that is used now (take it off the list).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { Parse } from "typebox/value";

const ROOT = resolve(import.meta.dirname, "..");
const LIST = join(ROOT, "scripts", "production-exports.json");

const Named = Type.Array(Type.Object({ name: Type.String() }));
const Report = Type.Object({ issues: Type.Array(Type.Object({ file: Type.String(), exports: Named, types: Named })) });
const Listed = Type.Array(Type.String());

/**
 * A package whose `dist` exists is resolved through its build output, and knip then misses the
 * imports of its source. The result must not depend on whether a build ran before, so the build
 * outputs are set aside while knip runs.
 */
function withoutBuildOutput<T>(run: () => T): T {
	const hidden: [string, string][] = [];
	for (const group of ["packages", "mechanics", "apps"]) {
		for (const name of readdirSync(join(ROOT, group))) {
			const dist = join(ROOT, group, name, "dist");
			if (!existsSync(dist)) continue;
			const aside = `${dist}.knip-aside`;
			renameSync(dist, aside);
			hidden.push([dist, aside]);
		}
	}
	try {
		return run();
	} finally {
		for (const [dist, aside] of hidden) renameSync(aside, dist);
	}
}

const raw = withoutBuildOutput(() => execFileSync(process.execPath, [join(ROOT, "node_modules", "knip", "bin", "knip.js"), "--config", "knip.production.json", "--production", "--include-entry-exports", "--no-exit-code", "--reporter", "json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const report = Parse(Report, JSON.parse(raw.slice(raw.indexOf("{"))));
const found = report.issues.flatMap((issue) => [...issue.exports, ...issue.types].map((entry) => `${issue.file}: ${entry.name}`)).sort();

if (process.argv.includes("--write")) {
	writeFileSync(LIST, `${JSON.stringify(found, null, "\t")}\n`);
	console.log(`knip:production: wrote ${String(found.length)} entries to scripts/production-exports.json`);
	process.exit(0);
}

const listed = new Set(Parse(Listed, JSON.parse(readFileSync(LIST, "utf8"))));
const fresh = found.filter((entry) => !listed.has(entry));
const gone = [...listed].filter((entry) => !found.includes(entry));
for (const entry of fresh) console.error(`new export no production code uses: ${entry}`);
for (const entry of gone) console.error(`used or gone now, take it off scripts/production-exports.json: ${entry}`);
if (fresh.length > 0 || gone.length > 0) process.exit(1);
console.log(`knip:production: ${String(found.length)} exports only tests use (the list may only shrink)`);
