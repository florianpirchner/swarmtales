/**
 * Renames the game master to the gamemaker in recorded runs (2026-10-29, Flo):
 * `pnpm migrate:gamemaker <dir>...`. In every `.json` and `.jsonl` file it
 * renames the keys and event types (`"gamemaster_note"` -> `"gamemaker_note"`,
 * `"gamemaster": {...}` -> `"gamemaker": {...}`); in every `README.md` the
 * prose. What residents and models wrote stays as it was. Idempotent.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/** A JSON text with the old keys and event types renamed; only quoted names that start with the old word. */
export function migrateJson(text: string): string {
	return text.replace(/"gamemaster/g, '"gamemaker').replace(/"Gamemaster/g, '"Gamemaker');
}

/** A hand-written README with the old name in its prose renamed. */
export function migrateProse(text: string): string {
	return text
		.replace(/GAME MASTER/g, "GAMEMAKER")
		.replace(/Game [Mm]aster/g, "Gamemaker")
		.replace(/game[ -]master/g, "gamemaker")
		.replace(/Gamemaster/g, "Gamemaker")
		.replace(/gamemaster/g, "gamemaker");
}

function walk(path: string, changed: string[]): void {
	if (statSync(path).isDirectory()) {
		for (const name of readdirSync(path)) walk(join(path, name), changed);
		return;
	}
	const migrate = /\.jsonl?$/.test(path) ? migrateJson : basename(path) === "README.md" ? migrateProse : undefined;
	if (migrate === undefined) return;
	const text = readFileSync(path, "utf8");
	const next = migrate(text);
	if (next === text) return;
	writeFileSync(path, next);
	changed.push(path);
}

/** Migrates the given directories; `argv` is the list of directories. */
export function main(argv: readonly string[]): void {
	if (argv.length === 0) {
		process.stderr.write("Usage: pnpm migrate:gamemaker <dir>...\n");
		process.exit(2);
	}
	const changed: string[] = [];
	for (const directory of argv) walk(directory, changed);
	process.stdout.write(`${changed.length} files migrated\n`);
}

if (process.argv[1]?.endsWith("migrate-gamemaker.ts") === true) main(process.argv.slice(2));
