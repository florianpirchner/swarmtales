// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The two runs every standing part starts from, played once per test session (decision A99): the fake run, and the
 * straight run with a snapshot at each of its boundaries. The first part that needs a game's runs takes a lock file,
 * plays them into a staging folder and renames it into the cache; a part that finds the lock waits for the folder
 * (or takes over the lock of a worker that died). Each part copies the folders into its own working directory, so
 * its resumes write beside them as before.
 *
 * The cache of a session is `<tmp>/swt-standing-cache/session-<pid>`, with the pid of the Vitest process that started
 * the workers (their parent), and one folder per run, keyed by the game file, the seed and a hash of every file the
 * fake run reads (the sources of the games, the mechanics, the packages and the command line, tests left out). A
 * session folder whose process is gone, or that is older than a day, is removed; nothing outside the cache's own
 * folder is touched. The session folder goes when every part has said it is done.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { cli, eventsOf, type Printed } from "./support.ts";

/** The folder of all caches of the standing parts; nothing outside it is written or removed. */
const ROOT = join(tmpdir(), "swt-standing-cache");
const SESSION = join(ROOT, `session-${String(process.ppid)}`);
const REPOSITORY = fileURLToPath(new URL("../../../", import.meta.url));
/** The folders whose files the fake run of a game file reads. */
const INPUTS = ["games", "mechanics", "packages", "apps/cli/src"];
const SKIPPED = new Set(["node_modules", "dist", "test"]);
const DAY = 24 * 60 * 60 * 1000;
const WAIT = 500_000;

const Shared = Type.Object(
	{
		plain: Type.Object({ code: Type.Number(), err: Type.String(), folder: Type.String() }, { description: "The fake run: its exit code, its error output and its folder" }),
		straight: Type.Union([Type.Null(), Type.Object({ code: Type.Number(), err: Type.String(), folder: Type.String() })], { description: "The run with the snapshots; null for a run without a boundary" }),
	},
	{ description: "What the writer of a cached run recorded (result.json)" },
);
/** The two runs of a cache entry, with their folders relative to the working directory of the part that read them, and the entry. */
export type SharedRuns = Static<typeof Shared> & { readonly entry: string };

/** Whether the process of a pid still runs (a process of another user counts as running). */
function alive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error instanceof Error && Reflect.get(error, "code") === "EPERM";
	}
}

/** Removes the session folders of processes that are gone, or that are older than a day. */
function cleanStale(): void {
	const names = existsSync(ROOT) ? readdirSync(ROOT) : [];
	for (const name of names) {
		const pid = /^session-(\d+)$/.exec(name)?.[1];
		const path = join(ROOT, name);
		if (pid === undefined || path === SESSION) continue;
		try {
			if (!alive(Number(pid)) || Date.now() - statSync(path).mtimeMs > DAY) rmSync(path, { recursive: true, force: true });
		} catch {
			// Another worker removed it first.
		}
	}
}
cleanStale();

/** The files below a folder of the repository that a fake run may read, as paths relative to the repository. */
function inputFiles(folder: string): readonly string[] {
	const path = join(REPOSITORY, folder);
	if (!existsSync(path)) return [];
	return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
		if (SKIPPED.has(entry.name)) return [];
		const inner = relative(REPOSITORY, join(path, entry.name));
		return entry.isDirectory() ? inputFiles(inner) : [inner];
	});
}

let inputs = "";
/** The hash of every input file of the fake runs, by path and content; computed once per worker. */
function inputHash(): string {
	if (inputs !== "") return inputs;
	const hash = createHash("sha256");
	for (const file of INPUTS.flatMap(inputFiles).sort()) hash.update(`${file}\0`).update(readFileSync(join(REPOSITORY, file))).update("\0");
	inputs = hash.digest("hex").slice(0, 16);
	return inputs;
}

/** The run folder a command printed (`run: <folder>`), relative to the working directory. */
export const folderOf = (printed: Printed): string => (printed.out.at(-1) ?? "").replace(/^run: /, "");

/** Plays the two runs into `staging` and records them in its `result.json`. */
async function write(staging: string, file: string, seed: number, boundariesOf: (ticks: number) => readonly number[]): Promise<void> {
	mkdirSync(staging, { recursive: true });
	const swt = cli(staging);
	const plain = await swt("run", file, "--fake", "--seed", String(seed), "--out", "plain");
	const folder = folderOf(plain);
	const ticks = plain.code === 0 ? eventsOf(join(staging, folder)).filter((event) => event.type === "tick_ended").length : 0;
	const all = boundariesOf(ticks);
	const straight = all.length === 0 ? null : await swt("run", file, "--fake", "--seed", String(seed), "--out", "straight", "--snapshot-at", all.join(","));
	const shared: Static<typeof Shared> = { plain: { code: plain.code, err: plain.err, folder }, straight: straight === null ? null : { code: straight.code, err: straight.err, folder: folderOf(straight) } };
	writeFileSync(join(staging, "result.json"), JSON.stringify(shared));
}

