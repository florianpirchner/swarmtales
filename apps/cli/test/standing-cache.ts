// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The run every standing part starts from, played once per test session (decision A99): the fake run with a snapshot
 * at every boundary up to `CAP` ticks (`--snapshot-at`), of which those the part resumes from are kept. The tick
 * count of a run is known only once it is played, so it is played once, not first plainly and then with the snapshots
 * of its boundaries (decision A108; a snapshot writes no event, so the log is the fake run's). The first part that
 * needs a game's run takes a lock file, plays it into a staging folder and renames it into the cache; a part that
 * finds the lock waits for the folder (or takes over the lock of a worker that died). Each part copies the folder into
 * its own working directory, so its resumes write beside it as before.
 *
 * The cache of a session is `<tmp>/swt-standing-cache/session-<pid>`, with the pid of the Vitest process that started
 * the workers (their parent), and one folder per run, keyed by the game file, the seed and a hash of every file the
 * fake run reads (the sources of the games, the mechanics, the packages and the command line, tests and build output left out). A
 * session folder whose process is gone, or that is older than a day, is removed; nothing outside the cache's own
 * folder is touched. The session folder goes when every part has said it is done.
 *
 * Every command of the parts runs in a child process (`cliProcess`, `standing-child.ts`), so that a long run does not
 * hold the event loop of a Vitest worker (decision A112).
 */
import { fork, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { eventsOf, type Printed } from "./events.ts";

const CHILD = fileURLToPath(new URL("standing-child.ts", import.meta.url));
const Answer = Type.Object(
	{
		id: Type.Number(),
		code: Type.Optional(Type.Number()),
		out: Type.Optional(Type.Array(Type.String())),
		err: Type.Optional(Type.String()),
		thrown: Type.Optional(Type.String()),
	},
	{ description: "The child's answer to one command (standing-child.ts): what it printed, or the error it threw" },
);
interface Pending {
	readonly resolve: (printed: Printed) => void;
	readonly reject: (error: Error) => void;
}

let child: ChildProcess | undefined;
const pending = new Map<number, Pending>();
let next = 0;

/** Settles the command an answer of the child belongs to. */
function settle(message: unknown): void {
	const answer = Parse(Answer, message);
	const waiting = pending.get(answer.id);
	pending.delete(answer.id);
	if (answer.thrown !== undefined) waiting?.reject(new Error(answer.thrown));
	else {
		const err = answer.err ?? "";
		waiting?.resolve({ code: answer.code ?? -1, out: answer.out ?? [], err, issue: /SWT-[A-Z]\d{3}/.exec(err)?.[0] });
	}
}

/**
 * The child process of this worker, started on the first command; a child that died fails what it had. Its heap is
 * held to 384 MB: the check's 6 GB hold every lane at once, and three children of a part each held up to about 380 MB
 * of resident memory without the limit (J306); the Whispers run with every snapshot plays in it.
 */
function started(): ChildProcess {
	if (child !== undefined) return child;
	const forked = fork(CHILD, [], { execArgv: ["--conditions", "development", "--max-old-space-size=384"], stdio: ["ignore", "ignore", "inherit", "ipc"] });
	forked.on("message", settle);
	forked.on("exit", (code) => {
		child = undefined;
		for (const waiting of pending.values()) waiting.reject(new Error(`the child process of the command line ended with ${String(code)}`));
		pending.clear();
	});
	child = forked;
	return forked;
}

/**
 * The command line in a child process of this worker, as `cli` of `support.ts` has it in process (a clock that stands
 * still, no variable of the environment): the Vitest worker waits on the child and keeps answering its RPC calls
 * (decision A112). One child serves every command of the worker, so the modules load once.
 *
 * @param cwd - The working directory of the commands.
 * @returns A function that runs one command and resolves to what it printed.
 */
export function cliProcess(cwd: string): (...args: readonly string[]) => Promise<Printed> {
	return (...args) =>
		new Promise((resolve, reject) => {
			const id = next++;
			pending.set(id, { resolve, reject });
			started().send({ id, cwd, args });
		});
}

/** Ends the child process of this worker, if one runs. */
export function stopCliProcess(): void {
	// The stopped child's exit must not touch the next one, nor the commands sent to it.
	child?.removeAllListeners("exit");
	child?.kill();
	child = undefined;
}

/** The folder of all caches of the standing parts; nothing outside it is written or removed. */
const ROOT = join(tmpdir(), "swt-standing-cache");
const SESSION = join(ROOT, `session-${String(process.ppid)}`);
const REPOSITORY = fileURLToPath(new URL("../../../", import.meta.url));
/** The folders whose files the fake run of a game file reads. */
const INPUTS = ["games", "mechanics", "packages", "apps/cli/src"];
/**
 * Left out of the hash: dependencies, tests and build output. The typecheck and the API reports of `pnpm check` write
 * `dist-types`, `temp` and `*.tsbuildinfo` while the tests run, so a part that started later missed the cache and
 * played every run again (M5-98: 268 s against 1.7 s).
 */
const SKIPPED = new Set(["node_modules", "dist", "dist-types", "temp", "test"]);
const skipped = (name: string): boolean => SKIPPED.has(name) || name.endsWith(".tsbuildinfo");
const DAY = 24 * 60 * 60 * 1000;
const WAIT = 500_000;

/** A run's snapshots are asked for after each of the first `CAP` numbers of finished ticks; a longer run fails its check. */
export const CAP = 1000;

const Shared = Type.Object(
	{
		straight: Type.Object({ code: Type.Number(), err: Type.String(), folder: Type.String() }, { description: "The fake run with the snapshots: its exit code, its error output and its folder" }),
	},
	{ description: "What the writer of a cached run recorded (result.json)" },
);
/** The run of a cache entry, with its folder relative to the working directory of the part that read it, and the entry. */
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
		if (skipped(entry.name)) return [];
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

/**
 * Plays the run into `staging` with a snapshot at every boundary below `CAP`, removes the snapshots of the boundaries
 * that `boundariesOf` does not name, and records the run in its `result.json`.
 */
async function write(staging: string, file: string, seed: number, boundariesOf: (ticks: number) => readonly number[]): Promise<void> {
	mkdirSync(staging, { recursive: true });
	const every = Array.from({ length: CAP }, (_, tick) => tick).join(",");
	const straight = await cliProcess(staging)("run", file, "--fake", "--seed", String(seed), "--out", "straight", "--snapshot-at", every);
	const folder = folderOf(straight);
	const snapshots = join(staging, folder, "snapshots");
	if (straight.code === 0 && existsSync(snapshots)) {
		const kept = new Set(boundariesOf(eventsOf(join(staging, folder)).filter((event) => event.type === "tick_ended").length).map((tick) => `t${String(tick)}.json`));
		for (const name of readdirSync(snapshots)) if (!kept.has(name)) rmSync(join(snapshots, name));
	}
	const shared: Static<typeof Shared> = { straight: { code: straight.code, err: straight.err, folder } };
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
 * The fake run with snapshots of one game file and seed, copied into `cwd` under `out`: played by the first part that
 * asks, read from the cache by the others.
 *
 * @param input - The game file, the seed, the boundaries of a run by its tick count, and where to copy the run.
 * @param input.file - The game file, absolute.
 * @param input.seed - The fake seed.
 * @param input.boundariesOf - The boundaries whose snapshots are kept, by the run's tick count.
 * @param input.cwd - The working directory of the part.
 * @param input.out - The folder under `cwd` the run is copied into.
 * @returns The run, with its folder relative to `cwd`, and the cache entry (for `claim`).
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
	return { entry, straight: { ...shared.straight, folder: join(input.out, shared.straight.folder) } };
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
