/**
 * Writes `apps/viewer-web/public/viewer-data.json` (or the file given as argument): every registered story as plain JSON (what
 * `swt story show <name> --json` puts under `story`, for the viewer's story graph) and the view
 * descriptors of `mechanics/*\/views.json`. Run by `pnpm --filter @swarmtales/viewer-web build` and `dev`;
 * the file is not committed. `--no-stories` leaves the stories out (the public GitHub Pages build ships the app
 * only; its story view then reads the story from the run's own `000-run.json`).
 */
import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { storyData } from "@swarmtales/kernel";
import { parseViews, type ViewDescriptor } from "@swarmtales/viewer-ui/views";
import { coreStories, coreStoryNames, STORIES, storyId } from "../stories/index.ts";

const ROOT = resolve(import.meta.dirname, "..");
// `export-viewer-data.ts [--no-stories] [out-file]`: the web app's public folder by default; the VS Code extension passes its own `dist/viewer-data.json`.
const args = process.argv.slice(2);
const withStories = !args.includes("--no-stories");
const outArg = args.find((arg) => arg !== "--no-stories");
const OUT = outArg === undefined ? join(ROOT, "apps", "viewer-web", "public", "viewer-data.json") : resolve(process.cwd(), outArg);

/** A story as plain JSON, without functions or classes. */
function plain(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value));
}

const stories: Record<string, unknown> = {};
if (withStories) {
	for (const [name, story] of Object.entries(STORIES)) stories[name] = plain(story);
	for (const name of coreStoryNames()) {
		const entry = coreStories[name];
		if (entry !== undefined) stories[name] = plain(storyData(entry.story));
	}
}

// Names runs were recorded under before a rename (`ALIASES` in stories/index.ts).
const aliases: Record<string, string> = {};
for (const old of withStories ? ["nexus", "quarry-noburn", "lantern-auction"] : []) {
	if (storyId(old) !== old) aliases[old] = storyId(old);
}

const views: ViewDescriptor[] = [];
for (const mechanic of readdirSync(join(ROOT, "mechanics"))) {
	const file = join(ROOT, "mechanics", mechanic, "views.json");
	if (!existsSync(file)) continue;
	const parsed = parseViews(readFileSync(file, "utf8"), `mechanics/${mechanic}/views.json`);
	if (parsed.issues.length > 0) throw new Error(parsed.issues.join("\n"));
	views.push(...parsed.views);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ stories, aliases, views }));
console.log(`viewer data: ${String(Object.keys(stories).length)} stories, ${String(views.length)} views -> ${relative(ROOT, OUT)}`);