/** Creates a file that must not exist yet; false when it exists. */
function create(path: string, content: string): boolean {
	try {
		writeFileSync(path, content, { flag: "wx" });
		return true;
	} catch {
		return false;
	}
}

/** Takes the lock file, or takes over the lock of a process that is gone; false while another process holds it. */
function lock(path: string): boolean {
	if (create(path, String(process.pid))) return true;
	try {
		const holder = Number(readFileSync(path, "utf8"));
		if (holder > 0 && !alive(holder)) rmSync(path, { force: true });
	} catch {
		// The writer let go between the two looks.
	}
	return false;
}

/**
 * The fake run and the straight run with snapshots of one game file and seed, copied into `cwd` under `out`: played
 * by the first part that asks, read from the cache by the others.
 *
 * @param input - The game file, the seed, the boundaries of a run by its tick count, and where to copy the runs.
 * @param input.file - The game file, absolute.
 * @param input.seed - The fake seed.
 * @param input.boundariesOf - The boundaries of the straight run's snapshots, by the plain run's tick count.
 * @param input.cwd - The working directory of the part.
 * @param input.out - The folder under `cwd` the runs are copied into.
 * @returns The runs, with their folders relative to `cwd`, and the cache entry (for `claim`).
 * @throws Error When no run is in the cache after `WAIT` milliseconds.
 */
export async function sharedRuns(input: { file: string; seed: number; boundariesOf: (ticks: number) => readonly number[]; cwd: string; out: string }): Promise<SharedRuns> {
	const key = createHash("sha256").update(`${relative(REPOSITORY, input.file)}\0${String(input.seed)}\0${inputHash()}`).digest("hex").slice(0, 24);
	const entry = join(SESSION, key);
	const deadline = Date.now() + WAIT;
	mkdirSync(SESSION, { recursive: true });
	while (!existsSync(join(entry, "result.json"))) {
		if (Date.now() > deadline) throw new Error(`no cached run of ${input.file} after ${String(WAIT)} ms`);
		if (!lock(`${entry}.lock`)) {
			await new Promise((resolve) => setTimeout(resolve, 200));
			continue;
		}
		const staging = `${entry}.staging-${String(process.pid)}`;
		try {
			// The writer before may have finished between the look and the lock.
			if (existsSync(join(entry, "result.json"))) break;
			await write(staging, input.file, input.seed, input.boundariesOf);
			renameSync(staging, entry);
		} finally {
			rmSync(staging, { recursive: true, force: true });
			rmSync(`${entry}.lock`, { force: true });
		}
	}
	const shared = Parse(Shared, JSON.parse(readFileSync(join(entry, "result.json"), "utf8")));
	cpSync(entry, join(input.cwd, input.out), { recursive: true });
	const moved = (folder: string): string => join(input.out, folder);
	return { entry, plain: { ...shared.plain, folder: moved(shared.plain.folder) }, straight: shared.straight === null ? null : { ...shared.straight, folder: moved(shared.straight.folder) } };
}

/**
 * Takes a unit of the checks of a cached run (a boundary to resume from, the replay) for a part, so that each unit is
 * checked once in a session by the first part that comes to it, and a part that starts late finds less to do.
 *
 * @param entry - The cache entry, as `sharedRuns` returned it.
 * @param unit - The unit's name, unique within the entry.
 * @param part - The part that takes it.
 * @returns True when the part took the unit; false when another part had.
 */
export function claim(entry: string, unit: string, part: number): boolean {
	mkdirSync(`${entry}.claims`, { recursive: true });
	return create(join(`${entry}.claims`, unit), String(part));
}

/**
 * Gives back the units a part took earlier in this session: a part that runs again (Vitest's watch mode) checks
 * its units again.
 *
 * @param part - The part.
 */
export function releaseClaims(part: number): void {
	const claims = existsSync(SESSION) ? readdirSync(SESSION).filter((name) => name.endsWith(".claims")) : [];
	for (const unit of claims.flatMap((folder) => readdirSync(join(SESSION, folder)).map((name) => join(SESSION, folder, name)))) {
		if (readFileSync(unit, "utf8") === String(part)) rmSync(unit, { force: true });
	}
}

/**
 * Says that a part is done with the cache; the last of `parts` parts removes the session folder.
 *
 * @param part - The part, from 0.
 * @param parts - The number of parts.
 */
export function partDone(part: number, parts: number): void {
	const done = join(SESSION, "done");
	mkdirSync(done, { recursive: true });
	writeFileSync(join(done, String(part)), "");
	if (readdirSync(done).length >= parts) rmSync(SESSION, { recursive: true, force: true });
}
