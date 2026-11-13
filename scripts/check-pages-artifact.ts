/**
 * Checks the run viewer's GitHub Pages artifact (`apps/viewer-web/dist` after `pnpm --filter @swarmtales/viewer-web build:pages`,
 * or the folder given as argument) before it is published: the page goes public even while the repository is private, so
 * it may hold the app and nothing else. Allowed: `index.html` (with its Content Security Policy), `viewer-data.json`
 * without stories, and `assets/*.js` / `assets/*.css`. Refused: source maps, local paths, anything that looks like a key.
 * Prints every file with its size; exits 1 on the first broken rule.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Type } from "typebox";
import { Check } from "typebox/value";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = process.argv[2] === undefined ? join(ROOT, "apps", "viewer-web", "dist") : resolve(process.cwd(), process.argv[2]);

const ALLOWED = [/^index\.html$/, /^viewer-data\.json$/, /^assets\/[\w.-]+\.(js|css)$/];
/** Patterns that must not appear in any file: source map links, absolute local paths, key prefixes, private keys. */
const FORBIDDEN: readonly (readonly [string, RegExp])[] = [
	["a source map link", /sourceMappingURL=/],
	["a local path", /\/home\/[a-z]|\/Users\/[A-Za-z]|[A-Z]:\\\\Users\\\\/],
	["a GitHub token", /\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
	["an API key", /\bsk-(ant|or)-[A-Za-z0-9_-]{20,}/],
	["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

const DataFile = Type.Object({
	stories: Type.Record(Type.String(), Type.Unknown()),
	aliases: Type.Record(Type.String(), Type.String()),
	views: Type.Array(Type.Unknown()),
});

function files(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]));
}

const problems: string[] = [];
const all = files(DIST).map((file) => relative(DIST, file).split("\\").join("/")).sort();
let total = 0;
for (const name of all) {
	const size = statSync(join(DIST, name)).size;
	total += size;
	console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${name}`);
	if (!ALLOWED.some((pattern) => pattern.test(name))) problems.push(`${name}: not part of the app`);
	const text = readFileSync(join(DIST, name), "utf8");
	for (const [what, pattern] of FORBIDDEN) if (pattern.test(text)) problems.push(`${name}: contains ${what}`);
}
console.log(`${(total / 1024).toFixed(1).padStart(8)} KB  total, ${String(all.length)} files`);

if (!all.includes("index.html")) problems.push("index.html is missing");
else if (!readFileSync(join(DIST, "index.html"), "utf8").includes('http-equiv="Content-Security-Policy"')) problems.push("index.html has no Content Security Policy");
if (all.includes("viewer-data.json")) {
	const data: unknown = JSON.parse(readFileSync(join(DIST, "viewer-data.json"), "utf8"));
	if (!Check(DataFile, data)) problems.push("viewer-data.json has an unexpected shape");
	else if (Object.keys(data.stories).length > 0 || Object.keys(data.aliases).length > 0) problems.push(`viewer-data.json holds ${String(Object.keys(data.stories).length)} stories (build with build:pages)`);
}

if (problems.length > 0) {
	for (const problem of problems) console.error(`pages artifact: ${problem}`);
	process.exit(1);
}
console.log("pages artifact: only the app");
